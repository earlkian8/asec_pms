# Resend Email Setup Instructions

## Configuration

To use Resend for sending client credentials emails, you need to configure the following in your `.env` file:

### 1. Mail Configuration

```env
MAIL_MAILER=resend
MAIL_FROM_ADDRESS=noreply@yourdomain.com
MAIL_FROM_NAME="Your Company Name"
```

**IMPORTANT:** The `MAIL_FROM_ADDRESS` must be a verified domain/email in your Resend account. For testing, you can use the Resend test domain, but for production, you need to verify your domain.

### 2. Resend API Key

Add your Resend API key to the `.env` file:

```env
RESEND_API_KEY=re_your_api_key_here
```

**To get your API key:**
1. Go to https://resend.com
2. Sign up or log in
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key (starts with `re_`)
6. Add it to your `.env` file

### 3. Client Portal URL (Optional)

If your client portal is hosted on a different domain, set the URL:

```env
CLIENT_PORTAL_URL=https://your-client-portal-domain.com/login
```

If not set, it will default to your app URL.

### 4. Clear Config Cache

After updating `.env`, run:

```bash
php artisan config:clear
php artisan cache:clear
```

## How It Works

1. **When a client is created:**
   - An email is automatically sent to the client with their login credentials (email and password)
   - The email includes a professional HTML template with:
     - Welcome message
     - Login credentials (email and password)
     - Direct link to the client portal
     - Security reminders

2. **First Login:**
   - When a client logs in for the first time (or if `password_changed_at` is null), they are automatically redirected to the change password page
   - They cannot access the portal until they change their password

3. **Password Change:**
   - Client must enter their current password
   - Set a new password (minimum 8 characters)
   - Confirm the new password
   - After successful change, they are logged out and redirected to login

## Email Template

The email template is located at:
- `backend/resources/views/emails/client-credentials.blade.php`

You can customize this template to match your branding.

## Testing

To test the email functionality:

1. Make sure your `.env` has the correct Resend API key
2. Create a new client in the admin panel
3. Check the client's email inbox for the credentials email
4. Try logging in with the provided credentials
5. You should be redirected to the change password page

## Troubleshooting

- **Emails not sending:** Check your Resend API key and ensure it's valid
- **Email in spam:** Make sure your Resend domain is verified
- **Template not rendering:** Check that the Blade template file exists and is readable

