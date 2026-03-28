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

    /**
     * List material allocations for a project with their receiving reports.
     */
    public function index(Request $request, Project $project)
    {
        $user  = $request->user();
        $authz = app(TaskManagementAuthorization::class);

        if (!$authz->isAssignedToProject($user, $project)) {
            return response()->json(['success' => false, 'message' => 'Project not found or you do not have access to it'], 404);
        }

        $allocations = ProjectMaterialAllocation::query()
            ->where('project_id', $project->id)
            ->with(['inventoryItem', 'receivingReports.receivedBy'])
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn (ProjectMaterialAllocation $a) => $this->formatAllocation($a));

        return response()->json(['success' => true, 'data' => $allocations]);
    }

    /**
     * Submit a receiving report — mirrors admin storeReceivingReport exactly.
     */
    public function storeReceivingReport(Request $request, Project $project, ProjectMaterialAllocation $allocation)
    {
        $user  = $request->user();
        $authz = app(TaskManagementAuthorization::class);

        if ($allocation->project_id !== $project->id || !$authz->isAssignedToProject($user, $project)) {
            return response()->json(['success' => false, 'message' => 'Allocation not found or you do not have access'], 404);
        }

        $data = $request->validate([
            'quantity_received' => [
                'nullable', 'numeric', 'min:0.01',
                function ($attribute, $value, $fail) use ($allocation) {
                    if ($value === null) return; // will default to remaining
                    $remaining = $allocation->quantity_allocated - $allocation->quantity_received;
                    if ($value > $remaining) {
                        $fail("Quantity received cannot exceed remaining quantity ({$remaining}).");
                    }
                },
            ],
            'condition'   => ['nullable', 'string', 'max:255'],
            'notes'       => ['nullable', 'string'],
            'received_at' => ['nullable', 'date'],
        ]);

        // Default to full remaining quantity if not provided
        if (empty($data['quantity_received'])) {
            $data['quantity_received'] = $allocation->quantity_allocated - $allocation->quantity_received;
        }

        $data['received_by'] = $user->id;
        $data['received_at'] = $data['received_at'] ?? now();

        $receivingReport = $allocation->receivingReports()->create($data);

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

        $allocation->quantity_received += $data['quantity_received'];
        $allocation->updateStatus();

        $allocation->refresh()->load(['inventoryItem', 'receivingReports.receivedBy']);

        return response()->json([
            'success' => true,
            'message' => 'Receiving report submitted successfully.',
            'data'    => $this->formatAllocation($allocation),
        ]);
    }

    private function formatAllocation(ProjectMaterialAllocation $a): array
    {
        $item      = $a->inventoryItem;
        $remaining = (float) $a->quantity_allocated - (float) $a->quantity_received;

        return [
            'id'                => $a->id,
            'itemName'          => $item?->item_name,
            'itemCode'          => $item?->item_code,
            'unit'              => $item?->unit_of_measure,
            'quantityAllocated' => (float) $a->quantity_allocated,
            'quantityReceived'  => (float) $a->quantity_received,
            'quantityRemaining' => max(0, $remaining),
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
