import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sanitizeTextInput, sanitizeUrl, sanitizePrice } from '@/lib/sanitize'

// GET - Fetch all menu items for the authenticated user
export async function GET(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    
    // Create a Supabase client with the user's token
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    )

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get query parameters for filtering and pagination
    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get('categoryId')
    const limit = parseInt(searchParams.get('limit') || '100') // Default to 100 items
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = supabase
      .from('menu_items')
      .select(`
        *,
        menu_categories(name),
        menu_item_tags(
          tags(name)
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
      return NextResponse.json({ error: 'Failed to fetch menu items' }, { status: 500 })
    }

    // Add cache control headers for better performance
    return NextResponse.json(
      { items, total: count || items?.length || 0 },
      {
        headers: {
          'Cache-Control': 'private, max-age=60, stale-while-revalidate=300',
        },
      }
    )
  } catch (error) {
    console.error('Error in menu items GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create a new menu item
export async function POST(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    
    // Create a Supabase client with the user's token
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    )

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { title, description, price, category_id, image_url, tag_ids } = body

    // Sanitize inputs
    const sanitizedTitle = sanitizeTextInput(title)
    const sanitizedDescription = description ? sanitizeTextInput(description) : ''
    const sanitizedPrice = price ? sanitizePrice(price) : null
    const sanitizedImageUrl = image_url ? sanitizeUrl(image_url) : ''

    // Validate required fields
    if (!sanitizedTitle) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    // Create the menu item
    const { data: item, error } = await supabase
      .from('menu_items')
      .insert({
        user_id: user.id,
        title: sanitizedTitle,
        description: sanitizedDescription,
        price: sanitizedPrice,
        category_id: category_id || null,
        image_url: sanitizedImageUrl || ''
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating menu item:', error)
      return NextResponse.json({ error: 'Failed to create menu item' }, { status: 500 })
    }

    // Add tags if provided
    if (tag_ids && tag_ids.length > 0) {
      const tagInserts = tag_ids.map((tagId: number) => ({
        menu_item_id: item.id,
        tag_id: tagId
      }))

      const { error: tagError } = await supabase
        .from('menu_item_tags')
        .insert(tagInserts)

      if (tagError) {
        console.error('Error adding tags:', tagError)
        // Don't fail the whole request if tags fail
      }
    }

    return NextResponse.json({ item })
  } catch (error) {
    console.error('Error in menu items POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH - Update a menu item
export async function PATCH(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    
    // Create a Supabase client with the user's token
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    )

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, title, description, price, category_id, image_url, tag_ids } = body

    // Update the menu item
    const { data: item, error } = await supabase
      .from('menu_items')
      .update({
        title,
        description,
        price: price ? parseFloat(price) : null,
        category_id: category_id || null,
        image_url: image_url || ''
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating menu item:', error)
      return NextResponse.json({ error: 'Failed to update menu item' }, { status: 500 })
    }

    // Update tags if provided
    if (tag_ids !== undefined) {
      // First, remove existing tags
      await supabase
        .from('menu_item_tags')
        .delete()
        .eq('menu_item_id', id)

      // Then add new tags
      if (tag_ids.length > 0) {
        const tagInserts = tag_ids.map((tagId: number) => ({
          menu_item_id: id,
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

    return NextResponse.json({ item })
  } catch (error) {
    console.error('Error in menu items PATCH:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete a menu item
export async function DELETE(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    
    // Create a Supabase client with the user's token
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    )

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const itemId = searchParams.get('id')

    if (!itemId) {
      return NextResponse.json({ error: 'Item ID is required' }, { status: 400 })
    }

    // Delete associated tags first
    await supabase
      .from('menu_item_tags')
      .delete()
      .eq('menu_item_id', itemId)

    // Delete the menu item
    const { error } = await supabase
      .from('menu_items')
      .delete()
      .eq('id', itemId)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting menu item:', error)
      return NextResponse.json({ error: 'Failed to delete menu item' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in menu items DELETE:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
