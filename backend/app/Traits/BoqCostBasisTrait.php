<?php

namespace App\Traits;

/**
 * Shared BOQ item cost resolution logic.
 *
 * When an item has resources, the cost basis is always 1 lot = sum of resource costs.
 * When an item has no resources, cost basis is quantity × unit_cost from the item itself.
 *
 * Used by both ProjectsController (wizard creation) and ProjectBoqController (post-creation edits).
 */
trait BoqCostBasisTrait
{
    private function resolveItemCostBasis(array $item): array
    {
        $resources = $item['resources'] ?? [];

        if (!empty($resources)) {
            $resourceTotal = collect($resources)->sum(
                fn ($r) => (float) ($r['quantity'] ?? 0) * (float) ($r['unit_price'] ?? 0)
            );

            return [1.0, round((float) $resourceTotal, 2)];
        }

        $quantity = (float) ($item['quantity'] ?? 0);
        $unitCost = (float) ($item['unit_cost'] ?? 0);

        return [$quantity, $unitCost];
    }
}
