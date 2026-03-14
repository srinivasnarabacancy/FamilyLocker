<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MedicalRecord extends Model
{
    use HasFactory;

    protected $fillable = [
        'family_id', 'user_id', 'member_name', 'type', 'title',
        'doctor_name', 'hospital_name', 'date', 'diagnosis',
        'notes', 'file_path', 'file_name',
    ];

    protected $casts = [
        'date' => 'date',
    ];

    public function family()
    {
        return $this->belongsTo(Family::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function medicines()
    {
        return $this->hasMany(Medicine::class);
    }
}
