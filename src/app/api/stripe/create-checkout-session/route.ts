import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { stripe, STRIPE_CONFIG } from '@/lib/stripe'
import { getSecurityHeaders } from '@/lib/security'
import { createAuthenticatedClient, getAuthToken } from '@/lib/supabase-server'
import { checkRateLimit, getRateLimitHeaders, STANDARD_RATE_LIMIT } from '@/lib/rate-limiting'

// Maximum request body size (1MB)
const MAX_REQUEST_SIZE = 1024 * 1024

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
    const { data: { user } } = await supabase.auth.getUser(token)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: getSecurityHeaders() })
    }

    // Apply standard rate limiting
    const rateLimit = checkRateLimit(request, user.id, 'stripe:create-checkout', STANDARD_RATE_LIMIT.maxRequests, STANDARD_RATE_LIMIT.windowMs)

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

    // Fetch existing Stripe customer ID so repeat checkouts reuse the same
    // customer instead of creating duplicates in Stripe
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, stripe_customer_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404, headers: getSecurityHeaders() })
    }

    // Prefer a fixed app URL over request headers to prevent host-header
    // injection into the redirect URLs. Falls back to headers in development.
    let baseUrl = process.env.NEXT_PUBLIC_APP_URL
    if (!baseUrl) {
      const host = request.headers.get('host') || 'localhost:3000'
      const protocol = host.includes('localhost') ? 'http' : 'https'
      baseUrl = `${protocol}://${host}`
    }

    // {CHECKOUT_SESSION_ID} is replaced by Stripe; the success page uses it
    // to verify payment server-side before showing the upgraded state.
    const successUrl = `${baseUrl}/?success=true&session_id={CHECKOUT_SESSION_ID}`
    const cancelUrl = `${baseUrl}/?canceled=true`

    const metadata = {
      userId: user.id,
      profileId: profile.id,
    }

    // Use the dashboard-managed Price when configured (single source of
    // truth for pricing); otherwise fall back to inline price_data.
    const lineItem: Stripe.Checkout.SessionCreateParams.LineItem = STRIPE_CONFIG.priceId
      ? { price: STRIPE_CONFIG.priceId, quantity: 1 }
      : {
        price_data: {
          currency: STRIPE_CONFIG.currency,
          product_data: {
            name: 'The Menu Guide Premium',
            description: 'Unlock public menus, QR codes, and advanced features',
          },
          unit_amount: STRIPE_CONFIG.amount,
          recurring: {
            interval: STRIPE_CONFIG.interval as 'month',
          },
        },
        quantity: 1,
      }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [lineItem],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      // Reuse the existing customer when we have one; otherwise let Stripe
      // create a new customer with the user's email
      ...(profile.stripe_customer_id
        ? { customer: profile.stripe_customer_id }
        : { customer_email: user.email }),
      metadata,
      // Copy metadata onto the subscription itself so subscription webhook
      // events can identify the user without relying on email lookups
      subscription_data: { metadata },
      allow_promotion_codes: false,
      billing_address_collection: 'auto',
      payment_method_collection: 'always',
    })

    return NextResponse.json(
      { sessionId: session.id, url: session.url },
      {
        headers: {
          ...getSecurityHeaders(),
          ...getRateLimitHeaders(rateLimit.remaining, rateLimit.resetTime, rateLimit.limit),
        },
      }
    )
  } catch (error) {
    console.error('Error creating checkout session:', error)
    return NextResponse.json({ error: 'An error occurred while creating the checkout session' }, { status: 500, headers: getSecurityHeaders() })
  }
}
