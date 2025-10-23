import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

export async function POST(request: NextRequest) {
  try {
    const { username } = await request.json()

    if (!username || typeof username !== 'string') {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 })
    }

    // Basic validation
    if (username.length < 3) {
      return NextResponse.json({ 
        available: false, 
        message: 'Username must be at least 3 characters' 
      })
    }

    if (username.length > 20) {
      return NextResponse.json({ 
        available: false, 
        message: 'Username must be less than 20 characters' 
      })
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      return NextResponse.json({ 
        available: false, 
        message: 'Username can only contain letters, numbers, hyphens, and underscores' 
      })
    }

    // Create a basic Supabase client for anonymous checks
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Check if username is already taken
    const { data: existingProfile, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username.trim())
      .single()

    if (error && error.code === 'PGRST116') {
      // No rows returned - username is available
      return NextResponse.json({ 
        available: true, 
        message: 'Username is available' 
      })
    } else if (existingProfile) {
      // Username is taken
      return NextResponse.json({ 
        available: false, 
        message: 'Username is already taken' 
      })
    } else {
      // Other error
      return NextResponse.json({ error: 'Error checking username' }, { status: 500 })
    }
  } catch (error) {
    console.error('Username validation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
