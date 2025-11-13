# Password Reset Email Setup Guide

## Issue: Not Receiving Password Reset Emails

If you're not receiving password reset emails, follow these steps to troubleshoot and configure Supabase email settings.

## Step 1: Configure Redirect URL in Supabase

1. Go to your Supabase Dashboard: https://app.supabase.com
2. Select your project
3. Navigate to **Authentication** → **URL Configuration**
4. Add your redirect URLs:
   - **Site URL**: `http://localhost:3000` (for development)
   - **Redirect URLs**: Add both:
     - `http://localhost:3000/auth/reset-password`
     - `https://your-production-domain.com/auth/reset-password` (for production)

## Step 2: Check Supabase Email Settings

### Option A: Use Supabase Default Email (Limited - For Testing Only)

Supabase's default email provider has very low rate limits and may not send emails reliably. It's fine for testing but not recommended for production.

1. Go to **Authentication** → **Email Templates**
2. Verify the "Reset Password" template exists
3. Check that email sending is enabled

### Option B: Configure Custom SMTP (Recommended for Production)

For reliable email delivery, configure your own SMTP provider:

1. Go to **Project Settings** → **Auth** → **SMTP Settings**
2. Enable **Custom SMTP**
3. Configure your SMTP provider (Gmail, SendGrid, Mailgun, etc.)

**Example Gmail SMTP Configuration:**
```
SMTP Host: smtp.gmail.com
SMTP Port: 587
SMTP User: your-email@gmail.com
SMTP Password: [App Password - see below]
Sender Email: your-email@gmail.com
Sender Name: The Menu Guide
```

**To get Gmail App Password:**
1. Enable 2-Factor Authentication on your Google account
2. Go to Google Account → Security → App Passwords
3. Generate a new app password for "Mail"
4. Use this password in SMTP configuration

## Step 3: Check Email Logs

1. Go to **Authentication** → **Logs** in Supabase Dashboard
2. Look for password reset attempts
3. Check for any error messages related to email sending

## Step 4: Verify Email Address

- Make sure the email address you're using matches exactly the one in your account
- Check for typos
- Try with a different email address if possible

## Step 5: Check Spam/Junk Folder

- Password reset emails often go to spam
- Check your spam/junk folder
- Add the sender to your contacts/whitelist

## Step 6: Test Email Configuration

1. Try requesting a password reset again
2. Check the browser console (F12) for any error messages
3. Check Supabase Auth logs for delivery status

## Common Issues

### Issue: "Email rate limit exceeded"
**Solution**: Configure custom SMTP or wait before trying again

### Issue: "Invalid redirect URL"
**Solution**: Make sure the redirect URL is added in Supabase Dashboard → Authentication → URL Configuration

### Issue: "Email not configured"
**Solution**: Configure SMTP settings in Supabase Dashboard

## Testing Locally

For local development, you can:

1. Use Supabase's default email (may be unreliable)
2. Configure custom SMTP with a test email provider
3. Check Supabase Auth logs to see if emails are being sent

## Production Checklist

Before deploying to production:

- [ ] Custom SMTP configured
- [ ] Redirect URLs added for production domain
- [ ] Email templates customized (optional)
- [ ] Test password reset flow end-to-end
- [ ] Verify emails are delivered (not in spam)

## Need Help?

If emails still aren't being sent:

1. Check Supabase Dashboard → Authentication → Logs
2. Verify SMTP configuration is correct
3. Test SMTP settings with a simple email test
4. Contact Supabase support if issues persist

