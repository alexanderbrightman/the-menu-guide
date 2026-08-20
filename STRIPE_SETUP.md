# Stripe Payment Setup Guide

Stripe is the system of record for billing. This app is the system of record for access (`subscription_status`, `is_public`, `is_complimentary`, period end). Webhooks keep the two in sync.

- **Checkout** creates the subscription (UpgradeCard → `create-checkout-session`).
- **Customer Portal** is where customers cancel, reactivate, update payment methods, and download invoices.
- The app shows subscription status from `profiles`; it does not collect tax or change cards itself.

Complimentary accounts bypass Stripe entirely.

Stripe Tax is deferred until a certificate of authority is in place (NYC). Do not enable `automatic_tax` in Checkout until then.

## Step 1: Create a Stripe account

1. Go to [stripe.com](https://stripe.com) and create an account.
2. Complete verification.
3. Copy API keys from **Developers → API keys**.

## Step 2: Product and price ($30/month)

Prefer a Dashboard-managed Price. Keep the amount in Stripe, not in app code.

1. **Product catalog → Add product** — name it e.g. `The Menu Guide Premium`.
2. Recurring price: **$30 / month**.
3. Copy the Price ID (`price_...`) into `STRIPE_PRICE_ID`.

## Step 3: Payment methods

**Settings → Payment methods** — enable Card, Apple Pay, Google Pay, and Link. Checkout omits a hard-coded `payment_method_types` list so these surface automatically when the device/browser supports them.

## Step 4: Customer Portal

See [STRIPE_CUSTOMER_PORTAL_SETUP.md](./STRIPE_CUSTOMER_PORTAL_SETUP.md). Enable the portal and allow payment-method updates, cancel at period end, reactivation, and invoice history.

## Step 5: Webhook

1. **Developers → Webhooks → Add endpoint**
2. URL: `https://your-domain.com/api/stripe/webhook`  
   Local: Stripe CLI `stripe listen --forward-to localhost:3000/api/stripe/webhook` (see [WEBHOOK_TESTING.md](./WEBHOOK_TESTING.md))
3. Select:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy the signing secret (`whsec_...`). Portal cancel/reactivate/card updates emit the same subscription and invoice events — no extra types are required.

## Step 6: Environment variables

```env
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
STRIPE_PRICE_ID=price_your_dashboard_price_id_here

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

`NEXT_PUBLIC_APP_URL` is used for Checkout success/cancel URLs and the portal return URL (avoids host-header injection). In production it must be the canonical site origin.

## Step 7: Test the payment flow

1. Restart the dev server.
2. Sign in, click **Publish Your Menu**.
3. Complete Checkout ($30/month; no tax line until Stripe Tax is enabled later).
4. After success, premium access should unlock (webhook or payment-success path).
5. Click **Manage billing** — you should land in the Customer Portal, then return to the app.

## Troubleshooting

- **"Stripe not configured"**: Check env vars and restart.
- **"Customer portal is not configured"**: Activate the portal in the Dashboard for the same mode as your API keys (test vs live).
- **"Webhook signature verification failed"**: Wrong `STRIPE_WEBHOOK_SECRET` (CLI secret differs from Dashboard).
- **Public menu still 404**: Need pro (or complimentary) **and** menu set public.

## What users can do

- Upgrade to Premium ($30/month)
- Apply promotion codes at Checkout
- See subscription status in the app
- Manage billing in Stripe (card, cancel at period end, invoices)
- Keep access until period end after cancel; webhooks revoke access afterward
