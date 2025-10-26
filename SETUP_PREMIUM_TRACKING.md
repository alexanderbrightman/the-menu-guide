# Setting Up Premium Membership Tracking

## Current Issue
After a Stripe payment, the webhook should automatically upgrade the user to premium status, but the database columns are missing.

## Solution

### Step 1: Run Database Migration

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Click on **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy and paste the following SQL:

```sql
-- Add Stripe-related columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS stripe_customer_id text,
ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
ADD COLUMN IF NOT EXISTS subscription_current_period_end timestamp with time zone,
ADD COLUMN IF NOT EXISTS subscription_cancel_at_period_end boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS subscription_canceled_at timestamp with time zone;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id ON profiles(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_subscription_id ON profiles(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_current_period_end ON profiles(subscription_current_period_end);
```

6. Click **Run** (or press Ctrl+Enter)
7. You should see "Success. No rows returned"

### Step 2: Verify Webhook Configuration

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/webhooks)
2. Find your webhook endpoint
3. Verify these events are enabled:
   - ✅ `checkout.session.completed`
   - ✅ `customer.subscription.created`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`
   - ✅ `invoice.payment_succeeded`
   - ✅ `invoice.payment_failed`

4. Verify the endpoint URL is your production URL (not localhost):
   ```
   https://your-domain.com/api/stripe/webhook
   ```

### Step 3: Test the Payment Flow

1. **Create a test user account**
2. **Go to the upgrade page**
3. **Use Stripe test card**: `4242 4242 4242 4242`
   - Any future expiry date
   - Any CVC
   - Any ZIP code
4. **Complete payment**
5. **Verify in database**:

Run this in Supabase SQL Editor:
```sql
SELECT 
  id,
  username,
  subscription_status,
  is_public,
  stripe_customer_id,
  stripe_subscription_id,
  subscription_current_period_end
FROM profiles
WHERE id = 'your_user_id_here';
```

Expected results:
- `subscription_status` = `'pro'`
- `is_public` = `true`
- `stripe_customer_id` = `cus_xxxxx`
- `stripe_subscription_id` = `sub_xxxxx`
- `subscription_current_period_end` = future timestamp

### Step 4: Check Webhook Logs

If the profile didn't update, check the webhook logs:

1. **In your application logs** (Vercel/your hosting):
   Look for logs starting with:
   - `[Webhook] Received event: checkout.session.completed`
   - `[Checkout] Processing subscription:`
   - `[ManageSubscription] Successfully updated profile`

2. **In Stripe Dashboard**:
   - Go to Webhooks
   - Click on your webhook
   - View "Events" tab
   - Click on recent events to see delivery status

### Troubleshooting

#### Issue: Profile Not Updating After Payment

**Possible causes:**

1. **Database columns missing**
   - Solution: Run the SQL migration above

2. **Webhook not being called**
   - Check webhook endpoint URL in Stripe dashboard
   - Verify endpoint is accessible (not behind firewall)

3. **Missing metadata in checkout**
   - Verify `create-checkout-session/route.ts` includes metadata:
   ```typescript
   metadata: {
     userId: user.id,
     profileId: profile.id,
   }
   ```

4. **Webhook secret mismatch**
   - Verify `STRIPE_WEBHOOK_SECRET` in environment variables matches Stripe

#### Issue: Webhook Returns 400 Error

Check application logs for:
- Signature verification failed
- Missing parameters
- Database errors

Common fixes:
- Verify webhook secret is correct
- Ensure database migration has run
- Check database permissions

### Manual Verification Query

Run this to see all premium users:

```sql
SELECT 
  id,
  username,
  subscription_status,
  is_public,
  subscription_current_period_end,
  CASE 
    WHEN subscription_current_period_end > NOW() THEN 'Active'
    ELSE 'Expired'
  END as status
FROM profiles
WHERE subscription_status = 'pro'
ORDER BY subscription_current_period_end DESC;
```

### Testing Locally

If you want to test locally before deploying:

1. **Install Stripe CLI**:
   ```bash
   brew install stripe/stripe-cli/stripe
   stripe login
   ```

2. **Forward webhooks**:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
   (Copy the webhook secret and add to `.env.local`)

3. **Trigger test event**:
   ```bash
   stripe trigger checkout.session.completed
   ```

### Success Indicators

✅ **Payment succeeds**
✅ **Webhook receives event**
✅ **Database shows**:
- `subscription_status = 'pro'`
- `is_public = true`
✅ **User can access premium features**
✅ **Menu is publicly accessible**

### Support

If issues persist:
1. Check application logs for webhook processing
2. Verify Stripe webhook delivery in dashboard
3. Confirm database migration was run
4. Test with Stripe CLI locally
5. Review WEBHOOK_TESTING.md for more details
