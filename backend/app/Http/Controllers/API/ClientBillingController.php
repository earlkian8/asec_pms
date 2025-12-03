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
     * Initiate PayMongo payment
     */
    public function initiatePayment(Request $request, $id)
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

        // Check if billing is already fully paid
        if ($billing->status === 'paid') {
            return response()->json([
                'success' => false,
                'message' => 'This billing is already fully paid',
            ], 400);
        }

        $validated = $request->validate([
            'amount' => ['nullable', 'numeric', 'min:0.01'],
            'payment_method_type' => ['nullable', 'in:gcash'],
        ]);

        $amount = $validated['amount'] ?? $billing->remaining_amount;
        $paymentMethodType = $validated['payment_method_type'] ?? 'gcash';

        // Validate amount doesn't exceed remaining
        if ($amount > $billing->remaining_amount) {
            return response()->json([
                'success' => false,
                'message' => 'Payment amount cannot exceed remaining amount',
            ], 400);
        }

        // GCash maximum amount is 100,000 PHP per transaction
        $maxGcashAmount = 100000.00;
        if ($paymentMethodType === 'gcash' && $amount > $maxGcashAmount) {
            return response()->json([
                'success' => false,
                'message' => 'Payment amount cannot exceed GCash maximum limit of ₱' . number_format($maxGcashAmount, 2) . '. Please split your payment into multiple transactions or contact support for assistance.',
            ], 400);
        }

        try {
            DB::beginTransaction();

            // Create payment record with pending status
            $payment = BillingPayment::create([
                'billing_id' => $billing->id,
                'payment_code' => $this->billingService->generatePaymentCode(),
                'payment_amount' => $amount,
                'payment_date' => now(),
                'payment_method' => 'paymongo',
                'payment_status' => 'pending',
                'paid_by_client' => true,
                'paymongo_metadata' => [
                    'payment_method_type' => $paymentMethodType,
                    'initiated_at' => now()->toIso8601String(),
                ],
            ]);

            // Create PayMongo source for GCash payment
            // Build redirect URLs - these will redirect back to the app
            $baseUrl = config('app.url', 'http://localhost');
            $successUrl = rtrim($baseUrl, '/') . '/api/client/payment/success?payment_code=' . urlencode($payment->payment_code) . '&source_id={source_id}';
            $failedUrl = rtrim($baseUrl, '/') . '/api/client/payment/failed?payment_code=' . urlencode($payment->payment_code) . '&source_id={source_id}';
            
            $payMongoResult = $this->payMongoService->createSource(
                (float)$amount,
                'PHP',
                'gcash',
                [
                    'billing_id' => $billing->id,
                    'billing_code' => $billing->billing_code,
                    'payment_code' => $payment->payment_code,
                    'client_id' => $client->id,
                ],
                $successUrl,
                $failedUrl
            );

            if (!$payMongoResult['success']) {
                DB::rollBack();
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to create payment source: ' . ($payMongoResult['error'] ?? 'Unknown error'),
                ], 500);
            }

            $payment->paymongo_source_id = $payMongoResult['source_id'];
            $checkoutUrl = $payMongoResult['checkout_url'] ?? null;
            $payment->paymongo_metadata = array_merge($payment->paymongo_metadata ?? [], [
                'checkout_url' => $checkoutUrl,
            ]);

            $payment->save();

            DB::commit();

            // Notify admin
            $this->createSystemNotification(
                'general',
                'Payment Initiated',
                "Client {$client->client_name} initiated a payment of ₱" . number_format((float)$amount, 2) . " for billing '{$billing->billing_code}' via PayMongo.",
                $billing->project,
                null
            );

            // Get checkout URL from PayMongo result (for GCash source)
            $checkoutUrl = $payMongoResult['checkout_url'] ?? null;

            return response()->json([
                'success' => true,
                'message' => 'Payment initiated successfully',
                'data' => [
                    'payment_id' => $payment->id,
                    'payment_code' => $payment->payment_code,
                    'amount' => $amount,
                    'payment_intent_id' => $payment->paymongo_payment_intent_id,
                    'source_id' => $payment->paymongo_source_id,
                    'checkout_url' => $checkoutUrl,
                    'client_key' => $payment->paymongo_metadata['client_key'] ?? null,
                    'public_key' => $this->payMongoService->getPublicKey(),
                    'payment_method_type' => $paymentMethodType,
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
        if ($payment->paymongo_payment_intent_id) {
            $payMongoResult = $this->payMongoService->getPaymentIntent($payment->paymongo_payment_intent_id);
            
            if ($payMongoResult['success']) {
                $payMongoStatus = $payMongoResult['status'];
                
                // Update payment status based on PayMongo status
                if ($payMongoStatus === 'succeeded') {
                    $payment->payment_status = 'paid';
                    $payment->save();
                    
                    // Update billing status
                    $this->billingService->calculateBillingStatus($billing);
                    $billing->refresh();

                    // Notify admin
                    $this->createSystemNotification(
                        'general',
                        'Payment Completed',
                        "Client {$client->client_name} completed payment of ₱" . number_format((float)$payment->payment_amount, 2) . " for billing '{$billing->billing_code}' via PayMongo.",
                        $billing->project,
                        null
                    );
                } elseif (in_array($payMongoStatus, ['failed', 'cancelled'])) {
                    $payment->payment_status = $payMongoStatus;
                    $payment->save();
                }
            }
        } elseif ($payment->paymongo_source_id) {
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
                        $paymentStatus = $paymentResult['status'];
                        
                        if ($paymentStatus === 'paid') {
                            $payment->payment_status = 'paid';
                            $payment->paymongo_metadata = array_merge($payment->paymongo_metadata ?? [], [
                                'payment_id' => $paymentResult['payment_id'],
                            ]);
                            $payment->save();
                            
                            // Update billing status
                            $this->billingService->calculateBillingStatus($billing);
                            $billing->refresh();

                            // Notify admin
                            $this->createSystemNotification(
                                'general',
                                'Payment Completed',
                                "Client {$client->client_name} completed payment of ₱" . number_format((float)$payment->payment_amount, 2) . " for billing '{$billing->billing_code}' via PayMongo.",
                                $billing->project,
                                null
                            );
                        } elseif (in_array($paymentStatus, ['failed', 'pending'])) {
                            // Payment creation succeeded but status is pending or failed
                            $payment->payment_status = $paymentStatus === 'pending' ? 'pending' : 'failed';
                            $payment->paymongo_metadata = array_merge($payment->paymongo_metadata ?? [], [
                                'payment_id' => $paymentResult['payment_id'],
                            ]);
                            $payment->save();
                        }
                    }
                } elseif ($sourceStatus === 'paid') {
                    // Source is already paid (shouldn't happen, but handle it)
                    $payment->payment_status = 'paid';
                    $payment->save();
                    
                    // Update billing status
                    $this->billingService->calculateBillingStatus($billing);
                    $billing->refresh();

                    // Notify admin
                    $this->createSystemNotification(
                        'general',
                        'Payment Completed',
                        "Client {$client->client_name} completed payment of ₱" . number_format((float)$payment->payment_amount, 2) . " for billing '{$billing->billing_code}' via PayMongo.",
                        $billing->project,
                        null
                    );
                } elseif (in_array($sourceStatus, ['failed', 'cancelled'])) {
                    $payment->payment_status = $sourceStatus;
                    $payment->save();
                }
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
                            $paymentStatus = $paymentResult['status'];
                            
                            if ($paymentStatus === 'paid') {
                                $payment->payment_status = 'paid';
                                $payment->paymongo_metadata = array_merge($payment->paymongo_metadata ?? [], [
                                    'payment_id' => $paymentResult['payment_id'],
                                ]);
                                $payment->save();
                                
                                // Update billing status
                                $billing = $payment->billing;
                                if ($billing) {
                                    $this->billingService->calculateBillingStatus($billing);
                                }
                            } elseif (in_array($paymentStatus, ['failed', 'pending'])) {
                                // Payment creation succeeded but status is pending or failed
                                $payment->payment_status = $paymentStatus === 'pending' ? 'pending' : 'failed';
                                $payment->paymongo_metadata = array_merge($payment->paymongo_metadata ?? [], [
                                    'payment_id' => $paymentResult['payment_id'],
                                ]);
                                $payment->save();
                            }
                        }
                    } elseif ($sourceStatus === 'paid') {
                        // Source is already paid (shouldn't happen, but handle it)
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
                $payment->payment_status = 'failed';
                $payment->save();
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
