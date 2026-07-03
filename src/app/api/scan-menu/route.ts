import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { sanitizeTextInput, sanitizePrice } from '@/lib/sanitize'
import { getSecurityHeaders } from '@/lib/security'
import { createAuthenticatedClient, getAuthToken } from '@/lib/supabase-server'
import { checkRateLimit, getRateLimitHeaders, AI_SCAN_RATE_LIMIT } from '@/lib/rate-limiting'
import { PREMIUM_API_HEADERS } from '@/lib/premium-validation'
import { requirePremium } from '@/lib/premium-server'

export const runtime = 'nodejs'
// Allow enough time for the Gemini call plus DB writes on Vercel
export const maxDuration = 60

// Maximum file size (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024
const MIN_FILE_SIZE = 5 * 1024

// Abort the Gemini call if it takes longer than this
const GEMINI_TIMEOUT_MS = 45000

// Initialize Gemini client lazily (only when needed)
const getGeminiClient = () => {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
  if (!apiKey) throw new Error('GOOGLE_GENERATIVE_AI_API_KEY is not configured')
  return new GoogleGenerativeAI(apiKey)
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

/**
 * Validate and normalize the AI's JSON output. The model's response is
 * untrusted input: fields may be missing, of the wrong type, or absurdly
 * long. Returns null when the payload doesn't match the expected shape.
 */
function normalizeParsedMenu(raw: unknown): ParsedMenu | null {
  if (typeof raw !== 'object' || raw === null) return null
  const items = (raw as { items?: unknown }).items
  if (!Array.isArray(items)) return null

  const normalized: ParsedMenuItem[] = []
  for (const item of items) {
    if (typeof item !== 'object' || item === null) continue
    const record = item as Record<string, unknown>

    const title = typeof record.title === 'string' ? record.title : ''
    if (!title.trim()) continue

    normalized.push({
      title,
      description: typeof record.description === 'string' ? record.description : null,
      price: typeof record.price === 'number' || typeof record.price === 'string' ? sanitizePrice(record.price) : null,
      category: typeof record.category === 'string' ? record.category : null,
    })
  }

  return { items: normalized }
}

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

    // AI scanning is a premium feature - enforce server-side (the client UI
    // gate alone can be bypassed with a direct API call)
    const premiumGate = await requirePremium(supabase, user.id, 'AI menu scanning')
    if (!premiumGate.ok) {
      return NextResponse.json(premiumGate.body, {
        status: premiumGate.status,
        headers: {
          ...PREMIUM_API_HEADERS,
          ...getSecurityHeaders(),
        },
      })
    }

    // Tight rate limiting: each scan is a paid Gemini vision call
    const rateLimit = checkRateLimit(
      request,
      user.id,
      'scan-menu:POST',
      AI_SCAN_RATE_LIMIT.maxRequests,
      AI_SCAN_RATE_LIMIT.windowMs
    )

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Scan limit reached. Please wait before scanning another menu.' },
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
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Upload JPEG, PNG, or WebP.' },
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

    // Prepare Gemini client and structured extraction prompt
    const genAI = getGeminiClient()
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0,
        maxOutputTokens: 3000,
      },
    })

    const structuredPrompt = `Extract menu items from this image. Return JSON only:
{
  "items": [
    {"title": "string", "description": "string | null", "price": number | null, "category": "string | null"}
  ]
}
Rules: Use null for missing fields. Prices as decimals (12.00). Infer categories from section headers. If an item has multiple price options (e.g., small/large, lunch/dinner), set price to the lowest option and append all pricing options to the description (e.g., "Small: $8 | Medium: $10 | Large: $12"). No markdown, no extra text.`

    const imageData = {
      inlineData: {
        data: base64,
        mimeType: mimeType as string,
      },
    }

    // Race the Gemini call against a hard timeout so a hung request can't
    // hold the connection open until the platform kills it
    const parseResponse = await Promise.race([
      model.generateContent([structuredPrompt, imageData]),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('GEMINI_TIMEOUT')), GEMINI_TIMEOUT_MS)
      ),
    ])

    const parsed = parseResponse.response.text() || '{}'
    let rawMenuData: unknown
    try {
      const cleaned = parsed.replace(/```json\n?|```/g, '').trim()
      rawMenuData = JSON.parse(cleaned)
    } catch (parseError) {
      console.error('JSON parse error:', parseError, 'Raw response:', parsed.substring(0, 200))
      return NextResponse.json(
        { error: 'Failed to parse menu data. Try again with a clearer image.' },
        { status: 500, headers: getSecurityHeaders() }
      )
    }

    // Validate the AI output shape before touching the database
    const menuData = normalizeParsedMenu(rawMenuData)
    if (!menuData) {
      console.error('AI response did not match expected schema:', parsed.substring(0, 200))
      return NextResponse.json(
        { error: 'Received unexpected data from the scanner. Please try again.' },
        { status: 502, headers: getSecurityHeaders() }
      )
    }

    if (!menuData.items.length) {
      return NextResponse.json(
        { error: 'No menu items found. Ensure the text is readable.' },
        { status: 400, headers: getSecurityHeaders() }
      )
    }

    // Cap number of items to prevent very large inserts slowing down response
    if (menuData.items.length > 50) {
      menuData.items = menuData.items.slice(0, 50)
    }

    let itemsInserted = 0
    let categoriesCreated = 0
    const categoryMap = new Map<string, string>()

    // Extract unique category names, sanitized identically to how they are
    // looked up later (a mismatch here previously left items uncategorized)
    const categoryNames = Array.from(
      new Set(
        menuData.items
          .map((item) => (item.category ? sanitizeTextInput(item.category) : ''))
          .filter((category): category is string => category.length > 0)
      )
    )

    if (categoryNames.length > 0) {
      // Fetch ALL user categories upfront so existing ones are reused
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

      allUserCategories?.forEach((category) => {
        categoryMap.set(category.name, category.id)
      })

      // Only create categories that don't exist
      const missing = categoryNames.filter((n) => !categoryMap.has(n))
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

    // Process items: no placeholder image needed (allows NULL per database schema)
    const itemsToInsert = menuData.items
      .map((item) => {
        const title = sanitizeTextInput(item.title)
        const description = item.description ? sanitizeTextInput(item.description) : null
        const categoryName = item.category ? sanitizeTextInput(item.category) : null
        const category_id = categoryName ? categoryMap.get(categoryName) || null : null
        return {
          user_id: user.id,
          title,
          description,
          price: item.price,
          category_id,
          image_url: null, // No placeholder needed - allows users to add images later
        }
      })
      .filter((menuItem) => menuItem.title.length > 0)

    if (itemsToInsert.length > 0) {
      const { error: itemsInsertError } = await supabase.from('menu_items').insert(itemsToInsert)
      if (itemsInsertError) {
        console.error('Error inserting menu items:', itemsInsertError)
        return NextResponse.json(
          { error: 'The menu was scanned but items could not be saved. Please try again.' },
          { status: 500, headers: getSecurityHeaders() }
        )
      }
      itemsInserted = itemsToInsert.length
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

    if (error instanceof Error && error.message === 'GEMINI_TIMEOUT') {
      return NextResponse.json(
        { error: 'The scan took too long. Please try again with a smaller or clearer image.' },
        { status: 504, headers: getSecurityHeaders() }
      )
    }

    const responseStatus =
      typeof error === 'object' && error !== null && 'response' in error
        ? (error as { response?: { status?: number } }).response?.status
        : undefined
    const errorCode = typeof error === 'object' && error !== null && 'code' in error ? (error as { code?: string }).code : undefined

    if (responseStatus === 401) {
      return NextResponse.json({ error: 'An error occurred with the scanning service' }, { status: 500, headers: getSecurityHeaders() })
    }
    if (errorCode === 'insufficient_quota' || errorCode === 'RESOURCE_EXHAUSTED') {
      return NextResponse.json({ error: 'Scanning service temporarily unavailable. Please try again later.' }, { status: 503, headers: getSecurityHeaders() })
    }
    // Generic message - never leak internal error details to the client
    return NextResponse.json({ error: 'An error occurred while scanning the menu' }, { status: 500, headers: getSecurityHeaders() })
  }
}
