<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ProjectBoqSection extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'project_id',
        'code',
        'name',
        'description',
        'sort_order',
    ];

    protected $casts = [
        'sort_order' => 'integer',
    ];

    public function project()
    {
        return $this->belongsTo(Project::class);
    }

    public function items()
    {
        return $this->hasMany(ProjectBoqItem::class)->orderBy('sort_order');
    }
}
