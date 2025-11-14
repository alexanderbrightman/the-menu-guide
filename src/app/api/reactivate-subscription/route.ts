import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'
import type Stripe from 'stripe'
import { getSecurityHeaders } from '@/lib/security'
import { createAuthenticatedClient, getAuthToken } from '@/lib/supabase-server'
import { checkRateLimit, getRateLimitHeaders, STANDARD_RATE_LIMIT } from '@/lib/rate-limiting'

// Maximum request body size (1MB)
const MAX_REQUEST_SIZE = 1024 * 1024

// Admin Supabase client for subscription operations
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest) {
  try {
    // Check request size
    const contentLength = request.headers.get('content-length')
    if (contentLength && parseInt(contentLength) > MAX_REQUEST_SIZE) {
      return NextResponse.json({ error: 'Request body too large' }, { status: 413, headers: getSecurityHeaders() })
    }

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
    const rateLimit = checkRateLimit(request, user.id, 'reactivate-subscription:POST', STANDARD_RATE_LIMIT.maxRequests, STANDARD_RATE_LIMIT.windowMs)

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
    const { data: profile, error: profileError } = await supabase.from('profiles').select('stripe_customer_id, stripe_subscription_id, subscription_status').eq('id', user.id).single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404, headers: getSecurityHeaders() })
    }

    if (!profile.stripe_customer_id || !profile.stripe_subscription_id) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 404, headers: getSecurityHeaders() })
    }

    // Reactivate the subscription by removing the cancel_at_period_end flag
    const subscription: Stripe.Subscription = await stripe.subscriptions.update(profile.stripe_subscription_id, {
      cancel_at_period_end: false,
    })

    // Update the database to reflect the reactivation
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        subscription_cancel_at_period_end: false,
        subscription_canceled_at: null,
        // Keep subscription_status as 'pro' and is_public as true
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Error updating profile:', updateError)
      // Don't fail the request since Stripe was updated successfully
    }

    const periodEndSeconds = subscription.items?.data?.[0]?.current_period_end ?? null

    return NextResponse.json(
      {
        success: true,
        message: 'Your subscription has been reactivated and will continue billing monthly.',
        subscription_id: subscription.id,
        cancel_at_period_end: subscription.cancel_at_period_end,
        current_period_end: periodEndSeconds ? new Date(periodEndSeconds * 1000).toISOString() : null,
      },
      {
        headers: {
          ...getSecurityHeaders(),
          ...getRateLimitHeaders(rateLimit.remaining, rateLimit.resetTime, rateLimit.limit),
        },
      }
    )
  } catch (error: unknown) {
    console.error('Error reactivating subscription:', error)

    if (error && typeof error === 'object' && 'code' in error && error.code === 'resource_missing') {
      return NextResponse.json({ error: 'Subscription not found. Please contact support.' }, { status: 404, headers: getSecurityHeaders() })
    }

    return NextResponse.json({ error: 'An error occurred while reactivating your subscription' }, { status: 500, headers: getSecurityHeaders() })
  }
}
