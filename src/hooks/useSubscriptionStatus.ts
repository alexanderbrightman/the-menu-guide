import { useAuth } from '@/contexts/AuthContext'
import { checkSubscriptionStatus, checkPremiumFeatureWithStatus } from '@/lib/premium-validation'
import { useMemo } from 'react'

export interface SubscriptionStatus {
  isActive: boolean
  isExpired: boolean
  daysUntilExpiry: number | null
  expiryDate: Date | null
  message: string
}

export interface EnhancedPremiumFeatureResult {
  canAccess: boolean
  message: string | null
  action: 'upgrade' | 'publish' | null
  subscriptionStatus: SubscriptionStatus
  isExpired: boolean
  daysUntilExpiry: number | null
  expiryDate: Date | null
}

/**
 * Hook for checking subscription status with end date validation
 * @returns Subscription status information
 */
export function useSubscriptionStatus(): SubscriptionStatus {
  const { profile } = useAuth()
  
  return useMemo(() => {
    return checkSubscriptionStatus(profile)
  }, [profile])
}

/**
 * Enhanced hook for premium feature access with subscription details
 * @param feature - Name of the feature being accessed
 * @returns Enhanced access information including subscription status
 */
export function useEnhancedPremiumFeature(feature: string = 'this feature'): EnhancedPremiumFeatureResult {
  const { profile } = useAuth()
  
  return useMemo(() => {
    return checkPremiumFeatureWithStatus(profile, feature)
  }, [profile, feature])
}

/**
 * Hook for checking if subscription is expiring soon
 * @param daysThreshold - Number of days to consider "soon" (default: 7)
 * @returns Object with expiry information
 */
export function useSubscriptionExpiry(daysThreshold: number = 7) {
  const subscriptionStatus = useSubscriptionStatus()
  
  return useMemo(() => {
    const isExpiringSoon = subscriptionStatus.daysUntilExpiry !== null && 
                          subscriptionStatus.daysUntilExpiry <= daysThreshold &&
                          subscriptionStatus.daysUntilExpiry > 0
    
    return {
      ...subscriptionStatus,
      isExpiringSoon,
      daysThreshold
    }
  }, [subscriptionStatus, daysThreshold])
}
