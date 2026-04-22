<?php

namespace App\Mail;

use App\Models\Family;
use App\Models\Medicine;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Collection;

class MedicineCompletionMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public User $recipient,
        public Family $family,
        public Collection $medicines,
    ) {
    }

    public function envelope(): Envelope
    {
        $count   = $this->medicines->count();
        $subject = $count === 1
            ? "Medicine Course Completed: {$this->medicines->first()->name} — {$this->family->name}"
            : "{$count} medicine courses completed for {$this->family->name}";

        return new Envelope(subject: $subject);
    }

    public function content(): Content
    {
        return new Content(view: 'emails.medicine-completion');
    }
}
