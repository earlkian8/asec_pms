<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\ProjectMaterialAllocation;
use App\Models\MaterialReceivingReport;
use App\Models\InventoryTransaction;
use App\Models\InventoryItem;
use App\Models\User;
use App\Services\InventoryService;
use App\Traits\ActivityLogsTrait;
use App\Traits\ClientNotificationTrait;
use App\Traits\NotificationTrait;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ProjectMaterialAllocationsController extends Controller
{
    use ActivityLogsTrait, ClientNotificationTrait, NotificationTrait;

    protected $inventoryService;

    public function __construct(InventoryService $inventoryService)
    {
        $this->inventoryService = $inventoryService;
    }

    // Store receiving report
    public function storeReceivingReport(Project $project, Request $request, ProjectMaterialAllocation $allocation)
    {
        $data = $request->validate([
            'quantity_received' => [
                'required',
                'numeric',
                'min:0.01',
                function ($attribute, $value, $fail) use ($allocation) {
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

        $data['received_by'] = auth()->id();
        $data['received_at'] = $data['received_at'] ?? now();

        $receivingReport = $allocation->receivingReports()->create($data);

        // Only deduct inventory stock for inventory-based allocations
        if ($allocation->inventory_item_id) {
            $inventoryItem = $allocation->inventoryItem;
            InventoryTransaction::create([
                'inventory_item_id'               => $inventoryItem->id,
                'transaction_type'                => 'stock_out',
                'stock_out_type'                  => 'project_use',
                'quantity'                        => $data['quantity_received'],
                'project_id'                      => $project->id,
                'project_material_allocation_id'  => $allocation->id,
                'notes'                           => '[RECEIVING_REPORT_ID:' . $receivingReport->id . '] Stock removed via receiving report' . ($data['notes'] ? ' - ' . $data['notes'] : ''),
                'created_by'                      => auth()->id(),
                'transaction_date'                => $data['received_at'],
            ]);
            $this->inventoryService->updateItemStock($inventoryItem);
            $itemName = $inventoryItem->item_name;
            $itemUnit = $inventoryItem->unit_of_measure;
        } else {
            $directSupply = $allocation->directSupply;
            $itemName = $directSupply->supply_name ?? 'Direct Supply';
            $itemUnit = $directSupply->unit_of_measure ?? 'units';
        }

        $allocation->quantity_received += $data['quantity_received'];
        $allocation->updateStatus();

        $this->notifyMaterialStatusChange($project, $itemName, $allocation->status);

        $this->adminActivityLogs(
            'Material Receiving Report',
            'Created',
            'Created receiving report for "' . $itemName . '" - ' . $data['quantity_received'] . ' ' . $itemUnit . ' received for project "' . $project->project_name . '"'
        );

        $this->createSystemNotification(
            'general',
            'Material Received',
            "Material '{$itemName}' ({$data['quantity_received']} {$itemUnit}) has been received for project '{$project->project_name}'.",
            $project,
            route('project-management.view', $project->id)
        );

        return back()->with('success', 'Receiving report created successfully.');
    }

    // Update receiving report
    public function updateReceivingReport(Project $project, Request $request, ProjectMaterialAllocation $allocation, MaterialReceivingReport $receivingReport)
    {
        $data = $request->validate([
            'quantity_received' => [
                'required',
                'numeric',
                'min:0.01',
                function ($attribute, $value, $fail) use ($allocation, $receivingReport) {
                    $currentReceived = $allocation->quantity_received - $receivingReport->quantity_received;
                    $remaining       = $allocation->quantity_allocated - $currentReceived;
                    if ($value > $remaining) {
                        $fail("Quantity received cannot exceed remaining quantity ({$remaining}).");
                    }
                },
            ],
            'condition'   => ['nullable', 'string', 'max:255'],
            'notes'       => ['nullable', 'string'],
            'received_at' => ['nullable', 'date'],
        ]);

        $oldQuantity = $receivingReport->quantity_received;
        $allocation->quantity_received -= $oldQuantity;

        $receivingReport->update($data);

        if ($allocation->inventory_item_id) {
            $inventoryItem       = $allocation->inventoryItem;
            $stockOutTransaction = InventoryTransaction::where('project_material_allocation_id', $allocation->id)
                ->where('transaction_type', 'stock_out')
                ->where('stock_out_type', 'project_use')
                ->where('notes', 'like', '%[RECEIVING_REPORT_ID:' . $receivingReport->id . ']%')
                ->first();

            if ($stockOutTransaction) {
                $stockOutTransaction->update([
                    'quantity'         => $data['quantity_received'],
                    'transaction_date' => $data['received_at'],
                    'notes'            => '[RECEIVING_REPORT_ID:' . $receivingReport->id . '] Stock removed via receiving report' . ($data['notes'] ? ' - ' . $data['notes'] : ''),
                ]);
            } else {
                InventoryTransaction::create([
                    'inventory_item_id'              => $inventoryItem->id,
                    'transaction_type'               => 'stock_out',
                    'stock_out_type'                 => 'project_use',
                    'quantity'                       => $data['quantity_received'],
                    'project_id'                     => $project->id,
                    'project_material_allocation_id' => $allocation->id,
                    'notes'                          => '[RECEIVING_REPORT_ID:' . $receivingReport->id . '] Stock removed via receiving report' . ($data['notes'] ? ' - ' . $data['notes'] : ''),
                    'created_by'                     => auth()->id(),
                    'transaction_date'               => $data['received_at'],
                ]);
            }

            $allocation->quantity_received += $data['quantity_received'];
            $allocation->updateStatus();
            $this->inventoryService->updateItemStock($inventoryItem);

            $this->adminActivityLogs(
                'Material Receiving Report',
                'Updated',
                'Updated receiving report for "' . $inventoryItem->item_name . '" for project "' . $project->project_name . '"'
            );
        } else {
            $allocation->quantity_received += $data['quantity_received'];
            $allocation->updateStatus();
            $supplyName = $allocation->directSupply->supply_name ?? 'Direct Supply';
            $this->adminActivityLogs(
                'Material Receiving Report',
                'Updated',
                'Updated receiving report for "' . $supplyName . '" for project "' . $project->project_name . '"'
            );
        }

        return back()->with('success', 'Receiving report updated successfully.');
    }

    // Delete receiving report
    public function destroyReceivingReport(Project $project, ProjectMaterialAllocation $allocation, MaterialReceivingReport $receivingReport)
    {
        if ($allocation->inventory_item_id) {
            $inventoryItem       = $allocation->inventoryItem;
            $stockOutTransaction = InventoryTransaction::where('project_material_allocation_id', $allocation->id)
                ->where('transaction_type', 'stock_out')
                ->where('stock_out_type', 'project_use')
                ->where('notes', 'like', '%[RECEIVING_REPORT_ID:' . $receivingReport->id . ']%')
                ->first();

            if ($stockOutTransaction) {
                $stockOutTransaction->delete();
            }

            $allocation->quantity_received -= $receivingReport->quantity_received;
            $allocation->updateStatus();
            $receivingReport->delete();
            $this->inventoryService->updateItemStock($inventoryItem);

            $this->adminActivityLogs(
                'Material Receiving Report',
                'Deleted',
                'Deleted receiving report for "' . $inventoryItem->item_name . '" for project "' . $project->project_name . '"'
            );
        } else {
            $allocation->quantity_received -= $receivingReport->quantity_received;
            $allocation->updateStatus();
            $receivingReport->delete();
            $supplyName = $allocation->directSupply->supply_name ?? 'Direct Supply';
            $this->adminActivityLogs(
                'Material Receiving Report',
                'Deleted',
                'Deleted receiving report for "' . $supplyName . '" for project "' . $project->project_name . '"'
            );
        }

        return back()->with('success', 'Receiving report deleted successfully.');
    }

    // Delete material allocation
    public function destroy(Project $project, ProjectMaterialAllocation $allocation)
    {
        // ── Hard guard: never allow deletion once receiving reports exist ──────
        // Once materials have started arriving, the allocation is part of the
        // audit trail and must not be removed.
        if ($allocation->receivingReports()->exists()) {
            return back()->with(
                'error',
                'This allocation cannot be deleted because it already has receiving reports. ' .
                'Please contact an administrator if you believe this is an error.'
            );
        }

        $inventoryItem = $allocation->inventoryItem;
        $itemName      = $inventoryItem ? $inventoryItem->item_name : 'Unknown Item';

        // No receiving reports exist, so we only need to clean up the original
        // allocation transaction (the stock_out created when the item was allocated).
        InventoryTransaction::where('project_material_allocation_id', $allocation->id)
            ->where('transaction_type', 'stock_out')
            ->where('stock_out_type', 'project_use')
            ->delete();

        $allocation->delete();

        $this->adminActivityLogs(
            'Material Allocation',
            'Deleted',
            'Deleted material allocation for "' . $itemName . '" from project "' . $project->project_name . '"'
        );

        return back()->with('success', 'Material allocation deleted successfully.');
    }

    public function bulkReceivingReport(Project $project, Request $request)
    {
        $request->validate([
            'received_at'                    => ['required', 'date'],
            'items'                          => ['required', 'array', 'min:1'],
            'items.*.allocation_id'          => ['required', 'exists:project_material_allocations,id'],
            'items.*.quantity_received'      => ['required', 'numeric', 'min:0.01'],
            'items.*.condition'              => ['nullable', 'string', 'max:255'],
            'items.*.notes'                  => ['nullable', 'string'],
        ]);

        $created = 0;
        $errors  = [];

        foreach ($request->items as $index => $item) {
            $allocation = ProjectMaterialAllocation::with('inventoryItem', 'directSupply')
                ->where('id', $item['allocation_id'])
                ->where('project_id', $project->id)
                ->first();

            if (!$allocation) {
                $errors["items.{$index}.allocation_id"] = 'Allocation not found or does not belong to this project.';
                continue;
            }

            $remaining = $allocation->quantity_allocated - $allocation->quantity_received;

            if ($allocation->inventory_item_id) {
                $unitOfMeasure = $allocation->inventoryItem->unit_of_measure;
            } else {
                $unitOfMeasure = $allocation->directSupply->unit_of_measure ?? 'units';
            }

            if ($item['quantity_received'] > $remaining) {
                $errors["items.{$index}.quantity_received"] =
                    "Quantity cannot exceed remaining ({$remaining} {$unitOfMeasure}).";
                continue;
            }

            $receivingReport = $allocation->receivingReports()->create([
                'quantity_received' => $item['quantity_received'],
                'condition'         => $item['condition']  ?? null,
                'notes'             => $item['notes']      ?? null,
                'received_at'       => $request->received_at,
                'received_by'       => auth()->id(),
            ]);

            if ($allocation->inventory_item_id) {
                $inventoryItem = $allocation->inventoryItem;
                $itemName      = $inventoryItem->item_name;

                InventoryTransaction::create([
                    'inventory_item_id'              => $inventoryItem->id,
                    'transaction_type'               => 'stock_out',
                    'stock_out_type'                 => 'project_use',
                    'quantity'                       => $item['quantity_received'],
                    'project_id'                     => $project->id,
                    'project_material_allocation_id' => $allocation->id,
                    'notes'                          => '[RECEIVING_REPORT_ID:' . $receivingReport->id . '] Bulk receiving report'
                                                    . ($item['notes'] ? ' - ' . $item['notes'] : ''),
                    'created_by'                     => auth()->id(),
                    'transaction_date'               => $request->received_at,
                ]);

                $this->inventoryService->updateItemStock($inventoryItem);
            } else {
                $itemName = $allocation->directSupply->supply_name ?? 'Direct Supply';
            }

            $allocation->quantity_received += $item['quantity_received'];
            $allocation->updateStatus();

            $this->notifyMaterialStatusChange($project, $itemName, $allocation->status);

            $this->adminActivityLogs(
                'Material Receiving Report',
                'Bulk Created',
                'Bulk receiving report for "' . $itemName . '" - '
                . $item['quantity_received'] . ' ' . $unitOfMeasure
                . ' received for project "' . $project->project_name . '"'
            );

            $created++;
        }

        if (!empty($errors)) {
            return back()->withErrors($errors)->with(
                'error',
                "Completed {$created} report(s) but encountered errors on some items."
            );
        }

        $this->createSystemNotification(
            'general',
            'Bulk Materials Received',
            "{$created} material(s) received in bulk for project '{$project->project_name}'.",
            $project,
            route('project-management.view', $project->id)
        );

        return back()->with('success', "{$created} receiving report(s) created successfully.");
    }
}