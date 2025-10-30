import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import { sanitizeTextInput, sanitizePrice } from '@/lib/sanitize'

export const runtime = 'nodejs'

// Initialize OpenAI client lazily (only when needed)
const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured')
  return new OpenAI({ apiKey })
}

// Helper to create a Supabase client with the user's token
const getSupabaseClientWithAuth = (token: string) => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: { Authorization: `Bearer ${token}` }
      }
    }
  )
}

export async function POST(request: NextRequest) {
  try {
    // Authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const token = authHeader.substring(7)
    const supabase = getSupabaseClientWithAuth(token)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const userId = formData.get('userId') as string | null
    if (!file) return NextResponse.json({ error: 'File is required' }, { status: 400 })
    if (!userId || userId !== user.id)
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 })

    // Validate file
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Upload JPEG, PNG, WebP, or PDF.' },
        { status: 400 }
      )
    }
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      )
    }
    if (file.size < 200 * 1024) {
      return NextResponse.json(
        { error: 'Image too small or low resolution. Upload a clearer photo.' },
        { status: 400 }
      )
    }

    // Convert file to base64
    const arrayBuffer = await file.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')
    const mimeType = file.type

    // Prepare OpenAI client and single-pass structured extraction prompt
    const openai = getOpenAIClient()
    const structuredPrompt = `You are extracting menu items from an image. Return ONLY a valid JSON object with this schema:
{
  "items": [
    {
      "title": "string",
      "description": "string | null",
      "price": number | null,
      "category": "string | null"
    }
  ]
}

Rules:
- Infer categories/sections if present (e.g., Appetizers, Entrees)
- Normalize prices to decimals (12.00) when present; otherwise null
- Use null for missing description/category/price
- No markdown code fences, no extra text. JSON only.`

    const imageData = {
      type: 'image_url' as const,
      image_url: {
        url: `data:${mimeType};base64,${base64}`
      }
    }

    // Single OpenAI round-trip for structured JSON directly from the image
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 45000) // 45s timeout
    const parseResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: structuredPrompt },
            imageData
          ]
        }
      ],
      response_format: { type: 'json_object' },
      max_completion_tokens: 1200
    }, { signal: controller.signal })
    clearTimeout(timeout)

    const parsed = parseResponse.choices[0]?.message?.content || '{}'
    let menuData
    try {
      const cleaned = parsed.replace(/```json\n?|```/g, '').trim()
      menuData = JSON.parse(cleaned)
    } catch {
      return NextResponse.json(
        { error: 'Failed to parse structured data. Try again with a clearer image.' },
        { status: 500 }
      )
    }

    if (!menuData.items?.length) {
      return NextResponse.json(
        { error: 'No menu items found. Ensure the text is readable.' },
        { status: 400 }
      )
    }

    // Cap number of items to prevent very large inserts slowing down response
    if (menuData.items.length > 50) {
      menuData.items = menuData.items.slice(0, 50)
    }

    // Batch resolve categories to reduce round-trips
    let itemsInserted = 0
    let categoriesCreated = 0
    const categoryMap = new Map<string, string>()
    const categoryNames = Array.from(new Set(
      menuData.items
        .map((i: any) => i.category?.toString()?.trim())
        .filter((c: string | undefined) => !!c)
    )) as string[]

    if (categoryNames.length > 0) {
      const { data: existing } = await supabase
        .from('menu_categories')
        .select('id,name')
        .eq('user_id', user.id)
        .in('name', categoryNames)

      existing?.forEach((c: any) => categoryMap.set(c.name, c.id))

      const missing = categoryNames.filter((n) => !categoryMap.has(n))
      if (missing.length > 0) {
        const { data: inserted } = await supabase
          .from('menu_categories')
          .insert(missing.map((name) => ({ user_id: user.id, name })))
          .select('id,name')
        inserted?.forEach((c: any) => categoryMap.set(c.name, c.id))
        categoriesCreated += inserted?.length || 0
      }
    }

    const placeholderImageUrl =
      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2YzZjRmNiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5Y2EzYWYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBJbWFnZTwvdGV4dD48L3N2Zz4='

    const itemsToInsert = menuData.items.map((item: any) => {
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
        image_url: placeholderImageUrl,
      }
    }).filter((i: any) => i.title)

    if (itemsToInsert.length > 0) {
      const { error } = await supabase.from('menu_items').insert(itemsToInsert)
      if (!error) itemsInserted = itemsToInsert.length
    }

    return NextResponse.json({
      itemsInserted,
      categoriesCreated,
      message: `Imported ${itemsInserted} item${itemsInserted !== 1 ? 's' : ''} successfully.`
    })
  } catch (error: any) {
    console.error('Error in scan-menu POST:', error)
    if (error.response?.status === 401) {
      return NextResponse.json(
        { error: 'Invalid OpenAI API key.' },
        { status: 500 }
      )
    }
    if (error.code === 'insufficient_quota') {
      return NextResponse.json(
        { error: 'OpenAI API quota exceeded. Check billing.' },
        { status: 500 }
      )
    }
    return NextResponse.json(
      { error: error.message || 'Failed to scan menu. Try again later.' },
      { status: 500 }
    )
  }
}
