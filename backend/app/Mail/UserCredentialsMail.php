<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class UserCredentialsMail extends Mailable
{
    use Queueable, SerializesModels;

    public $user;
    public $password;
    public $loginUrl;

    public function __construct($user, $password, $loginUrl = null)
    {
        $this->user = $user;
        $this->password = $password;
        $this->loginUrl = $loginUrl ?? url('/login');
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            from: new \Illuminate\Mail\Mailables\Address(
                config('mail.from.address'),
                config('mail.from.name')
            ),
            subject: 'Welcome to ' . config('app.name') . ' - Your Account Credentials',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.user-credentials',
            with: [
                'userName'  => $this->user->name,
                'email'     => $this->user->email,
                'role'      => $this->user->roles->first()?->name ?? 'User',
                'password'  => $this->password,
                'loginUrl'  => $this->loginUrl,
                'appName'   => config('app.name'),
            ],
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
