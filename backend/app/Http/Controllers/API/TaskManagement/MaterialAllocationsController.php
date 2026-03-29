<?php

namespace App\Http\Controllers\Api\TaskManagement;

use App\Http\Controllers\Controller;
use App\Models\InventoryTransaction;
use App\Models\Project;
use App\Models\ProjectMaterialAllocation;
use App\Services\InventoryService;
use App\Services\TaskManagementAuthorization;
use Illuminate\Http\Request;

class MaterialAllocationsController extends Controller
{
    public function __construct(protected InventoryService $inventoryService) {}

    public function index(Request $request, Project $project)
    {
        $user  = $request->user();
        $authz = app(TaskManagementAuthorization::class);

        if (!$authz->isAssignedToProject($user, $project)) {
            return response()->json(['success' => false, 'message' => 'Project not found or you do not have access to it'], 404);
        }

        $allocations = ProjectMaterialAllocation::query()
            ->where('project_id', $project->id)
            ->with(['inventoryItem', 'directSupply', 'receivingReports.receivedBy', 'milestoneUsages'])
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn (ProjectMaterialAllocation $a) => $this->formatAllocation($a));

        return response()->json(['success' => true, 'data' => $allocations]);
    }

    public function storeReceivingReport(Request $request, Project $project, ProjectMaterialAllocation $allocation)
    {
        $user  = $request->user();
        $authz = app(TaskManagementAuthorization::class);

        if ($allocation->project_id !== $project->id || !$authz->isAssignedToProject($user, $project)) {
            return response()->json(['success' => false, 'message' => 'Allocation not found or you do not have access'], 404);
        }

        $remaining = $allocation->quantity_allocated - $allocation->quantity_received;

        $data = $request->validate([
            'quantity_received' => [
                'nullable', 'numeric', 'min:0.01',
                function ($attribute, $value, $fail) use ($remaining) {
                    if ($value === null) return;
                    if ($value > $remaining) {
                        $fail("Quantity received cannot exceed remaining quantity ({$remaining}).");
                    }
                },
            ],
            'condition'   => ['nullable', 'string', 'max:255'],
            'notes'       => ['nullable', 'string'],
            'received_at' => ['nullable', 'date'],
        ]);

        if (empty($data['quantity_received'])) {
            $data['quantity_received'] = $remaining;
        }

        $data['received_by'] = $user->id;
        $data['received_at'] = $data['received_at'] ?? now();

        $receivingReport = $allocation->receivingReports()->create($data);

        // Only create inventory transaction for inventory-based allocations
        if ($allocation->inventory_item_id) {
            $inventoryItem = $allocation->inventoryItem;
            InventoryTransaction::create([
                'inventory_item_id'              => $inventoryItem->id,
                'transaction_type'               => 'stock_out',
                'stock_out_type'                 => 'project_use',
                'quantity'                       => $data['quantity_received'],
                'project_id'                     => $project->id,
                'project_material_allocation_id' => $allocation->id,
                'notes'                          => '[RECEIVING_REPORT_ID:' . $receivingReport->id . '] Stock removed via receiving report (mobile)'
                                                   . ($data['notes'] ? ' - ' . $data['notes'] : ''),
                'created_by'                     => $user->id,
                'transaction_date'               => $data['received_at'],
            ]);
            $this->inventoryService->updateItemStock($inventoryItem);
        }

        $allocation->quantity_received += $data['quantity_received'];
        $allocation->updateStatus();

        $allocation->refresh()->load(['inventoryItem', 'directSupply', 'receivingReports.receivedBy', 'milestoneUsages']);

        return response()->json([
            'success' => true,
            'message' => 'Receiving report submitted successfully.',
            'data'    => $this->formatAllocation($allocation),
        ]);
    }

    private function formatAllocation(ProjectMaterialAllocation $a): array
    {
        $isDs      = (bool) $a->direct_supply_id;
        $item      = $a->inventoryItem;
        $ds        = $a->directSupply;
        $totalUsed = $a->relationLoaded('milestoneUsages') ? (float) $a->milestoneUsages->sum('quantity_used') : 0.0;
        $received  = (float) $a->quantity_received;
        $allocated = (float) $a->quantity_allocated;
        $available = max(0, $received - $totalUsed);

        return [
            'id'                => $a->id,
            'isDirect'          => $isDs,
            'itemName'          => $isDs ? ($ds?->supply_name ?? 'Direct Supply') : ($item?->item_name ?? 'Unknown'),
            'itemCode'          => $isDs ? ($ds?->supply_code ?? '---') : ($item?->item_code ?? '---'),
            'unit'              => $isDs ? ($ds?->unit_of_measure ?? 'units') : ($item?->unit_of_measure ?? 'units'),
            'quantityAllocated' => $allocated,
            'quantityReceived'  => $received,
            'quantityRemaining' => max(0, $allocated - $received),
            'totalUsed'         => $totalUsed,
            'available'         => $available,
            'status'            => $a->status,
            'notes'             => $a->notes,
            'receivingReports'  => $a->receivingReports->map(fn ($r) => [
                'id'               => $r->id,
                'quantityReceived' => (float) $r->quantity_received,
                'condition'        => $r->condition,
                'notes'            => $r->notes,
                'receivedAt'       => $r->received_at?->toISOString(),
                'receivedBy'       => $r->receivedBy?->name,
            ])->values(),
        ];
    }
}
