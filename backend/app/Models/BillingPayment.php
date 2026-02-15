<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BillingPayment extends Model
{
    use HasFactory;

    protected $fillable = [
        'billing_id',
        'payment_code',
        'payment_amount',
        'payment_date',
        'payment_method',
        'reference_number',
        'notes',
        'created_by',
        'paymongo_payment_intent_id',
        'paymongo_payment_method_id',
        'payment_status',
        'paymongo_source_id',
        'paymongo_metadata',
        'paid_by_client',
    ];

    protected $casts = [
        'payment_amount' => 'decimal:2',
        'payment_date' => 'date',
        'paymongo_metadata' => 'array',
        'paid_by_client' => 'boolean',
    ];

    // Relationships
    public function billing()
    {
        return $this->belongsTo(Billing::class);
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
