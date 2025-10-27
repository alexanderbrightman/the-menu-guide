import { NextRequest, NextResponse } from 'next/server'
import QRCode from 'qrcode'
import { createClient } from '@supabase/supabase-js'
import { validateApiPremiumAccess, PREMIUM_API_HEADERS, createPremiumErrorResponse } from '@/lib/premium-validation'
import { checkRateLimit, getRateLimitHeaders } from '@/lib/rate-limiting'

// Helper to create a Supabase client with the user's token
const getSupabaseClientWithAuth = (token: string) => {
  return createClient(
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
}

export async function GET(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const supabase = getSupabaseClientWithAuth(token)

    // Get the authenticated user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the user's profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('username, subscription_status, is_public')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Validate premium access for QR code generation
    const premiumValidation = validateApiPremiumAccess(profile, 'QR code generation')
    if (!premiumValidation.isValid) {
      return NextResponse.json(
        createPremiumErrorResponse(premiumValidation.error!, premiumValidation.statusCode!),
        { 
          status: premiumValidation.statusCode!,
          headers: PREMIUM_API_HEADERS
        }
      )
    }

    // Check rate limiting for QR code generation
    const rateLimit = checkRateLimit(request, user.id, 'qr-code', 10, 60000) // 10 requests per minute
    if (!rateLimit.allowed) {
      return NextResponse.json(
        createPremiumErrorResponse('Rate limit exceeded. Please wait before generating another QR code.', 429),
        { 
          status: 429,
          headers: {
            ...PREMIUM_API_HEADERS,
            ...getRateLimitHeaders(rateLimit.remaining, rateLimit.resetTime)
          }
        }
      )
    }

    // Generate the public profile URL using the request origin
    const host = request.headers.get('host') || 'localhost:3000'
    const forwardedProto = request.headers.get('x-forwarded-proto')
    const protocol = forwardedProto || (host.includes('localhost') ? 'http' : 'https')
    const publicProfileUrl = `${protocol}://${host}/menu/${profile.username}`

    // Generate QR code as PNG buffer
    const qrCodeBuffer = await QRCode.toBuffer(publicProfileUrl, {
      type: 'png',
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    })

    // Return the QR code as PNG
    return new NextResponse(new Uint8Array(qrCodeBuffer), {
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="menu-qr-code-${profile.username}.png"`,
        'Cache-Control': 'public, max-age=3600', // Override premium headers for QR code caching
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        ...getRateLimitHeaders(rateLimit.remaining, rateLimit.resetTime)
      }
    })

  } catch (error) {
    console.error('Error generating QR code:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
