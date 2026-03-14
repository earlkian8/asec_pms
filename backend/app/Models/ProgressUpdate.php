<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ProgressUpdate extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'project_task_id',
        'description',
        'file_path',
        'original_name',
        'file_type',
        'file_size',
        'created_by',
    ];

    public function task()
    {
        return $this->belongsTo(ProjectTask::class, 'project_task_id');
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
