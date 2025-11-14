import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import type Stripe from 'stripe'
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
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: getSecurityHeaders() })
    }

    // Apply standard rate limiting
    const rateLimit = checkRateLimit(request, user.id, 'stripe:customer-portal', STANDARD_RATE_LIMIT.maxRequests, STANDARD_RATE_LIMIT.windowMs)

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
    const { data: profile, error: profileError } = await supabase.from('profiles').select('stripe_customer_id, subscription_status').eq('id', user.id).single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404, headers: getSecurityHeaders() })
    }

    if (!profile.stripe_customer_id) {
      return NextResponse.json({ error: 'No Stripe customer found. Please contact support for assistance.' }, { status: 400, headers: getSecurityHeaders() })
    }

    // Get base URL with proper protocol and port
    const host = request.headers.get('host') || 'localhost:3000'
    const forwardedProto = request.headers.get('x-forwarded-proto')
    const protocol = forwardedProto || (host.includes('localhost') ? 'http' : 'https')
    const baseUrl = `${protocol}://${host}`

    // Create Stripe customer portal session
    try {
      const session = await stripe.billingPortal.sessions.create({
        customer: profile.stripe_customer_id,
        return_url: `${baseUrl}/dashboard`,
      })

      return NextResponse.json(
        { url: session.url },
        {
          headers: {
            ...getSecurityHeaders(),
            ...getRateLimitHeaders(rateLimit.remaining, rateLimit.resetTime, rateLimit.limit),
          },
        }
      )
    } catch (stripeError: unknown) {
      const stripeErr = stripeError && typeof stripeError === 'object' ? (stripeError as Stripe.StripeRawError) : undefined

      console.error('Stripe customer portal error:', stripeError)
      console.error('Error details:', {
        code: stripeErr?.code,
        message: stripeErr?.message,
        type: stripeErr?.type,
        customer_id: profile.stripe_customer_id,
      })

      // Handle specific Stripe errors
      if (stripeErr?.code === 'resource_missing') {
        return NextResponse.json({ error: 'Customer not found. Please contact support for assistance.' }, { status: 404, headers: getSecurityHeaders() })
      }

      if (stripeErr?.code === 'billing_portal_configuration_inactive') {
        return NextResponse.json(
          { error: 'Customer portal is not configured. Please contact support to enable subscription management.' },
          { status: 400, headers: getSecurityHeaders() }
        )
      }

      return NextResponse.json({ error: 'An error occurred while accessing the customer portal' }, { status: 500, headers: getSecurityHeaders() })
    }
  } catch (error) {
    console.error('Error creating customer portal session:', error)
    return NextResponse.json({ error: 'An error occurred while processing your request' }, { status: 500, headers: getSecurityHeaders() })
  }
}
