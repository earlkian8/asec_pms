<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Billing;
use App\Models\BillingPayment;
use App\Models\Project;
use App\Services\BillingService;
use App\Services\PayMongoService;
use App\Traits\NotificationTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ClientBillingController extends Controller
{
    use NotificationTrait;

    protected $billingService;
    protected $payMongoService;

    public function __construct(BillingService $billingService, PayMongoService $payMongoService)
    {
        $this->billingService = $billingService;
        $this->payMongoService = $payMongoService;
    }

    /**
     * Map PayMongo payment intent status to our payment status
     * CRITICAL: Only 'succeeded' maps to 'paid' - ensures data integrity
     * 
     * @param string $payMongoStatus
     * @return string
     */
    private function mapPayMongoStatusToPaymentStatus(string $payMongoStatus): string
    {
        switch ($payMongoStatus) {
            case 'succeeded':
            case 'paid':
                return 'paid';
            case 'failed':
                return 'failed';
            case 'cancelled':
            case 'void':
                return 'cancelled';
            case 'processing':
            case 'awaiting_next_action':
            case 'awaiting_payment_method':
            case 'awaiting_capture':
                return 'pending';
            default:
                // Unknown status - log warning but keep as pending for safety
                Log::warning('Unknown PayMongo payment intent status encountered', [
                    'status' => $payMongoStatus,
                    'timestamp' => now()->toIso8601String(),
                ]);
                return 'pending';
        }
    }

    /**
     * Update payment status with logging and idempotency checks
     * Only updates if status actually changes to ensure data integrity
     * 
     * @param BillingPayment $payment
     * @param string $newStatus
     * @param string $payMongoStatus
     * @param Billing $billing
     * @param mixed $client
     * @return bool True if status was updated, false if already in target state
     */
    private function updatePaymentStatus(
        BillingPayment $payment,
        string $newStatus,
        string $payMongoStatus,
        Billing $billing,
        $client
    ): bool {
        $previousStatus = $payment->payment_status;
        
        // Idempotency check: Don't update if already in target state
        if ($payment->payment_status === $newStatus) {
            Log::info('Payment status check: Already in target state', [
                'payment_id' => $payment->id,
                'payment_code' => $payment->payment_code,
                'status' => $newStatus,
                'paymongo_status' => $payMongoStatus,
            ]);
            return false;
        }

        // Log status transition for audit trail
        Log::info('Payment status transition', [
            'payment_id' => $payment->id,
            'payment_code' => $payment->payment_code,
            'billing_id' => $billing->id,
            'billing_code' => $billing->billing_code,
            'previous_status' => $previousStatus,
            'new_status' => $newStatus,
            'paymongo_status' => $payMongoStatus,
            'timestamp' => now()->toIso8601String(),
        ]);

        // Update payment status
        $payment->payment_status = $newStatus;
        
        // Ensure reference_number is set for PayMongo payments
        if (!$payment->reference_number) {
            $payment->reference_number = $payment->paymongo_checkout_session_id
                ?? $payment->paymongo_payment_intent_id
                ?? null;
        }
        
        $payment->save();

        // Only update billing status when payment status changes to/from 'paid'
        // This ensures billing status accurately reflects paid amounts
        $wasPaid = $previousStatus === 'paid';
        $isPaid = $newStatus === 'paid';

        if ($wasPaid !== $isPaid) {
            $this->billingService->calculateBillingStatus($billing);
            $billing->refresh();

            // Notify admin only when payment is actually completed (paid)
            if ($isPaid) {
                $this->createSystemNotification(
                    'general',
                    'Payment Completed',
                    "Client {$client->client_name} completed payment of ₱" . number_format((float)$payment->payment_amount, 2) . " for billing '{$billing->billing_code}' via PayMongo.",
                    $billing->project,
                    null
                );
            }
        }

        return true;
    }

    /**
     * Get all billings for the authenticated client
     */
    public function index(Request $request)
    {
        $client = $request->user();
        
        $search = $request->get('search');
        $status = $request->get('status');
        $sortBy = $request->get('sort_by', 'created_at');
        $sortOrder = $request->get('sort_order', 'desc');

        // Get client's project IDs
        $projectIds = Project::where('client_id', $client->id)->pluck('id');

        $billings = Billing::with([
            'project:id,project_code,project_name,client_id',
            'milestone:id,name',
            'payments' => function ($query) {
                $query->orderBy('created_at', 'desc');
            }
        ])
            ->whereIn('project_id', $projectIds)
            ->when($search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('billing_code', 'ilike', "%{$search}%")
                      ->orWhereHas('project', function ($projectQuery) use ($search) {
                          $projectQuery->where('project_name', 'ilike', "%{$search}%")
                                      ->orWhere('project_code', 'ilike', "%{$search}%");
                      });
                });
            })
            ->when($status, function ($query, $status) {
                $query->where('status', $status);
            })
            ->orderBy($sortBy, $sortOrder)
            ->paginate(15);

        // Add computed properties
        $billings->getCollection()->transform(function ($billing) {
            $billing->total_paid = $billing->total_paid;
            $billing->remaining_amount = $billing->remaining_amount;
            $billing->payment_percentage = $billing->payment_percentage;
            return $billing;
        });

        return response()->json([
            'success' => true,
            'data' => $billings,
        ]);
    }

    /**
     * Get billing details
     */
    public function show(Request $request, $id)
    {
        $client = $request->user();

        // Validate ID is numeric to prevent route conflicts
        if (!is_numeric($id)) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid billing ID',
            ], 400);
        }

        $billing = Billing::with([
            'project.client',
            'milestone',
            'payments' => function ($query) {
                $query->orderBy('created_at', 'desc');
            }
        ])->findOrFail($id);

        // Verify billing belongs to client
        if ($billing->project->client_id !== $client->id) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized access to this billing',
            ], 403);
        }

        $billing->total_paid = $billing->total_paid;
        $billing->remaining_amount = $billing->remaining_amount;
        $billing->payment_percentage = $billing->payment_percentage;

        return response()->json([
            'success' => true,
            'data' => $billing,
        ]);
    }

    /**
     * Initiate PayMongo payment via Checkout API (hosted payment page)
     * Returns checkout_url - user is redirected to PayMongo to enter card details.
     */
    public function initiatePayment(Request $request, $id)
    {
        if (!is_numeric($id)) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid billing ID',
            ], 400);
        }

        $client = $request->user();
        $billing = Billing::with('project')->findOrFail($id);

        if ($billing->project->client_id !== $client->id) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized access to this billing',
            ], 403);
        }

        if ($billing->status === 'paid') {
            return response()->json([
                'success' => false,
                'message' => 'This billing is already fully paid',
            ], 400);
        }

        if (!$client->email) {
            return response()->json([
                'success' => false,
                'message' => 'Email is required for payment processing. Please update your profile with a valid email address.',
            ], 400);
        }

        $validated = $request->validate([
            'amount' => ['nullable', 'numeric', 'min:0.01'],
        ]);

        $amount = (float)($validated['amount'] ?? $billing->remaining_amount);

        if ($amount > $billing->remaining_amount) {
            return response()->json([
                'success' => false,
                'message' => 'Payment amount cannot exceed remaining amount',
            ], 400);
        }

        try {
            DB::beginTransaction();

            $payment = BillingPayment::create([
                'billing_id' => $billing->id,
                'payment_code' => $this->billingService->generatePaymentCode(),
                'payment_amount' => $amount,
                'payment_date' => now(),
                'payment_method' => 'paymongo',
                'payment_status' => 'pending',
                'paid_by_client' => true,
                'paymongo_metadata' => [
                    'checkout_initiated_at' => now()->toIso8601String(),
                ],
            ]);

            $baseUrl = rtrim(config('app.url'), '/') . '/api/client/payment';
            if (!str_starts_with($baseUrl, 'https://')) {
                $baseUrl = 'https://' . substr($baseUrl, 7);
            }

            $successUrl = $baseUrl . '/checkout-success?payment_code=' . urlencode($payment->payment_code);
            $cancelUrl = $baseUrl . '/checkout-cancel?billing_id=' . $billing->id;

            $description = "Payment for {$billing->billing_code} - {$billing->project->project_name}";

            $result = $this->payMongoService->createCheckoutSession(
                $amount,
                $description,
                [
                    'name' => $client->client_name,
                    'email' => $client->email,
                ],
                $successUrl,
                $cancelUrl,
                [
                    'billing_id' => $billing->id,
                    'billing_code' => $billing->billing_code,
                    'payment_code' => $payment->payment_code,
                    'client_id' => $client->id,
                ]
            );

            if (!$result['success'] || !($result['checkout_url'] ?? null)) {
                DB::rollBack();
                return response()->json([
                    'success' => false,
                    'message' => $result['error'] ?? 'Failed to create checkout session',
                ], 500);
            }

            $payment->paymongo_checkout_session_id = $result['checkout_session_id'];
            $payment->reference_number = $result['checkout_session_id'];
            $payment->save();

            DB::commit();

            $this->createSystemNotification(
                'general',
                'Payment Initiated',
                "Client {$client->client_name} initiated a payment of ₱" . number_format($amount, 2) . " for billing '{$billing->billing_code}' via PayMongo Checkout.",
                $billing->project,
                null
            );

            return response()->json([
                'success' => true,
                'message' => 'Payment initiated successfully',
                'data' => [
                    'payment_id' => $payment->id,
                    'payment_code' => $payment->payment_code,
                    'amount' => $amount,
                    'checkout_url' => $result['checkout_url'],
                ],
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Payment Initiation Failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'billing_id' => $billing->id,
                'client_id' => $client->id,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'An error occurred while initiating payment',
            ], 500);
        }
    }

    /**
     * Handle PayMongo Checkout success redirect (public).
     * PayMongo redirects here after successful payment; return HTML with deep link to app.
     */
    public function checkoutSuccess(Request $request)
    {
        $paymentCode = $request->query('payment_code');
        $checkoutSessionId = $request->query('checkout_session_id');

        $payment = null;
        if ($paymentCode) {
            $payment = BillingPayment::with(['billing.project.client'])->where('payment_code', $paymentCode)->first();
        }
        if (!$payment && $checkoutSessionId) {
            $payment = BillingPayment::with(['billing.project.client'])->where('paymongo_checkout_session_id', $checkoutSessionId)->first();
        }

        if (!$payment) {
            Log::warning('Checkout success: payment not found', [
                'payment_code' => $paymentCode,
                'checkout_session_id' => $checkoutSessionId,
            ]);
            $deepLink = 'client://payment/failed?error=not_found';
            return response()->view('payment-redirect', [
                'deepLink' => $deepLink,
                'status' => 'failed',
            ], 200);
        }

        $billing = $payment->billing;
        $client = $billing->project->client ?? null;

        // Verify checkout session with PayMongo
        $sessionResult = $this->payMongoService->getCheckoutSession($payment->paymongo_checkout_session_id ?? $checkoutSessionId ?? '');
        if ($sessionResult['success'] && ($sessionResult['status'] ?? null) === 'paid') {
            $this->updatePaymentStatus($payment, 'paid', 'paid', $billing, $client);
            $payment->refresh();
        } else {
            Log::info('Checkout success: verifying session', [
                'payment_code' => $payment->payment_code,
                'session_status' => $sessionResult['status'] ?? 'unknown',
            ]);
            // Still treat as success - user was redirected here; webhook may have updated already
            if ($payment->payment_status !== 'paid') {
                $this->updatePaymentStatus($payment, 'paid', 'redirect_success', $billing, $client);
                $payment->refresh();
            }
        }

        $deepLink = 'client://billings';
        return response()->view('payment-redirect', [
            'deepLink' => $deepLink,
            'status' => 'success',
            'paymentCode' => $payment->payment_code,
        ], 200)->header('Content-Type', 'text/html');
    }

    /**
     * Handle PayMongo Checkout cancel redirect (public).
     */
    public function checkoutCancel(Request $request)
    {
        $billingId = $request->query('billing_id');
        return response()->view('payment-cancel', ['billing_id' => $billingId], 200);
    }

    /**
     * Check payment status
     */
    public function checkPaymentStatus(Request $request, $id)
    {
        // Validate ID is numeric to prevent route conflicts
        if (!is_numeric($id)) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid billing ID',
            ], 400);
        }

        $client = $request->user();

        $billing = Billing::with('project')->findOrFail($id);

        // Verify billing belongs to client
        if ($billing->project->client_id !== $client->id) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized access to this billing',
            ], 403);
        }

        // Get the latest pending payment for this billing
        $payment = BillingPayment::where('billing_id', $billing->id)
            ->where('paid_by_client', true)
            ->where('payment_status', 'pending')
            ->orderBy('created_at', 'desc')
            ->first();

        if (!$payment) {
            return response()->json([
                'success' => true,
                'data' => [
                    'status' => 'no_pending_payment',
                    'message' => 'No pending payment found',
                ],
            ]);
        }

        // Check PayMongo status
        if ($payment->paymongo_checkout_session_id) {
            $sessionResult = $this->payMongoService->getCheckoutSession($payment->paymongo_checkout_session_id);

            if ($sessionResult['success'] && ($sessionResult['is_paid'] ?? false)) {
                $this->updatePaymentStatus($payment, 'paid', 'paid', $billing, $client);
                $payment->refresh();
            } elseif ($sessionResult['success']) {
                $status = $sessionResult['status'] ?? 'pending';
                $newStatus = $status === 'paid' ? 'paid' : ($status === 'cancelled' ? 'cancelled' : 'pending');
                $this->updatePaymentStatus($payment, $newStatus, $status, $billing, $client);
                $payment->refresh();
            }
        } elseif ($payment->paymongo_payment_intent_id) {
            $payMongoResult = $this->payMongoService->getPaymentIntent($payment->paymongo_payment_intent_id);
            
            if ($payMongoResult['success']) {
                $payMongoStatus = $payMongoResult['status'];
                
                // Map PayMongo status to our payment status using comprehensive mapping
                $newPaymentStatus = $this->mapPayMongoStatusToPaymentStatus($payMongoStatus);
                
                // Update payment status with logging and idempotency checks
                $this->updatePaymentStatus($payment, $newPaymentStatus, $payMongoStatus, $billing, $client);
                
                // Refresh payment to get updated status
                $payment->refresh();
            } else {
                // PayMongo API call failed - log error but don't change payment status
                // This ensures we don't mark as paid if we can't verify with PayMongo
                Log::error('Failed to retrieve PayMongo payment intent status', [
                    'payment_id' => $payment->id,
                    'payment_code' => $payment->payment_code,
                    'payment_intent_id' => $payment->paymongo_payment_intent_id,
                    'error' => $payMongoResult['error'] ?? 'Unknown error',
                ]);
            }
        } elseif ($payment->paymongo_source_id) {
            // Legacy GCash source-based payments (for backward compatibility)
            // Check source status for GCash payments
            $sourceResult = $this->payMongoService->getSource($payment->paymongo_source_id);
            
            if ($sourceResult['success']) {
                $sourceStatus = $sourceResult['status'];
                
                // Update payment status based on source status
                if ($sourceStatus === 'chargeable') {
                    // Source is chargeable - create payment from source
                    $paymentResult = $this->payMongoService->createPaymentFromSource(
                        $payment->paymongo_source_id,
                        (float)$payment->payment_amount,
                        'PHP',
                        [
                            'billing_id' => $billing->id,
                            'billing_code' => $billing->billing_code,
                            'payment_code' => $payment->payment_code,
                            'client_id' => $client->id,
                        ]
                    );
                    
                    if ($paymentResult['success']) {
                        $paymentStatusFromResult = $paymentResult['status'];
                        
                        // Map payment status - only 'paid' should mark as paid
                        // Use similar logic to payment intent status mapping
                        $newPaymentStatus = $paymentStatusFromResult === 'paid' ? 'paid' : 
                                          ($paymentStatusFromResult === 'failed' ? 'failed' : 'pending');
                        
                        // Update with logging and idempotency
                        $previousStatus = $payment->payment_status;
                        if ($payment->payment_status !== $newPaymentStatus) {
                            Log::info('Legacy source payment status transition', [
                                'payment_id' => $payment->id,
                                'payment_code' => $payment->payment_code,
                                'previous_status' => $previousStatus,
                                'new_status' => $newPaymentStatus,
                                'source_status' => $sourceStatus,
                                'payment_result_status' => $paymentStatusFromResult,
                            ]);
                            
                            $payment->payment_status = $newPaymentStatus;
                            $payment->paymongo_metadata = array_merge($payment->paymongo_metadata ?? [], [
                                'payment_id' => $paymentResult['payment_id'],
                            ]);
                            $payment->save();
                            
                            // Only update billing if status changed to/from 'paid'
                            if (($previousStatus === 'paid') !== ($newPaymentStatus === 'paid')) {
                                $this->billingService->calculateBillingStatus($billing);
                                $billing->refresh();
                                
                                if ($newPaymentStatus === 'paid') {
                                    $this->createSystemNotification(
                                        'general',
                                        'Payment Completed',
                                        "Client {$client->client_name} completed payment of ₱" . number_format((float)$payment->payment_amount, 2) . " for billing '{$billing->billing_code}' via PayMongo.",
                                        $billing->project,
                                        null
                                    );
                                }
                            }
                        }
                    } else {
                        // Payment creation failed - log but don't change status
                        Log::error('Failed to create payment from source', [
                            'payment_id' => $payment->id,
                            'payment_code' => $payment->payment_code,
                            'source_id' => $payment->paymongo_source_id,
                            'error' => $paymentResult['error'] ?? 'Unknown error',
                        ]);
                    }
                } elseif ($sourceStatus === 'paid') {
                    // Source is already paid - use updatePaymentStatus for consistency
                    $this->updatePaymentStatus($payment, 'paid', 'source_paid', $billing, $client);
                    $payment->refresh();
                } elseif (in_array($sourceStatus, ['failed', 'cancelled'])) {
                    // Map source status to payment status
                    $newPaymentStatus = $sourceStatus === 'cancelled' ? 'cancelled' : 'failed';
                    $this->updatePaymentStatus($payment, $newPaymentStatus, $sourceStatus, $billing, $client);
                    $payment->refresh();
                } else {
                    // Unknown source status - log and keep as pending
                    Log::warning('Unknown source status encountered', [
                        'payment_id' => $payment->id,
                        'payment_code' => $payment->payment_code,
                        'source_status' => $sourceStatus,
                    ]);
                }
            } else {
                // Source API call failed - log error but don't change payment status
                Log::error('Failed to retrieve PayMongo source status', [
                    'payment_id' => $payment->id,
                    'payment_code' => $payment->payment_code,
                    'source_id' => $payment->paymongo_source_id,
                    'error' => $sourceResult['error'] ?? 'Unknown error',
                ]);
            }
        }

        return response()->json([
            'success' => true,
            'data' => [
                'payment_id' => $payment->id,
                'payment_code' => $payment->payment_code,
                'status' => $payment->payment_status,
                'amount' => $payment->payment_amount,
                'billing_status' => $billing->status,
                'remaining_amount' => $billing->remaining_amount,
            ],
        ]);
    }

    /**
     * Get payment transactions for client
     * This endpoint returns all payment transactions made by the authenticated client
     */
    public function transactions(Request $request)
    {
        try {
            $client = $request->user();

            if (!$client) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthenticated',
                ], 401);
            }

            // Get and sanitize input parameters
            $search = $request->get('search');
            $sortBy = $request->get('sort_by', 'created_at');
            $sortOrder = $request->get('sort_order', 'desc');

            // Validate and sanitize sort_by parameter
            $allowedSortColumns = [
                'payment_date',
                'payment_code',
                'payment_amount',
                'created_at',
                'payment_status',
                'payment_method',
            ];
            
            if (!in_array($sortBy, $allowedSortColumns)) {
                $sortBy = 'created_at';
            }

            // Validate and sanitize sort_order parameter
            $sortOrder = strtolower($sortOrder) === 'asc' ? 'asc' : 'desc';

            // Sanitize search input
            if ($search) {
                $search = trim($search);
                if (empty($search)) {
                    $search = null;
                }
            }

            // Get client's project IDs - only transactions from client's projects
            $projectIds = Project::where('client_id', $client->id)->pluck('id')->toArray();

            // Build the base query
            $query = BillingPayment::query();

            // Only get payments made by clients
            $query->where('paid_by_client', true);

            // Only get payments from client's projects
            if (!empty($projectIds)) {
                $query->whereHas('billing', function ($q) use ($projectIds) {
                    $q->whereIn('project_id', $projectIds);
                });
            } else {
                // Client has no projects, return empty result
                return response()->json([
                    'success' => true,
                    'data' => [
                        'data' => [],
                        'current_page' => 1,
                        'last_page' => 1,
                        'per_page' => 15,
                        'total' => 0,
                        'from' => null,
                        'to' => null,
                    ],
                ]);
            }

            // Apply search filter if provided
            if ($search) {
                $query->where(function ($q) use ($search) {
                    $q->where('payment_code', 'ilike', "%{$search}%")
                      ->orWhere('reference_number', 'ilike', "%{$search}%")
                      ->orWhereHas('billing', function ($billingQuery) use ($search) {
                          $billingQuery->where('billing_code', 'ilike', "%{$search}%");
                      });
                });
            }

            // Eager load relationships with specific columns to optimize query
            $query->with([
                'billing' => function ($q) {
                    $q->select('id', 'billing_code', 'project_id');
                },
                'billing.project' => function ($q) {
                    $q->select('id', 'project_code', 'project_name');
                },
            ]);

            // Apply sorting
            $query->orderBy($sortBy, $sortOrder);
            $query->orderBy('id', 'desc'); // Secondary sort for consistency

            // Paginate results
            $perPage = min((int)$request->get('per_page', 15), 100); // Max 100 per page
            $transactions = $query->paginate($perPage);

            // Transform results to ensure safe data access
            $transactions->getCollection()->transform(function ($transaction) {
                // Ensure billing relationship exists
                if (!$transaction->billing) {
                    $transaction->billing = (object)[
                        'id' => null,
                        'billing_code' => 'N/A',
                        'project' => (object)[
                            'id' => null,
                            'project_code' => 'N/A',
                            'project_name' => 'N/A',
                        ],
                    ];
                } elseif (!$transaction->billing->project) {
                    // Billing exists but project doesn't
                    $transaction->billing->project = (object)[
                        'id' => null,
                        'project_code' => 'N/A',
                        'project_name' => 'N/A',
                    ];
                }
                
                return $transaction;
            });

            return response()->json([
                'success' => true,
                'data' => $transactions,
            ]);

        } catch (\Illuminate\Database\QueryException $e) {
            Log::error('Client Transactions Database Error', [
                'error' => $e->getMessage(),
                'sql' => $e->getSql() ?? 'N/A',
                'bindings' => $e->getBindings() ?? [],
                'client_id' => $request->user()->id ?? null,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Database error while loading transactions',
                'data' => [
                    'data' => [],
                    'current_page' => 1,
                    'last_page' => 1,
                    'per_page' => 15,
                    'total' => 0,
                ],
            ], 500);

        } catch (\Exception $e) {
            Log::error('Client Transactions Error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'client_id' => $request->user()->id ?? null,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to load transactions',
                'data' => [
                    'data' => [],
                    'current_page' => 1,
                    'last_page' => 1,
                    'per_page' => 15,
                    'total' => 0,
                ],
            ], 500);
        }
    }

    /**
     * Handle 3D Secure return redirect from PayMongo (Payment Intent card flow).
     * PayMongo redirects here after the user completes 3DS authentication.
     * This route must return 200 OK so PayMongo validates return_url before providing redirect.url.
     */
    public function paymentReturn(Request $request)
    {
        $paymentIntentId = $request->get('payment_intent_id');
        $paymentCode = $request->get('payment_code');

        try {
            if ($paymentIntentId) {
                $payment = BillingPayment::where('paymongo_payment_intent_id', $paymentIntentId)->first();
            } elseif ($paymentCode) {
                $payment = BillingPayment::where('payment_code', $paymentCode)->first();
            } else {
                $payment = null;
            }

            if ($payment && $payment->paymongo_payment_intent_id) {
                $billing = $payment->billing;

                if ($billing) {
                    $client = $billing->project?->client;
                    $payMongoResult = $this->payMongoService->getPaymentIntent($payment->paymongo_payment_intent_id);

                    if ($payMongoResult['success']) {
                        $payMongoStatus = $payMongoResult['status'];
                        $newPaymentStatus = $this->mapPayMongoStatusToPaymentStatus($payMongoStatus);
                        $this->updatePaymentStatus($payment, $newPaymentStatus, $payMongoStatus, $billing, $client);
                    }
                }
            }
        } catch (\Exception $e) {
            Log::error('Payment Return Handler Error', [
                'error' => $e->getMessage(),
                'payment_intent_id' => $paymentIntentId,
                'payment_code' => $paymentCode,
            ]);
        }

        $deepLink = 'client://payment/return?payment_intent_id=' . urlencode($paymentIntentId ?? '') . '&payment_code=' . urlencode($paymentCode ?? '');

        return response()->view('payment-redirect', [
            'deepLink' => $deepLink,
            'paymentCode' => $paymentCode ?? '',
            'status' => 'return',
        ])->header('Content-Type', 'text/html');
    }

    /**
     * Handle successful payment redirect from PayMongo
     */
    public function paymentSuccess(Request $request)
    {
        $paymentCode = $request->get('payment_code');
        $sourceId = $request->get('source_id');
        
        try {
            // Find the payment
            $payment = BillingPayment::where('payment_code', $paymentCode)->first();
            
            if ($payment && $sourceId) {
                // Verify source status with PayMongo
                $sourceResult = $this->payMongoService->getSource($sourceId);
                
                if ($sourceResult['success']) {
                    $sourceStatus = $sourceResult['status'];
                    
                    // Update payment status based on source status
                    if ($sourceStatus === 'chargeable') {
                        // Source is chargeable - create payment from source
                        $paymentResult = $this->payMongoService->createPaymentFromSource(
                            $sourceId,
                            (float)$payment->payment_amount,
                            'PHP',
                            [
                                'billing_id' => $payment->billing_id,
                                'billing_code' => $payment->billing->billing_code ?? '',
                                'payment_code' => $payment->payment_code,
                                'client_id' => $payment->billing->project->client_id ?? null,
                            ]
                        );
                        
                        if ($paymentResult['success']) {
                            $paymentStatusFromResult = $paymentResult['status'];
                            
                            // Map payment status - only 'paid' should mark as paid
                            $newPaymentStatus = $paymentStatusFromResult === 'paid' ? 'paid' : 
                                              ($paymentStatusFromResult === 'failed' ? 'failed' : 'pending');
                            
                            // Update with logging and idempotency
                            $previousStatus = $payment->payment_status;
                            if ($payment->payment_status !== $newPaymentStatus) {
                                Log::info('Payment return handler: Payment status transition', [
                                    'payment_id' => $payment->id,
                                    'payment_code' => $payment->payment_code,
                                    'previous_status' => $previousStatus,
                                    'new_status' => $newPaymentStatus,
                                    'source_status' => $sourceStatus,
                                    'payment_result_status' => $paymentStatusFromResult,
                                ]);
                                
                                $payment->payment_status = $newPaymentStatus;
                                $payment->paymongo_metadata = array_merge($payment->paymongo_metadata ?? [], [
                                    'payment_id' => $paymentResult['payment_id'],
                                ]);
                                $payment->save();
                                
                                // Only update billing if status changed to/from 'paid'
                                $billing = $payment->billing;
                                if ($billing && (($previousStatus === 'paid') !== ($newPaymentStatus === 'paid'))) {
                                    $this->billingService->calculateBillingStatus($billing);
                                }
                            }
                        }
                    } elseif ($sourceStatus === 'paid') {
                        // Source is already paid - use consistent status update
                        $previousStatus = $payment->payment_status;
                        if ($payment->payment_status !== 'paid') {
                            Log::info('Payment return handler: Source already paid', [
                                'payment_id' => $payment->id,
                                'payment_code' => $payment->payment_code,
                                'previous_status' => $previousStatus,
                                'new_status' => 'paid',
                                'source_status' => $sourceStatus,
                            ]);
                            
                            $payment->payment_status = 'paid';
                            $payment->save();
                            
                            // Update billing status
                            $billing = $payment->billing;
                            if ($billing) {
                                $this->billingService->calculateBillingStatus($billing);
                            }
                        }
                    }
                }
            }
        } catch (\Exception $e) {
            Log::error('Payment Success Handler Error', [
                'error' => $e->getMessage(),
                'payment_code' => $paymentCode,
                'source_id' => $sourceId,
            ]);
        }
        
        // Redirect to mobile app using deep link
        $deepLink = "client://payment/success?payment_code=" . urlencode($paymentCode ?? '') . "&source_id=" . urlencode($sourceId ?? '');
        
        // Return HTML that redirects to the app
        return response()->view('payment-redirect', [
            'deepLink' => $deepLink,
            'paymentCode' => $paymentCode,
            'status' => 'success',
        ])->header('Content-Type', 'text/html');
    }

    /**
     * Handle failed payment redirect from PayMongo
     */
    public function paymentFailed(Request $request)
    {
        $paymentCode = $request->get('payment_code');
        $sourceId = $request->get('source_id');
        
        try {
            // Find the payment and mark as failed
            $payment = BillingPayment::where('payment_code', $paymentCode)->first();
            
            if ($payment) {
                // Only update if not already failed (idempotency)
                if ($payment->payment_status !== 'failed') {
                    $previousStatus = $payment->payment_status;
                    
                    Log::info('Payment return handler: Payment marked as failed', [
                        'payment_id' => $payment->id,
                        'payment_code' => $payment->payment_code,
                        'previous_status' => $previousStatus,
                        'new_status' => 'failed',
                    ]);
                    
                    $payment->payment_status = 'failed';
                    $payment->save();
                }
            }
        } catch (\Exception $e) {
            Log::error('Payment Failed Handler Error', [
                'error' => $e->getMessage(),
                'payment_code' => $paymentCode,
                'source_id' => $sourceId,
            ]);
        }
        
        // Redirect to mobile app using deep link
        $deepLink = "client://payment/failed?payment_code=" . urlencode($paymentCode ?? '') . "&source_id=" . urlencode($sourceId ?? '');
        
        // Return HTML that redirects to the app
        return response()->view('payment-redirect', [
            'deepLink' => $deepLink,
            'paymentCode' => $paymentCode,
            'status' => 'failed',
        ])->header('Content-Type', 'text/html');
    }
}
