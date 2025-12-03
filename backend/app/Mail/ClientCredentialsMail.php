<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ClientCredentialsMail extends Mailable
{
    use Queueable, SerializesModels;

    public $client;
    public $password;
    public $loginUrl;

    /**
     * Create a new message instance.
     */
    public function __construct($client, $password, $loginUrl = null)
    {
        $this->client = $client;
        $this->password = $password;
        $this->loginUrl = $loginUrl ?? config('app.client_portal_url', 'https://your-client-portal.com/login');
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            from: new \Illuminate\Mail\Mailables\Address(
                config('mail.from.address'),
                config('mail.from.name')
            ),
            subject: 'Welcome to ' . config('app.name') . ' - Your Client Portal Credentials',
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.client-credentials',
            with: [
                'clientName' => $this->client->client_name ?? $this->client->contact_person,
                'email' => $this->client->email,
                'password' => $this->password,
                'loginUrl' => $this->loginUrl,
                'appName' => config('app.name'),
            ],
        );
    }

    /**
     * Get the attachments for the message.
     *
     * @return array<int, \Illuminate\Mail\Mailables\Attachment>
     */
    public function attachments(): array
    {
        return [];
    }
}

