<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProjectTask extends Model
{
    use HasFactory;

    protected $fillable = [
        'project_milestone_id',
        'title',
        'description',
        'assigned_to',
        'due_date',
        'status',
    ];

    public function milestone()
    {
        return $this->belongsTo(ProjectMilestone::class, 'project_milestone_id');
    }

    public function assignedUser()
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function progressUpdates()
    {
        return $this->hasMany(ProgressUpdate::class, 'project_task_id');
    }
}
