import { NextRequest, NextResponse } from 'next/server'
import { sanitizePrice, sanitizeTextInput } from '@/lib/sanitize'
import { getSecurityHeaders } from '@/lib/security'
import { createAuthenticatedClient, getAuthToken } from '@/lib/supabase-server'
import { checkRateLimit, getRateLimitHeaders, STANDARD_RATE_LIMIT } from '@/lib/rate-limiting'
import { replaceMenuItemExtras } from '@/lib/menu-extras'

export const runtime = 'nodejs'
export const maxDuration = 60

const MAX_ITEMS = 50
const MAX_REQUEST_SIZE = 1024 * 1024

type CategoryRecord = { id: string; name: string }

type CommitDraftItem = {
  title: string
  description: string | null
  price: number | null
  category: string | null
  extras: unknown
}

function parseCommitItem(item: unknown): CommitDraftItem | null {
  if (typeof item !== 'object' || item === null) return null
  const record = item as Record<string, unknown>
  const title = typeof record.title === 'string' ? sanitizeTextInput(record.title) : ''
  if (!title) return null
  return {
    title,
    description:
      typeof record.description === 'string' && record.description.trim()
        ? sanitizeTextInput(record.description)
        : null,
    price:
      record.price !== undefined && record.price !== null && record.price !== ''
        ? sanitizePrice(record.price as string | number)
        : null,
    category:
      typeof record.category === 'string' && record.category.trim()
        ? sanitizeTextInput(record.category)
        : null,
    extras: record.extras,
  }
}

export async function POST(request: NextRequest) {
  try {
    const contentLength = request.headers.get('content-length')
    if (contentLength && parseInt(contentLength) > MAX_REQUEST_SIZE) {
      return NextResponse.json({ error: 'Request body too large' }, { status: 413, headers: getSecurityHeaders() })
    }

    const token = getAuthToken(request)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: getSecurityHeaders() })
    }

    const supabase = createAuthenticatedClient(token)
    const { data: { user } } = await supabase.auth.getUser(token)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: getSecurityHeaders() })
    }

    const rateLimit = checkRateLimit(
      request,
      user.id,
      'scan-menu-commit:POST',
      STANDARD_RATE_LIMIT.maxRequests,
      STANDARD_RATE_LIMIT.windowMs
    )

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a moment before saving.' },
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
    const rawItems: unknown[] = Array.isArray(body?.items) ? body.items : []
    const draftItems = rawItems
      .slice(0, MAX_ITEMS)
      .map(parseCommitItem)
      .filter((item): item is CommitDraftItem => item !== null)

    if (draftItems.length === 0) {
      return NextResponse.json({ error: 'No valid items to save' }, { status: 400, headers: getSecurityHeaders() })
    }

    const categoryMap = new Map<string, string>()
    const categoryNames = Array.from(
      new Set(draftItems.map((item) => item.category).filter((name): name is string => Boolean(name)))
    )

    let categoriesCreated = 0

    if (categoryNames.length > 0) {
      const { data: allUserCategories, error: categoriesFetchError } = await supabase
        .from('menu_categories')
        .select('id,name')
        .eq('user_id', user.id)

      if (categoriesFetchError) {
        console.error('Error fetching categories:', categoriesFetchError)
        return NextResponse.json(
          { error: 'Failed to load your menu categories. Please try again.' },
          { status: 500, headers: getSecurityHeaders() }
        )
      }

      allUserCategories?.forEach((category: CategoryRecord) => {
        categoryMap.set(category.name, category.id)
      })

      const missing = categoryNames.filter((name) => !categoryMap.has(name))
      if (missing.length > 0) {
        const { data: inserted, error: categoriesInsertError } = await supabase
          .from('menu_categories')
          .insert(missing.map((name) => ({ user_id: user.id, name })))
          .select('id,name')

        if (categoriesInsertError) {
          console.error('Error creating categories:', categoriesInsertError)
          return NextResponse.json(
            { error: 'Failed to save menu categories. Please try again.' },
            { status: 500, headers: getSecurityHeaders() }
          )
        }

        const insertedCategories = inserted as CategoryRecord[] | null
        insertedCategories?.forEach((category) => categoryMap.set(category.name, category.id))
        categoriesCreated += insertedCategories?.length || 0
      }
    }

    let itemsInserted = 0

    for (const item of draftItems) {
      const category_id = item.category ? categoryMap.get(item.category) || null : null
      const { data: inserted, error: insertError } = await supabase
        .from('menu_items')
        .insert({
          user_id: user.id,
          title: item.title,
          description: item.description,
          price: item.price,
          category_id,
          image_url: null,
        })
        .select('id')
        .single()

      if (insertError || !inserted) {
        console.error('Error inserting scanned menu item:', insertError)
        return NextResponse.json(
          {
            error:
              itemsInserted > 0
                ? `Saved ${itemsInserted} item${itemsInserted !== 1 ? 's' : ''}, then failed. Please try the rest again.`
                : 'The menu could not be saved. Please try again.',
            itemsInserted,
            categoriesCreated,
          },
          { status: 500, headers: getSecurityHeaders() }
        )
      }

      const extrasError = await replaceMenuItemExtras(supabase, inserted.id, item.extras)
      if (extrasError) {
        console.warn('Scanned item saved without extras:', extrasError)
      }

      itemsInserted += 1
    }

    return NextResponse.json(
      {
        itemsInserted,
        categoriesCreated,
        message: `Added ${itemsInserted} item${itemsInserted !== 1 ? 's' : ''} to your menu.`,
      },
      {
        headers: {
          ...getSecurityHeaders(),
          ...getRateLimitHeaders(rateLimit.remaining, rateLimit.resetTime, rateLimit.limit),
        },
      }
    )
  } catch (error) {
    console.error('Error in scan-menu commit POST:', error)
    return NextResponse.json(
      { error: 'An error occurred while saving the scanned menu' },
      { status: 500, headers: getSecurityHeaders() }
    )
  }
}
