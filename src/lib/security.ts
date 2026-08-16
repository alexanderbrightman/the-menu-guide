import { NextResponse } from 'next/server'

/**
 * Security headers middleware for Next.js API routes
 */

export function getSecurityHeaders(overrides: Record<string, string> = {}) {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    // Default: APIs are user-specific. Pass Cache-Control to override
    // (public discover feeds, QR images, tag lists).
    'Cache-Control': 'private, no-store',
    ...overrides,
  }
}

export function addSecurityHeaders(response: Response): Response {
  const headers = getSecurityHeaders()
  
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value)
  })
  
  return response
}

/**
 * Helper to create a secure JSON response with security headers
 */
export function secureJsonResponse(
  data: unknown,
  status: number = 200,
  additionalHeaders: Record<string, string> = {}
): NextResponse {
  return NextResponse.json(data, {
    status,
    headers: {
      ...getSecurityHeaders(),
      ...additionalHeaders,
    },
  })
}
