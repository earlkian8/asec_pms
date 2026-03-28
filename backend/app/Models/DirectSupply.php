<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class DirectSupply extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'supply_code',
        'supply_name',
        'description',
        'category',
        'unit_of_measure',
        'unit_price',
        'supplier_name',
        'supplier_contact',
        'is_active',
        'created_by',
    ];

    protected $casts = [
        'unit_price' => 'decimal:2',
        'is_active' => 'boolean',
    ];

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}
