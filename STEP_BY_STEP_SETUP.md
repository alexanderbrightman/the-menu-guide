# 🎯 Step-by-Step: Enable Premium Tracking

## What We're Doing
After a user pays, their account should automatically upgrade to premium. The webhook code is ready, but we need to add database columns.

---

## Step 1: Run Database Migration in Supabase

### 1.1 Go to Supabase
1. Open https://supabase.com/dashboard in your browser
2. Click on **your project** (the-menu-guide or whatever you named it)

### 1.2 Open SQL Editor
1. In the left sidebar, click **SQL Editor** (it has a database icon)
2. Click the **New Query** button at the top

### 1.3 Paste and Run the SQL
1. **Copy this entire SQL block:**

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

2. **Paste it** into the SQL Editor
3. Click the **RUN** button (or press Cmd+Enter / Ctrl+Enter)
4. You should see: ✅ **"Success. No rows returned"**

**✅ Step 1 Complete!**

---

## Step 2: Verify Webhook is Configured in Stripe

### 2.1 Go to Stripe Dashboard
1. Open https://dashboard.stripe.com/webhooks in your browser
2. Login to your Stripe account

### 2.2 Check Your Webhook Endpoint
1. You should see your webhook endpoint listed
2. Click on it to view details
3. Verify these events are checked:
   - ✅ `checkout.session.completed`
   - ✅ `customer.subscription.created`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`
   - ✅ `invoice.payment_succeeded`
   - ✅ `invoice.payment_failed`

### 2.3 Verify Endpoint URL
- Should be: `https://your-domain.com/api/stripe/webhook`
- **NOT** `localhost:3000` (that's for local testing only)

**✅ Step 2 Complete!**

---

## Step 3: Test with a Payment

### 3.1 Make a Test Payment
1. Go to your deployed app (or localhost if testing locally)
2. Sign up or log in
3. Click "Upgrade" or "Go Pro" button
4. Use this **Stripe test card**:
   - **Card:** `4242 4242 4242 4242`
   - **Expiry:** Any future date (e.g., 12/25)
   - **CVC:** Any 3 digits (e.g., 123)
   - **ZIP:** Any ZIP code (e.g., 12345)
5. Complete the payment

### 3.2 Verify It Worked
Go back to Supabase SQL Editor and run:

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

You should see your user with:
- `subscription_status` = `'pro'`
- `is_public` = `true`
- Both Stripe IDs are filled in

**✅ Step 3 Complete!**

---

## ✅ Success Checklist

After completing all steps, you should have:

- [x] Database columns added (Step 1)
- [x] Webhook configured in Stripe (Step 2)
- [x] Test payment successfully updates profile (Step 3)

---

## 🐛 If Something Goes Wrong

### Profile Not Updating After Payment?

**Check 1: Did you run the SQL?**
```sql
-- Run this to check if columns exist:
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name LIKE 'stripe%';
```

**Check 2: Are webhooks being received?**
- Go to Stripe Dashboard → Webhooks → Your endpoint
- Click "Events" tab
- Look for recent `checkout.session.completed` events
- If you see ❌ red X's, click the event to see the error

**Check 3: Check your application logs**
- Go to Vercel (or your hosting) → Logs
- Look for logs starting with `[Webhook]` or `[Checkout]`

---

## 🎉 You're Done!

Now when users pay:
1. Stripe processes the payment ✅
2. Webhook automatically fires ✅  
3. Database updates profile to 'pro' ✅
4. User gets premium features ✅

**No manual intervention needed!**
