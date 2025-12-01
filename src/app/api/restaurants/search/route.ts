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

    // Query public profiles matching the search term by username
    // RLS policy ensures only is_public=true and subscription_status='pro' are returned
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('username, display_name, avatar_url')
      .eq('is_public', true)
      .eq('subscription_status', 'pro')
      .ilike('username', `%${sanitizedQuery}%`)
      .limit(50) // Get more results to sort properly

    if (error) {
      console.error('Error searching restaurants:', error)
      return NextResponse.json(
        { error: 'An error occurred while searching restaurants', details: error.message },
        { status: 500, headers: getSecurityHeaders() }
      )
    }

    // Sort results to prioritize usernames that start with the search query
    const searchLower = sanitizedQuery.toLowerCase()
    const sortedRestaurants = (profiles || []).sort((a, b) => {
      const aUsername = a.username.toLowerCase()
      const bUsername = b.username.toLowerCase()
      
      const aStartsWith = aUsername.startsWith(searchLower)
      const bStartsWith = bUsername.startsWith(searchLower)
      
      // If one starts with the query and the other doesn't, prioritize the one that starts with it
      if (aStartsWith && !bStartsWith) return -1
      if (!aStartsWith && bStartsWith) return 1
      
      // If both start with the query or both don't, sort alphabetically
      return aUsername.localeCompare(bUsername)
    }).slice(0, 20) // Limit to 20 results after sorting

    return NextResponse.json(
      { restaurants: sortedRestaurants },
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

