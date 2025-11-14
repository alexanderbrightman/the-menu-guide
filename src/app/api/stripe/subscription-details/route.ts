import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import type Stripe from 'stripe'
import { getSecurityHeaders } from '@/lib/security'
import { createAuthenticatedClient, getAuthToken } from '@/lib/supabase-server'
import { checkRateLimit, getRateLimitHeaders, STANDARD_RATE_LIMIT } from '@/lib/rate-limiting'

export async function GET(request: NextRequest) {
  try {
    // Check if Stripe is configured
    if (!stripe) {
      return NextResponse.json({ error: 'Payment system not configured' }, { status: 503, headers: getSecurityHeaders() })
    }

    // Get and validate auth token
    const token = getAuthToken(request)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: getSecurityHeaders() })
    }

    const supabase = createAuthenticatedClient(token)

    // Get the authenticated user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: getSecurityHeaders() })
    }

    // Apply standard rate limiting
    const rateLimit = checkRateLimit(request, user.id, 'stripe:subscription-details', STANDARD_RATE_LIMIT.maxRequests, STANDARD_RATE_LIMIT.windowMs)

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a moment before trying again.' },
        {
          status: 429,
          headers: {
            ...getSecurityHeaders(),
            ...getRateLimitHeaders(rateLimit.remaining, rateLimit.resetTime, rateLimit.limit),
          },
        }
      )
    }

    // Get the user's profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_customer_id, stripe_subscription_id, subscription_status, subscription_current_period_end, created_at')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404, headers: getSecurityHeaders() })
    }

    if (!profile.stripe_customer_id || !profile.stripe_subscription_id) {
      // If user has pro status but no Stripe IDs, provide helpful error message
      if (profile.subscription_status === 'pro') {
        return NextResponse.json(
          {
            error: 'Your account shows Premium status but is not connected to Stripe. Please sync your subscription.',
          },
          { status: 404, headers: getSecurityHeaders() }
        )
      } else {
        return NextResponse.json({ error: 'No active subscription found' }, { status: 404, headers: getSecurityHeaders() })
      }
    }

    // Fetch subscription details from Stripe
    let subscription: Stripe.Subscription
    let customer: Stripe.Customer | Stripe.DeletedCustomer

    try {
      subscription = await stripe.subscriptions.retrieve(profile.stripe_subscription_id)
      customer = await stripe.customers.retrieve(profile.stripe_customer_id)
    } catch (stripeError: unknown) {
      const stripeErr = stripeError && typeof stripeError === 'object' ? (stripeError as Stripe.StripeRawError) : undefined

      console.error('Error retrieving from Stripe:', stripeError)

      // If subscription doesn't exist in Stripe, return appropriate error
      if (stripeErr?.code === 'resource_missing') {
        return NextResponse.json({ error: 'Subscription not found. Please contact support.' }, { status: 404, headers: getSecurityHeaders() })
      }

      // For other Stripe errors, return generic error
      return NextResponse.json({ error: 'An error occurred while retrieving subscription details' }, { status: 500, headers: getSecurityHeaders() })
    }

    // Fetch upcoming invoice for renewal information
    let upcomingInvoice = null
    try {
      const upcomingInvoices = await stripe.invoices.list({
        customer: profile.stripe_customer_id,
        status: 'open',
        limit: 1,
      })
      upcomingInvoice = upcomingInvoices.data[0] || null
    } catch (error) {
      console.log('No upcoming invoice found:', error)
    }

    // Calculate dates first
    const firstItem = subscription.items?.data?.[0]
    const periodStartSeconds = firstItem?.current_period_start ?? null
    const periodEndSeconds = firstItem?.current_period_end ?? null

    const currentPeriodStart = periodStartSeconds ? new Date(periodStartSeconds * 1000).toISOString() : new Date(profile.created_at).toISOString()

    const currentPeriodEnd = periodEndSeconds
      ? new Date(periodEndSeconds * 1000).toISOString()
      : profile.subscription_current_period_end || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

    const daysUntilRenewal = Math.max(0, Math.ceil((new Date(currentPeriodEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))

    // Format subscription information
    const subscriptionInfo = {
      // Basic subscription details
      id: subscription.id,
      status: subscription.status,
      current_period_start: currentPeriodStart,
      current_period_end: currentPeriodEnd,

      // Pricing information
      amount: firstItem?.price?.unit_amount || 0,
      currency: firstItem?.price?.currency || 'usd',
      interval: firstItem?.price?.recurring?.interval || 'month',

      // Cancellation information
      cancel_at_period_end: subscription.cancel_at_period_end,
      canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,

      // Customer information
      customer_email: 'deleted' in customer && customer.deleted ? '' : customer.email ?? '',
      customer_name: 'deleted' in customer && customer.deleted ? null : customer.name ?? null,

      // Next billing information
      next_billing_date: upcomingInvoice ? new Date(upcomingInvoice.period_end * 1000).toISOString() : null,
      next_billing_amount: upcomingInvoice ? upcomingInvoice.amount_due : null,

      // Trial information
      trial_start: subscription.trial_start ? new Date(subscription.trial_start * 1000).toISOString() : null,
      trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,

      // Status-specific information
      is_active: subscription.status === 'active',
      is_canceled: subscription.status === 'canceled',
      is_past_due: subscription.status === 'past_due',
      is_unpaid: subscription.status === 'unpaid',

      // Grace period information
      days_until_renewal: daysUntilRenewal,
      days_until_cancellation: subscription.cancel_at_period_end ? daysUntilRenewal : null,
    }

    return NextResponse.json(
      { subscription: subscriptionInfo },
      {
        headers: {
          ...getSecurityHeaders(),
          ...getRateLimitHeaders(rateLimit.remaining, rateLimit.resetTime, rateLimit.limit),
        },
      }
    )
  } catch (error) {
    console.error('Error fetching subscription details:', error)
    return NextResponse.json({ error: 'An error occurred while processing your request' }, { status: 500, headers: getSecurityHeaders() })
  }
}
