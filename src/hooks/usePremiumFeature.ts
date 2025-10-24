import { useAuth } from '@/contexts/AuthContext'
import { checkPremiumFeature } from '@/lib/premium-validation'
import { useCallback } from 'react'

export interface PremiumFeatureResult {
  canAccess: boolean
  message: string | null
  action: 'upgrade' | 'publish' | null
}

/**
 * Hook for checking premium feature access in React components
 * @param feature - Name of the feature being accessed
 * @returns Object with access status and user-friendly messages
 */
export function usePremiumFeature(feature: string = 'this feature'): PremiumFeatureResult {
  const { profile } = useAuth()
  
  return checkPremiumFeature(profile, feature)
}

/**
 * Hook for premium feature validation with callback
 * @param feature - Name of the feature
 * @param onError - Callback when access is denied
 * @returns Function to check access and execute callback if needed
 */
export function usePremiumValidation(feature: string = 'this feature', onError?: (message: string) => void) {
  const { profile } = useAuth()
  
  const validateAccess = useCallback(() => {
    const result = checkPremiumFeature(profile, feature)
    
    if (!result.canAccess && onError) {
      onError(result.message || `Access denied for ${feature}`)
    }
    
    return result.canAccess
  }, [profile, feature, onError])
  
  return validateAccess
}

/**
 * Hook for premium feature with automatic error handling
 * @param feature - Name of the feature
 * @returns Object with validation function and current access status
 */
export function usePremiumGuard(feature: string = 'this feature') {
  const { profile } = useAuth()
  const result = checkPremiumFeature(profile, feature)
  
  const guard = useCallback((callback: () => void) => {
    if (result.canAccess) {
      callback()
    } else {
      // Could integrate with toast notifications here
      console.warn(`Premium feature access denied: ${result.message}`)
    }
  }, [result.canAccess, result.message])
  
  return {
    canAccess: result.canAccess,
    message: result.message,
    action: result.action,
    guard
  }
}
