<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProjectLaborCost extends Model
{
    protected $fillable = [
        'project_id',
        'user_id',
        'work_date',
        'hours_worked',
        'hourly_rate',
        'total_cost',
        'description',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'work_date' => 'date',
        'hours_worked' => 'decimal:2',
        'hourly_rate' => 'decimal:2',
    ];

    public function project()
    {
        return $this->belongsTo(Project::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    // Auto-calculate total_cost before saving
    protected static function boot()
    {
        parent::boot();

        static::saving(function ($model) {
            if ($model->hours_worked && $model->hourly_rate) {
                $model->total_cost = $model->hours_worked * $model->hourly_rate;
            }
        });
    }

    // Calculate total cost (fallback if not saved)
    public function getTotalCostAttribute($value)
    {
        if ($value !== null) {
            return $value;
        }
        return $this->hours_worked * $this->hourly_rate;
    }
}

