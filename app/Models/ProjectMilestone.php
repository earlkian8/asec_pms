<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProjectMilestone extends Model
{
    use HasFactory;

    protected $fillable = [
        'project_id',
        'name',
        'description',
        'start_date',
        'due_date',
        'billing_percentage',
        'status',
    ];

    // Relationship to Project
    public function project()
    {
        return $this->belongsTo(Project::class);
    }

    // Optional: relationship to tasks (for future)
    public function tasks()
    {
        return $this->hasMany(ProjectTask::class);
    }

    public function billings()
    {
        return $this->hasMany(Billing::class, 'milestone_id');
    }

    public function issues()
    {
        return $this->hasMany(ProjectIssue::class, 'project_milestone_id');
    }
}
