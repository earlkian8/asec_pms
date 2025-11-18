<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Project extends Model
{
    protected $fillable = [
        'project_code',
        'project_name',
        'client_id',
        'project_type',
        'status',
        'priority',
        'contract_amount',
        'start_date',
        'planned_end_date',
        'actual_end_date',
        'completion_percentage',
        'location',
        'description',
        'is_billable',
        'billing_type',
    ];

    public function client(){
        return $this->belongsTo(Client::class, 'client_id', 'id');
    }

    public function milestones()
    {
        return $this->hasMany(ProjectMilestone::class);
    }

    public function team()
    {
        return $this->hasMany(ProjectTeam::class, 'project_id');
    }

    /**
     * Get all active team users (for task assignment dropdown)
     */
    public function teamUsers()
    {
        return $this->team()
            ->active()      // only active members
            ->current()     // current members
            ->with('user'); // eager load employee/user info
    }

    public function billings()
    {
        return $this->hasMany(Billing::class);
    }
    
}
