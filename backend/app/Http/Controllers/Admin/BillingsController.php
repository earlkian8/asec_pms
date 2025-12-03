<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Billing;
use App\Models\BillingPayment;
use App\Models\Project;
use App\Models\ProjectMilestone;
use App\Models\User;
use App\Services\BillingService;
use App\Services\PayMongoService;
use App\Traits\ActivityLogsTrait;
use App\Traits\NotificationTrait;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class BillingsController extends Controller
{
    use ActivityLogsTrait, NotificationTrait;

    protected $billingService;
    protected $payMongoService;

    public function __construct(BillingService $billingService, PayMongoService $payMongoService)
    {
        $this->billingService = $billingService;
        $this->payMongoService = $payMongoService;
    }

    public function index(Request $request)
    {
        $tab = $request->get('tab', 'billings');
        
        $data = $this->billingService->getBillingsData();
        
        // Get transactions data if on transactions tab
        if ($tab === 'transactions') {
            $transactionsData = $this->billingService->getTransactionsData();
            $data = array_merge($data, $transactionsData);
        }
        
        // Get all projects for filter dropdown
        // Exclude projects where all billings are fully paid (done with client payment)
        // A project is excluded if it has billings AND all of them have status = 'paid'
        $projects = Project::with(['milestones:id,project_id,name,billing_percentage', 'billings:id,project_id,status'])
            ->orderBy('project_name', 'asc')
            ->get(['id', 'project_code', 'project_name', 'billing_type', 'contract_amount']);

        // Filter out projects where all billings are paid
        $projects = $projects->filter(function ($project) {
            $billings = $project->billings;
            // Include if no billings OR if there's at least one unpaid/partial billing
            return $billings->isEmpty() || $billings->contains(function ($billing) {
                return in_array($billing->status, ['unpaid', 'partial']);
            });
        })->values();

        $data['projects'] = $projects;
        $data['tab'] = $tab;

        return Inertia::render('BillingManagement/index', $data);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'project_id' => ['required', 'exists:projects,id'],
            'billing_type' => ['required', 'in:fixed_price,milestone'],
            'milestone_id' => ['nullable', 'exists:project_milestones,id', 'required_if:billing_type,milestone'],
            'billing_amount' => ['required', 'numeric', 'min:0.01'],
            'billing_date' => ['required', 'date'],
            'due_date' => ['nullable', 'date', 'after_or_equal:billing_date'],
            'description' => ['nullable', 'string'],
        ]);

        // Get project
        $project = Project::findOrFail($validated['project_id']);

        // Verify billing type matches project billing type
        if ($project->billing_type !== $validated['billing_type']) {
            return back()->with('error', 'Billing type does not match project billing type.');
        }

        // For milestone-based, verify milestone belongs to project and calculate amount
        if ($validated['billing_type'] === 'milestone' && $validated['milestone_id']) {
            $milestone = ProjectMilestone::where('id', $validated['milestone_id'])
                ->where('project_id', $validated['project_id'])
                ->first();
            
            if (!$milestone) {
                return back()->with('error', 'Milestone does not belong to this project.');
            }

            // Calculate billing amount based on milestone percentage if not provided or if it should be recalculated
            if ($milestone->billing_percentage && $project->contract_amount) {
                $calculatedAmount = ($project->contract_amount * $milestone->billing_percentage) / 100;
                // Use calculated amount if user didn't provide a different amount, or validate it's close to calculated
                if (empty($validated['billing_amount']) || abs($validated['billing_amount'] - $calculatedAmount) < 0.01) {
                    $validated['billing_amount'] = $calculatedAmount;
                }
            }
        }

        // Validate billing amount against contract amount
        if ($validated['billing_type'] === 'fixed_price') {
            // For fixed price, check if billing amount exceeds contract amount
            if ($validated['billing_amount'] > $project->contract_amount) {
                return back()->with('error', 'Billing amount cannot exceed contract amount (' . number_format($project->contract_amount, 2) . ').');
            }

            // Check total existing billings + new billing doesn't exceed contract amount
            $totalBilled = Billing::where('project_id', $project->id)
                ->where('billing_type', 'fixed_price')
                ->sum('billing_amount');
            
            if (($totalBilled + $validated['billing_amount']) > $project->contract_amount) {
                $remaining = $project->contract_amount - $totalBilled;
                return back()->with('error', 'Total billings would exceed contract amount. Remaining billable amount: ' . number_format($remaining, 2) . '.');
            }
        }

        $validated['billing_code'] = $this->billingService->generateBillingCode();
        $validated['status'] = 'unpaid';
        $validated['created_by'] = auth()->id();

        $billing = Billing::create($validated);

        $this->adminActivityLogs(
            'Billing',
            'Created',
            'Created billing "' . $billing->billing_code . '" for project "' . $project->project_name . '"'
        );

        // System-wide notification for new billing
        $this->createSystemNotification(
            'general',
            'New Billing Created',
            "A new billing '{$billing->billing_code}' (₱" . number_format($billing->billing_amount, 2) . ") has been created for project '{$project->project_name}'.",
            $project,
            route('billing-management.show', $billing->id)
        );

        return back()->with('success', 'Billing created successfully.');
    }

    public function update(Request $request, Billing $billing)
    {
        // Cannot update if fully paid
        if ($billing->status === 'paid') {
            return back()->with('error', 'Cannot update a fully paid billing.');
        }

        $validated = $request->validate([
            'billing_amount' => ['required', 'numeric', 'min:0.01'],
            'billing_date' => ['required', 'date'],
            'due_date' => ['nullable', 'date', 'after_or_equal:billing_date'],
            'description' => ['nullable', 'string'],
        ]);

        // For fixed_price, billing amount should not be changed
        if ($billing->billing_type === 'fixed_price') {
            $validated['billing_amount'] = $billing->billing_amount;
        }

        // Ensure new billing amount is not less than total paid
        $totalPaid = $billing->total_paid;
        if ($validated['billing_amount'] < $totalPaid) {
            return back()->with('error', 'Billing amount cannot be less than total paid amount (' . number_format($totalPaid, 2) . ').');
        }

        $billing->update($validated);

        // Recalculate status after update
        $this->billingService->calculateBillingStatus($billing);
        $billing->refresh();
        $project = $billing->project;

        $this->adminActivityLogs(
            'Billing',
            'Updated',
            'Updated billing "' . $billing->billing_code . '"'
        );

        // System-wide notification for billing update
        $this->createSystemNotification(
            'general',
            'Billing Updated',
            "Billing '{$billing->billing_code}' has been updated" . ($project ? " for project '{$project->project_name}'" : "") . ".",
            $project,
            route('billing-management.show', $billing->id)
        );

        return back()->with('success', 'Billing updated successfully.');
    }

    public function destroy(Billing $billing)
    {
        // Allow deletion even if paid, but preserve transaction records
        $billingCode = $billing->billing_code;
        $paymentCount = $billing->payments()->count();
        
        // IMPORTANT: Manually set billing_id to null for all payments BEFORE deleting the billing
        // This ensures transactions are preserved even if foreign key constraint fails
        if ($paymentCount > 0) {
            BillingPayment::where('billing_id', $billing->id)
                ->update(['billing_id' => null]);
        }
        
        // Now delete the billing
        $project = $billing->project;
        $billing->delete();

        $this->adminActivityLogs(
            'Billing',
            'Deleted',
            'Deleted billing "' . $billingCode . '"' . ($paymentCount > 0 ? ' (preserved ' . $paymentCount . ' transaction record(s))' : '')
        );

        // System-wide notification for billing deletion
        $this->createSystemNotification(
            'general',
            'Billing Deleted',
            "Billing '{$billingCode}' has been deleted" . ($project ? " for project '{$project->project_name}'" : "") . ".",
            $project,
            route('billing-management.index')
        );

        return back()->with('success', 'Billing deleted successfully.' . ($paymentCount > 0 ? ' Transaction records have been preserved.' : ''));
    }

    public function show(Billing $billing)
    {
        $billing = $this->billingService->getBillingDetails($billing);

        return Inertia::render('BillingManagement/ViewBilling', [
            'billing' => $billing,
        ]);
    }

    public function addPayment(Request $request, Billing $billing)
    {
        // Cannot add payment if already fully paid
        if ($billing->status === 'paid') {
            return back()->with('error', 'This billing is already fully paid.');
        }

        $validated = $request->validate([
            'payment_amount' => ['required', 'numeric', 'min:0.01'],
            'payment_date' => ['required', 'date'],
            'payment_method' => ['required', 'in:cash,check,bank_transfer,credit_card,paymongo,other'],
            'reference_number' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string'],
            'use_paymongo' => ['nullable', 'boolean'],
        ]);

        // Check if payment amount exceeds remaining amount
        $remainingAmount = $billing->remaining_amount;
        if ($validated['payment_amount'] > $remainingAmount) {
            return back()->with('error', 'Payment amount cannot exceed remaining amount (' . number_format($remainingAmount, 2) . ').');
        }

        $validated['billing_id'] = $billing->id;
        $validated['payment_code'] = $this->billingService->generatePaymentCode();
        $validated['created_by'] = auth()->id();
        $validated['paid_by_client'] = false;

        // Handle PayMongo payment
        if ($request->boolean('use_paymongo') && $validated['payment_method'] === 'paymongo') {
            $payMongoResult = $this->payMongoService->createPaymentIntent(
                (float)$validated['payment_amount'],
                'PHP',
                [
                    'billing_id' => $billing->id,
                    'billing_code' => $billing->billing_code,
                    'payment_code' => $validated['payment_code'],
                    'admin_id' => auth()->id(),
                ]
            );

            if (!$payMongoResult['success']) {
                return back()->with('error', 'Failed to create PayMongo payment: ' . ($payMongoResult['error'] ?? 'Unknown error'));
            }

            $validated['paymongo_payment_intent_id'] = $payMongoResult['payment_intent_id'];
            $validated['payment_status'] = 'pending';
            $validated['paymongo_metadata'] = [
                'client_key' => $payMongoResult['client_key'] ?? null,
                'created_at' => now()->toIso8601String(),
            ];
        } else {
            // Manual payment - mark as paid immediately
            $validated['payment_status'] = 'paid';
        }

        $payment = BillingPayment::create($validated);

        // Update billing status after payment
        $this->billingService->calculateBillingStatus($billing);
        $billing->refresh();
        $project = $billing->project;

        $this->adminActivityLogs(
            'Billing Payment',
            'Created',
            'Recorded payment "' . $payment->payment_code . '" of ' . number_format((float)$payment->payment_amount, 2) . ' for billing "' . $billing->billing_code . '"'
        );

        // System-wide notification for payment received
        if ($project) {
            $status = $billing->status === 'paid' ? 'fully paid' : 'partially paid';
            $this->createSystemNotification(
                'general',
                'Payment Received',
                "Payment of ₱" . number_format((float)$payment->payment_amount, 2) . " has been received for billing '{$billing->billing_code}'. Billing is now {$status}.",
                $project,
                route('billing-management.show', $billing->id)
            );
        }

        return back()->with('success', 'Payment recorded successfully.');
    }
}

