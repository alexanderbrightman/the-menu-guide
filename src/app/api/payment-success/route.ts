import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { stripe } from '@/lib/stripe'
import type Stripe from 'stripe'
import type { Profile } from '@/lib/supabase'
import { getSecurityHeaders } from '@/lib/security'
import { createAuthenticatedClient, getAuthToken } from '@/lib/supabase-server'
import { checkRateLimit, getRateLimitHeaders, STRICT_RATE_LIMIT } from '@/lib/rate-limiting'

// Maximum request body size (1MB)
const MAX_REQUEST_SIZE = 1024 * 1024

// Admin Supabase client for reliable updates
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Confirms a completed Stripe Checkout and syncs the user's subscription.
 *
 * Security model: the client only supplies a Checkout Session ID. Everything
 * else (payment status, subscription state, ownership) is verified against
 * Stripe. Premium is NEVER granted without a paid session whose metadata
 * matches the authenticated user. The webhook remains the source of truth;
 * this endpoint just makes the upgrade visible immediately after redirect.
 */
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

    // Strict rate limiting: this endpoint triggers Stripe API calls
    const rateLimit = checkRateLimit(request, user.id, 'payment-success:POST', STRICT_RATE_LIMIT.maxRequests, STRICT_RATE_LIMIT.windowMs)

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

    // The Checkout Session ID comes from the success redirect URL
    // (?session_id={CHECKOUT_SESSION_ID}); it is required for verification.
    let sessionId: string | null = null
    try {
      const body = await request.json()
      sessionId = typeof body?.sessionId === 'string' ? body.sessionId : null
    } catch {
      // No/invalid JSON body
    }

    if (!sessionId || !sessionId.startsWith('cs_')) {
      return NextResponse.json(
        { error: 'A valid Checkout session ID is required to confirm payment.' },
        { status: 400, headers: getSecurityHeaders() }
      )
    }

    // Retrieve the session directly from Stripe - never trust the client
    let session: Stripe.Checkout.Session
    try {
      session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ['subscription'] })
    } catch {
      return NextResponse.json({ error: 'Checkout session not found' }, { status: 404, headers: getSecurityHeaders() })
    }

    // The session must belong to the authenticated user
    if (session.metadata?.userId !== user.id) {
      console.warn(`[PaymentSuccess] Session ${sessionId} does not belong to user ${user.id}`)
      return NextResponse.json({ error: 'Checkout session does not belong to this account' }, { status: 403, headers: getSecurityHeaders() })
    }

    // The session must be a paid subscription checkout
    if (session.mode !== 'subscription' || session.payment_status !== 'paid') {
      return NextResponse.json(
        { error: 'Payment has not been completed for this session.' },
        { status: 402, headers: getSecurityHeaders() }
      )
    }

    const subscription = session.subscription as Stripe.Subscription | null
    if (!subscription || !['active', 'trialing'].includes(subscription.status)) {
      return NextResponse.json(
        { error: 'No active subscription found for this session. If you were charged, your account will update automatically shortly.' },
        { status: 402, headers: getSecurityHeaders() }
      )
    }

    // All checks passed - sync verified subscription details to the profile
    const periodEndSeconds = subscription.items?.data?.[0]?.current_period_end
    const updateData: Partial<Profile> = {
      subscription_status: 'pro',
      is_public: true,
      stripe_customer_id: typeof session.customer === 'string' ? session.customer : session.customer?.id,
      stripe_subscription_id: subscription.id,
      subscription_cancel_at_period_end: subscription.cancel_at_period_end || false,
    }
    if (periodEndSeconds) {
      updateData.subscription_current_period_end = new Date(periodEndSeconds * 1000).toISOString()
    }

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update(updateData)
      .eq('id', user.id)

    if (updateError) {
      console.error('[PaymentSuccess] Error updating subscription status:', updateError)
      return NextResponse.json({ error: 'An error occurred while updating subscription status' }, { status: 500, headers: getSecurityHeaders() })
    }

    console.log(`[PaymentSuccess] Verified and synced subscription ${subscription.id} for user ${user.id}`)

    return NextResponse.json(
      {
        success: true,
        message: 'Payment verified successfully',
        subscription_status: 'pro',
        is_public: true,
        subscription_id: subscription.id,
      },
      {
        headers: {
          ...getSecurityHeaders(),
          ...getRateLimitHeaders(rateLimit.remaining, rateLimit.resetTime, rateLimit.limit),
        },
      }
    )
  } catch (error) {
    console.error('Error processing payment success:', error)
    return NextResponse.json({ error: 'An error occurred while processing your payment' }, { status: 500, headers: getSecurityHeaders() })
  }
}
