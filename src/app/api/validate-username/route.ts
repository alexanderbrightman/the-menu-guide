import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSecurityHeaders } from '@/lib/security'
import { sanitizeTextInput } from '@/lib/sanitize'

// Maximum request body size (1MB)
const MAX_REQUEST_SIZE = 1024 * 1024

export async function POST(request: NextRequest) {
  try {
    // Check request size
    const contentLength = request.headers.get('content-length')
    if (contentLength && parseInt(contentLength) > MAX_REQUEST_SIZE) {
      return NextResponse.json({ error: 'Request body too large' }, { status: 413, headers: getSecurityHeaders() })
    }

    const { username } = await request.json()

    if (!username || typeof username !== 'string') {
      return NextResponse.json({ error: 'Username is required' }, { status: 400, headers: getSecurityHeaders() })
    }

    // Sanitize input
    const sanitizedUsername = sanitizeTextInput(username)

    // Basic validation
    if (sanitizedUsername.length < 3) {
      return NextResponse.json(
        {
          available: false,
          message: 'Username must be at least 3 characters',
        },
        { headers: getSecurityHeaders() }
      )
    }

    if (sanitizedUsername.length > 20) {
      return NextResponse.json(
        {
          available: false,
          message: 'Username must be less than 20 characters',
        },
        { headers: getSecurityHeaders() }
      )
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(sanitizedUsername)) {
      return NextResponse.json(
        {
          available: false,
          message: 'Username can only contain letters, numbers, hyphens, and underscores',
        },
        { headers: getSecurityHeaders() }
      )
    }

    // Create a basic Supabase client for anonymous checks
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

    // Check if username is already taken
    const { data: existingProfile, error } = await supabase.from('profiles').select('id').eq('username', sanitizedUsername).single()

    if (error && error.code === 'PGRST116') {
      // No rows returned - username is available
      return NextResponse.json(
        {
          available: true,
          message: 'Username is available',
        },
        { headers: getSecurityHeaders() }
      )
    } else if (existingProfile) {
      // Username is taken
      return NextResponse.json(
        {
          available: false,
          message: 'Username is already taken',
        },
        { headers: getSecurityHeaders() }
      )
    } else {
      // Other error
      return NextResponse.json({ error: 'An error occurred while checking username' }, { status: 500, headers: getSecurityHeaders() })
    }
  } catch (error) {
    console.error('Username validation error:', error)
    return NextResponse.json({ error: 'An error occurred while processing your request' }, { status: 500, headers: getSecurityHeaders() })
  }
}
