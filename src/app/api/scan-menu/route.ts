import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { sanitizeTextInput, sanitizePrice } from '@/lib/sanitize'
import { getSecurityHeaders } from '@/lib/security'
import { createAuthenticatedClient, getAuthToken } from '@/lib/supabase-server'
import { checkRateLimit, getRateLimitHeaders, PHOTO_UPLOAD_RATE_LIMIT } from '@/lib/rate-limiting'

export const runtime = 'nodejs'

// Maximum file size (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024
const MIN_FILE_SIZE = 5 * 1024

// Initialize OpenAI client lazily (only when needed)
const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured')
  return new OpenAI({ apiKey })
}

interface ParsedMenuItem {
  title: string
  description?: string | null
  price?: number | null
  category?: string | null
}

interface ParsedMenu {
  items: ParsedMenuItem[]
}

type CategoryRecord = { id: string; name: string }

export async function POST(request: NextRequest) {
  try {
    // Get and validate auth token
    const token = getAuthToken(request)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: getSecurityHeaders() })
    }

    const supabase = createAuthenticatedClient(token)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: getSecurityHeaders() })
    }

    // Apply generous rate limiting for menu scanning (photo upload limit)
    const rateLimit = checkRateLimit(
      request,
      user.id,
      'scan-menu:POST',
      PHOTO_UPLOAD_RATE_LIMIT.maxRequests,
      PHOTO_UPLOAD_RATE_LIMIT.windowMs
    )

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a moment before scanning another menu.' },
        {
          status: 429,
          headers: {
            ...getSecurityHeaders(),
            ...getRateLimitHeaders(rateLimit.remaining, rateLimit.resetTime, rateLimit.limit),
          },
        }
      )
    }

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const userId = formData.get('userId') as string | null

    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400, headers: getSecurityHeaders() })
    }

    if (!userId || userId !== user.id) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400, headers: getSecurityHeaders() })
    }

    // Validate file
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Upload JPEG, PNG, WebP, or PDF.' },
        { status: 400, headers: getSecurityHeaders() }
      )
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 400, headers: getSecurityHeaders() }
      )
    }

    if (file.size < MIN_FILE_SIZE) {
      return NextResponse.json(
        { error: 'Image too small. Please upload a valid image file.' },
        { status: 400, headers: getSecurityHeaders() }
      )
    }

    // Convert file to base64
    const arrayBuffer = await file.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')
    const mimeType = file.type

    // Prepare OpenAI client and optimized structured extraction prompt
    const openai = getOpenAIClient()
    // Optimized prompt: more concise, specific instructions for faster processing
    const structuredPrompt = `Extract menu items from this image. Return JSON only:
{
  "items": [
    {"title": "string", "description": "string | null", "price": number | null, "category": "string | null"}
  ]
}
Rules: Use null for missing fields. Prices as decimals (12.00). Infer categories from section headers. If an item has multiple price options (e.g., small/large, lunch/dinner), set price to the lowest option and append all pricing options to the description (e.g., "Small: $8 | Medium: $10 | Large: $12"). No markdown, no extra text.`

    const imageData = {
      type: 'image_url' as const,
      image_url: {
        url: `data:${mimeType};base64,${base64}`,
      },
    }

    // Optimized OpenAI call: reduced tokens, temperature=0 for consistency, faster processing
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 45000) // 45s timeout
    const parseResponse = await openai.chat.completions.create(
      {
        model: 'gpt-4o', // Using gpt-4o for maximum accuracy and premium experience
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: structuredPrompt },
              imageData,
            ],
          },
        ],
        response_format: { type: 'json_object' },
        max_completion_tokens: 1500, // Reduced from 1200 - most menus fit in 800 tokens
        temperature: 0, // Deterministic output for consistency and speed
      },
      { signal: controller.signal }
    )
    clearTimeout(timeout)

    // Optimized JSON parsing: handle response_format json_object (shouldn't need cleaning, but keep as fallback)
    const parsed = parseResponse.choices[0]?.message?.content || '{}'
    let menuData: ParsedMenu
    try {
      // With response_format: json_object, OpenAI should return clean JSON, but clean just in case
      const cleaned = parsed.replace(/```json\n?|```/g, '').trim()
      menuData = JSON.parse(cleaned) as ParsedMenu
    } catch (parseError) {
      console.error('JSON parse error:', parseError, 'Raw response:', parsed.substring(0, 200))
      return NextResponse.json(
        { error: 'Failed to parse menu data. Try again with a clearer image.' },
        { status: 500, headers: getSecurityHeaders() }
      )
    }

    if (!menuData.items?.length) {
      return NextResponse.json(
        { error: 'No menu items found. Ensure the text is readable.' },
        { status: 400, headers: getSecurityHeaders() }
      )
    }

    // Cap number of items to prevent very large inserts slowing down response
    if (menuData.items.length > 50) {
      menuData.items = menuData.items.slice(0, 50)
    }

    // Optimized category resolution: fetch ALL user categories upfront for caching
    // This eliminates the need for a second query when categories already exist
    let itemsInserted = 0
    let categoriesCreated = 0
    const categoryMap = new Map<string, string>()

    // Extract unique category names from scanned items
    const categoryNames = Array.from(
      new Set(
        menuData.items
          .map((item) => item.category?.toString().trim())
          .filter((category): category is string => Boolean(category))
      )
    )

    if (categoryNames.length > 0) {
      // Fetch ALL user categories upfront (not just matching ones) for better caching
      // This allows us to reuse categories that might be referenced later
      const { data: allUserCategories } = await supabase
        .from('menu_categories')
        .select('id,name')
        .eq('user_id', user.id)

      // Build map of all existing categories
      allUserCategories?.forEach((category) => {
        categoryMap.set(category.name, category.id)
      })

      // Only create categories that don't exist
      const missing = categoryNames.filter((n) => !categoryMap.has(n))
      if (missing.length > 0) {
        // Batch insert missing categories
        const { data: inserted } = await supabase
          .from('menu_categories')
          .insert(missing.map((name) => ({ user_id: user.id, name })))
          .select('id,name')
        const insertedCategories = inserted as CategoryRecord[] | null
        insertedCategories?.forEach((category) => categoryMap.set(category.name, category.id))
        categoriesCreated += insertedCategories?.length || 0
      }
    }

    // Process items: no placeholder image needed (allows NULL per database schema)
    const itemsToInsert = menuData.items
      .map((item) => {
        const title = sanitizeTextInput(item.title || '')
        const description = item.description ? sanitizeTextInput(item.description) : null
        const price = item.price !== null && item.price !== undefined ? sanitizePrice(item.price) : null
        const categoryName = item.category ? sanitizeTextInput(item.category) : null
        const category_id = categoryName ? categoryMap.get(categoryName) || null : null
        return {
          user_id: user.id,
          title,
          description,
          price,
          category_id,
          image_url: null, // No placeholder needed - allows users to add images later
        }
      })
      .filter((menuItem) => menuItem.title.length > 0)

    if (itemsToInsert.length > 0) {
      const { error } = await supabase.from('menu_items').insert(itemsToInsert)
      if (!error) itemsInserted = itemsToInsert.length
    }

    return NextResponse.json(
      {
        itemsInserted,
        categoriesCreated,
        message: `Imported ${itemsInserted} item${itemsInserted !== 1 ? 's' : ''} successfully.`,
      },
      {
        headers: {
          ...getSecurityHeaders(),
          ...getRateLimitHeaders(rateLimit.remaining, rateLimit.resetTime, rateLimit.limit),
        },
      }
    )
  } catch (error: unknown) {
    console.error('Error in scan-menu POST:', error)
    const responseStatus =
      typeof error === 'object' && error !== null && 'response' in error
        ? (error as { response?: { status?: number } }).response?.status
        : undefined
    const errorCode = typeof error === 'object' && error !== null && 'code' in error ? (error as { code?: string }).code : undefined
    const errorMessage = error instanceof Error ? error.message : 'An error occurred while scanning the menu'

    if (responseStatus === 401) {
      return NextResponse.json({ error: 'An error occurred with the scanning service' }, { status: 500, headers: getSecurityHeaders() })
    }
    if (errorCode === 'insufficient_quota') {
      return NextResponse.json({ error: 'Scanning service temporarily unavailable. Please try again later.' }, { status: 503, headers: getSecurityHeaders() })
    }
    return NextResponse.json({ error: errorMessage }, { status: 500, headers: getSecurityHeaders() })
  }
}
