import { NextRequest } from 'next/server'
import { secureJsonResponse } from '@/lib/security'
import { resolveAddress } from '@/lib/geocoding-server'

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim() || ''

  if (!q) {
    return secureJsonResponse({ error: 'Query required' }, 400)
  }

  const result = await resolveAddress(q)

  if (!result) {
    return secureJsonResponse({ error: 'Address not found' }, 404)
  }

  return secureJsonResponse({ result })
}
