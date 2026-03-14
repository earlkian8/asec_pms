<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Billing extends Model
{
    use HasFactory, SoftDeletes;

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
        'archived_at',
    ];

    protected $casts = [
        'billing_amount' => 'decimal:2',
        'billing_date'   => 'date',
        'due_date'       => 'date',
        'archived_at'    => 'datetime',
    ];

    // ── Scopes ──────────────────────────────────────────────────────────────

    /** Active (non-archived) billings — used by default queries */
    public function scopeActive($query)
    {
        return $query->whereNull('archived_at');
    }

    /** Archived billings only */
    public function scopeArchived($query)
    {
        return $query->whereNotNull('archived_at');
    }

    // ── Relationships ────────────────────────────────────────────────────────

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

    // ── Computed properties ──────────────────────────────────────────────────

    public function getTotalPaidAttribute()
    {
        return $this->payments()
            ->where('payment_status', 'paid')
            ->sum('payment_amount');
    }

    public function getRemainingAmountAttribute()
    {
        return $this->billing_amount - $this->total_paid;
    }

    public function getPaymentPercentageAttribute()
    {
        if ($this->billing_amount == 0) return 0;
        return ($this->total_paid / $this->billing_amount) * 100;
    }

    public function getIsArchivedAttribute(): bool
    {
        return !is_null($this->archived_at);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    public function updateStatus(): void
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

    public function archive(): void
    {
        $this->update(['archived_at' => now()]);
    }

    public function unarchive(): void
    {
        $this->update(['archived_at' => null]);
    }
}