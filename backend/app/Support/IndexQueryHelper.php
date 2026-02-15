<?php

namespace App\Support;

use Illuminate\Http\Request;

class IndexQueryHelper
{
    /**
     * Sanitize sort_by and sort_order from request.
     *
     * @param  array<int, string>  $allowedSortColumns
     * @return array{sort_by: string, sort_order: string}
     */
    public static function sortParams(Request $request, array $allowedSortColumns, string $defaultSort = 'created_at', string $defaultOrder = 'desc'): array
    {
        $sortBy = $request->input('sort_by', $defaultSort);
        if (! in_array($sortBy, $allowedSortColumns, true)) {
            $sortBy = $defaultSort;
        }
        $sortOrder = $request->input('sort_order', $defaultOrder);
        $sortOrder = in_array(strtolower($sortOrder), ['asc', 'desc'], true) ? strtolower($sortOrder) : $defaultOrder;

        return ['sort_by' => $sortBy, 'sort_order' => $sortOrder];
    }

    /**
     * Parse is_active (or similar boolean) from request.
     * Accepts: true, false, 'true', 'false', '1', '0', 1, 0.
     */
    public static function parseBoolean($value): ?bool
    {
        if ($value === null || $value === '') {
            return null;
        }
        if (is_bool($value)) {
            return $value;
        }
        if ($value === 'true' || $value === '1' || $value === 1) {
            return true;
        }
        if ($value === 'false' || $value === '0' || $value === 0) {
            return false;
        }

        return null;
    }
}
