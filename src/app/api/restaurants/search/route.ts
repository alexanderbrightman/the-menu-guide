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

    // Optimized search: Use two queries - one for exact/starts-with matches, one for contains
    // This prioritizes better matches and reduces sorting overhead
    
    // First, get profiles that start with the query (higher priority)
    const { data: startsWithProfiles, error: startsWithError } = await supabase
      .from('profiles')
      .select('username, display_name, avatar_url')
      .eq('is_public', true)
      .eq('subscription_status', 'pro')
      .ilike('username', `${sanitizedQuery}%`)
      .limit(20)
      .order('username', { ascending: true })

    if (startsWithError) {
      console.error('Error searching restaurants (starts with):', startsWithError)
    }

    // If we have enough results from starts-with, return them
    if (startsWithProfiles && startsWithProfiles.length >= 20) {
      return NextResponse.json(
        { restaurants: startsWithProfiles.slice(0, 20) },
        { headers: getSecurityHeaders() }
      )
    }

    // Otherwise, get additional results that contain the query
    const { data: containsProfiles, error: containsError } = await supabase
      .from('profiles')
      .select('username, display_name, avatar_url')
      .eq('is_public', true)
      .eq('subscription_status', 'pro')
      .ilike('username', `%${sanitizedQuery}%`)
      .not('username', 'ilike', `${sanitizedQuery}%`) // Exclude ones we already got
      .limit(20 - (startsWithProfiles?.length || 0))
      .order('username', { ascending: true })

    if (containsError) {
      console.error('Error searching restaurants (contains):', containsError)
      // If starts-with worked, return those results even if contains failed
      if (startsWithProfiles) {
        return NextResponse.json(
          { restaurants: startsWithProfiles },
          { headers: getSecurityHeaders() }
        )
      }
      return NextResponse.json(
        { error: 'An error occurred while searching restaurants', details: containsError.message },
        { status: 500, headers: getSecurityHeaders() }
      )
    }

    // Combine results: starts-with first, then contains
    const allProfiles = [
      ...(startsWithProfiles || []),
      ...(containsProfiles || [])
    ]

    // Remove duplicates (in case of any overlap)
    const uniqueProfiles = Array.from(
      new Map(allProfiles.map(profile => [profile.username, profile])).values()
    ).slice(0, 20)

    return NextResponse.json(
      { restaurants: uniqueProfiles },
      { headers: getSecurityHeaders() }
    )
  } catch (error) {
    console.error('Error in restaurant search:', error)
    return NextResponse.json(
      { error: 'An error occurred while processing your request', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500, headers: getSecurityHeaders() }
    )
  }
}

