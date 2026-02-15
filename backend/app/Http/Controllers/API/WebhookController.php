<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\BillingPayment;
use App\Services\BillingService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class WebhookController extends Controller
{
    public function __construct(
        protected BillingService $billingService
    ) {}

    /**
     * Handle PayMongo webhook events.
     * POST /api/webhooks/paymongo
     * Events: checkout_session.payment.paid, payment.paid
     * Register webhook in PayMongo dashboard: https://your-api.com/api/webhooks/paymongo
     */
    public function handlePayMongo(Request $request)
    {
        $payload = $request->all();

        if (empty($payload['data']['attributes']['type'])) {
            Log::warning('PayMongo webhook: missing event type', ['payload' => $payload]);
            return response()->json(['message' => 'OK'], 200);
        }

        $eventType = $payload['data']['attributes']['type'];

        if ($eventType === 'checkout_session.payment.paid') {
            return $this->handleCheckoutSessionPaymentPaid($payload);
        }

        if ($eventType === 'payment.paid') {
            return $this->handlePaymentPaid($payload);
        }

        return response()->json(['message' => 'OK'], 200);
    }

    /**
     * Handle checkout_session.payment.paid - Checkout API session was paid.
     */
    protected function handleCheckoutSessionPaymentPaid(array $payload): \Illuminate\Http\JsonResponse
    {
        $eventData = $payload['data']['attributes']['data'] ?? null;

        if (!$eventData || ($eventData['type'] ?? null) !== 'checkout_session') {
            Log::warning('PayMongo webhook: invalid checkout_session data', ['payload' => $payload]);
            return response()->json(['message' => 'OK'], 200);
        }

        $checkoutSessionId = $eventData['id'] ?? null;
        $metadata = $eventData['attributes']['metadata'] ?? [];

        $payment = null;

        if ($checkoutSessionId) {
            $payment = BillingPayment::with(['billing.project.client'])
                ->where('paymongo_checkout_session_id', $checkoutSessionId)
                ->first();
        }

        if (!$payment && !empty($metadata['payment_code'])) {
            $payment = BillingPayment::with(['billing.project.client'])
                ->where('payment_code', $metadata['payment_code'])
                ->first();
        }

        if (!$payment) {
            Log::info('PayMongo webhook: no matching payment for checkout_session', [
                'checkout_session_id' => $checkoutSessionId,
                'metadata' => $metadata,
            ]);
            return response()->json(['message' => 'OK'], 200);
        }

        return $this->markPaymentAsPaid($payment);
    }

    /**
     * Handle payment.paid - generic payment paid (e.g. from checkout or other flows).
     * Used as fallback when checkout_session.payment.paid doesn't fire or for consistency.
     */
    protected function handlePaymentPaid(array $payload): \Illuminate\Http\JsonResponse
    {
        $eventData = $payload['data']['attributes']['data'] ?? null;

        if (!$eventData || ($eventData['type'] ?? null) !== 'payment') {
            return response()->json(['message' => 'OK'], 200);
        }

        $metadata = $eventData['attributes']['metadata'] ?? [];

        if (empty($metadata['payment_code'])) {
            return response()->json(['message' => 'OK'], 200);
        }

        $payment = BillingPayment::with(['billing.project.client'])
            ->where('payment_code', $metadata['payment_code'])
            ->where('payment_status', 'pending')
            ->first();

        if (!$payment) {
            return response()->json(['message' => 'OK'], 200);
        }

        return $this->markPaymentAsPaid($payment);
    }

    /**
     * Idempotent: mark payment as paid and recalculate billing.
     */
    protected function markPaymentAsPaid(BillingPayment $payment): \Illuminate\Http\JsonResponse
    {
        try {
            if ($payment->payment_status === 'paid') {
                return response()->json(['message' => 'OK'], 200);
            }

            DB::transaction(function () use ($payment) {
                $payment->payment_status = 'paid';
                $payment->save();

                $billing = $payment->billing;
                $this->billingService->calculateBillingStatus($billing);
            });

            Log::info('PayMongo webhook: payment marked as paid', [
                'payment_id' => $payment->id,
                'payment_code' => $payment->payment_code,
                'billing_id' => $payment->billing_id,
            ]);
        } catch (\Exception $e) {
            Log::error('PayMongo webhook: failed to update payment', [
                'payment_id' => $payment->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
        }

        return response()->json(['message' => 'OK'], 200);
    }
}
