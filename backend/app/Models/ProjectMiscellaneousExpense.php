<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProjectMiscellaneousExpense extends Model
{
    protected $fillable = [
        'project_id',
        'expense_type',
        'expense_name',
        'expense_date',
        'amount',
        'description',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'expense_date' => 'date',
        'amount' => 'decimal:2',
    ];

    public function project()
    {
        return $this->belongsTo(Project::class);
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}

