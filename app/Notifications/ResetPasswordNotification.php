<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ResetPasswordNotification extends Notification
{
    use Queueable;

    public function __construct(public string $token) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        // Build a URL that points to the SPA frontend, not a Laravel route
        $frontendUrl = config('app.url') . '/reset-password?'
            . http_build_query([
                'token' => $this->token,
                'email' => $notifiable->getEmailForPasswordReset(),
            ]);

        return (new MailMessage)
            ->subject('Reset Your Password — Smart Stock')
            ->greeting('Hello ' . ($notifiable->name ?? '') . ',')
            ->line('You are receiving this email because we received a password reset request for your account.')
            ->action('Reset Password', $frontendUrl)
            ->line('This link will expire in ' . config('auth.passwords.users.expire', 60) . ' minutes.')
            ->line('If you did not request a password reset, no further action is required.');
    }
}
