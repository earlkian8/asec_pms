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
            'payment_method_type' => ['nullable', 'in:card,gcash,paymaya'],
        ]);

        $amount = $validated['amount'] ?? $billing->remaining_amount;
        $paymentMethodType = $validated['payment_method_type'] ?? 'card';

        // Validate amount doesn't exceed remaining
        if ($amount > $billing->remaining_amount) {
            return response()->json([
                'success' => false,
                'message' => 'Payment amount cannot exceed remaining amount',
            ], 400);
        }

        // PayMongo maximum amount is 999,999,999 cents (9,999,999.99 PHP)
        $maxAmount = 9999999.99;
        if ($amount > $maxAmount) {
            return response()->json([
                'success' => false,
                'message' => 'Payment amount cannot exceed ₱' . number_format($maxAmount, 2) . '. Please contact support for payments above this limit.',
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

            // Create PayMongo payment intent or source
            if ($paymentMethodType === 'card') {
                $payMongoResult = $this->payMongoService->createPaymentIntent(
                    (float)$amount,
                    'PHP',
                    [
                        'billing_id' => $billing->id,
                        'billing_code' => $billing->billing_code,
                        'payment_code' => $payment->payment_code,
                        'client_id' => $client->id,
                    ]
                );

                if (!$payMongoResult['success']) {
                    DB::rollBack();
                    return response()->json([
                        'success' => false,
                        'message' => 'Failed to create payment intent: ' . ($payMongoResult['error'] ?? 'Unknown error'),
                    ], 500);
                }

                $payment->paymongo_payment_intent_id = $payMongoResult['payment_intent_id'];
                $payment->paymongo_metadata = array_merge($payment->paymongo_metadata ?? [], [
                    'client_key' => $payMongoResult['client_key'] ?? null,
                ]);
            } else {
                // For GCash/PayMaya, create a source
                $sourceType = $paymentMethodType === 'gcash' ? 'gcash' : 'paymaya';
                
                // Build redirect URLs - these will redirect back to the app
                // For mobile apps, we can use a deep link or web page that redirects
                $baseUrl = config('app.url', 'http://localhost');
                $successUrl = rtrim($baseUrl, '/') . '/api/client/payment/success?payment_code=' . urlencode($payment->payment_code) . '&source_id={source_id}';
                $failedUrl = rtrim($baseUrl, '/') . '/api/client/payment/failed?payment_code=' . urlencode($payment->payment_code) . '&source_id={source_id}';
                
                $payMongoResult = $this->payMongoService->createSource(
                    (float)$amount,
                    'PHP',
                    $sourceType,
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
            }

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

            // Get checkout URL from PayMongo result (for GCash/PayMaya sources)
            $checkoutUrl = null;
            if ($paymentMethodType !== 'card' && isset($payMongoResult['checkout_url'])) {
                $checkoutUrl = $payMongoResult['checkout_url'];
            }

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
     */
    public function transactions(Request $request)
    {
        $client = $request->user();

        $search = $request->get('search');
        $sortBy = $request->get('sort_by', 'created_at');
        $sortOrder = $request->get('sort_order', 'desc');

        // Get client's project IDs
        $projectIds = Project::where('client_id', $client->id)->pluck('id');

        $transactions = BillingPayment::with([
            'billing:id,billing_code,project_id',
            'billing.project:id,project_code,project_name',
        ])
            ->whereHas('billing', function ($query) use ($projectIds) {
                $query->whereIn('project_id', $projectIds);
            })
            ->where('paid_by_client', true)
            ->when($search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('payment_code', 'ilike', "%{$search}%")
                      ->orWhere('reference_number', 'ilike', "%{$search}%")
                      ->orWhereHas('billing', function ($billingQuery) use ($search) {
                          $billingQuery->where('billing_code', 'ilike', "%{$search}%");
                      });
                });
            })
            ->orderBy($sortBy, $sortOrder)
            ->paginate(15);

        return response()->json([
            'success' => true,
            'data' => $transactions,
        ]);
    }

    /**
     * Handle successful payment redirect from PayMongo
     */
    public function paymentSuccess(Request $request)
    {
        $paymentCode = $request->get('payment_code');
        $sourceId = $request->get('source_id');
        
        // This is a redirect endpoint - could return HTML or redirect to app
        // For now, return a simple JSON response that the app can check
        return response()->json([
            'success' => true,
            'message' => 'Payment successful',
            'payment_code' => $paymentCode,
        ]);
    }

    /**
     * Handle failed payment redirect from PayMongo
     */
    public function paymentFailed(Request $request)
    {
        $paymentCode = $request->get('payment_code');
        $sourceId = $request->get('source_id');
        
        return response()->json([
            'success' => false,
            'message' => 'Payment failed',
            'payment_code' => $paymentCode,
        ]);
    }
}
