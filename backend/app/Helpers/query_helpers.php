<?php

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

if (! function_exists('query_where_search')) {
    /**
     * Add a single case-insensitive LIKE condition to the query.
     * DB-agnostic: uses ilike on PostgreSQL, LOWER+like elsewhere.
     */
    function query_where_search(Builder $query, string $column, string $value): Builder
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
}

if (! function_exists('query_where_search_in')) {
    /**
     * Add OR case-insensitive LIKE conditions for multiple columns.
     */
    function query_where_search_in(Builder $query, array $columns, string $value): Builder
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
