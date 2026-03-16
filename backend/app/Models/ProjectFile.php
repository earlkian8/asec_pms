<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ProjectFile extends Model
{
     use HasFactory, SoftDeletes;

    protected $table = 'project_files';

    protected $fillable = [
        'project_id',
        'file_name',
        'original_name',
        'file_path',
        'file_size',
        'file_type',
        'mime_type',
        'category',
        'description',
        'uploaded_at',
    ];

    protected $casts = [
        'uploaded_at' => 'datetime',
        'file_size'   => 'integer',
    ];

    /**
     * Relationships
     */
    public function project()
    {
        return $this->belongsTo(Project::class);
    }
}
