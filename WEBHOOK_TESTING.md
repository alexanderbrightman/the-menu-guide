# Webhook Testing Guide

This guide explains how to test the Stripe webhook handler to ensure payments properly update user subscription status.

## Prerequisites

1. Stripe CLI installed: https://stripe.com/docs/stripe-cli
2. Supabase local development setup
3. ngrok or similar tunneling service for local development

## Local Testing Setup

### 1. Install Stripe CLI

```bash
# macOS
brew install stripe/stripe-cli/stripe

# Or download from: https://github.com/stripe/stripe-cli/releases
```

### 2. Login to Stripe CLI

```bash
stripe login
```

### 3. Start your development server

```bash
npm run dev
```

### 4. Forward Stripe webhooks to your local endpoint

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

This will output a webhook secret (starts with `whsec_`). **Add this to your `.env.local`:**

```env
STRIPE_WEBHOOK_SECRET=whsec_your_secret_here
```

### 5. Trigger Test Events

In a new terminal window, trigger test events:

```bash
# Test successful checkout
stripe trigger checkout.session.completed

# Test subscription update
stripe trigger customer.subscription.updated

# Test payment success
stripe trigger invoice.payment_succeeded
```

## Testing Payment Flow

### Step 1: Create a Test User

1. Sign up a test user in your app
2. Note the user ID and profile ID

### Step 2: Initiate Payment

1. Go to the dashboard
2. Click "Upgrade" to start checkout
3. Use test card: `4242 4242 4242 4242`
4. Complete the checkout

### Step 3: Verify Database Update

Check that the webhook processed correctly:

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
WHERE id = 'your_user_id';
```

Expected results:
- `subscription_status` = `'pro'`
- `is_public` = `true`
- `stripe_customer_id` is set
- `stripe_subscription_id` is set
- `subscription_current_period_end` is set

## Integration Tests

### Test 1: Successful Subscription Creation

```typescript
// Test that checkout.session.completed properly upgrades user to pro
describe('Subscription Webhook', () => {
  it('should upgrade user after successful payment', async () => {
    // 1. Create test user
    const user = await createTestUser()
    
    // 2. Simulate successful checkout
    const mockEvent = createMockCheckoutSessionEvent({
      userId: user.id,
      profileId: user.profileId
    })
    
    // 3. Process webhook
    await processWebhook(mockEvent)
    
    // 4. Verify database
    const updatedProfile = await getProfile(user.id)
    expect(updatedProfile.subscription_status).toBe('pro')
    expect(updatedProfile.is_public).toBe(true)
  })
})
```

### Test 2: Idempotency

```typescript
it('should not process duplicate events', async () => {
  const eventId = 'evt_test_123'
  const mockEvent = createMockEvent(eventId)
  
  // Process twice
  await processWebhook(mockEvent)
  const result = await processWebhook(mockEvent)
  
  // Should skip second time
  expect(result.skipped).toBe(true)
})
```

### Test 3: Cancellation Handling

```typescript
it('should handle subscription cancellation correctly', async () => {
  const user = await createTestUserWithSubscription()
  
  const mockEvent = createMockSubscriptionEvent({
    status: 'canceled',
    canceled_at: Date.now()
  })
  
  await processWebhook(mockEvent)
  
  const profile = await getProfile(user.id)
  expect(profile.subscription_status).toBe('canceled')
  expect(profile.is_public).toBe(false)
})
```

## Production Testing

### Using Stripe Test Mode

1. Go to Stripe Dashboard > Webhooks
2. Find your production webhook endpoint
3. Click "Send test webhook"
4. Select `checkout.session.completed`
5. Review the event details
6. Check logs in your application

### Monitoring Webhook Delivery

1. Go to Stripe Dashboard > Webhooks
2. Click on your webhook endpoint
3. View "Events" tab to see all events
4. Check status of each event
5. Review response codes and times

## Debugging

### Check Webhook Logs

Webhook events are logged with prefixes:

- `[Webhook]` - General webhook processing
- `[Checkout]` - Checkout session events
- `[Subscription]` - Subscription events
- `[Invoice]` - Invoice payment events
- `[ManageSubscription]` - Database updates

### Common Issues

#### Issue: Webhook Not Received

**Check:**
1. Webhook endpoint URL is correct
2. Stripe can reach your server (not behind firewall)
3. HTTPS is properly configured
4. Webhook secret matches in `.env.local`

#### Issue: Profile Not Updated

**Check:**
1. Console logs show event was received
2. Profile ID in metadata is correct
3. Database connection is working
4. No error messages in logs

#### Issue: Duplicate Updates

**Check:**
1. Idempotency is working (see logs)
2. No multiple webhook endpoints
3. Event ID tracking is working

### Manual Database Update

If webhook fails, manually update profile:

```sql
UPDATE profiles
SET 
  subscription_status = 'pro',
  is_public = true,
  stripe_customer_id = 'cus_xxxxx',
  stripe_subscription_id = 'sub_xxxxx',
  subscription_current_period_end = '2024-01-01T00:00:00Z'
WHERE id = 'user_id_here';
```

## Best Practices

1. **Always test in test mode first**
2. **Monitor webhook delivery in Stripe dashboard**
3. **Log all webhook events for debugging**
4. **Implement idempotency checks**
5. **Handle errors gracefully**
6. **Use Stripe CLI for local development**
7. **Verify webhook signature**
8. **Keep webhook handler stateless**

## Security

- Always verify webhook signature
- Never trust data without validation
- Use HTTPS in production
- Keep webhook secret secure
- Log security events
- Implement rate limiting

## Next Steps

1. Set up automated monitoring
2. Create dashboard for webhook status
3. Implement webhook retry logic
4. Add alerting for failed webhooks
5. Set up automated tests in CI/CD
