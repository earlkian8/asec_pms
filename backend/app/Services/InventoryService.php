<?php

namespace App\Services;

use App\Models\InventoryItem;
use App\Models\InventoryTransaction;

class InventoryService
{
    public function getInventoryData()
    {
        $search = request('search');
        $category = request('category');
        $isActive = request('is_active');
        $isLowStock = request('is_low_stock');
        $sortBy = request('sort_by', 'item_name');
        $sortOrder = request('sort_order', 'asc');

        // Validate sort column
        $allowedSortColumns = ['item_code', 'item_name', 'category', 'current_stock', 'min_stock_level', 'unit_price', 'is_active', 'created_at'];
        if (!in_array($sortBy, $allowedSortColumns)) {
            $sortBy = 'item_name';
        }

        // Validate sort order
        $sortOrder = in_array(strtolower($sortOrder), ['asc', 'desc']) ? strtolower($sortOrder) : 'asc';

        $items = InventoryItem::with(['createdBy'])
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
            ->paginate(15)
            ->withQueryString();

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

        // Get unique categories for filter options
        $categories = InventoryItem::distinct()
            ->whereNotNull('category')
            ->pluck('category')
            ->sort()
            ->values();

        return [
            'items' => $items,
            'search' => $search,
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
        ];
    }

    public function getTransactions($itemId = null)
    {
        $search = request('transactions_search') ?? request('search');

        try {
            $transactions = InventoryTransaction::with([
                'inventoryItem',
                'project:id,project_code,project_name',
                'createdBy:id,name',
                'materialAllocation'
            ])
                ->when($itemId, function ($query, $itemId) {
                    $query->where('inventory_item_id', $itemId);
                })
                ->when($search, function ($query, $search) {
                    $query->where(function ($q) use ($search) {
                        $q->whereHas('inventoryItem', function ($itemQuery) use ($search) {
                            $itemQuery->where('item_name', 'ilike', "%{$search}%")
                                      ->orWhere('item_code', 'ilike', "%{$search}%");
                        })
                        ->orWhere('notes', 'ilike', "%{$search}%");
                    });
                })
                ->orderBy('transaction_date', 'desc')
                ->orderBy('created_at', 'desc')
                ->paginate(20)
                ->withQueryString();
        } catch (\Exception $e) {
            // Table doesn't exist, return empty paginated collection
            $transactions = new \Illuminate\Pagination\LengthAwarePaginator(
                collect([]),
                0,
                20,
                1
            );
        }

        return [
            'transactions' => $transactions,
            'search' => $search,
        ];
    }

    public function updateItemStock(InventoryItem $item)
    {
        $calculatedStock = $item->calculateCurrentStock();
        $item->update(['current_stock' => $calculatedStock]);
        return $calculatedStock;
    }

    public function getReceivingReports()
    {
        $search = request('receiving_reports_search');

        try {
            $receivingReports = \App\Models\MaterialReceivingReport::with([
                'materialAllocation' => function ($query) {
                    $query->with([
                        'inventoryItem:id,item_code,item_name,unit_of_measure',
                        'project:id,project_code,project_name'
                    ]);
                },
                'receivedBy' => function ($query) {
                    $query->select('id', 'name')->with('roles:id,name');
                }
            ])
                ->when($search, function ($query, $search) {
                    $query->where(function ($q) use ($search) {
                        $q->whereHas('materialAllocation', function ($allocationQuery) use ($search) {
                            $allocationQuery->whereHas('inventoryItem', function ($itemQuery) use ($search) {
                                $itemQuery->where('item_name', 'ilike', "%{$search}%")
                                          ->orWhere('item_code', 'ilike', "%{$search}%");
                            })
                            ->orWhereHas('project', function ($projectQuery) use ($search) {
                                $projectQuery->where('project_name', 'ilike', "%{$search}%")
                                            ->orWhere('project_code', 'ilike', "%{$search}%");
                            });
                        })
                        ->orWhere('notes', 'ilike', "%{$search}%");
                    });
                })
                ->orderBy('received_at', 'desc')
                ->orderBy('created_at', 'desc')
                ->paginate(20)
                ->withQueryString();
        } catch (\Exception $e) {
            // Table doesn't exist, return empty paginated collection
            $receivingReports = new \Illuminate\Pagination\LengthAwarePaginator(
                collect([]),
                0,
                20,
                1
            );
        }

        return [
            'receivingReports' => $receivingReports,
            'search' => $search,
        ];
    }
}
