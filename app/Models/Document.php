<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Document extends Model
{
    use HasFactory;

    protected $fillable = [
        'family_id', 'uploaded_by', 'title', 'type', 'document_number',
        'member_name', 'issue_date', 'expiry_date', 'file_path',
        'file_name', 'notes', 'is_reminder_enabled', 'reminder_days_before',
    ];

    protected $casts = [
        'issue_date' => 'date',
        'expiry_date' => 'date',
        'is_reminder_enabled' => 'boolean',
    ];

    public function family()
    {
        return $this->belongsTo(Family::class);
    }

    public function uploader()
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    public function isExpired(): bool
    {
        return $this->expiry_date && $this->expiry_date->isPast();
    }

    public function isExpiringSoon(int $days = 30): bool
    {
        return $this->expiry_date &&
            !$this->isExpired() &&
            $this->expiry_date->diffInDays(now()) <= $days;
    }
}
