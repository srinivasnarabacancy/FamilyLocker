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
use Illuminate\Support\Collection;

class ReminderNotificationMail extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * @param  User        $recipient   The family member receiving the email.
     * @param  Family      $family      The family the reminders belong to.
     * @param  Collection  $reminders   Active reminders that are due for notification.
     */
    public function __construct(
        public User $recipient,
        public Family $family,
        public Collection $reminders,
    ) {
    }

    public function envelope(): Envelope
    {
        $count = $this->reminders->count();
        $subject = $count === 1
            ? "Reminder: {$this->reminders->first()->title} — {$this->family->name}"
            : "{$count} upcoming reminders for {$this->family->name}";

        return new Envelope(subject: $subject);
    }

    public function content(): Content
    {
        return new Content(view: 'emails.reminder-notification');
    }
}
