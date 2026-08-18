import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { sanitizePrice } from '@/lib/sanitize'
import { getSecurityHeaders } from '@/lib/security'
import { createAuthenticatedClient, getAuthToken } from '@/lib/supabase-server'
import { checkRateLimit, getRateLimitHeaders, AI_SCAN_RATE_LIMIT } from '@/lib/rate-limiting'
import { PREMIUM_API_HEADERS } from '@/lib/premium-validation'
import { requirePremium } from '@/lib/premium-server'
import { isExtraKind, type ExtraKind, type ScannedExtra, type ScannedMenuItem } from '@/lib/menu-extras'

export const runtime = 'nodejs'
export const maxDuration = 60

const MAX_FILE_SIZE = 10 * 1024 * 1024
const MIN_FILE_SIZE = 5 * 1024
const GEMINI_TIMEOUT_MS = 45000
const MAX_SCAN_ITEMS = 50
const MAX_EXTRAS = 20

const getGeminiClient = () => {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
  if (!apiKey) throw new Error('GOOGLE_GENERATIVE_AI_API_KEY is not configured')
  return new GoogleGenerativeAI(apiKey)
}

function namedPrices(raw: unknown, kind: ExtraKind): ScannedExtra[] {
  if (!Array.isArray(raw)) return []
  const extras: ScannedExtra[] = []
  for (const entry of raw) {
    if (extras.length >= MAX_EXTRAS) break
    if (typeof entry !== 'object' || entry === null) continue
    const record = entry as Record<string, unknown>
    const name = typeof record.name === 'string' ? record.name.trim() : ''
    if (!name) continue
    const price = sanitizePrice(record.price as string | number)
    if (price === null) continue
    extras.push({ kind, name: name.slice(0, 120), price })
  }
  return extras
}

function normalizeParsedMenu(raw: unknown): ScannedMenuItem[] | null {
  if (typeof raw !== 'object' || raw === null) return null
  const items = (raw as { items?: unknown }).items
  if (!Array.isArray(items)) return null

  const normalized: ScannedMenuItem[] = []
  for (const item of items) {
    if (typeof item !== 'object' || item === null) continue
    const record = item as Record<string, unknown>

    const title = typeof record.title === 'string' ? record.title.trim() : ''
    if (!title) continue

    const variants = namedPrices(record.variants, 'variant')
    const addons = namedPrices(record.addons, 'addon')
    const extrasFromModel = Array.isArray(record.extras)
      ? record.extras.flatMap((entry) => {
          if (typeof entry !== 'object' || entry === null) return []
          const extra = entry as Record<string, unknown>
          if (!isExtraKind(extra.kind)) return []
          return namedPrices([extra], extra.kind)
        })
      : []

    const extras = [...variants, ...addons, ...extrasFromModel].slice(0, MAX_EXTRAS)
    const variantPrices = extras.filter((extra) => extra.kind === 'variant').map((extra) => extra.price)

    let price =
      typeof record.price === 'number' || typeof record.price === 'string'
        ? sanitizePrice(record.price)
        : null
    if (price === null && variantPrices.length > 0) {
      price = Math.min(...variantPrices)
    }

    normalized.push({
      title: title.slice(0, 200),
      description:
        typeof record.description === 'string' && record.description.trim()
          ? record.description.trim().slice(0, 1000)
          : null,
      price,
      category:
        typeof record.category === 'string' && record.category.trim()
          ? record.category.trim().slice(0, 80)
          : null,
      extras,
    })
  }

  return normalized
}

export async function POST(request: NextRequest) {
  try {
    const token = getAuthToken(request)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: getSecurityHeaders() })
    }

    const supabase = createAuthenticatedClient(token)
    const { data: { user } } = await supabase.auth.getUser(token)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: getSecurityHeaders() })
    }

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

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const userId = formData.get('userId') as string | null

    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400, headers: getSecurityHeaders() })
    }

    if (!userId || userId !== user.id) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400, headers: getSecurityHeaders() })
    }

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

    const arrayBuffer = await file.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')

    const genAI = getGeminiClient()
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0,
        maxOutputTokens: 8192,
      },
    })

    const structuredPrompt = `Extract menu items from this photo of a printed menu. Copy the restaurant's wording. Do not rewrite, translate, or invent dishes. Return JSON only:
{
  "items": [
    {
      "title": "string",
      "description": "string | null",
      "price": number | null,
      "category": "string | null",
      "variants": [{"name": "string", "price": number}],
      "addons": [{"name": "string", "price": number}]
    }
  ]
}
Rules:
- Use null or [] for missing fields. Prices as decimals (12.00). Infer categories from section headers.
- variants: mutually exclusive prices for the same dish (size, lunch/dinner, glass/bottle). Each price is the full price for that choice.
- addons: optional extras with an additional charge (Add crab 12). price is the extra amount, not a new total.
- If only one price is printed, set price and leave variants and addons empty.
- If variants exist, set price to the lowest variant. Do not repeat those prices in description.
- Do not put add-on prices in description.
- If a price is unreadable, use null rather than guessing.
- No markdown, no extra text.`

    const parseResponse = await Promise.race([
      model.generateContent([
        structuredPrompt,
        {
          inlineData: {
            data: base64,
            mimeType: file.type,
          },
        },
      ]),
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

    const items = normalizeParsedMenu(rawMenuData)
    if (!items) {
      console.error('AI response did not match expected schema:', parsed.substring(0, 200))
      return NextResponse.json(
        { error: 'Received unexpected data from the scanner. Please try again.' },
        { status: 502, headers: getSecurityHeaders() }
      )
    }

    if (!items.length) {
      return NextResponse.json(
        { error: 'No menu items found. Ensure the text is readable.' },
        { status: 400, headers: getSecurityHeaders() }
      )
    }

    return NextResponse.json(
      {
        items: items.slice(0, MAX_SCAN_ITEMS),
        message: `Found ${Math.min(items.length, MAX_SCAN_ITEMS)} item${Math.min(items.length, MAX_SCAN_ITEMS) !== 1 ? 's' : ''}. Review them before adding to your menu.`,
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
    return NextResponse.json({ error: 'An error occurred while scanning the menu' }, { status: 500, headers: getSecurityHeaders() })
  }
}
