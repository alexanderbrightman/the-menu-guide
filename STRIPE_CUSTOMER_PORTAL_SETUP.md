# Stripe Customer Portal Setup

Post-purchase billing (payment method, cancel, reactivate, invoices) goes through Stripe’s hosted Customer Portal. The app only shows status from `profiles` and a **Manage billing** button.

If you see “Customer portal is not configured”, the portal is not activated in the Stripe Dashboard for the mode (test vs live) you are using.

## Enable the portal

1. Open the [Stripe Dashboard](https://dashboard.stripe.com)
2. **Settings → Billing → Customer portal**
3. Activate the test link (test mode) or live link (production)
4. Configure:

### Features

- **Update payment methods** — on
- **Cancel subscriptions** — on, and choose **Cancel at end of billing period** (matches previous app behavior)
- **Reactivate** canceled-at-period-end subscriptions — on
- **Invoice history / download** — on
- Plan switching — optional; leave off until yearly pricing exists

### Branding and return

- Logo and colors for The Menu Guide
- Default return URL can stay empty; the API passes `return_url` from `NEXT_PUBLIC_APP_URL`

## App behavior

- `POST /api/stripe/customer-portal` creates a portal session for the signed-in user’s `stripe_customer_id`.
- Complimentary accounts never hit Stripe.
- Cancel and reactivate in the portal still fire `customer.subscription.updated` / `deleted`. Do not remove those webhook handlers.
- Custom `/api/cancel-subscription` and `/api/reactivate-subscription` routes are unused by the UI and kept only as a short transition fallback.

## Security

Portal sessions are created only after app auth. Stripe then authenticates the customer for that session. `return_url` uses `NEXT_PUBLIC_APP_URL` when set so a spoofed `Host` header cannot redirect elsewhere.
