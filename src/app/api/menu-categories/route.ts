import { NextRequest, NextResponse } from 'next/server'
import { sanitizeTextInput, sanitizeUUID } from '@/lib/sanitize'
import { getSecurityHeaders } from '@/lib/security'
import { createAuthenticatedClient, getAuthToken } from '@/lib/supabase-server'
import { checkRateLimit, getRateLimitHeaders, STANDARD_RATE_LIMIT, STRICT_RATE_LIMIT } from '@/lib/rate-limiting'

// Maximum request body size (1MB)
const MAX_REQUEST_SIZE = 1024 * 1024

// GET - Fetch all categories for the authenticated user
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

    const { data: categories, error } = await supabase
      .from('menu_categories')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching categories:', error)
      return NextResponse.json({ error: 'An error occurred while fetching categories' }, { status: 500, headers: getSecurityHeaders() })
    }

    // No caching for authenticated requests to ensure fresh data
    return NextResponse.json(
      { categories },
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
    console.error('Error in categories GET:', error)
    return NextResponse.json({ error: 'An error occurred while processing your request' }, { status: 500, headers: getSecurityHeaders() })
  }
}

// POST - Create a new category
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

    // Create authenticated Supabase client
    const supabase = createAuthenticatedClient(token)

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: getSecurityHeaders() })
    }

    // Apply standard rate limiting
    const rateLimit = checkRateLimit(
      request,
      user.id,
      'menu-categories:POST',
      STANDARD_RATE_LIMIT.maxRequests,
      STANDARD_RATE_LIMIT.windowMs
    )

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a moment before creating more categories.' },
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
    const { name } = body

    // Sanitize and validate input
    const sanitizedName = name ? sanitizeTextInput(name) : ''
    if (!sanitizedName || sanitizedName.trim() === '') {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400, headers: getSecurityHeaders() })
    }

    const { data: category, error } = await supabase
      .from('menu_categories')
      .insert({
        user_id: user.id,
        name: sanitizedName
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating category:', error)
      return NextResponse.json({ error: 'An error occurred while creating the category' }, { status: 500, headers: getSecurityHeaders() })
    }

    return NextResponse.json(
      { category },
      {
        headers: {
          ...getSecurityHeaders(),
          ...getRateLimitHeaders(rateLimit.remaining, rateLimit.resetTime, rateLimit.limit),
        },
      }
    )
  } catch (error) {
    console.error('Error in categories POST:', error)
    return NextResponse.json({ error: 'An error occurred while processing your request' }, { status: 500, headers: getSecurityHeaders() })
  }
}

// PATCH - Update a category
export async function PATCH(request: NextRequest) {
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

    // Create authenticated Supabase client
    const supabase = createAuthenticatedClient(token)

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: getSecurityHeaders() })
    }

    // Apply standard rate limiting
    const rateLimit = checkRateLimit(
      request,
      user.id,
      'menu-categories:PATCH',
      STANDARD_RATE_LIMIT.maxRequests,
      STANDARD_RATE_LIMIT.windowMs
    )

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a moment before updating more categories.' },
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
    const { id, name } = body

    // Validate and sanitize inputs
    const sanitizedId = sanitizeUUID(id)
    const sanitizedName = name ? sanitizeTextInput(name) : ''

    if (!sanitizedId) {
      return NextResponse.json({ error: 'Invalid category ID format' }, { status: 400, headers: getSecurityHeaders() })
    }

    if (!sanitizedName || sanitizedName.trim() === '') {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400, headers: getSecurityHeaders() })
    }

    const { data: category, error } = await supabase
      .from('menu_categories')
      .update({ name: sanitizedName })
      .eq('id', sanitizedId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating category:', error)
      return NextResponse.json({ error: 'An error occurred while updating the category' }, { status: 500, headers: getSecurityHeaders() })
    }

    return NextResponse.json(
      { category },
      {
        headers: {
          ...getSecurityHeaders(),
          ...getRateLimitHeaders(rateLimit.remaining, rateLimit.resetTime, rateLimit.limit),
        },
      }
    )
  } catch (error) {
    console.error('Error in categories PATCH:', error)
    return NextResponse.json({ error: 'An error occurred while processing your request' }, { status: 500, headers: getSecurityHeaders() })
  }
}

// DELETE - Delete a category
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

    // Apply strict rate limiting for delete operations
    const rateLimit = checkRateLimit(
      request,
      user.id,
      'menu-categories:DELETE',
      STRICT_RATE_LIMIT.maxRequests,
      STRICT_RATE_LIMIT.windowMs
    )

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many delete requests. Please wait a moment before trying again.' },
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
    const categoryId = searchParams.get('id')

    // Validate category ID
    const sanitizedCategoryId = categoryId ? sanitizeUUID(categoryId) : null
    if (!sanitizedCategoryId) {
      return NextResponse.json({ error: 'Category ID is required and must be valid' }, { status: 400, headers: getSecurityHeaders() })
    }

    // Before deleting the category, move all menu items to uncategorized (set category_id to null)
    const { error: updateError } = await supabase
      .from('menu_items')
      .update({ category_id: null })
      .eq('category_id', sanitizedCategoryId)
      .eq('user_id', user.id) // Ensure we only update items belonging to this user

    if (updateError) {
      console.error('Error updating menu items:', updateError)
      return NextResponse.json({ error: 'An error occurred while moving menu items to uncategorized' }, { status: 500, headers: getSecurityHeaders() })
    }

    // Now delete the category (database foreign key constraint will handle any remaining references)
    const { data: deleted, error } = await supabase
      .from('menu_categories')
      .delete()
      .eq('id', sanitizedCategoryId)
      .eq('user_id', user.id)
      .select()

    if (error) {
      console.error('Error deleting category:', error)
      return NextResponse.json({ error: 'An error occurred while deleting the category' }, { status: 500, headers: getSecurityHeaders() })
    }

    if (!deleted || deleted.length === 0) {
      return NextResponse.json({ error: 'Category not found or could not be deleted' }, { status: 404, headers: getSecurityHeaders() })
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
    console.error('Error in categories DELETE:', error)
    return NextResponse.json({ error: 'An error occurred while processing your request' }, { status: 500, headers: getSecurityHeaders() })
  }
}
