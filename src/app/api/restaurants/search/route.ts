import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSecurityHeaders } from '@/lib/security'
import { sanitizeTextInput } from '@/lib/sanitize'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')

    // If no query, return empty results
    if (!query || query.trim() === '') {
      return NextResponse.json(
        { restaurants: [] },
        { headers: getSecurityHeaders() }
      )
    }

    // Sanitize the search query
    const sanitizedQuery = sanitizeTextInput(query.trim())

    if (!sanitizedQuery || sanitizedQuery.length < 1) {
      return NextResponse.json(
        { restaurants: [] },
        { headers: getSecurityHeaders() }
      )
    }

    // Optimized search: Use a single query to fetch potential matches, then sort in memory
    // This reduces database roundtrips from 2 to 1, significantly improving latency

    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('username, display_name, avatar_url')
      .eq('is_public', true)
      .eq('subscription_status', 'pro')
      .ilike('username', `%${sanitizedQuery}%`)
      .limit(50) // Fetch more than needed to ensure we get good candidates

    if (error) {
      console.error('Error searching restaurants:', error)
      return NextResponse.json(
        { error: 'An error occurred while searching restaurants', details: error.message },
        { status: 500, headers: getSecurityHeaders() }
      )
    }

    // Sort in memory:
    // 1. Exact match (case-insensitive)
    // 2. Starts with (case-insensitive)
    // 3. Alphabetical
    const lowerQuery = sanitizedQuery.toLowerCase()

    const sortedProfiles = (profiles || []).sort((a, b) => {
      const aUser = a.username.toLowerCase()
      const bUser = b.username.toLowerCase()

      // Exact match priority
      if (aUser === lowerQuery && bUser !== lowerQuery) return -1
      if (bUser === lowerQuery && aUser !== lowerQuery) return 1

      // Starts with priority
      const aStarts = aUser.startsWith(lowerQuery)
      const bStarts = bUser.startsWith(lowerQuery)

      if (aStarts && !bStarts) return -1
      if (!aStarts && bStarts) return 1

      // Alphabetical fallback
      return aUser.localeCompare(bUser)
    }).slice(0, 20)

    // Add cache headers for faster repeated searches
    const headers = new Headers(getSecurityHeaders())
    headers.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=120')

    return NextResponse.json(
      { restaurants: sortedProfiles },
      { headers }
    )
  } catch (error) {
    console.error('Error in restaurant search:', error)
    return NextResponse.json(
      { error: 'An error occurred while processing your request', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500, headers: getSecurityHeaders() }
    )
  }
}

