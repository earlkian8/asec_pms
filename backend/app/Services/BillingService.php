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
        $startDate = request('start_date');
        $endDate = request('end_date');
        $sortBy = request('sort_by', 'created_at');
        $sortOrder = request('sort_order', 'desc');

        // Validate sort column
        $allowedSortColumns = ['created_at', 'billing_code', 'billing_date', 'due_date', 'billing_amount', 'status', 'billing_type'];
        if (!in_array($sortBy, $allowedSortColumns)) {
            $sortBy = 'created_at';
        }

        // Validate sort order
        $sortOrder = in_array(strtolower($sortOrder), ['asc', 'desc']) ? strtolower($sortOrder) : 'desc';

        $billings = Billing::with([
            'project:id,project_code,project_name,client_id',
            'project.client:id,client_name',
            'milestone:id,name',
            'createdBy:id,first_name,middle_name,last_name'
        ])
            ->withCount('payments')
            ->whereNull('archived_at')
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
            ->when($startDate, function ($query, $startDate) {
                $query->whereDate('billing_date', '>=', $startDate);
            })
            ->when($endDate, function ($query, $endDate) {
                $query->whereDate('billing_date', '<=', $endDate);
            })
            ->orderBy($sortBy, $sortOrder)
            ->paginate(15)
            ->withQueryString();

        // Add computed properties to each billing
        $billings->getCollection()->transform(function ($billing) {
            $billing->total_paid = $billing->total_paid;
            $billing->remaining_amount = $billing->remaining_amount;
            $billing->payment_percentage = $billing->payment_percentage;
            return $billing;
        });

        // Get unique values for filter options
        $statuses = Billing::distinct()->whereNotNull('status')->pluck('status')->sort()->values();
        $billingTypes = Billing::distinct()->whereNotNull('billing_type')->pluck('billing_type')->sort()->values();

        return [
            'billings' => $billings,
            'search' => $search,
            'filters' => [
                'status' => $status,
                'project_id' => $projectId,
                'billing_type' => $billingType,
                'start_date' => $startDate,
                'end_date' => $endDate,
            ],
            'filterOptions' => [
                'statuses' => $statuses,
                'billingTypes' => $billingTypes,
            ],
            'sort_by' => $sortBy,
            'sort_order' => $sortOrder,
        ];
    }

    public function calculateBillingStatus(Billing $billing)
    {
        // CRITICAL: Only sum payments with status='paid' to ensure data integrity
        // Pending, failed, or cancelled payments should not count towards billing status
        $totalPaid = $billing->payments()
            ->where('payment_status', 'paid')
            ->sum('payment_amount');
        
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
        try {
            // Get and sanitize input parameters
            $search = request('search');
            $projectId = request('transaction_project_id');
            $paymentMethod = request('transaction_payment_method');

            // Sanitize search input
            if ($search) {
                $search = trim($search);
                if (empty($search)) {
                    $search = null;
                }
            }

            // Validate project_id if provided
            if ($projectId && !is_numeric($projectId)) {
                $projectId = null;
            }

            // Validate payment_method if provided
            $allowedPaymentMethods = ['cash', 'check', 'bank_transfer', 'credit_card', 'paymongo', 'other'];
            if ($paymentMethod && !in_array($paymentMethod, $allowedPaymentMethods)) {
                $paymentMethod = null;
            }

            // Build the base query
            $query = BillingPayment::query();

            // Eager load relationships with specific columns to optimize query
            $query->with([
                'billing' => function ($q) {
                    $q->select('id', 'billing_code', 'project_id');
                },
                'billing.project' => function ($q) {
                    $q->select('id', 'project_code', 'project_name');
                },
                'createdBy' => function ($q) {
                    $q->select('id', 'name');
                },
            ]);

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

            // Apply project filter if provided
            if ($projectId) {
                $query->whereHas('billing', function ($billingQuery) use ($projectId) {
                    $billingQuery->where('project_id', $projectId);
                });
            }

            // Apply payment method filter if provided
            if ($paymentMethod) {
                $query->where('payment_method', $paymentMethod);
            }

            // Apply sorting - primary by payment_date, secondary by created_at
            $query->orderBy('payment_date', 'desc');
            $query->orderBy('created_at', 'desc');
            $query->orderBy('id', 'desc'); // Tertiary sort for consistency

            // Paginate results
            $perPage = min((int)request('per_page', 15), 100); // Max 100 per page
            $transactions = $query->paginate($perPage)->withQueryString();
            
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

                // Ensure createdBy relationship exists
                if (!$transaction->createdBy) {
                    $transaction->createdBy = (object)[
                        'id' => null,
                        'name' => 'System',
                    ];
                }
                
                return $transaction;
            });

            return [
                'transactions' => $transactions,
                'search' => $search,
                'project_id' => $projectId,
                'payment_method' => $paymentMethod,
            ];

        } catch (\Illuminate\Database\QueryException $e) {
            \Illuminate\Support\Facades\Log::error('Get Transactions Data Database Error', [
                'error' => $e->getMessage(),
                'sql' => $e->getSql() ?? 'N/A',
                'bindings' => $e->getBindings() ?? [],
            ]);

            // Return empty result on database error
            return [
                'transactions' => new \Illuminate\Pagination\LengthAwarePaginator(
                    collect([]),
                    0,
                    15,
                    1
                ),
                'search' => $search ?? null,
                'project_id' => $projectId ?? null,
                'payment_method' => $paymentMethod ?? null,
            ];

        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Get Transactions Data Error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            // Return empty result on error
            return [
                'transactions' => new \Illuminate\Pagination\LengthAwarePaginator(
                    collect([]),
                    0,
                    15,
                    1
                ),
                'search' => $search ?? null,
                'project_id' => $projectId ?? null,
                'payment_method' => $paymentMethod ?? null,
            ];
        }
    }
}

