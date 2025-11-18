<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\InventoryItem;
use App\Models\InventoryTransaction;
use App\Models\Project;
use App\Services\InventoryService;
use App\Traits\ActivityLogsTrait;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class InventoryItemsController extends Controller
{
    use ActivityLogsTrait;

    protected $inventoryService;

    public function __construct(InventoryService $inventoryService)
    {
        $this->inventoryService = $inventoryService;
    }

    public function index(Request $request)
    {
        $data = $this->inventoryService->getInventoryData();
        
        // Get all active projects for stock out dropdown
        $projects = Project::whereIn('status', ['planning', 'active', 'on_hold'])
            ->orderBy('project_name', 'asc')
            ->get(['id', 'project_code', 'project_name']);

        // Get transactions data for the transactions tab
        $transactionsData = $this->inventoryService->getTransactions();

        $data['projects'] = $projects;
        $data['transactions'] = $transactionsData['transactions'];
        $data['transactionsSearch'] = $transactionsData['search'];

        return Inertia::render('InventoryManagement/index', $data);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'item_name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'category' => 'nullable|string|max:255',
            'unit_of_measure' => 'required|string|max:50',
            'min_stock_level' => 'nullable|numeric|min:0',
            'unit_price' => 'nullable|numeric|min:0',
            'is_active' => 'boolean',
        ]);

        // Auto-generate item code
        do {
            $random = str_pad(rand(1, 999999), 6, '0', STR_PAD_LEFT);
            $itemCode = 'INV-' . $random;
        } while (InventoryItem::where('item_code', $itemCode)->exists());

        $data['item_code'] = $itemCode;
        $data['created_by'] = auth()->id();
        $data['current_stock'] = 0;
        $data['is_active'] = $data['is_active'] ?? true;

        $item = InventoryItem::create($data);

        $this->adminActivityLogs(
            'Inventory Item',
            'Created',
            'Created inventory item "' . $item->item_name . '" with code "' . $item->item_code . '"'
        );

        return back()->with('success', 'Inventory item created successfully');
    }

    public function update(Request $request, InventoryItem $inventoryItem)
    {
        $data = $request->validate([
            'item_code' => ['required', 'string', 'max:255', Rule::unique('inventory_items')->ignore($inventoryItem->id)],
            'item_name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'category' => 'nullable|string|max:255',
            'unit_of_measure' => 'required|string|max:50',
            'min_stock_level' => 'nullable|numeric|min:0',
            'unit_price' => 'nullable|numeric|min:0',
            'is_active' => 'boolean',
        ]);

        $inventoryItem->update($data);

        $this->adminActivityLogs(
            'Inventory Item',
            'Updated',
            'Updated inventory item "' . $inventoryItem->item_name . '"'
        );

        return back()->with('success', 'Inventory item updated successfully');
    }

    public function destroy(InventoryItem $inventoryItem)
    {
        $itemName = $inventoryItem->item_name;
        $itemCode = $inventoryItem->item_code;

        // Check if item has transactions
        if ($inventoryItem->transactions()->count() > 0) {
            return back()->with('error', 'Cannot delete item with existing transactions. Please delete transactions first.');
        }

        $inventoryItem->delete();

        $this->adminActivityLogs(
            'Inventory Item',
            'Deleted',
            'Deleted inventory item "' . $itemName . '" with code "' . $itemCode . '"'
        );

        return back()->with('success', 'Inventory item deleted successfully');
    }

    public function stockIn(Request $request, InventoryItem $inventoryItem)
    {
        $data = $request->validate([
            'quantity' => 'required|numeric|min:0.01',
            'unit_price' => 'nullable|numeric|min:0',
            'transaction_date' => 'nullable|date',
            'notes' => 'nullable|string',
        ]);

        $transaction = InventoryTransaction::create([
            'inventory_item_id' => $inventoryItem->id,
            'transaction_type' => 'stock_in',
            'quantity' => $data['quantity'],
            'unit_price' => $data['unit_price'] ?? null,
            'transaction_date' => $data['transaction_date'] ?? now(),
            'notes' => $data['notes'] ?? null,
            'created_by' => auth()->id(),
        ]);

        // Update current stock
        $this->inventoryService->updateItemStock($inventoryItem);

        $this->adminActivityLogs(
            'Inventory Transaction',
            'Stock In',
            'Added ' . $data['quantity'] . ' ' . $inventoryItem->unit_of_measure . ' to "' . $inventoryItem->item_name . '"'
        );

        return back()->with('success', 'Stock added successfully');
    }

    public function stockOut(Request $request, InventoryItem $inventoryItem)
    {
        $data = $request->validate([
            'quantity' => 'required|numeric|min:0.01',
            'stock_out_type' => 'required|in:project_use,damage,other',
            'project_id' => 'nullable|exists:projects,id|required_if:stock_out_type,project_use',
            'unit_price' => 'nullable|numeric|min:0',
            'transaction_date' => 'nullable|date',
            'notes' => 'nullable|string',
        ]);

        // Check if sufficient stock
        if ($inventoryItem->current_stock < $data['quantity']) {
            return back()->with('error', 'Insufficient stock. Available: ' . $inventoryItem->current_stock . ' ' . $inventoryItem->unit_of_measure);
        }

        $transactionData = [
            'inventory_item_id' => $inventoryItem->id,
            'transaction_type' => 'stock_out',
            'stock_out_type' => $data['stock_out_type'],
            'quantity' => $data['quantity'],
            'unit_price' => $data['unit_price'] ?? null,
            'transaction_date' => $data['transaction_date'] ?? now(),
            'notes' => $data['notes'] ?? null,
            'created_by' => auth()->id(),
        ];

        // If project_use, create material allocation
        if ($data['stock_out_type'] === 'project_use' && isset($data['project_id'])) {
            $project = Project::findOrFail($data['project_id']);
            
            // Create or update material allocation
            $allocation = $inventoryItem->materialAllocations()
                ->where('project_id', $project->id)
                ->where('status', '!=', 'received')
                ->first();

            if ($allocation) {
                $allocation->update([
                    'quantity_allocated' => $allocation->quantity_allocated + $data['quantity'],
                ]);
            } else {
                $allocation = $inventoryItem->materialAllocations()->create([
                    'project_id' => $project->id,
                    'quantity_allocated' => $data['quantity'],
                    'quantity_received' => 0,
                    'status' => 'pending',
                    'allocated_by' => auth()->id(),
                    'allocated_at' => now(),
                ]);
            }

            $transactionData['project_id'] = $project->id;
            $transactionData['project_material_allocation_id'] = $allocation->id;
        }

        $transaction = InventoryTransaction::create($transactionData);

        // Update current stock
        $this->inventoryService->updateItemStock($inventoryItem);

        $this->adminActivityLogs(
            'Inventory Transaction',
            'Stock Out',
            'Removed ' . $data['quantity'] . ' ' . $inventoryItem->unit_of_measure . ' from "' . $inventoryItem->item_name . '" (' . $data['stock_out_type'] . ')'
        );

        return back()->with('success', 'Stock removed successfully');
    }

    public function transactions(Request $request)
    {
        $data = $this->inventoryService->getTransactions();

        return Inertia::render('InventoryManagement/Transactions', $data);
    }
}
