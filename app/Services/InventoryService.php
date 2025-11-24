<?php

namespace App\Services;

use App\Models\InventoryItem;
use App\Models\InventoryTransaction;

class InventoryService
{
    public function getInventoryData()
    {
        $search = request('search');

        $items = InventoryItem::with(['createdBy'])
            ->when($search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('item_code', 'ilike', "%{$search}%")
                      ->orWhere('item_name', 'ilike', "%{$search}%")
                      ->orWhere('category', 'ilike', "%{$search}%")
                      ->orWhere('description', 'ilike', "%{$search}%");
                });
            })
            ->orderBy('item_name', 'asc')
            ->paginate(15)
            ->withQueryString();

        // Add is_low_stock flag to each item
        $items->getCollection()->transform(function ($item) {
            $item->is_low_stock = $item->isLowStock();
            return $item;
        });

        return [
            'items' => $items,
            'search' => $search,
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
                'receivedBy:id,name'
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
