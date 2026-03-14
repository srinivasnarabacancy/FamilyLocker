<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Appointment extends Model
{
    use HasFactory;

    protected $fillable = [
        'family_id', 'user_id', 'member_name', 'doctor_name',
        'specialty', 'date', 'time', 'location', 'notes', 'status',
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
}
