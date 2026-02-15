<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;

class CodeGeneratorService
{
    /**
     * Generate a unique code with prefix (e.g. PRJ-000001, CLT-001).
     */
    public function generateUniqueCode(string $prefix, string $table, string $column, int $length = 6): string
    {
        $padChar = '0';
        do {
            $random = str_pad((string) random_int(1, (int) str_repeat('9', $length)), $length, $padChar, STR_PAD_LEFT);
            $code = $prefix.'-'.$random;
        } while (DB::table($table)->where($column, $code)->exists());

        return $code;
    }
}
