# 🔗 Stripe Webhook Setup Guide

## Overview
This guide will help you set up Stripe webhooks for automatic subscription management in The Menu Guide.

## Prerequisites
- Stripe account with API keys configured
- ngrok account (free)
- Your app running on localhost:3001

## Step 1: Set Up ngrok

### 1.1 Create ngrok Account
1. Go to: https://dashboard.ngrok.com/signup
2. Sign up for a free account
3. Verify your email

### 1.2 Get Your Auth Token
1. Go to: https://dashboard.ngrok.com/get-started/your-authtoken
2. Copy your authtoken (looks like: `2abc123def456ghi789jkl012mno345pqr678stu`)

### 1.3 Configure ngrok
```bash
ngrok config add-authtoken YOUR_TOKEN_HERE
```

### 1.4 Start ngrok Tunnel
```bash
ngrok http 3001
```

This will give you a URL like: `https://abc123.ngrok.io`

## Step 2: Create Stripe Webhook

### 2.1 Go to Stripe Dashboard
1. Navigate to: https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"

### 2.2 Configure Webhook
- **Endpoint URL:** `https://your-ngrok-url.ngrok.io/api/stripe/webhook`
- **Description:** "The Menu Guide Subscription Webhooks"

### 2.3 Select Events
Check these boxes:
- ✅ `checkout.session.completed`
- ✅ `customer.subscription.created`
- ✅ `customer.subscription.updated`
- ✅ `customer.subscription.deleted`
- ✅ `invoice.payment_succeeded`
- ✅ `invoice.payment_failed`

### 2.4 Create Webhook
Click "Add endpoint"

## Step 3: Get Webhook Secret

### 3.1 Access Webhook Details
1. Click on your newly created webhook
2. Click "Reveal" next to "Signing secret"
3. Copy the secret (starts with `whsec_`)

## Step 4: Update Environment Variables

Add this to your `.env.local` file:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

## Step 5: Test the Webhook

### 5.1 Test Webhook Endpoint
Visit: `https://your-ngrok-url.ngrok.io/api/stripe/webhook`

You should see:
```json
{
  "message": "Stripe webhook endpoint is ready",
  "timestamp": "2025-10-21T..."
}
```

### 5.2 Test Payment Flow
1. Go to your dashboard
2. Click "Upgrade Now"
3. Complete payment with test card: `4242 4242 4242 4242`
4. Check your terminal logs for webhook events

### 5.3 Verify Automatic Upgrade
After successful payment:
1. Your account should automatically upgrade to "pro"
2. Check Stripe dashboard for webhook delivery logs
3. Check your terminal for webhook event logs

## Step 6: Monitor Webhook Events

### 6.1 Stripe Dashboard
- Go to your webhook in Stripe dashboard
- Check "Recent deliveries" tab
- Look for successful webhook calls

### 6.2 Terminal Logs
Watch your terminal for logs like:
```
Received webhook event: checkout.session.completed
Successfully updated profile abc123 to pro
```

## Troubleshooting

### Common Issues

#### 1. Webhook Not Receiving Events
- Check ngrok is running: `ngrok http 3001`
- Verify webhook URL in Stripe dashboard
- Check webhook secret in environment variables

#### 2. Webhook Signature Verification Failed
- Ensure `STRIPE_WEBHOOK_SECRET` is correct
- Check webhook secret starts with `whsec_`

#### 3. Profile Not Updating
- Check `SUPABASE_SERVICE_ROLE_KEY` is correct
- Verify profile exists in database
- Check terminal logs for errors

#### 4. ngrok Authentication Failed
- Run: `ngrok config add-authtoken YOUR_TOKEN`
- Verify token is correct

## Production Deployment

When deploying to production:

1. **Update webhook URL** to your production domain
2. **Use production Stripe keys** (not test keys)
3. **Set up proper SSL** for webhook endpoint
4. **Monitor webhook delivery** in Stripe dashboard

## Webhook Events Handled

| Event | Description | Action |
|-------|-------------|--------|
| `checkout.session.completed` | Payment completed | Upgrade to pro |
| `customer.subscription.created` | New subscription | Set to pro |
| `customer.subscription.updated` | Subscription changed | Update status |
| `customer.subscription.deleted` | Subscription canceled | Set to canceled |
| `invoice.payment_succeeded` | Payment successful | Log success |
| `invoice.payment_failed` | Payment failed | Log failure |

## Security Notes

- Webhook secret is required for signature verification
- Use service role key for database updates
- Never expose webhook secret in client-side code
- Monitor webhook delivery for security

---

**Need Help?** Check the terminal logs and Stripe dashboard webhook delivery logs for debugging information.
