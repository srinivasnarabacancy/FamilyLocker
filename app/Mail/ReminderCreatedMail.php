<?php

namespace App\Mail;

use App\Models\Family;
use App\Models\Reminder;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ReminderCreatedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public User $recipient,
        public User $creator,
        public Family $family,
        public Reminder $reminder,
    ) {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "New Reminder Added: {$this->reminder->title} — {$this->family->name}"
        );
    }

    public function content(): Content
    {
        return new Content(view: 'emails.reminder-created');
    }
}
