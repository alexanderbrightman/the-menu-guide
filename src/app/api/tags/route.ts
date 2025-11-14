import { NextRequest, NextResponse } from 'next/server'
import { getSecurityHeaders } from '@/lib/security'
import { createAuthenticatedClient, getAuthToken } from '@/lib/supabase-server'

// GET - Fetch all available tags
export async function GET(request: NextRequest) {
  try {
    // Get and validate auth token
    const token = getAuthToken(request)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: getSecurityHeaders() })
    }

    // Create authenticated Supabase client
    const supabase = createAuthenticatedClient(token)

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: getSecurityHeaders() })
    }

    // Fetch all tags - tags are read-only and public
    const { data: tags, error } = await supabase.from('tags').select('*').order('name')

    if (error) {
      console.error('Error fetching tags:', error)
      // Return empty array instead of error for tags (they're optional)
      return NextResponse.json({ tags: [] }, { headers: getSecurityHeaders() })
    }

    // Add cache control headers for better performance
    return NextResponse.json(
      { tags },
      {
        headers: {
          'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
          ...getSecurityHeaders(),
        },
      }
    )
  } catch (error) {
    console.error('Error in tags GET:', error)
    return NextResponse.json({ error: 'An error occurred while processing your request' }, { status: 500, headers: getSecurityHeaders() })
  }
}
