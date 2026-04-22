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
        'remind_days_before', 'notification_sent_at',
    ];

    protected $casts = [
        'date'                 => 'date',
        'notification_sent_at' => 'date',
        'remind_days_before'   => 'integer',
    ];

    public function shouldNotifyToday(): bool
    {
        if ($this->status === 'cancelled') return false;

        $daysUntil = (int) now()->startOfDay()->diffInDays($this->date, false);

        if ($daysUntil < 0 || $daysUntil > $this->remind_days_before) return false;

        // Don't re-notify if already sent today
        if ($this->notification_sent_at && $this->notification_sent_at->isToday()) return false;

        return true;
    }

    public function family()
    {
        return $this->belongsTo(Family::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
