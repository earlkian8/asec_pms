<?php

namespace App\Services;

use App\Models\InventoryItem;
use App\Models\Project;
use App\Models\ProjectBoqItemResource;

/**
 * Tells callers how much of an inventory item can still be committed
 * to a new BOQ resource line, given current stock minus quantity
 * already committed by other active projects' BOQ resources.
 *
 * Pulled into a service so wizard creation, BOQ tab edits, and the
 * frontend live-availability endpoint share one source of truth.
 */
class InventoryAvailabilityService
{
    /**
     * @param int      $inventoryItemId
     * @param int|null $excludeBoqItemId    Skip resources belonging to this BOQ item (when editing it)
     * @param int|null $excludeResourceId   Skip a single resource row (granular edit)
     * @param int|null $excludeProjectId    Skip every BOQ resource in this project (wizard creation, BOQ replace)
     * @return array{current_stock: float, committed: float, available: float, unit: ?string, item_name: ?string}
     */
    public function availability(
        int $inventoryItemId,
        ?int $excludeBoqItemId = null,
        ?int $excludeResourceId = null,
        ?int $excludeProjectId = null
    ): array {
        $item = InventoryItem::find($inventoryItemId);
        if (!$item) {
            return [
                'current_stock' => 0.0,
                'committed'     => 0.0,
                'available'     => 0.0,
                'unit'          => null,
                'item_name'     => null,
            ];
        }

        $currentStock = (float) $item->calculateCurrentStock();

        $query = ProjectBoqItemResource::query()
            ->where('inventory_item_id', $inventoryItemId)
            ->where('source_type', 'inventory')
            ->whereHas('boqItem.project', function ($q) {
                $q->whereNotIn('status', ['completed', 'cancelled']);
            });

        if ($excludeResourceId) {
            $query->where('id', '!=', $excludeResourceId);
        }
        if ($excludeBoqItemId) {
            $query->where('project_boq_item_id', '!=', $excludeBoqItemId);
        }
        if ($excludeProjectId) {
            $query->whereHas('boqItem', fn ($q) => $q->where('project_id', '!=', $excludeProjectId));
        }

        $committed = (float) $query->sum('quantity');
        $available = max($currentStock - $committed, 0.0);

        return [
            'current_stock' => round($currentStock, 4),
            'committed'     => round($committed, 4),
            'available'     => round($available, 4),
            'unit'          => $item->unit_of_measure,
            'item_name'     => $item->item_name,
        ];
    }

    /**
     * Validate a flat list of resource arrays against inventory availability.
     * Resources are aggregated per inventory_item_id so the same item used twice
     * in the same submission is summed before comparison.
     *
     * Throws ValidationException with field-keyed messages on the first violation
     * batch (keyed by the original index in $resources via $keyResolver).
     *
     * @param array $resources             Flat list of resource arrays
     * @param callable|null $keyResolver   fn($index) => 'sections.0.items.1.resources.2.quantity'
     * @param int|null $excludeProjectId
     * @param int|null $excludeBoqItemId
     */
    public function validateResources(
        array $resources,
        ?callable $keyResolver = null,
        ?int $excludeProjectId = null,
        ?int $excludeBoqItemId = null
    ): void {
        $aggregated = []; // [inventory_item_id => ['qty' => ..., 'indexes' => [...], 'exclude_resource_id' => ?]]

        foreach ($resources as $i => $r) {
            if (($r['source_type'] ?? null) !== 'inventory') continue;
            $invId = (int) ($r['inventory_item_id'] ?? 0);
            if (!$invId) continue;
            $qty = (float) ($r['quantity'] ?? 0);
            if ($qty <= 0) continue;

            if (!isset($aggregated[$invId])) {
                $aggregated[$invId] = ['qty' => 0, 'indexes' => [], 'exclude_resource_id' => null];
            }
            $aggregated[$invId]['qty'] += $qty;
            $aggregated[$invId]['indexes'][] = $i;
            if (!empty($r['id'])) {
                // single-row update: skip itself when computing committed
                $aggregated[$invId]['exclude_resource_id'] = (int) $r['id'];
            }
        }

        $errors = [];

        foreach ($aggregated as $invId => $data) {
            $info = $this->availability(
                $invId,
                $excludeBoqItemId,
                $data['exclude_resource_id'],
                $excludeProjectId
            );

            if ($data['qty'] > $info['available'] + 0.0001) {
                $msg = sprintf(
                    'Only %s %s of %s available (in stock: %s, committed elsewhere: %s).',
                    rtrim(rtrim(number_format($info['available'], 4, '.', ''), '0'), '.'),
                    $info['unit'] ?? 'units',
                    $info['item_name'] ?? 'this item',
                    rtrim(rtrim(number_format($info['current_stock'], 4, '.', ''), '0'), '.'),
                    rtrim(rtrim(number_format($info['committed'], 4, '.', ''), '0'), '.')
                );
                foreach ($data['indexes'] as $idx) {
                    $key = $keyResolver ? $keyResolver($idx) : "resources.$idx.quantity";
                    $errors[$key] = [$msg];
                }
            }
        }

        if (!empty($errors)) {
            throw \Illuminate\Validation\ValidationException::withMessages($errors);
        }
    }
}
