<?php

namespace App\Traits;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

/**
 * Provides DB-agnostic case-insensitive LIKE search.
 * Uses ilike on PostgreSQL, LOWER() + like on MySQL/SQLite.
 */
trait SearchableScope
{
    /**
     * Scope: case-insensitive where like for a single column.
     */
    public function scopeWhereSearch(Builder $query, string $column, string $value): Builder
    {
        if ($value === '') {
            return $query;
        }

        $pattern = '%'.addcslashes($value, '%_\\').'%';

        if (DB::getDriverName() === 'pgsql') {
            return $query->where($column, 'ilike', $pattern);
        }

        $wrapped = $query->getGrammar()->wrap($column);

        return $query->whereRaw('LOWER('.$wrapped.') LIKE ?', [strtolower($pattern)]);
    }

    /**
     * Apply case-insensitive LIKE to multiple columns (OR).
     * $columns: array of column names.
     */
    public function scopeWhereSearchIn(Builder $query, array $columns, string $value): Builder
    {
        if ($value === '' || empty($columns)) {
            return $query;
        }

        $pattern = '%'.addcslashes($value, '%_\\').'%';

        return $query->where(function (Builder $q) use ($columns, $pattern) {
            foreach ($columns as $column) {
                if (DB::getDriverName() === 'pgsql') {
                    $q->orWhere($column, 'ilike', $pattern);
                } else {
                    $wrapped = $q->getGrammar()->wrap($column);
                    $q->orWhereRaw('LOWER('.$wrapped.') LIKE ?', [strtolower($pattern)]);
                }
            }
        });
    }
}
