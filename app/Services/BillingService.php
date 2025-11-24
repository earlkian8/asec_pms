<?php

namespace App\Services;

use App\Models\Billing;
use App\Models\BillingPayment;

class BillingService
{
    public function getBillingsData()
    {
        $search = request('search');
        $status = request('status');
        $projectId = request('project_id');
        $billingType = request('billing_type');

        $billings = Billing::with([
            'project:id,project_code,project_name,client_id',
            'project.client:id,client_name',
            'milestone:id,name',
            'createdBy:id,name'
        ])
            ->withCount('payments')
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
            ->when($projectId, function ($query, $projectId) {
                $query->where('project_id', $projectId);
            })
            ->when($billingType, function ($query, $billingType) {
                $query->where('billing_type', $billingType);
            })
            ->orderBy('created_at', 'desc')
            ->paginate(15)
            ->withQueryString();

        // Add computed properties to each billing
        $billings->getCollection()->transform(function ($billing) {
            $billing->total_paid = $billing->total_paid;
            $billing->remaining_amount = $billing->remaining_amount;
            $billing->payment_percentage = $billing->payment_percentage;
            return $billing;
        });

        return [
            'billings' => $billings,
            'search' => $search,
            'status' => $status,
            'project_id' => $projectId,
            'billing_type' => $billingType,
        ];
    }

    public function calculateBillingStatus(Billing $billing)
    {
        $totalPaid = $billing->payments()->sum('payment_amount');
        
        if ($totalPaid == 0) {
            $billing->status = 'unpaid';
        } elseif ($totalPaid >= $billing->billing_amount) {
            $billing->status = 'paid';
        } else {
            $billing->status = 'partial';
        }
        
        $billing->save();
        return $billing;
    }

    public function generateBillingCode()
    {
        do {
            $random = str_pad(rand(1, 999999), 6, '0', STR_PAD_LEFT);
            $billingCode = 'BIL-' . $random;
        } while (Billing::where('billing_code', $billingCode)->exists());

        return $billingCode;
    }

    public function generatePaymentCode()
    {
        do {
            $random = str_pad(rand(1, 999999), 6, '0', STR_PAD_LEFT);
            $paymentCode = 'PAY-' . $random;
        } while (BillingPayment::where('payment_code', $paymentCode)->exists());

        return $paymentCode;
    }

    public function getBillingDetails(Billing $billing)
    {
        $billing->load([
            'project.client',
            'milestone',
            'payments.createdBy',
            'createdBy'
        ]);

        $billing->total_paid = $billing->total_paid;
        $billing->remaining_amount = $billing->remaining_amount;
        $billing->payment_percentage = $billing->payment_percentage;

        return $billing;
    }

    public function getTransactionsData()
    {
        $search = request('search');
        $projectId = request('transaction_project_id');
        $paymentMethod = request('transaction_payment_method');

        $transactions = BillingPayment::with([
            'billing:id,billing_code,project_id',
            'billing.project:id,project_code,project_name',
            'createdBy:id,name'
        ])
            // Include all transactions, including those with null billing_id (orphaned transactions)
            ->when($search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('payment_code', 'ilike', "%{$search}%")
                      ->orWhere('reference_number', 'ilike', "%{$search}%")
                      ->orWhereHas('billing', function ($billingQuery) use ($search) {
                          $billingQuery->where('billing_code', 'ilike', "%{$search}%");
                      });
                });
            })
            ->when($projectId, function ($query, $projectId) {
                // When filtering by project, only show transactions with billing matching project_id
                // (exclude orphaned transactions since we can't determine their project)
                $query->whereHas('billing', function ($billingQuery) use ($projectId) {
                    $billingQuery->where('project_id', $projectId);
                });
            })
            ->when($paymentMethod, function ($query, $paymentMethod) {
                $query->where('payment_method', $paymentMethod);
            })
            ->orderBy('payment_date', 'desc')
            ->orderBy('created_at', 'desc')
            ->paginate(15)
            ->withQueryString();

        return [
            'transactions' => $transactions,
            'search' => $search,
            'project_id' => $projectId,
            'payment_method' => $paymentMethod,
        ];
    }
}

