import { NextRequest, NextResponse } from 'next/server'
import { getCachedResponse, setCachedResponse, getProfileCacheKey, createCacheableResponse } from '@/lib/cache'
import { getSecurityHeaders } from '@/lib/security'
import { createAuthenticatedClient, getAuthToken } from '@/lib/supabase-server'
import { checkRateLimit, getRateLimitHeaders, STANDARD_RATE_LIMIT } from '@/lib/rate-limiting'
import { sanitizeTextInput } from '@/lib/sanitize'

// Maximum request body size (1MB)
const MAX_REQUEST_SIZE = 1024 * 1024

export async function GET(request: NextRequest) {
  try {
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

    // Check cache first
    const cacheKey = getProfileCacheKey(user.id)
    const cachedProfile = getCachedResponse(cacheKey, 30000) // 30 second cache
    if (cachedProfile) {
      const response = createCacheableResponse({ profile: cachedProfile }, 30)
      // Add security headers to cached response
      Object.entries(getSecurityHeaders()).forEach(([key, value]) => {
        response.headers.set(key, value)
      })
      return response
    }

    // Fetch from database
    const { data: profile, error } = await supabase.from('profiles').select('*').eq('id', user.id).single()

    if (error) {
      console.error('Error fetching profile:', error)
      return NextResponse.json({ error: 'Profile not found' }, { status: 404, headers: getSecurityHeaders() })
    }

    // Cache the result
    setCachedResponse(cacheKey, profile, 30000)

    const response = createCacheableResponse({ profile }, 30)
    // Add security headers
    Object.entries(getSecurityHeaders()).forEach(([key, value]) => {
      response.headers.set(key, value)
    })
    return response
  } catch (error) {
    console.error('Error in profile fetch:', error)
    return NextResponse.json({ error: 'An error occurred while processing your request' }, { status: 500, headers: getSecurityHeaders() })
  }
}

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
    const rateLimit = checkRateLimit(request, user.id, 'profiles:POST', STANDARD_RATE_LIMIT.maxRequests, STANDARD_RATE_LIMIT.windowMs)

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

    const body = await request.json()
    const { username, display_name } = body

    // Sanitize inputs
    const sanitizedUsername = username ? sanitizeTextInput(username) : ''
    const sanitizedDisplayName = display_name ? sanitizeTextInput(display_name) : ''

    if (!sanitizedUsername || sanitizedUsername.trim() === '') {
      return NextResponse.json({ error: 'Username is required' }, { status: 400, headers: getSecurityHeaders() })
    }

    if (!sanitizedDisplayName || sanitizedDisplayName.trim() === '') {
      return NextResponse.json({ error: 'Display name is required' }, { status: 400, headers: getSecurityHeaders() })
    }

    // Check if username is already taken
    const { data: existingProfile } = await supabase.from('profiles').select('id').eq('username', sanitizedUsername).single()

    if (existingProfile) {
      return NextResponse.json({ error: 'Username already taken' }, { status: 400, headers: getSecurityHeaders() })
    }

    // Create profile
    const { data: profile, error } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        username: sanitizedUsername,
        display_name: sanitizedDisplayName,
        bio: '',
        is_public: false,
        subscription_status: 'free',
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating profile:', error)
      return NextResponse.json({ error: 'An error occurred while creating the profile' }, { status: 500, headers: getSecurityHeaders() })
    }

    return NextResponse.json(
      { profile },
      {
        headers: {
          ...getSecurityHeaders(),
          ...getRateLimitHeaders(rateLimit.remaining, rateLimit.resetTime, rateLimit.limit),
        },
      }
    )
  } catch (error) {
    console.error('Error in profile creation:', error)
    return NextResponse.json({ error: 'An error occurred while processing your request' }, { status: 500, headers: getSecurityHeaders() })
  }
}

export async function PUT(request: NextRequest) {
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
    const rateLimit = checkRateLimit(request, user.id, 'profiles:PUT', STANDARD_RATE_LIMIT.maxRequests, STANDARD_RATE_LIMIT.windowMs)

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

    const body = await request.json()
    const { is_public, show_prices } = body

    // Build update object with only provided fields
    const updateData: Record<string, boolean> = {}
    
    if (typeof is_public === 'boolean') {
      updateData.is_public = is_public
    }
    
    if (typeof show_prices === 'boolean') {
      updateData.show_prices = show_prices
    }

    // Validate that at least one field is provided
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400, headers: getSecurityHeaders() })
    }

    // Update profile
    const { data: profile, error } = await supabase.from('profiles').update(updateData).eq('id', user.id).select().single()

    if (error) {
      console.error('Error updating profile:', error)
      return NextResponse.json({ error: 'An error occurred while updating the profile' }, { status: 500, headers: getSecurityHeaders() })
    }

    // Clear cache for this user
    const cacheKey = getProfileCacheKey(user.id)
    setCachedResponse(cacheKey, null, 0) // Clear cache

    console.log('Profile updated successfully:', { id: user.id, ...updateData })

    return NextResponse.json(
      { profile },
      {
        headers: {
          ...getSecurityHeaders(),
          ...getRateLimitHeaders(rateLimit.remaining, rateLimit.resetTime, rateLimit.limit),
        },
      }
    )
  } catch (error) {
    console.error('Error in profile update:', error)
    return NextResponse.json({ error: 'An error occurred while processing your request' }, { status: 500, headers: getSecurityHeaders() })
  }
}
