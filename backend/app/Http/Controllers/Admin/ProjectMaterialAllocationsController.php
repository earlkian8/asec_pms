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
use App\Traits\NotificationTrait;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ProjectMaterialAllocationsController extends Controller
{
    use ActivityLogsTrait, NotificationTrait;

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
            'condition' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string'],
            'received_at' => ['nullable', 'date'],
        ]);

        $data['received_by'] = auth()->id();
        $data['received_at'] = $data['received_at'] ?? now();

        // Create receiving report first
        $receivingReport = $allocation->receivingReports()->create($data);

        // Create stock_out transaction for the received quantity (this actually removes stock)
        $inventoryItem = $allocation->inventoryItem;
        $transaction = InventoryTransaction::create([
            'inventory_item_id' => $inventoryItem->id,
            'transaction_type' => 'stock_out',
            'stock_out_type' => 'project_use',
            'quantity' => $data['quantity_received'],
            'project_id' => $project->id,
            'project_material_allocation_id' => $allocation->id,
            'notes' => '[RECEIVING_REPORT_ID:' . $receivingReport->id . '] Stock removed via receiving report' . ($data['notes'] ? ' - ' . $data['notes'] : ''),
            'created_by' => auth()->id(),
            'transaction_date' => $data['received_at'],
        ]);

        // Update current stock (this actually removes the stock)
        $this->inventoryService->updateItemStock($inventoryItem);

        // Update allocation received quantity and status
        $allocation->quantity_received += $data['quantity_received'];
        $allocation->updateStatus();

        $this->adminActivityLogs(
            'Material Receiving Report',
            'Created',
            'Created receiving report for "' . $allocation->inventoryItem->item_name . '" - ' . $data['quantity_received'] . ' ' . $allocation->inventoryItem->unit_of_measure . ' received for project "' . $project->project_name . '"'
        );

        // System-wide notification for material received
        $this->createSystemNotification(
            'general',
            'Material Received',
            "Material '{$allocation->inventoryItem->item_name}' ({$data['quantity_received']} {$allocation->inventoryItem->unit_of_measure}) has been received for project '{$project->project_name}'.",
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
                    $remaining = $allocation->quantity_allocated - $currentReceived;
                    if ($value > $remaining) {
                        $fail("Quantity received cannot exceed remaining quantity ({$remaining}).");
                    }
                },
            ],
            'condition' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string'],
            'received_at' => ['nullable', 'date'],
        ]);

        // Find and update the stock_out transaction created for this receiving report
        $inventoryItem = $allocation->inventoryItem;
        $stockOutTransaction = InventoryTransaction::where('project_material_allocation_id', $allocation->id)
            ->where('transaction_type', 'stock_out')
            ->where('stock_out_type', 'project_use')
            ->where('notes', 'like', '%[RECEIVING_REPORT_ID:' . $receivingReport->id . ']%')
            ->first();

        // Update allocation received quantity
        $oldQuantity = $receivingReport->quantity_received;
        $allocation->quantity_received -= $oldQuantity;
        
        $receivingReport->update($data);
        
        // Update the stock_out transaction quantity if found
        if ($stockOutTransaction) {
            $stockOutTransaction->update([
                'quantity' => $data['quantity_received'],
                'transaction_date' => $data['received_at'],
                'notes' => '[RECEIVING_REPORT_ID:' . $receivingReport->id . '] Stock removed via receiving report' . ($data['notes'] ? ' - ' . $data['notes'] : ''),
            ]);
        } else {
            // If transaction not found, create a new one
            InventoryTransaction::create([
                'inventory_item_id' => $inventoryItem->id,
                'transaction_type' => 'stock_out',
                'stock_out_type' => 'project_use',
                'quantity' => $data['quantity_received'],
                'project_id' => $project->id,
                'project_material_allocation_id' => $allocation->id,
                'notes' => '[RECEIVING_REPORT_ID:' . $receivingReport->id . '] Stock removed via receiving report' . ($data['notes'] ? ' - ' . $data['notes'] : ''),
                'created_by' => auth()->id(),
                'transaction_date' => $data['received_at'],
            ]);
        }
        
        $allocation->quantity_received += $data['quantity_received'];
        $allocation->updateStatus();

        // Update current stock
        $this->inventoryService->updateItemStock($inventoryItem);

        $this->adminActivityLogs(
            'Material Receiving Report',
            'Updated',
            'Updated receiving report for "' . $allocation->inventoryItem->item_name . '" for project "' . $project->project_name . '"'
        );

        return back()->with('success', 'Receiving report updated successfully.');
    }

    // Delete receiving report
    public function destroyReceivingReport(Project $project, ProjectMaterialAllocation $allocation, MaterialReceivingReport $receivingReport)
    {
        // Find and delete the stock_out transaction created for this receiving report
        $inventoryItem = $allocation->inventoryItem;
        $stockOutTransaction = InventoryTransaction::where('project_material_allocation_id', $allocation->id)
            ->where('transaction_type', 'stock_out')
            ->where('stock_out_type', 'project_use')
            ->where('notes', 'like', '%[RECEIVING_REPORT_ID:' . $receivingReport->id . ']%')
            ->first();

        if ($stockOutTransaction) {
            $stockOutTransaction->delete();
        }

        // Update allocation received quantity
        $allocation->quantity_received -= $receivingReport->quantity_received;
        $allocation->updateStatus();
        
        $receivingReport->delete();

        // Update current stock (this will add back the stock since transaction is deleted)
        $this->inventoryService->updateItemStock($inventoryItem);

        $this->adminActivityLogs(
            'Material Receiving Report',
            'Deleted',
            'Deleted receiving report for "' . $allocation->inventoryItem->item_name . '" for project "' . $project->project_name . '"'
        );

        return back()->with('success', 'Receiving report deleted successfully.');
    }

    // Delete material allocation
    public function destroy(Project $project, ProjectMaterialAllocation $allocation)
    {
        $inventoryItem = $allocation->inventoryItem;
        $itemName = $inventoryItem ? $inventoryItem->item_name : 'Unknown Item';

        // Delete all receiving reports and their associated stock_out transactions
        foreach ($allocation->receivingReports as $report) {
            $stockOutTransaction = InventoryTransaction::where('project_material_allocation_id', $allocation->id)
                ->where('transaction_type', 'stock_out')
                ->where('stock_out_type', 'project_use')
                ->where('notes', 'like', '%[RECEIVING_REPORT_ID:' . $report->id . ']%')
                ->first();

            if ($stockOutTransaction) {
                $stockOutTransaction->delete();
            }
        }

        // Delete the initial allocation transaction (if it exists and hasn't been received)
        InventoryTransaction::where('project_material_allocation_id', $allocation->id)
            ->where('transaction_type', 'stock_out')
            ->where('stock_out_type', 'project_use')
            ->where('notes', 'not like', '%[RECEIVING_REPORT_ID:%')
            ->delete();

        // Delete the allocation (this will cascade delete receiving reports)
        $allocation->delete();

        // Update current stock if there were receiving reports
        if ($inventoryItem && $allocation->quantity_received > 0) {
            $this->inventoryService->updateItemStock($inventoryItem);
        }

        $this->adminActivityLogs(
            'Material Allocation',
            'Deleted',
            'Deleted material allocation for "' . $itemName . '" from project "' . $project->project_name . '"'
        );

        return back()->with('success', 'Material allocation deleted successfully.');
    }
}
