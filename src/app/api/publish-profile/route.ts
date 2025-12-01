import { NextRequest, NextResponse } from 'next/server'
import { validateApiPremiumAccess, PREMIUM_API_HEADERS, createPremiumErrorResponse, checkAndGetExpiredSubscriptionUpdate } from '@/lib/premium-validation'
import { getSecurityHeaders } from '@/lib/security'
import { createAuthenticatedClient, getAuthToken } from '@/lib/supabase-server'
import { checkRateLimit, getRateLimitHeaders, STANDARD_RATE_LIMIT } from '@/lib/rate-limiting'
import { createClient } from '@supabase/supabase-js'

// Maximum request body size (1MB)
const MAX_REQUEST_SIZE = 1024 * 1024

export async function POST(request: NextRequest) {
  try {
    // Check request size
    const contentLength = request.headers.get('content-length')
    if (contentLength && parseInt(contentLength) > MAX_REQUEST_SIZE) {
      return NextResponse.json({ error: 'Request body too large' }, { status: 413, headers: getSecurityHeaders() })
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
    const rateLimit = checkRateLimit(request, user.id, 'publish-profile:POST', STANDARD_RATE_LIMIT.maxRequests, STANDARD_RATE_LIMIT.windowMs)

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
      .select('subscription_status, is_public, subscription_current_period_end')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404, headers: getSecurityHeaders() })
    }

    // Check if subscription is expired and update if needed
    const expiryCheck = checkAndGetExpiredSubscriptionUpdate(profile)
    if (expiryCheck.needsUpdate && expiryCheck.updateData) {
      // Update expired subscription status immediately
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      await supabaseAdmin
        .from('profiles')
        .update(expiryCheck.updateData)
        .eq('id', user.id)
      console.log(`[Publish Profile] Updated expired subscription for user ${user.id}`)
    }

    // Validate premium access for public profile publishing
    const premiumValidation = validateApiPremiumAccess(profile, 'public profile publishing')
    if (!premiumValidation.isValid) {
      return NextResponse.json(createPremiumErrorResponse(premiumValidation.error!, premiumValidation.statusCode!), {
        status: premiumValidation.statusCode!,
        headers: {
          ...PREMIUM_API_HEADERS,
          ...getSecurityHeaders(),
        },
      })
    }

    // Update profile to be public
    const { error: updateError } = await supabase.from('profiles').update({ is_public: true }).eq('id', user.id)

    if (updateError) {
      console.error('Error updating profile to public:', updateError)
      return NextResponse.json({ error: 'An error occurred while publishing the profile' }, { status: 500, headers: getSecurityHeaders() })
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Profile published successfully',
        is_public: true,
      },
      {
        headers: {
          ...PREMIUM_API_HEADERS,
          ...getSecurityHeaders(),
          ...getRateLimitHeaders(rateLimit.remaining, rateLimit.resetTime, rateLimit.limit),
        },
      }
    )
  } catch (error) {
    console.error('Error publishing profile:', error)
    return NextResponse.json({ error: 'An error occurred while processing your request' }, { status: 500, headers: getSecurityHeaders() })
  }
}
