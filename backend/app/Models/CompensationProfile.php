<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class CompensationProfile extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'profileable_type',
        'profileable_id',
        'pay_type',
        'hourly_rate',
        'monthly_salary',
        'effective_date',
        'is_active',
    ];

    protected $casts = [
        'hourly_rate' => 'decimal:2',
        'monthly_salary' => 'decimal:2',
        'effective_date' => 'date',
        'is_active' => 'boolean',
    ];

    public function profileable()
    {
        return $this->morphTo();
    }
}
