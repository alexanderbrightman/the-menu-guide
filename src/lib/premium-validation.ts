import { Profile } from '@/lib/supabase'

export interface PremiumValidationResult {
  isValid: boolean
  error?: string
  statusCode?: number
}

/**
 * Validates if a user has premium subscription status, including end date checks
 * @param profile - User profile object or partial profile data
 * @param feature - Feature being accessed (for error messages)
 * @returns Validation result with error details
 */
export function validatePremiumAccess(profile: Profile | Partial<Profile> | null, feature: string = 'premium feature'): PremiumValidationResult {
  // Check if profile exists
  if (!profile) {
    return {
      isValid: false,
      error: 'User profile not found. Please log in and try again.',
      statusCode: 401
    }
  }

  // Check subscription status
  if (profile.subscription_status !== 'pro') {
    return {
      isValid: false,
      error: `This ${feature} requires a Premium subscription. Please upgrade to access this feature.`,
      statusCode: 403
    }
  }

  // Check if subscription has expired based on end date
  if (profile.subscription_current_period_end) {
    const endDate = new Date(profile.subscription_current_period_end)
    const now = new Date()
    
    // If subscription has expired, deny access
    if (endDate < now) {
      return {
        isValid: false,
        error: `Your Premium subscription expired on ${endDate.toLocaleDateString()}. Please renew to access ${feature}.`,
        statusCode: 403
      }
    }
  }

  // Check if profile is public (for public features)
  if (feature.includes('public') && !profile.is_public) {
    return {
      isValid: false,
      error: 'Your profile must be published to access this feature. Please publish your profile first.',
      statusCode: 403
    }
  }

  return { isValid: true }
}

/**
 * Validates premium access for API endpoints
 * @param profile - User profile object or partial profile data
 * @param feature - Feature being accessed
 * @returns Validation result
 */
export function validateApiPremiumAccess(profile: Profile | Partial<Profile> | null, feature: string = 'premium API'): PremiumValidationResult {
  const validation = validatePremiumAccess(profile, feature)
  
  if (!validation.isValid) {
    return {
      isValid: false,
      error: validation.error,
      statusCode: validation.statusCode || 403
    }
  }

  return { isValid: true }
}

/**
 * Checks if a subscription is still active based on end date
 * @param profile - User profile object
 * @returns Object with subscription status and details
 */
export function checkSubscriptionStatus(profile: Profile | Partial<Profile> | null) {
  if (!profile) {
    return {
      isActive: false,
      isExpired: true,
      daysUntilExpiry: 0,
      expiryDate: null,
      message: 'No profile found'
    }
  }

  if (profile.subscription_status !== 'pro') {
    return {
      isActive: false,
      isExpired: true,
      daysUntilExpiry: 0,
      expiryDate: null,
      message: 'No active subscription'
    }
  }

  if (!profile.subscription_current_period_end) {
    return {
      isActive: true,
      isExpired: false,
      daysUntilExpiry: null,
      expiryDate: null,
      message: 'Active subscription (no end date)'
    }
  }

  const endDate = new Date(profile.subscription_current_period_end)
  const now = new Date()
  const isExpired = endDate < now
  const daysUntilExpiry = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  return {
    isActive: !isExpired,
    isExpired,
    daysUntilExpiry: Math.max(0, daysUntilExpiry),
    expiryDate: endDate,
    message: isExpired 
      ? `Subscription expired on ${endDate.toLocaleDateString()}`
      : `Subscription active until ${endDate.toLocaleDateString()}`
  }
}

/**
 * Enhanced premium feature check with subscription status details
 * @param profile - User profile object
 * @param feature - Feature name
 * @returns Detailed access information
 */
export function checkPremiumFeatureWithStatus(profile: Profile | Partial<Profile> | null, feature: string = 'this feature') {
  const subscriptionStatus = checkSubscriptionStatus(profile)
  const validation = validatePremiumAccess(profile, feature)
  
  return {
    canAccess: validation.isValid,
    message: validation.error || null,
    action: validation.isValid ? null : 'upgrade' as const,
    subscriptionStatus,
    isExpired: subscriptionStatus.isExpired,
    daysUntilExpiry: subscriptionStatus.daysUntilExpiry,
    expiryDate: subscriptionStatus.expiryDate
  }
}

/**
 * Client-side premium feature check with user-friendly error
 * @param profile - User profile object or partial profile data
 * @param feature - Feature name for error message
 * @returns Object with validation result and user message
 */
export function checkPremiumFeature(profile: Profile | Partial<Profile> | null, feature: string = 'this feature') {
  const validation = validatePremiumAccess(profile, feature)
  
  if (!validation.isValid) {
    return {
      canAccess: false,
      message: validation.error || `This ${feature} requires a Premium subscription.`,
      action: 'upgrade' as const
    }
  }

  return {
    canAccess: true,
    message: null,
    action: null
  }
}

/**
 * Rate limiting check for premium endpoints
 * @param userId - User ID
 * @param endpoint - API endpoint name
 * @param maxRequests - Maximum requests per minute (default: 60)
 * @returns Rate limit validation result
 */
export function checkRateLimit(_userId: string, _endpoint: string, _maxRequests: number = 60): PremiumValidationResult {
  // Simple in-memory rate limiting (in production, use Redis or similar)
  // This would be implemented with a proper rate limiting service
  // For now, we'll return valid to avoid blocking legitimate users
  return { isValid: true }
}

/**
 * Security headers for premium API responses
 */
export const PREMIUM_API_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Cache-Control': 'private, no-cache, no-store, must-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0'
}

/**
 * Error response for premium validation failures
 */
export function createPremiumErrorResponse(error: string, statusCode: number = 403) {
  return {
    error,
    code: 'PREMIUM_REQUIRED',
    statusCode,
    timestamp: new Date().toISOString()
  }
}
