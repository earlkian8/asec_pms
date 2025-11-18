<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Client extends Model
{
     use HasFactory;

    protected $fillable = [
        'client_code',
        'client_name',
        'client_type',
        'contact_person',
        'email',
        'phone_number',
        'address',
        'city',
        'province',
        'postal_code',
        'country',
        'tax_id',
        'business_permit',
        'credit_limit',
        'payment_terms',
        'is_active',
        'notes',
    ];

    public function projects()
    {
        return $this->hasMany(Project::class, 'client_id');
    }
}
