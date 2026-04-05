<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class Reminder extends Model
{
    use HasFactory;

    protected $fillable = [
        'family_id', 'created_by', 'title', 'type',
        'occasion_date', 'recurs_yearly', 'remind_days_before',
        'description', 'is_active', 'notification_sent_at',
    ];

    protected $casts = [
        'occasion_date'        => 'date',
        'recurs_yearly'        => 'boolean',
        'is_active'            => 'boolean',
        'remind_days_before'   => 'integer',
        'notification_sent_at' => 'date',
    ];

    protected $appends = ['next_occurrence', 'days_until'];

    // ─── Relationships ────────────────────────────────────────────────────────

    public function family()
    {
        return $this->belongsTo(Family::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    // ─── Computed attributes ──────────────────────────────────────────────────

    /**
     * Returns the next occurrence of this reminder as a Carbon date.
     */
    public function getNextOccurrenceAttribute(): ?string
    {
        if (!$this->occasion_date) {
            return null;
        }

        $today = Carbon::today();
        $next  = $this->occasion_date->copy();

        if ($this->recurs_yearly) {
            $next->year($today->year);

            // If this year's occurrence is already in the past, roll forward a year.
            if ($next->lt($today)) {
                $next->addYear();
            }
        }

        return $next->toDateString();
    }

    /**
     * Number of days from today until the next occurrence.
     */
    public function getDaysUntilAttribute(): ?int
    {
        if (!$this->next_occurrence) {
            return null;
        }

        return Carbon::today()->diffInDays(Carbon::parse($this->next_occurrence), false);
    }

    /**
     * Whether this reminder should trigger an email notification today.
     *
     * Conditions:
     *  - is_active is true
     *  - days_until is within the remind_days_before window (0 ≤ days_until ≤ remind_days_before)
     *  - No notification has been sent yet this occurrence cycle
     *    (notification_sent_at is null OR it was sent in a previous year for yearly reminders)
     */
    public function shouldNotifyToday(): bool
    {
        if (!$this->is_active) {
            return false;
        }

        $daysUntil = $this->days_until;

        if ($daysUntil === null || $daysUntil < 0 || $daysUntil > $this->remind_days_before) {
            return false;
        }

        if ($this->notification_sent_at === null) {
            return true;
        }

        // For yearly reminders, allow re-notification in a new occurrence year.
        if ($this->recurs_yearly) {
            $nextOccurrenceYear = Carbon::parse($this->next_occurrence)->year;
            return $this->notification_sent_at->year < $nextOccurrenceYear;
        }

        // For one-time reminders, never notify again once sent.
        return false;
    }
}
