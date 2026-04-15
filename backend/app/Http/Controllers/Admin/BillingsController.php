<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Billing;
use App\Models\BillingPayment;
use App\Models\ClientPortalSetting;
use App\Models\Project;
use App\Models\ProjectMilestone;
use App\Models\User;
use App\Services\BillingService;
use App\Services\PayMongoService;
use App\Traits\ActivityLogsTrait;
use App\Traits\ClientNotificationTrait;
use App\Traits\NotificationTrait;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class BillingsController extends Controller
{
    use ActivityLogsTrait, ClientNotificationTrait, NotificationTrait;

    protected $billingService;
    protected $payMongoService;

    public function __construct(BillingService $billingService, PayMongoService $payMongoService)
    {
        $this->billingService = $billingService;
        $this->payMongoService = $payMongoService;
    }

    // ── Index ────────────────────────────────────────────────────────────────

    public function index(Request $request)
    {
        $tab = $request->get('tab', 'billings');

        $data = $this->billingService->getBillingsData();

        if ($tab === 'transactions') {
            $transactionsData = $this->billingService->getTransactionsData();
            $data = array_merge($data, $transactionsData);
        }

        // All active projects are available for billing — no cap enforcement.
        $projects = Project::with(['milestones:id,project_id,name,billing_percentage'])
            ->withSum(['billings as total_billed' => function ($q) {
                $q->whereNull('archived_at');
            }], 'billing_amount')
            ->withSum(['billings as total_paid' => function ($q) {
                $q->whereNull('archived_at')
                  ->whereHas('payments', fn($p) => $p->where('payment_status', 'paid'));
            }], 'billing_amount')
            ->whereNull('archived_at')
            ->orderBy('project_name', 'asc')
            ->get(['id', 'project_code', 'project_name', 'contract_amount'])
            ->map(function ($project) {
                $contract    = (float) $project->contract_amount;
                $totalBilled = (float) ($project->total_billed ?? 0);
                $project->remaining_billable = $contract > 0 ? $contract - $totalBilled : null;
                $project->variance           = $totalBilled - $contract;
                return $project;
            })
            ->values();

        $data['projects'] = $projects;
        $data['tab'] = $tab;
        $data['display_billing_in_client_app'] = ClientPortalSetting::displayBillingModule();

        return Inertia::render('BillingManagement/index', $data);
    }

    /**
     * Update whether the billing module is displayed in the client app.
     */
    public function updateClientPortalBillingDisplay(Request $request)
    {
        $request->validate([
            'display_billing_module' => ['required', 'boolean'],
        ]);

        ClientPortalSetting::setDisplayBillingModule((bool) $request->display_billing_module);

        $this->adminActivityLogs(
            'Billing',
            'Updated Client Portal Billing Display',
            'Client portal billing display was set to ' . ($request->display_billing_module ? 'enabled' : 'disabled') . '.'
        );

        return redirect()->back()->with('success', 'Client portal billing setting updated successfully.');
    }

    // ── Archived index ───────────────────────────────────────────────────────

    public function archived(Request $request)
    {
        $search  = $request->get('search', '');
        $sortBy  = $request->get('sort_by', 'archived_at');
        $sortOrder = $request->get('sort_order', 'desc');

        $query = Billing::archived()
            ->with(['project:id,project_code,project_name', 'project.client:id,client_name', 'milestone:id,name'])
            ->when($search, function ($q) use ($search) {
                $q->where(function ($q2) use ($search) {
                    $q2->where('billing_code', 'like', "%{$search}%")
                       ->orWhereHas('project', fn($p) => $p->where('project_name', 'like', "%{$search}%")
                                                            ->orWhere('project_code', 'like', "%{$search}%"));
                });
            })
            ->orderBy($sortBy, $sortOrder);

        $billings = $query->paginate(15)->withQueryString();

        return Inertia::render('BillingManagement/archived', [
            'billings' => $billings,
            'search'   => $search,
            'sort_by'  => $sortBy,
            'sort_order' => $sortOrder,
        ]);
    }

    // ── Store ────────────────────────────────────────────────────────────────

    public function store(Request $request)
    {
        $validated = $request->validate([
            'project_id'     => ['required', 'exists:projects,id'],
            'milestone_id'   => ['nullable', 'exists:project_milestones,id'],
            'billing_amount' => ['required', 'numeric', 'min:0.01'],
            'billing_date'   => ['required', 'date'],
            'due_date'       => ['nullable', 'date', 'after_or_equal:billing_date'],
            'description'    => ['nullable', 'string'],
        ]);

        $project = Project::findOrFail($validated['project_id']);

        if ($validated['milestone_id']) {
            $milestone = ProjectMilestone::where('id', $validated['milestone_id'])
                ->where('project_id', $validated['project_id'])
                ->first();

            if (!$milestone) {
                return back()->with('error', 'Milestone does not belong to this project.');
            }
        }

        // Soft warning: check if billing exceeds contract amount (non-blocking)
        $warning = null;
        if ($project->contract_amount > 0) {
            $totalBilled = Billing::where('project_id', $project->id)
                ->whereNull('archived_at')
                ->sum('billing_amount');

            $newTotal = $totalBilled + $validated['billing_amount'];
            if ($newTotal > $project->contract_amount) {
                $over = $newTotal - $project->contract_amount;
                $warning = 'Billing created. Note: total billed (₱' . number_format($newTotal, 2) . ') now exceeds contract amount (₱' . number_format($project->contract_amount, 2) . ') by ₱' . number_format($over, 2) . '.';
            }
        }

        $validated['billing_code'] = $this->billingService->generateBillingCode();
        $validated['status']       = 'unpaid';
        $validated['created_by']   = auth()->id();

        $billing = Billing::create($validated);

        $this->adminActivityLogs('Billing', 'Created',
            'Created billing "' . $billing->billing_code . '" for project "' . $project->project_name . '"');

        $this->notifyBillingCreated($project, $billing->billing_code, '₱' . number_format($billing->billing_amount, 2));

        $this->createSystemNotification('general', 'New Billing Created',
            "A new billing '{$billing->billing_code}' (₱" . number_format($billing->billing_amount, 2) . ") has been created for project '{$project->project_name}'.",
            $project, route('billing-management.show', $billing->id));

        if ($warning) {
            return back()->with('success', 'Billing created successfully.')->with('warning', $warning);
        }

        return back()->with('success', 'Billing created successfully.');
    }

    // ── Update ───────────────────────────────────────────────────────────────

    public function update(Request $request, Billing $billing)
    {
        if ($billing->status === 'paid') {
            return back()->with('error', 'Cannot update a fully paid billing.');
        }

        $validated = $request->validate([
            'billing_amount' => ['required', 'numeric', 'min:0.01'],
            'billing_date'   => ['required', 'date'],
            'due_date'       => ['nullable', 'date', 'after_or_equal:billing_date'],
            'description'    => ['nullable', 'string'],
        ]);

        $totalPaid = $billing->total_paid;
        if ($validated['billing_amount'] < $totalPaid) {
            return back()->with('error', 'Billing amount cannot be less than total paid amount (₱' . number_format($totalPaid, 2) . ').');
        }

        $billing->update($validated);
        $this->billingService->calculateBillingStatus($billing);
        $billing->refresh();
        $project = $billing->project;

        $this->adminActivityLogs('Billing', 'Updated', 'Updated billing "' . $billing->billing_code . '"');

        $this->createSystemNotification('general', 'Billing Updated',
            "Billing '{$billing->billing_code}' has been updated" . ($project ? " for project '{$project->project_name}'" : "") . ".",
            $project, route('billing-management.show', $billing->id));

        // Soft warning if updated amount exceeds contract
        $warning = null;
        if ($project && $project->contract_amount > 0) {
            $totalBilled = Billing::where('project_id', $project->id)
                ->whereNull('archived_at')
                ->sum('billing_amount');
            if ($totalBilled > $project->contract_amount) {
                $over = $totalBilled - $project->contract_amount;
                $warning = 'Billing updated. Note: total billed (₱' . number_format($totalBilled, 2) . ') exceeds contract amount (₱' . number_format($project->contract_amount, 2) . ') by ₱' . number_format($over, 2) . '.';
            }
        }

        if ($warning) {
            return back()->with('success', 'Billing updated successfully.')->with('warning', $warning);
        }

        return back()->with('success', 'Billing updated successfully.');
    }

    // ── Archive ──────────────────────────────────────────────────────────────
    // Only fully-paid billings can be archived.

    public function archive(Billing $billing)
    {
        if ($billing->status !== 'paid') {
            return back()->with('error', 'Only fully paid billings can be archived.');
        }

        $billing->archive();

        $this->adminActivityLogs('Billing', 'Archived', 'Archived billing "' . $billing->billing_code . '"');

        return back()->with('success', 'Billing "' . $billing->billing_code . '" has been archived.');
    }

    // ── Unarchive ────────────────────────────────────────────────────────────

    public function unarchive(Billing $billing)
    {
        if (!$billing->is_archived) {
            return back()->with('error', 'Billing is not archived.');
        }

        $billing->unarchive();

        $this->adminActivityLogs('Billing', 'Unarchived', 'Unarchived billing "' . $billing->billing_code . '"');

        return back()->with('success', 'Billing "' . $billing->billing_code . '" has been restored.');
    }

    // ── Show ─────────────────────────────────────────────────────────────────

    public function show(Billing $billing)
    {
        $billing = $this->billingService->getBillingDetails($billing);

        return Inertia::render('BillingManagement/ViewBilling', [
            'billing' => $billing,
        ]);
    }

    // ── Add Payment ──────────────────────────────────────────────────────────

    public function addPayment(Request $request, Billing $billing)
    {
        if ($billing->status === 'paid') {
            return back()->with('error', 'This billing is already fully paid.');
        }

        $validated = $request->validate([
            'payment_amount'   => ['required', 'numeric', 'min:0.01'],
            'payment_date'     => ['required', 'date'],
            'payment_method'   => ['required', 'in:cash,check,bank_transfer,credit_card,paymongo,other'],
            'reference_number' => ['nullable', 'string', 'max:255'],
            'notes'            => ['nullable', 'string'],
            'use_paymongo'     => ['nullable', 'boolean'],
        ]);

        $remainingAmount = $billing->remaining_amount;
        if ($validated['payment_amount'] > $remainingAmount) {
            return back()->with('error', 'Payment amount cannot exceed remaining amount (₱' . number_format($remainingAmount, 2) . ').');
        }

        $validated['billing_id']     = $billing->id;
        $validated['payment_code']   = $this->billingService->generatePaymentCode();
        $validated['created_by']     = auth()->id();
        $validated['paid_by_client'] = false;

        if ($request->boolean('use_paymongo') && $validated['payment_method'] === 'paymongo') {
            $payMongoResult = $this->payMongoService->createPaymentIntent(
                (float) $validated['payment_amount'], 'PHP',
                [
                    'billing_id'   => $billing->id,
                    'billing_code' => $billing->billing_code,
                    'payment_code' => $validated['payment_code'],
                    'admin_id'     => auth()->id(),
                ]
            );

            if (!$payMongoResult['success']) {
                return back()->with('error', 'Failed to create PayMongo payment: ' . ($payMongoResult['error'] ?? 'Unknown error'));
            }

            $validated['paymongo_payment_intent_id'] = $payMongoResult['payment_intent_id'];
            if (empty($validated['reference_number'])) {
                $validated['reference_number'] = $payMongoResult['payment_intent_id'];
            }
            $validated['payment_status']    = 'pending';
            $validated['paymongo_metadata'] = [
                'client_key' => $payMongoResult['client_key'] ?? null,
                'created_at' => now()->toIso8601String(),
            ];
        } else {
            $validated['payment_status'] = 'paid';
        }

        $payment = BillingPayment::create($validated);

        $this->billingService->calculateBillingStatus($billing);
        $billing->refresh();
        $project = $billing->project;

        $this->adminActivityLogs('Billing Payment', 'Created',
            'Recorded payment "' . $payment->payment_code . '" of ₱' . number_format((float) $payment->payment_amount, 2) . ' for billing "' . $billing->billing_code . '"');

        if ($project) {
            $this->notifyPaymentReceived($project, $billing->billing_code, '₱' . number_format((float) $payment->payment_amount, 2));

            $status = $billing->status === 'paid' ? 'fully paid' : 'partially paid';
            $this->createSystemNotification('general', 'Payment Received',
                "Payment of ₱" . number_format((float) $payment->payment_amount, 2) . " has been received for billing '{$billing->billing_code}'. Billing is now {$status}.",
                $project, route('billing-management.show', $billing->id));
        }

        return back()->with('success', 'Payment recorded successfully.');
    }

    public function destroy(Billing $billing)
{
    // Prevent deleting if not unpaid
    if ($billing->status !== 'unpaid') {
        return back()->with('error', 'Only unpaid billings can be deleted.');
    }

    // Safety check if payments exist
    if ($billing->payments()->exists()) {
        return back()->with('error', 'Cannot delete billing that already has payments.');
    }

    $billingCode = $billing->billing_code;
    $projectName = $billing->project?->project_name;

    $billing->delete();

    $this->adminActivityLogs(
        'Billing',
        'Deleted',
        'Deleted billing "' . $billingCode . '"' . ($projectName ? ' from project "' . $projectName . '"' : '')
    );

    return back()->with('success', 'Billing "' . $billingCode . '" deleted successfully.');
}
}