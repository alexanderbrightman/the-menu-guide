import { NextRequest, NextResponse } from 'next/server'
import { sanitizeTextInput, sanitizeUrl, sanitizePrice, sanitizeUUID, sanitizeInteger, sanitizeIntegerArray } from '@/lib/sanitize'
import { getSecurityHeaders } from '@/lib/security'
import { createAuthenticatedClient, getAuthToken } from '@/lib/supabase-server'
import { checkRateLimit, getRateLimitHeaders, PHOTO_UPLOAD_RATE_LIMIT, STANDARD_RATE_LIMIT, STRICT_RATE_LIMIT } from '@/lib/rate-limiting'

// Maximum request body size (1MB)
const MAX_REQUEST_SIZE = 1024 * 1024

// GET - Fetch all menu items for the authenticated user
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

    // Get query parameters for filtering and pagination
    const { searchParams } = new URL(request.url)
    const categoryIdParam = searchParams.get('categoryId')
    const limitParam = searchParams.get('limit') || '100'
    const offsetParam = searchParams.get('offset') || '0'
    
    // Validate and sanitize inputs
    const categoryId = categoryIdParam ? sanitizeUUID(categoryIdParam) : null
    const limit = sanitizeInteger(limitParam, 1, 1000) ?? 100 // Max 1000 items
    const offset = sanitizeInteger(offsetParam, 0) ?? 0
    
    // Validate categoryId if provided
    if (categoryIdParam && !categoryId) {
      return NextResponse.json({ error: 'Invalid category ID format' }, { status: 400, headers: getSecurityHeaders() })
    }

    let query = supabase
      .from('menu_items')
      .select(`
        *,
        menu_categories(name),
        menu_item_tags(
          tags(id, name)
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Filter by category if specified
    if (categoryId) {
      query = query.eq('category_id', categoryId)
    }

    const { data: items, error, count } = await query

    if (error) {
      console.error('Error fetching menu items:', error)
      return NextResponse.json({ error: 'An error occurred while fetching menu items' }, { status: 500, headers: getSecurityHeaders() })
    }

    // No caching for authenticated requests to ensure fresh data
    const response = NextResponse.json(
      { items, total: count || items?.length || 0 },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          ...getSecurityHeaders(),
        },
      }
    )
    return response
  } catch (error) {
    console.error('Error in menu items GET:', error)
    return NextResponse.json({ error: 'An error occurred while processing your request' }, { status: 500, headers: getSecurityHeaders() })
  }
}

// POST - Create a new menu item
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

    // Apply generous rate limiting for photo uploads
    const rateLimit = checkRateLimit(
      request,
      user.id,
      'menu-items:POST',
      PHOTO_UPLOAD_RATE_LIMIT.maxRequests,
      PHOTO_UPLOAD_RATE_LIMIT.windowMs
    )

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a moment before uploading more items.' },
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
    const { title, description, price, category_id, image_url, tag_ids } = body

    // Sanitize inputs
    const sanitizedTitle = title ? sanitizeTextInput(title) : ''
    const sanitizedDescription = description ? sanitizeTextInput(description) : ''
    const sanitizedPrice = price ? sanitizePrice(price) : null
    const sanitizedImageUrl = image_url ? sanitizeUrl(image_url) : null
    const sanitizedCategoryId = category_id ? sanitizeUUID(category_id) : null
    const sanitizedTagIds = tag_ids ? sanitizeIntegerArray(tag_ids, 1) : null

    // Validate required fields early
    if (!sanitizedTitle) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400, headers: getSecurityHeaders() })
    }

    if (!sanitizedImageUrl) {
      return NextResponse.json({ error: 'Image URL is required and must be valid' }, { status: 400, headers: getSecurityHeaders() })
    }
    
    // Validate category_id if provided
    if (category_id && !sanitizedCategoryId) {
      return NextResponse.json({ error: 'Invalid category ID format' }, { status: 400, headers: getSecurityHeaders() })
    }
    
    // Validate tag_ids if provided
    if (tag_ids && sanitizedTagIds === null) {
      return NextResponse.json({ error: 'Invalid tag IDs format' }, { status: 400, headers: getSecurityHeaders() })
    }

    // Create the menu item
    const { data: item, error } = await supabase
      .from('menu_items')
      .insert({
        user_id: user.id,
        title: sanitizedTitle,
        description: sanitizedDescription,
        price: sanitizedPrice,
        category_id: sanitizedCategoryId,
        image_url: sanitizedImageUrl
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating menu item:', error)
      return NextResponse.json({ error: 'An error occurred while creating the menu item' }, { status: 500, headers: getSecurityHeaders() })
    }

    // Add tags if provided (in parallel for better performance)
    if (sanitizedTagIds && sanitizedTagIds.length > 0) {
      const tagInserts = sanitizedTagIds.map((tagId: number) => ({
        menu_item_id: item.id,
        tag_id: tagId
      }))

      const { error: tagError } = await supabase
        .from('menu_item_tags')
        .insert(tagInserts)

      if (tagError) {
        console.error('Error adding tags:', tagError)
        // Don't fail the whole request if tags fail - item was already created
      }
    }

    return NextResponse.json(
      { item },
      {
        headers: {
          ...getSecurityHeaders(),
          ...getRateLimitHeaders(rateLimit.remaining, rateLimit.resetTime, rateLimit.limit),
        },
      }
    )
  } catch (error) {
    console.error('Error in menu items POST:', error)
    return NextResponse.json({ error: 'An error occurred while processing your request' }, { status: 500, headers: getSecurityHeaders() })
  }
}

// PATCH - Update a menu item
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

    // Apply generous rate limiting for photo updates
    const rateLimit = checkRateLimit(
      request,
      user.id,
      'menu-items:PATCH',
      PHOTO_UPLOAD_RATE_LIMIT.maxRequests,
      PHOTO_UPLOAD_RATE_LIMIT.windowMs
    )

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a moment before updating more items.' },
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
    const { id, title, description, price, category_id, image_url, tag_ids } = body

    // Validate and sanitize ID (required)
    const sanitizedId = sanitizeUUID(id)
    if (!sanitizedId) {
      return NextResponse.json({ error: 'Invalid menu item ID format' }, { status: 400, headers: getSecurityHeaders() })
    }

    // Sanitize all inputs
    const sanitizedTitle = title ? sanitizeTextInput(title) : null
    const sanitizedDescription = description ? sanitizeTextInput(description) : null
    const sanitizedPrice = price !== undefined && price !== null ? sanitizePrice(price) : null
    const sanitizedCategoryId = category_id ? sanitizeUUID(category_id) : null
    const sanitizedImageUrl = image_url ? sanitizeUrl(image_url) : null
    const sanitizedTagIds = tag_ids !== undefined ? sanitizeIntegerArray(tag_ids, 1) : undefined
    
    // Validate image_url if provided
    if (image_url && !sanitizedImageUrl) {
      return NextResponse.json({ error: 'Invalid image URL format' }, { status: 400, headers: getSecurityHeaders() })
    }
    
    // Validate category_id if provided
    if (category_id && !sanitizedCategoryId) {
      return NextResponse.json({ error: 'Invalid category ID format' }, { status: 400, headers: getSecurityHeaders() })
    }
    
    // Validate tag_ids if provided
    if (tag_ids !== undefined && sanitizedTagIds === null) {
      return NextResponse.json({ error: 'Invalid tag IDs format' }, { status: 400, headers: getSecurityHeaders() })
    }

    // Get current menu item to check for old image
    const { data: currentItem } = await supabase
      .from('menu_items')
      .select('image_url')
      .eq('id', sanitizedId)
      .eq('user_id', user.id)
      .single()

    // Delete old image from storage if image_url is changing and old image exists
    if (currentItem?.image_url && currentItem.image_url !== sanitizedImageUrl && sanitizedImageUrl) {
      try {
        // Extract file path from Supabase storage URL
        const urlParts = currentItem.image_url.split('/')
        const bucketIndex = urlParts.findIndex((part: string) => part === 'menu_items')
        
        if (bucketIndex !== -1 && bucketIndex < urlParts.length - 1) {
          // Get path after bucket name (e.g., "userId/filename.webp")
          const oldImagePath = urlParts.slice(bucketIndex + 1).join('/')
          
          // Delete old image from storage
          const { error: storageError } = await supabase.storage
            .from('menu_items')
            .remove([oldImagePath])
          
          if (storageError) {
            console.warn('Error deleting old image from storage:', storageError)
            // Continue anyway - new image can be uploaded
          } else {
            console.log('Old image deleted from storage')
          }
        }
      } catch (storageError) {
        console.warn('Error deleting old image:', storageError)
        // Continue anyway - new image can be uploaded
      }
    }

    // Build update object with only provided fields
    const updateData: {
      title?: string
      description?: string | null
      price?: number | null
      category_id?: string | null
      image_url?: string
    } = {}
    
    if (sanitizedTitle !== null) updateData.title = sanitizedTitle
    if (sanitizedDescription !== null) updateData.description = sanitizedDescription || null
    if (sanitizedPrice !== null) updateData.price = sanitizedPrice
    if (sanitizedCategoryId !== null) updateData.category_id = sanitizedCategoryId
    if (sanitizedImageUrl !== null) updateData.image_url = sanitizedImageUrl

    // Update the menu item
    const { data: item, error } = await supabase
      .from('menu_items')
      .update(updateData)
      .eq('id', sanitizedId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating menu item:', error)
      return NextResponse.json({ error: 'Failed to update menu item' }, { status: 500, headers: getSecurityHeaders() })
    }

    // Update tags if provided
    if (sanitizedTagIds !== undefined) {
      // First, remove existing tags
      await supabase
        .from('menu_item_tags')
        .delete()
        .eq('menu_item_id', sanitizedId)

      // Then add new tags
      if (sanitizedTagIds && sanitizedTagIds.length > 0) {
        const tagInserts = sanitizedTagIds.map((tagId: number) => ({
          menu_item_id: sanitizedId,
          tag_id: tagId
        }))

        const { error: tagError } = await supabase
          .from('menu_item_tags')
          .insert(tagInserts)

        if (tagError) {
          console.error('Error updating tags:', tagError)
        }
      }
    }

    return NextResponse.json(
      { item },
      {
        headers: {
          ...getSecurityHeaders(),
          ...getRateLimitHeaders(rateLimit.remaining, rateLimit.resetTime, rateLimit.limit),
        },
      }
    )
  } catch (error) {
    console.error('Error in menu items PATCH:', error)
    return NextResponse.json({ error: 'An error occurred while updating the menu item' }, { status: 500, headers: getSecurityHeaders() })
  }
}

// DELETE - Delete a menu item
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
      'menu-items:DELETE',
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
    const deleteAll = searchParams.get('all') === 'true'
    const itemId = searchParams.get('id')

    // Validate itemId if provided
    const sanitizedItemId = itemId ? sanitizeUUID(itemId) : null
    if (!deleteAll && !sanitizedItemId) {
      return NextResponse.json({ error: 'Item ID is required and must be valid UUID' }, { status: 400, headers: getSecurityHeaders() })
    }

    if (deleteAll) {
      const { data: items, error: fetchItemsError } = await supabase
        .from('menu_items')
        .select('id, image_url')
        .eq('user_id', user.id)

      if (fetchItemsError) {
        console.error('Error fetching menu items for bulk delete:', fetchItemsError)
        return NextResponse.json({ error: 'Failed to fetch menu items' }, { status: 500, headers: getSecurityHeaders() })
      }

      if (!items || items.length === 0) {
        return NextResponse.json({ success: true, deletedCount: 0 }, { headers: getSecurityHeaders() })
      }

      const itemIds = items.map((item) => item.id)

      const imagePaths = items
        .map((item) => {
          if (!item.image_url) return null
          const urlParts = item.image_url.split('/')
          const bucketIndex = urlParts.findIndex((part: string) => part === 'menu_items')
          if (bucketIndex !== -1 && bucketIndex < urlParts.length - 1) {
            return urlParts.slice(bucketIndex + 1).join('/')
          }
          return null
        })
        .filter((path): path is string => Boolean(path))

      if (imagePaths.length > 0) {
        const { error: storageError } = await supabase.storage
          .from('menu_items')
          .remove(imagePaths)

        if (storageError) {
          console.warn('Error deleting images during bulk delete:', storageError)
        }
      }

      await supabase
        .from('menu_item_tags')
        .delete()
        .in('menu_item_id', itemIds)

      const { error: deleteError } = await supabase
        .from('menu_items')
        .delete()
        .in('id', itemIds)
        .eq('user_id', user.id)

      if (deleteError) {
        console.error('Error deleting menu items in bulk:', deleteError)
        return NextResponse.json({ error: 'Failed to delete menu items' }, { status: 500, headers: getSecurityHeaders() })
      }

      return NextResponse.json(
        { success: true, deletedCount: itemIds.length },
        {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            ...getSecurityHeaders(),
          },
        }
      )
    }

    // First, get the menu item to extract image URL for storage cleanup
    const { data: menuItem, error: fetchError } = await supabase
      .from('menu_items')
      .select('image_url')
      .eq('id', sanitizedItemId!)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !menuItem) {
      return NextResponse.json({ error: 'Menu item not found' }, { status: 404, headers: getSecurityHeaders() })
    }

    // Delete the image from storage if it exists
    if (menuItem.image_url) {
      try {
        // Extract file path from Supabase storage URL
        // URL format: https://project.supabase.co/storage/v1/object/public/bucket_name/path/to/file
        const urlParts = menuItem.image_url.split('/')
        const bucketIndex = urlParts.findIndex((part: string) => part === 'menu_items')
        
        if (bucketIndex !== -1 && bucketIndex < urlParts.length - 1) {
          // Get path after bucket name (e.g., "userId/filename.webp")
          const filePath = urlParts.slice(bucketIndex + 1).join('/')
          
          // Delete from storage
          const { error: storageError } = await supabase.storage
            .from('menu_items')
            .remove([filePath])
          
          if (storageError) {
            console.warn('Error deleting image from storage:', storageError)
            // Continue with database deletion even if storage deletion fails
          } else {
            console.log('Image deleted from storage:', filePath)
          }
        }
      } catch (storageError) {
        console.warn('Error deleting image from storage:', storageError)
        // Continue with database deletion even if storage deletion fails
      }
    }

    // Delete associated tags first
    await supabase
      .from('menu_item_tags')
      .delete()
      .eq('menu_item_id', sanitizedItemId!)

    // Delete the menu item
    const { error } = await supabase
      .from('menu_items')
      .delete()
      .eq('id', sanitizedItemId!)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting menu item:', error)
      return NextResponse.json({ error: 'An error occurred while deleting the menu item' }, { status: 500, headers: getSecurityHeaders() })
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
    console.error('Error in menu items DELETE:', error)
    return NextResponse.json({ error: 'An error occurred while processing your request' }, { status: 500, headers: getSecurityHeaders() })
  }
}
