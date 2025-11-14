<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProjectFile extends Model
{
     use HasFactory;

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
