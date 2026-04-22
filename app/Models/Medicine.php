<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Medicine extends Model
{
    use HasFactory;

    protected $fillable = [
        'medical_record_id', 'family_id', 'member_name',
        'name', 'dosage', 'frequency', 'start_date',
        'end_date', 'is_active', 'notes', 'image_path',
        'notify_on_completion',
    ];

    protected $casts = [
        'start_date'            => 'date',
        'end_date'              => 'date',
        'is_active'             => 'boolean',
        'notify_on_completion'  => 'boolean',
    ];

    public function medicalRecord()
    {
        return $this->belongsTo(MedicalRecord::class);
    }

    public function family()
    {
        return $this->belongsTo(Family::class);
    }
}
