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
            ->withCount('transactions')
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
}
