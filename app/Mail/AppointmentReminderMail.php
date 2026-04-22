<?php

namespace App\Mail;

use App\Models\Appointment;
use App\Models\Family;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Collection;

class AppointmentReminderMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public User $recipient,
        public Family $family,
        public Collection $appointments,
    ) {
    }

    public function envelope(): Envelope
    {
        $count   = $this->appointments->count();
        $subject = $count === 1
            ? "Appointment Reminder: Dr. {$this->appointments->first()->doctor_name} — {$this->family->name}"
            : "{$count} upcoming appointments for {$this->family->name}";

        return new Envelope(subject: $subject);
    }

    public function content(): Content
    {
        return new Content(view: 'emails.appointment-reminder');
    }
}
