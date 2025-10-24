import { NextRequest } from 'next/server'

// Simple in-memory rate limiting (for production, use Redis or similar)
interface RateLimitEntry {
  count: number
  resetTime: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

/**
 * Rate limiting for premium API endpoints
 * @param request - NextRequest object
 * @param userId - User ID for rate limiting
 * @param endpoint - API endpoint name
 * @param maxRequests - Maximum requests per window (default: 60)
 * @param windowMs - Time window in milliseconds (default: 60000 = 1 minute)
 * @returns Rate limit validation result
 */
export function checkRateLimit(
  request: NextRequest,
  userId: string,
  endpoint: string,
  maxRequests: number = 60,
  windowMs: number = 60000
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now()
  const key = `${userId}:${endpoint}`
  const entry = rateLimitStore.get(key)

  // Clean up expired entries
  if (entry && now > entry.resetTime) {
    rateLimitStore.delete(key)
  }

  const currentEntry = rateLimitStore.get(key)

  if (!currentEntry) {
    // First request in this window
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + windowMs
    })
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetTime: now + windowMs
    }
  }

  if (currentEntry.count >= maxRequests) {
    // Rate limit exceeded
    return {
      allowed: false,
      remaining: 0,
      resetTime: currentEntry.resetTime
    }
  }

  // Increment counter
  currentEntry.count++
  rateLimitStore.set(key, currentEntry)

  return {
    allowed: true,
    remaining: maxRequests - currentEntry.count,
    resetTime: currentEntry.resetTime
  }
}

/**
 * Get rate limit headers for API responses
 * @param remaining - Remaining requests
 * @param resetTime - Reset time timestamp
 * @returns Headers object
 */
export function getRateLimitHeaders(remaining: number, resetTime: number) {
  return {
    'X-RateLimit-Limit': '60',
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(resetTime / 1000).toString()
  }
}

/**
 * Clean up expired rate limit entries (call periodically)
 */
export function cleanupRateLimit() {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key)
    }
  }
}

// Clean up expired entries every 5 minutes
setInterval(cleanupRateLimit, 5 * 60 * 1000)
