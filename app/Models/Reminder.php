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
        'description', 'is_active',
    ];

    protected $casts = [
        'occasion_date'    => 'date',
        'recurs_yearly'    => 'boolean',
        'is_active'        => 'boolean',
        'remind_days_before' => 'integer',
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
}
