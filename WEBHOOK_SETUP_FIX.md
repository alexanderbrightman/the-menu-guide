# 🔧 Fixing Failing Webhook - Step by Step

## Understanding Why It Fails

The webhook can fail for several reasons:
1. **Missing database columns** - The webhook tries to update columns that don't exist
2. **Webhook secret mismatch** - The secret in Stripe doesn't match your environment
3. **Wrong events selected** - Missing required events
4. **Wrong endpoint URL** - Pointing to wrong domain

---

## Step 1: Run Database Migration (CRITICAL)

**This is the #1 reason webhooks fail!**

### In Supabase SQL Editor, run this:

```sql
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS stripe_customer_id text,
ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
ADD COLUMN IF NOT EXISTS subscription_current_period_end timestamp with time zone,
ADD COLUMN IF NOT EXISTS subscription_cancel_at_period_end boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS subscription_canceled_at timestamp with time zone;

CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id ON profiles(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_subscription_id ON profiles(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_current_period_end ON profiles(subscription_current_period_end);
```

**Verify it worked:**
```sql
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name LIKE '%stripe%';
```

You should see 3 rows returned.

---

## Step 2: Delete Old Webhook and Create New One

### In Stripe Dashboard:

1. **Go to:** https://dashboard.stripe.com/webhooks
2. **Find your webhook endpoint**
3. **Click the trash icon** to delete it
4. **Click "Add endpoint"** button
5. **Configure it:**

#### Endpoint URL:
```
https://YOUR_DOMAIN/api/stripe/webhook
```
Replace `YOUR_DOMAIN` with your actual domain (e.g., `themenu-guide.vercel.app`)

#### Events to send:
Check ALL of these:
- ✅ `checkout.session.completed`
- ✅ `customer.subscription.created`
- ✅ `customer.subscription.updated`
- ✅ `customer.subscription.deleted`
- ✅ `invoice.payment_succeeded`
- ✅ `invoice.payment_failed`

6. **Click "Add endpoint"**

---

## Step 3: Get Webhook Secret

After creating the endpoint:

1. **Click on your new webhook** to open it
2. **Find "Signing secret"**
3. **Click "Reveal"** to show it
4. **Copy the secret** (starts with `whsec_`)

---

## Step 4: Add Webhook Secret to Environment Variables

### Option A: If deploying to Vercel

1. Go to your Vercel project
2. Go to **Settings** → **Environment Variables**
3. Add/Update this variable:
   - **Name:** `STRIPE_WEBHOOK_SECRET`
   - **Value:** (paste the secret you copied)
4. **Important:** Make sure it's added to **Production** environment
5. Click **Save**
6. **Redeploy** your application (Vercel should auto-redeploy, but you can click "Redeploy" in Deployments tab)

### Option B: If testing locally

1. Open `.env.local` in your project
2. Add/Update:
```env
STRIPE_WEBHOOK_SECRET=whsec_your_secret_here
```
3. Restart your dev server

---

## Step 5: Verify Environment Variables

Make sure you have ALL these in your environment:

### Required Variables:
- ✅ `NEXT_PUBLIC_SUPABASE_URL`
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- ✅ `SUPABASE_SERVICE_ROLE_KEY` (for webhook to update database)
- ✅ `STRIPE_SECRET_KEY`
- ✅ `STRIPE_WEBHOOK_SECRET` ← **This is the one we just added**
- ✅ `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

---

## Step 6: Test the Webhook

### Method 1: Make a Test Payment

1. Go to your app
2. Sign in
3. Click "Upgrade"
4. Use test card: `4242 4242 4242 4242`
5. Complete payment

### Method 2: Send Test Event from Stripe

1. Go to Stripe Dashboard → Webhooks
2. Click on your webhook
3. Click "Send test webhook"
4. Select "checkout.session.completed"
5. Click "Send test webhook"

---

## Step 7: Check the Results

### In Stripe Dashboard:
1. Go to Webhooks → Your endpoint
2. Click "Events" tab
3. Look at the most recent event
4. Check status:
   - ✅ Green = Success
   - ❌ Red = Failed (click to see error)

### In Your Application Logs (Vercel):
1. Go to Vercel → Your Project → Logs
2. Look for logs starting with:
   - `[Webhook] Received event`
   - `[Checkout] Processing subscription`
   - `[ManageSubscription] Successfully updated profile`

### In Database:
Run this query in Supabase:
```sql
SELECT 
  username,
  subscription_status,
  is_public,
  stripe_customer_id,
  stripe_subscription_id
FROM profiles
WHERE subscription_status = 'pro';
```

---

## Common Error Messages & Fixes

### Error: "Missing required parameters"
**Cause:** Webhook received but metadata is missing
**Fix:** Check that checkout session includes metadata:
```typescript
metadata: {
  userId: user.id,
  profileId: profile.id,
}
```

### Error: "Profile not found"
**Cause:** User ID or profile ID in metadata is wrong
**Fix:** Check the checkout session creation code

### Error: "Database connection failed"
**Cause:** Supabase credentials wrong or service role key missing
**Fix:** Verify `SUPABASE_SERVICE_ROLE_KEY` is set

### Error: "Signature verification failed"
**Cause:** Webhook secret mismatch
**Fix:** 
1. Delete webhook in Stripe
2. Create new webhook
3. Copy new secret
4. Update environment variable
5. Redeploy

---

## Verification Checklist

Before testing, make sure:

- [x] Database migration ran successfully
- [x] Webhook endpoint URL is correct (production domain)
- [x] All 6 events are selected in webhook
- [x] Webhook secret is in environment variables
- [x] Service role key is in environment variables
- [x] Application redeployed after adding secrets

---

## Still Failing?

1. **Check Vercel logs** for detailed error messages
2. **Check Stripe event details** - click on failed event in Stripe dashboard
3. **Test endpoint directly:**
   ```bash
   curl https://YOUR_DOMAIN/api/stripe/webhook
   ```
   Should return: `{"message":"Stripe webhook endpoint is ready"}`

4. **Verify webhook secret matches:**
   - Stripe: Go to webhook → Signing secret
   - Vercel: Settings → Environment Variables → `STRIPE_WEBHOOK_SECRET`
   - They must match EXACTLY (including the `whsec_` prefix)

---

## Quick Test

Run this in Stripe CLI (if you have it installed):

```bash
stripe listen --forward-to https://YOUR_DOMAIN/api/stripe/webhook
stripe trigger checkout.session.completed
```

This will show you real-time webhook processing.
