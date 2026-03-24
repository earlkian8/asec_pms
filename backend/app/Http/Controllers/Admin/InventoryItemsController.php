<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\InventoryItem;
use App\Models\InventoryTransaction;
use App\Models\Project;
use App\Models\User;
use App\Services\InventoryService;
use App\Traits\ActivityLogsTrait;
use App\Traits\NotificationTrait;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class InventoryItemsController extends Controller
{
    use ActivityLogsTrait, NotificationTrait;

    protected $inventoryService;

    public function __construct(InventoryService $inventoryService)
    {
        $this->inventoryService = $inventoryService;
    }

    public function index(Request $request)
    {
        $search = $request->input('search');
        $category = $request->input('category');
        $isActive = $request->input('is_active');
        $isLowStock = $request->input('is_low_stock');
        $sortBy = $request->input('sort_by', 'created_at');
        $sortOrder = $request->input('sort_order', 'desc');

        // Validate sort column
        $allowedSortColumns = ['created_at', 'item_code', 'item_name', 'category', 'current_stock', 'min_stock_level', 'unit_price', 'is_active'];
        if (!in_array($sortBy, $allowedSortColumns)) {
            $sortBy = 'created_at';
        }

        // Validate sort order
        $sortOrder = in_array(strtolower($sortOrder), ['asc', 'desc']) ? strtolower($sortOrder) : 'desc';

        $items = InventoryItem::with(['createdBy'])
            ->withCount('transactions')               // ← needed for delete/archive logic in frontend
            ->where('is_archived', false)             // ← exclude archived items from main list
            ->when($search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('item_code', 'like', "%{$search}%")
                      ->orWhere('item_name', 'like', "%{$search}%")
                      ->orWhere('category', 'like', "%{$search}%")
                      ->orWhere('description', 'like', "%{$search}%");
                });
            })
            ->when($category, function ($query, $category) {
                $query->where('category', $category);
            })
            ->when($isActive !== null && $isActive !== '', function ($query) use ($isActive) {
                $query->where('is_active', filter_var($isActive, FILTER_VALIDATE_BOOLEAN));
            })
            ->orderBy($sortBy, $sortOrder)
            ->when($sortBy !== 'created_at', function ($query) {
                $query->orderBy('created_at', 'desc');
            })
            ->paginate(10);

        // Add is_low_stock flag to each item
        $items->getCollection()->transform(function ($item) {
            $item->is_low_stock = $item->isLowStock();
            return $item;
        });

        // Filter by low stock after calculating the flag
        if ($isLowStock === 'true') {
            $items->setCollection(
                $items->getCollection()->filter(function ($item) {
                    return $item->is_low_stock;
                })
            );
        }

        // Aggregate stats — always reflect full dataset (non-archived), not current page
        $stats = [
            'total_items'  => InventoryItem::where('is_archived', false)->count(),
            'active_items' => InventoryItem::where('is_active', true)->where('is_archived', false)->count(),
            'low_stock'    => InventoryItem::where('is_archived', false)
                                 ->whereNotNull('min_stock_level')
                                 ->whereColumn('current_stock', '<=', 'min_stock_level')
                                 ->count(),
            'total_value'  => InventoryItem::where('is_archived', false)
                                 ->selectRaw('COALESCE(SUM(current_stock * unit_price), 0) as total')
                                 ->value('total') ?? 0,
        ];

        // Get all active projects for stock out dropdown
        $projects = Project::whereIn('status', ['active', 'on_hold'])
            ->orWhereNotNull('archived_at')
            ->orderBy('project_name', 'asc')
            ->get(['id', 'project_code', 'project_name']);

        // Get transactions data for the transactions tab
        $transactionsData = $this->inventoryService->getTransactions();

        // Get receiving reports data for the receiving reports tab
        $receivingReportsData = $this->inventoryService->getReceivingReports();

        // Get unique categories for filter options
        $categories = InventoryItem::distinct()
            ->where('is_archived', false)
            ->whereNotNull('category')
            ->pluck('category')
            ->sort()
            ->values();

        return Inertia::render('InventoryManagement/index', [
            'items' => $items,
            'search' => $search,
            'projects' => $projects,
            'transactions' => $transactionsData['transactions'],
            'transactionsSearch' => $transactionsData['search'],
            'receivingReports' => $receivingReportsData['receivingReports'],
            'receivingReportsSearch' => $receivingReportsData['search'],
            'filters' => [
                'category' => $category,
                'is_active' => $isActive,
                'is_low_stock' => $isLowStock,
            ],
            'filterOptions' => [
                'categories' => $categories,
            ],
            'sort_by' => $sortBy,
            'sort_order' => $sortOrder,
            'stats' => $stats,
        ]);
    }

    /**
     * Show archived items list.
     */
    public function archived(Request $request)
    {
        $search    = $request->input('search');
        $sortBy    = $request->input('sort_by', 'archived_at');
        $sortOrder = $request->input('sort_order', 'desc');

        $allowedSortColumns = ['archived_at', 'item_code', 'item_name', 'category', 'current_stock', 'unit_price'];
        if (!in_array($sortBy, $allowedSortColumns)) {
            $sortBy = 'archived_at';
        }
        $sortOrder = in_array(strtolower($sortOrder), ['asc', 'desc']) ? strtolower($sortOrder) : 'desc';

        $items = InventoryItem::with(['createdBy'])
            ->withCount('transactions')
            ->where('is_archived', true)
            ->when($search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('item_code', 'like', "%{$search}%")
                      ->orWhere('item_name', 'like', "%{$search}%")
                      ->orWhere('category', 'like', "%{$search}%");
                });
            })
            ->orderBy($sortBy, $sortOrder)
            ->paginate(10)
            ->withQueryString();

        $items->getCollection()->transform(function ($item) {
            $item->is_low_stock = $item->isLowStock();
            return $item;
        });

        return Inertia::render('InventoryManagement/archived', [
            'items'      => $items,
            'search'     => $search,
            'sort_by'    => $sortBy,
            'sort_order' => $sortOrder,
        ]);
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
            'initial_stock' => 'nullable|numeric|min:0',
            'initial_stock_unit_price' => 'nullable|numeric|min:0',
            'is_active' => 'boolean',
        ]);

        // Auto-generate item code
        do {
            $random = str_pad(rand(1, 999999), 6, '0', STR_PAD_LEFT);
            $itemCode = 'INV-' . $random;
        } while (InventoryItem::where('item_code', $itemCode)->exists());

        $data['item_code'] = $itemCode;
        $data['created_by'] = auth()->id();
        $initialStock = $data['initial_stock'] ?? 0;
        $initialStockUnitPrice = $data['initial_stock_unit_price'] ?? null;
        $data['current_stock'] = $initialStock;
        $data['is_active'] = $data['is_active'] ?? true;
        $data['is_archived'] = false;

        // Remove initial stock fields from item data
        unset($data['initial_stock'], $data['initial_stock_unit_price']);

        $item = InventoryItem::create($data);

        // If initial stock is provided, create a stock_in transaction
        if ($initialStock > 0) {
            InventoryTransaction::create([
                'inventory_item_id' => $item->id,
                'transaction_type' => 'stock_in',
                'quantity' => $initialStock,
                'unit_price' => $initialStockUnitPrice,
                'transaction_date' => now(),
                'notes' => 'Initial stock - Item creation',
                'created_by' => auth()->id(),
            ]);

            $this->inventoryService->updateItemStock($item);
        }

        $this->adminActivityLogs(
            'Inventory Item',
            'Created',
            'Created inventory item "' . $item->item_name . '" with code "' . $item->item_code . '"' . ($initialStock > 0 ? ' with initial stock of ' . $initialStock : '')
        );

        $this->createSystemNotification(
            'general',
            'New Inventory Item Added',
            "A new inventory item '{$item->item_name}' ({$item->item_code}) has been added" . ($initialStock > 0 ? " with initial stock of {$initialStock}" : "") . ".",
            null,
            route('inventory-management.index')
        );

        return back()->with('success', 'Inventory item created successfully');
    }

    public function update(Request $request, InventoryItem $inventoryItem)
    {
        // item_code is intentionally excluded from validation — it is readonly and system-generated.
        // We simply preserve the existing value.
        $data = $request->validate([
            'item_name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'category' => 'nullable|string|max:255',
            'unit_of_measure' => 'required|string|max:50',
            'min_stock_level' => 'nullable|numeric|min:0',
            'unit_price' => 'nullable|numeric|min:0',
            'is_active' => 'boolean',
        ]);

        // Never allow item_code to be changed through this endpoint
        unset($data['item_code']);

        $inventoryItem->update($data);

        $this->adminActivityLogs(
            'Inventory Item',
            'Updated',
            'Updated inventory item "' . $inventoryItem->item_name . '"'
        );

        $this->createSystemNotification(
            'general',
            'Inventory Item Updated',
            "Inventory item '{$inventoryItem->item_name}' ({$inventoryItem->item_code}) has been updated.",
            null,
            route('inventory-management.index')
        );

        return back()->with('success', 'Inventory item updated successfully');
    }

    public function destroy(InventoryItem $inventoryItem)
    {
        // Hard-guard: if the item has transactions, refuse deletion and suggest archiving instead.
        try {
            if ($inventoryItem->transactions()->count() > 0) {
                return back()->with('error', 'Cannot delete this item because it has existing transactions. Please archive it instead to preserve the transaction history.');
            }
        } catch (\Exception $e) {
            // transactions table doesn't exist — allow deletion
        }

        $itemName = $inventoryItem->item_name;
        $itemCode = $inventoryItem->item_code;

        $inventoryItem->delete();

        $this->adminActivityLogs(
            'Inventory Item',
            'Deleted',
            'Deleted inventory item "' . $itemName . '" with code "' . $itemCode . '"'
        );

        $this->createSystemNotification(
            'general',
            'Inventory Item Deleted',
            "Inventory item '{$itemName}' ({$itemCode}) has been deleted.",
            null,
            route('inventory-management.index')
        );

        return back()->with('success', 'Inventory item deleted successfully');
    }

    /**
     * Archive an inventory item.
     * Archived items are hidden from the active inventory list but all transaction
     * history is preserved. The item can be restored at any time.
     */
    public function archive(InventoryItem $inventoryItem)
    {
        $inventoryItem->update([
            'is_archived' => true,
            'is_active' => false,       // deactivate alongside archiving
        ]);

        $this->adminActivityLogs(
            'Inventory Item',
            'Archived',
            'Archived inventory item "' . $inventoryItem->item_name . '" (' . $inventoryItem->item_code . ')'
        );

        $this->createSystemNotification(
            'general',
            'Inventory Item Archived',
            "Inventory item '{$inventoryItem->item_name}' ({$inventoryItem->item_code}) has been archived.",
            null,
            route('inventory-management.index')
        );

        return back()->with('success', 'Inventory item archived successfully');
    }

    /**
     * Restore a previously archived inventory item.
     */
    public function restore(InventoryItem $inventoryItem)
    {
        $inventoryItem->update([
            'is_archived' => false,
            'is_active' => true,
        ]);

        $this->adminActivityLogs(
            'Inventory Item',
            'Restored',
            'Restored archived inventory item "' . $inventoryItem->item_name . '" (' . $inventoryItem->item_code . ')'
        );

        return back()->with('success', 'Inventory item restored successfully');
    }

    public function stockIn(Request $request, InventoryItem $inventoryItem)
    {
        $data = $request->validate([
            'quantity' => 'required|numeric|min:0.01',
            'unit_price' => 'nullable|numeric|min:0',
            'transaction_date' => 'nullable|date',
            'notes' => 'nullable|string',
        ]);

        $wasLowStock = $inventoryItem->isLowStock();

        InventoryTransaction::create([
            'inventory_item_id' => $inventoryItem->id,
            'transaction_type' => 'stock_in',
            'quantity' => $data['quantity'],
            'unit_price' => $data['unit_price'] ?? null,
            'transaction_date' => $data['transaction_date'] ?? now(),
            'notes' => $data['notes'] ?? null,
            'created_by' => auth()->id(),
        ]);

        $this->inventoryService->updateItemStock($inventoryItem);
        $inventoryItem->refresh();
        $isStillLowStock = $inventoryItem->isLowStock();

        $this->adminActivityLogs(
            'Inventory Transaction',
            'Stock In',
            'Added ' . $data['quantity'] . ' ' . $inventoryItem->unit_of_measure . ' to "' . $inventoryItem->item_name . '"'
        );

        $message = "Stock in: {$data['quantity']} {$inventoryItem->unit_of_measure} added to '{$inventoryItem->item_name}'.";
        if ($wasLowStock && !$isStillLowStock) {
            $message .= " Low stock alert resolved.";
        }
        $this->createSystemNotification(
            'general',
            'Stock Added',
            $message,
            null,
            route('inventory-management.index')
        );

        return back()->with('success', 'Stock added successfully');
    }

    public function stockOut(Request $request, InventoryItem $inventoryItem)
    {
        $data = $request->validate([
            'quantity' => 'required|numeric|min:0.01',
            'stock_out_type' => [
                'required',
                Rule::in(['project_use', 'damage', 'expired', 'lost', 'returned_to_supplier', 'adjustment', 'other']),
            ],
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

        // Project use: create material allocation, do NOT remove stock yet (awaiting receiving report)
        if ($data['stock_out_type'] === 'project_use' && isset($data['project_id'])) {
            $project = Project::findOrFail($data['project_id']);

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

            // Record transaction for tracking but do NOT deduct stock yet
            InventoryTransaction::create($transactionData);
        } else {
            // All other stock-out types: immediately deduct stock
            InventoryTransaction::create($transactionData);
            $this->inventoryService->updateItemStock($inventoryItem);

            $inventoryItem->refresh();
            $isLowStock = $inventoryItem->isLowStock();

            $message = "Stock out: {$data['quantity']} {$inventoryItem->unit_of_measure} removed from '{$inventoryItem->item_name}' ({$data['stock_out_type']}).";
            if ($isLowStock) {
                $message .= " WARNING: Item is now below minimum stock level!";
            }
            $this->createSystemNotification(
                $isLowStock ? 'issue' : 'general',
                $isLowStock ? 'Low Stock Alert' : 'Stock Removed',
                $message,
                null,
                route('inventory-management.index')
            );
        }

        $this->adminActivityLogs(
            'Inventory Transaction',
            'Stock Out',
            'Removed ' . $data['quantity'] . ' ' . $inventoryItem->unit_of_measure . ' from "' . $inventoryItem->item_name . '" (' . $data['stock_out_type'] . ')'
        );

        return back()->with('success', 'Stock removed successfully');
    }

    public function updateStatus(Request $request, InventoryItem $inventoryItem)
    {
        $request->validate([
            'is_active' => ['required', 'boolean'],
        ]);

        $inventoryItem->update([
            'is_active' => $request->input('is_active'),
        ]);

        $this->adminActivityLogs(
            'Inventory Item',
            'Update Status',
            'Updated inventory item "' . $inventoryItem->item_name . '" status to ' . ($request->boolean('is_active') ? 'Active' : 'Inactive')
        );

        return back()->with('success', 'Inventory item status updated successfully.');
    }

    public function transactions(Request $request)
    {
        $data = $this->inventoryService->getTransactions();

        return Inertia::render('InventoryManagement/Transactions', $data);
    }
}