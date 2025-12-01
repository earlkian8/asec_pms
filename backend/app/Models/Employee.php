<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Employee extends Model
{
    use HasFactory;

    protected $fillable = [
        'first_name',
        'last_name',
        'email',
        'phone',
        'position',
        'is_active'
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    /**
     * Get the full name of the employee.
     */
    public function getFullNameAttribute()
    {
        return "{$this->first_name} {$this->last_name}";
    }

    /**
     * Get the project teams that this employee is assigned to.
     */
    public function projectTeams()
    {
        return $this->hasMany(ProjectTeam::class, 'employee_id');
    }

    /**
     * Get the labor costs for this employee.
     */
    public function laborCosts()
    {
        return $this->hasMany(ProjectLaborCost::class, 'employee_id');
    }
}
