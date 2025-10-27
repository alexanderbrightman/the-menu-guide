import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// GET - Fetch all available tags
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

    // Fetch all tags - use service role key for tags since they're read-only and public
    const { data: tags, error } = await supabase
      .from('tags')
      .select('*')
      .order('name')

    if (error) {
      console.error('Error fetching tags:', error)
      // Return empty array instead of error for tags (they're optional)
      return NextResponse.json({ tags: [] })
    }

    // Add cache control headers for better performance
    return NextResponse.json(
      { tags },
      {
        headers: {
          'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
        },
      }
    )
  } catch (error) {
    console.error('Error in tags GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
