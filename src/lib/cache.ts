import { NextRequest, NextResponse } from 'next/server'

// Simple in-memory cache for API responses
const cache = new Map<string, { data: any; timestamp: number; ttl: number }>()

export function getCachedResponse(key: string, ttl: number = 60000) {
  const cached = cache.get(key)
  if (cached && Date.now() - cached.timestamp < cached.ttl) {
    return cached.data
  }
  return null
}

export function setCachedResponse(key: string, data: any, ttl: number = 60000) {
  cache.set(key, {
    data,
    timestamp: Date.now(),
    ttl
  })
}

export function clearCache(key?: string) {
  if (key) {
    cache.delete(key)
  } else {
    cache.clear()
  }
}

// Cache key generators
export function getProfileCacheKey(userId: string) {
  return `profile:${userId}`
}

export function getMenuItemsCacheKey(userId: string) {
  return `menu-items:${userId}`
}

export function getCategoriesCacheKey(userId: string) {
  return `categories:${userId}`
}

// Helper to add cache headers to responses
export function addCacheHeaders(response: NextResponse, maxAge: number = 60) {
  response.headers.set('Cache-Control', `public, max-age=${maxAge}, stale-while-revalidate=300`)
  response.headers.set('X-Cache', 'HIT')
  return response
}

// Helper to create cacheable API response
export function createCacheableResponse(data: any, maxAge: number = 60) {
  const response = NextResponse.json(data)
  return addCacheHeaders(response, maxAge)
}
