<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProjectLaborCost extends Model
{
    protected $fillable = [
        'project_id',
        'user_id',
        'employee_id',
        'assignable_type',
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

    protected $appends = [
        'assignable_name',
    ];

    public function project()
    {
        return $this->belongsTo(Project::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the employee for this labor cost.
     */
    public function employee()
    {
        return $this->belongsTo(Employee::class, 'employee_id');
    }

    /**
     * Get the assignable (user or employee) for this labor cost.
     */
    public function assignable()
    {
        if ($this->assignable_type === 'employee' && $this->employee_id) {
            return $this->employee();
        }

        return $this->user();
    }

    /**
     * Get the name of the assignable (user or employee).
     */
    public function getAssignableNameAttribute()
    {
        // If assignable_type is set, use it
        if ($this->assignable_type === 'employee' && $this->employee) {
            return $this->employee->full_name;
        }
        if ($this->assignable_type === 'user' && $this->user) {
            return $this->user->name;
        }

        // Fallback: if assignable_type is not set (legacy records), check which one exists
        if ($this->employee_id && $this->employee) {
            return $this->employee->full_name;
        }
        if ($this->user_id && $this->user) {
            return $this->user->name;
        }

        return 'N/A';
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
