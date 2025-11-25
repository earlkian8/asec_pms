<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Billing extends Model
{
    use HasFactory;

    protected $fillable = [
        'project_id',
        'billing_code',
        'billing_type',
        'milestone_id',
        'billing_amount',
        'billing_date',
        'due_date',
        'status',
        'description',
        'created_by',
    ];

    protected $casts = [
        'billing_amount' => 'decimal:2',
        'billing_date' => 'date',
        'due_date' => 'date',
    ];

    // Relationships
    public function project()
    {
        return $this->belongsTo(Project::class);
    }

    public function milestone()
    {
        return $this->belongsTo(ProjectMilestone::class, 'milestone_id');
    }

    public function payments()
    {
        return $this->hasMany(BillingPayment::class);
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    // Computed properties
    public function getTotalPaidAttribute()
    {
        return $this->payments()->sum('payment_amount');
    }

    public function getRemainingAmountAttribute()
    {
        return $this->billing_amount - $this->total_paid;
    }

    public function getPaymentPercentageAttribute()
    {
        if ($this->billing_amount == 0) {
            return 0;
        }
        return ($this->total_paid / $this->billing_amount) * 100;
    }

    // Auto-update status based on payments
    public function updateStatus()
    {
        $totalPaid = $this->total_paid;
        
        if ($totalPaid == 0) {
            $this->status = 'unpaid';
        } elseif ($totalPaid >= $this->billing_amount) {
            $this->status = 'paid';
        } else {
            $this->status = 'partial';
        }
        
        $this->save();
    }
}

