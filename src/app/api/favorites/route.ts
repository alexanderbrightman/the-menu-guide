import { NextRequest, NextResponse } from 'next/server'
import { sanitizeUUID } from '@/lib/sanitize'
import { getSecurityHeaders } from '@/lib/security'
import { createAuthenticatedClient, getAuthToken } from '@/lib/supabase-server'
import { checkRateLimit, getRateLimitHeaders, STANDARD_RATE_LIMIT } from '@/lib/rate-limiting'

// GET - Fetch all favorited menu item IDs for the authenticated user
export async function GET(request: NextRequest) {
  try {
    // Get and validate auth token
    const token = getAuthToken(request)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: getSecurityHeaders() })
    }

    // Create authenticated Supabase client
    const supabase = createAuthenticatedClient(token)

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: getSecurityHeaders() })
    }

    // Fetch all favorited menu item IDs for this user
    const { data: favorites, error } = await supabase
      .from('user_favorites')
      .select('menu_item_id')
      .eq('user_id', user.id)

    if (error) {
      console.error('Error fetching favorites:', error)
      return NextResponse.json({ error: 'An error occurred while fetching favorites' }, { status: 500, headers: getSecurityHeaders() })
    }

    // Extract menu_item_id values into an array
    const favoriteIds = favorites?.map((fav) => fav.menu_item_id) || []

    // No caching for authenticated requests to ensure fresh data
    return NextResponse.json(
      { favoriteIds },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          ...getSecurityHeaders(),
        },
      }
    )
  } catch (error) {
    console.error('Error in favorites GET:', error)
    return NextResponse.json({ error: 'An error occurred while processing your request' }, { status: 500, headers: getSecurityHeaders() })
  }
}

// POST - Add a favorite
export async function POST(request: NextRequest) {
  try {
    // Get and validate auth token
    const token = getAuthToken(request)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: getSecurityHeaders() })
    }

    // Create authenticated Supabase client
    const supabase = createAuthenticatedClient(token)

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: getSecurityHeaders() })
    }

    // Apply rate limiting
    const rateLimit = checkRateLimit(
      request,
      user.id,
      'favorites:POST',
      STANDARD_RATE_LIMIT.maxRequests,
      STANDARD_RATE_LIMIT.windowMs
    )

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
    const { menu_item_id } = body

    // Validate and sanitize menu_item_id
    const sanitizedMenuItemId = sanitizeUUID(menu_item_id)
    if (!sanitizedMenuItemId) {
      return NextResponse.json({ error: 'Invalid menu item ID format' }, { status: 400, headers: getSecurityHeaders() })
    }

    // Verify that the menu item exists and belongs to the user
    const { data: menuItem, error: menuItemError } = await supabase
      .from('menu_items')
      .select('id')
      .eq('id', sanitizedMenuItemId)
      .eq('user_id', user.id)
      .single()

    if (menuItemError || !menuItem) {
      return NextResponse.json({ error: 'Menu item not found' }, { status: 404, headers: getSecurityHeaders() })
    }

    // Check if favorite already exists
    const { data: existingFavorite } = await supabase
      .from('user_favorites')
      .select('menu_item_id')
      .eq('user_id', user.id)
      .eq('menu_item_id', sanitizedMenuItemId)
      .single()

    if (existingFavorite) {
      // Already favorited, return success
      return NextResponse.json(
        { success: true, message: 'Already favorited' },
        {
          headers: {
            ...getSecurityHeaders(),
            ...getRateLimitHeaders(rateLimit.remaining, rateLimit.resetTime, rateLimit.limit),
          },
        }
      )
    }

    // Add the favorite
    const { error: insertError } = await supabase
      .from('user_favorites')
      .insert({
        user_id: user.id,
        menu_item_id: sanitizedMenuItemId,
      })

    if (insertError) {
      console.error('Error adding favorite:', insertError)
      return NextResponse.json({ error: 'An error occurred while adding favorite' }, { status: 500, headers: getSecurityHeaders() })
    }

    return NextResponse.json(
      { success: true },
      {
        headers: {
          ...getSecurityHeaders(),
          ...getRateLimitHeaders(rateLimit.remaining, rateLimit.resetTime, rateLimit.limit),
        },
      }
    )
  } catch (error) {
    console.error('Error in favorites POST:', error)
    return NextResponse.json({ error: 'An error occurred while processing your request' }, { status: 500, headers: getSecurityHeaders() })
  }
}

// DELETE - Remove a favorite
export async function DELETE(request: NextRequest) {
  try {
    // Get and validate auth token
    const token = getAuthToken(request)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: getSecurityHeaders() })
    }

    // Create authenticated Supabase client
    const supabase = createAuthenticatedClient(token)

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: getSecurityHeaders() })
    }

    // Apply rate limiting
    const rateLimit = checkRateLimit(
      request,
      user.id,
      'favorites:DELETE',
      STANDARD_RATE_LIMIT.maxRequests,
      STANDARD_RATE_LIMIT.windowMs
    )

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

    const { searchParams } = new URL(request.url)
    const menuItemId = searchParams.get('menu_item_id')

    // Validate and sanitize menu_item_id
    const sanitizedMenuItemId = menuItemId ? sanitizeUUID(menuItemId) : null
    if (!sanitizedMenuItemId) {
      return NextResponse.json({ error: 'Menu item ID is required and must be valid UUID' }, { status: 400, headers: getSecurityHeaders() })
    }

    // Remove the favorite
    const { error: deleteError } = await supabase
      .from('user_favorites')
      .delete()
      .eq('user_id', user.id)
      .eq('menu_item_id', sanitizedMenuItemId)

    if (deleteError) {
      console.error('Error removing favorite:', deleteError)
      return NextResponse.json({ error: 'An error occurred while removing favorite' }, { status: 500, headers: getSecurityHeaders() })
    }

    return NextResponse.json(
      { success: true },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          ...getSecurityHeaders(),
          ...getRateLimitHeaders(rateLimit.remaining, rateLimit.resetTime, rateLimit.limit),
        },
      }
    )
  } catch (error) {
    console.error('Error in favorites DELETE:', error)
    return NextResponse.json({ error: 'An error occurred while processing your request' }, { status: 500, headers: getSecurityHeaders() })
  }
}

