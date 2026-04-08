<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProjectTeamStatusLog extends Model
{
    protected $fillable = [
        'project_team_id',
        'project_id',
        'action',
        'performed_by',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function projectTeam()
    {
        return $this->belongsTo(ProjectTeam::class, 'project_team_id');
    }

    public function project()
    {
        return $this->belongsTo(Project::class, 'project_id');
    }

    public function performer()
    {
        return $this->belongsTo(User::class, 'performed_by');
    }
}
