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
}
