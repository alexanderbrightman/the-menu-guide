/**
 * Input sanitization utilities for security
 */

/**
 * Sanitize text input to prevent XSS
 */
export function sanitizeTextInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .substring(0, 1000) // Limit length
}

/**
 * Sanitize filename to prevent path traversal
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace special chars with underscore
    .replace(/\.{2,}/g, '.') // Replace multiple dots with single dot
    .replace(/^\.+|\.+$/g, '') // Remove leading/trailing dots
    .substring(0, 255) // Limit length
}

/**
 * Validate and sanitize URL input
 */
export function sanitizeUrl(url: string): string | null {
  try {
    const parsed = new URL(url)
    
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null
    }
    
    return parsed.toString()
  } catch {
    return null
  }
}

/**
 * Validate price input
 */
export function sanitizePrice(price: string | number): number | null {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price
  
  if (isNaN(numPrice) || numPrice < 0 || numPrice > 999999.99) {
    return null
  }
  
  return Math.round(numPrice * 100) / 100 // Round to 2 decimal places
}

/**
 * Validate UUID format
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

/**
 * Validate and sanitize UUID input
 */
export function sanitizeUUID(uuid: string | null | undefined): string | null {
  if (!uuid || typeof uuid !== 'string') {
    return null
  }
  return isValidUUID(uuid) ? uuid : null
}

/**
 * Validate and sanitize integer input with min/max bounds
 */
export function sanitizeInteger(
  value: string | number | null | undefined,
  min: number = 0,
  max: number = Number.MAX_SAFE_INTEGER
): number | null {
  if (value === null || value === undefined) {
    return null
  }
  
  const numValue = typeof value === 'string' ? parseInt(value, 10) : value
  
  if (isNaN(numValue) || !Number.isInteger(numValue)) {
    return null
  }
  
  if (numValue < min || numValue > max) {
    return null
  }
  
  return numValue
}

/**
 * Validate and sanitize array of integers (for tag_ids, etc.)
 */
export function sanitizeIntegerArray(
  value: unknown,
  min: number = 0,
  max: number = Number.MAX_SAFE_INTEGER
): number[] | null {
  if (!Array.isArray(value)) {
    return null
  }
  
  const sanitized = value
    .map(item => sanitizeInteger(item, min, max))
    .filter((item): item is number => item !== null)
  
  return sanitized.length === value.length ? sanitized : null
}
