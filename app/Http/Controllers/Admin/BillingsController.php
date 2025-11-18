<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Billing;
use App\Models\BillingPayment;
use App\Models\Project;
use App\Models\ProjectMilestone;
use App\Services\BillingService;
use App\Traits\ActivityLogsTrait;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class BillingsController extends Controller
{
    use ActivityLogsTrait;

    protected $billingService;

    public function __construct(BillingService $billingService)
    {
        $this->billingService = $billingService;
    }

    public function index(Request $request)
    {
        $data = $this->billingService->getBillingsData();
        
        // Get all billable projects for filter dropdown
        $projects = Project::where('is_billable', true)
            ->with('milestones:id,project_id,name')
            ->orderBy('project_name', 'asc')
            ->get(['id', 'project_code', 'project_name', 'billing_type']);

        $data['projects'] = $projects;

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

        // Verify project is billable
        $project = Project::findOrFail($validated['project_id']);
        if (!$project->is_billable) {
            return back()->with('error', 'This project is not billable.');
        }

        // Verify billing type matches project billing type
        if ($project->billing_type !== $validated['billing_type']) {
            return back()->with('error', 'Billing type does not match project billing type.');
        }

        // For milestone-based, verify milestone belongs to project
        if ($validated['billing_type'] === 'milestone' && $validated['milestone_id']) {
            $milestone = ProjectMilestone::where('id', $validated['milestone_id'])
                ->where('project_id', $validated['project_id'])
                ->first();
            
            if (!$milestone) {
                return back()->with('error', 'Milestone does not belong to this project.');
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

        // Ensure new billing amount is not less than total paid
        $totalPaid = $billing->total_paid;
        if ($validated['billing_amount'] < $totalPaid) {
            return back()->with('error', 'Billing amount cannot be less than total paid amount (' . number_format($totalPaid, 2) . ').');
        }

        $billing->update($validated);

        // Recalculate status after update
        $this->billingService->calculateBillingStatus($billing);

        $this->adminActivityLogs(
            'Billing',
            'Updated',
            'Updated billing "' . $billing->billing_code . '"'
        );

        return back()->with('success', 'Billing updated successfully.');
    }

    public function destroy(Billing $billing)
    {
        // Cannot delete if has payments
        if ($billing->payments()->count() > 0) {
            return back()->with('error', 'Cannot delete billing with existing payments. Please delete payments first.');
        }

        $billingCode = $billing->billing_code;
        $billing->delete();

        $this->adminActivityLogs(
            'Billing',
            'Deleted',
            'Deleted billing "' . $billingCode . '"'
        );

        return back()->with('success', 'Billing deleted successfully.');
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
            'payment_method' => ['required', 'in:cash,check,bank_transfer,credit_card,other'],
            'reference_number' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string'],
        ]);

        // Check if payment amount exceeds remaining amount
        $remainingAmount = $billing->remaining_amount;
        if ($validated['payment_amount'] > $remainingAmount) {
            return back()->with('error', 'Payment amount cannot exceed remaining amount (' . number_format($remainingAmount, 2) . ').');
        }

        $validated['billing_id'] = $billing->id;
        $validated['payment_code'] = $this->billingService->generatePaymentCode();
        $validated['created_by'] = auth()->id();

        $payment = BillingPayment::create($validated);

        // Update billing status after payment
        $this->billingService->calculateBillingStatus($billing);

        $this->adminActivityLogs(
            'Billing Payment',
            'Created',
            'Recorded payment "' . $payment->payment_code . '" of ' . number_format($payment->payment_amount, 2) . ' for billing "' . $billing->billing_code . '"'
        );

        return back()->with('success', 'Payment recorded successfully.');
    }
}

