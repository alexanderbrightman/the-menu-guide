import { NextRequest } from 'next/server'
import { secureJsonResponse } from '@/lib/security'
import { searchAddresses } from '@/lib/geocoding-server'

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim() || ''

  if (q.length < 3) {
    return secureJsonResponse({ suggestions: [] })
  }

  if (q.length > 200) {
    return secureJsonResponse({ error: 'Query too long' }, 400)
  }

  const suggestions = await searchAddresses(q, 6)

  return secureJsonResponse(
    { suggestions },
    200,
    { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' }
  )
}
