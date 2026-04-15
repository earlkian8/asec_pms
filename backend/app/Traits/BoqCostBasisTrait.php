<?php

namespace App\Traits;

/**
 * Standard construction BOQ cost shape.
 *
 * Material/Labor cost are summed from resources tied to the item.
 * Unit cost is material + labor (resource subtotal per BOQ unit).
 * Total is unit_cost x quantity.
 *
 * If the item has no resources at all, fall back to the user-entered
 * quantity x unit_cost (legacy lump-sum behavior).
 */
trait BoqCostBasisTrait
{
    private function resolveItemCostBasis(array $item): array
    {
        $resources = $item['resources'] ?? [];
        $quantity  = max((float) ($item['quantity'] ?? 0), 0.0);

        if (!empty($resources)) {
            $materialCost = 0.0;
            $laborCost    = 0.0;
            foreach ($resources as $r) {
                $line = (float) ($r['quantity'] ?? 0) * (float) ($r['unit_price'] ?? 0);
                if (($r['resource_category'] ?? null) === 'labor') {
                    $laborCost += $line;
                } else {
                    $materialCost += $line;
                }
            }

            $unitCost  = round($materialCost + $laborCost, 2);
            $quantity  = $quantity > 0 ? $quantity : 1.0;
            $totalCost = round($unitCost * $quantity, 2);

            return [
                'quantity'      => $quantity,
                'material_cost' => round($materialCost, 2),
                'labor_cost'    => round($laborCost, 2),
                'unit_cost'     => $unitCost,
                'total_cost'    => $totalCost,
            ];
        }

        $unitCost  = (float) ($item['unit_cost'] ?? 0);
        $totalCost = round($quantity * $unitCost, 2);

        return [
            'quantity'      => $quantity,
            'material_cost' => 0.0,
            'labor_cost'    => 0.0,
            'unit_cost'     => round($unitCost, 2),
            'total_cost'    => $totalCost,
        ];
    }
}
