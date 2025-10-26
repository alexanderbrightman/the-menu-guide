'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { getSessionToken, handleAuthError } from '@/lib/auth-utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Calendar, 
  CreditCard, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock,
  DollarSign,
  User,
  Mail,
  RefreshCw
} from 'lucide-react'
import { validatePremiumAccess } from '@/lib/premium-validation'

interface SubscriptionDetails {
  id: string
  status: string
  current_period_start: string
  current_period_end: string
  amount: number
  currency: string
  interval: string
  cancel_at_period_end: boolean
  canceled_at: string | null
  customer_email: string
  customer_name: string | null
  next_billing_date: string | null
  next_billing_amount: number | null
  trial_start: string | null
  trial_end: string | null
  is_active: boolean
  is_canceled: boolean
  is_past_due: boolean
  is_unpaid: boolean
  days_until_renewal: number
  days_until_cancellation: number | null
}

export function SubscriptionDetailsCard() {
  const { user, profile } = useAuth()
  const [subscriptionDetails, setSubscriptionDetails] = useState<SubscriptionDetails | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const fetchSubscriptionDetails = useCallback(async () => {
    if (!user || !supabase) {
      console.log('Cannot fetch subscription details: missing user or supabase client')
      return
    }

    // Only fetch if user has premium subscription
    if (profile?.subscription_status !== 'pro') {
      console.log('Cannot fetch subscription details: user does not have pro subscription')
      return
    }

    setLoading(true)
    setError('')

    try {
      const token = await getSessionToken()
      if (!token) {
        throw new Error('Not authenticated')
      }

      const response = await fetch('/api/stripe/subscription-details', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (response.ok) {
        setSubscriptionDetails(data.subscription)
      } else {
        throw new Error(data.error || 'Failed to fetch subscription details')
      }
    } catch (error) {
      console.error('Error fetching subscription details:', error)
      handleAuthError(error, 'fetchSubscriptionDetails')
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [user, profile?.subscription_status])

  useEffect(() => {
    // Only fetch if user has premium access and is authenticated
    if (profile?.subscription_status === 'pro' && user && supabase) {
      fetchSubscriptionDetails()
    }
  }, [profile?.subscription_status, user, fetchSubscriptionDetails])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase()
    }).format(amount / 100)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Active</Badge>
      case 'canceled':
        // Check if subscription is canceled but still active until period end
        if (subscriptionDetails?.cancel_at_period_end && subscriptionDetails?.is_active) {
          return <Badge className="bg-orange-100 text-orange-800"><AlertTriangle className="h-3 w-3 mr-1" />Canceling</Badge>
        }
        return <Badge className="bg-red-100 text-red-800"><XCircle className="h-3 w-3 mr-1" />Canceled</Badge>
      case 'past_due':
        return <Badge className="bg-yellow-100 text-yellow-800"><AlertTriangle className="h-3 w-3 mr-1" />Past Due</Badge>
      case 'unpaid':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="h-3 w-3 mr-1" />Unpaid</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (!profile || !validatePremiumAccess(profile, 'subscription details').isValid) {
    return null
  }

  if (loading) {
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Subscription Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-600">Loading subscription details...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="shadow-sm border-red-200">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2 text-red-800">
            <AlertTriangle className="h-4 w-4" />
            Subscription Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="border-red-300 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
          <div className="mt-4 space-y-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchSubscriptionDetails}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
            <Button 
              variant="default" 
              size="sm" 
              onClick={async () => {
                if (!supabase) return
                setLoading(true)
                setError('')
                
                try {
                  const token = await getSessionToken()
                  if (token) {
                    const response = await fetch('/api/sync-stripe-subscription', {
                      method: 'POST',
                      headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                      },
                    })
                    const data = await response.json()
                    if (response.ok) {
                      alert('Successfully synced with your Stripe subscription! Refreshing...')
                      window.location.reload()
                    } else {
                      setError(data.error || 'Failed to sync with Stripe')
                    }
                  }
                } catch (error) {
                  console.error('Error syncing subscription:', error)
                  handleAuthError(error, 'syncStripeSubscription')
                  setError('An error occurred while syncing your subscription')
                } finally {
                  setLoading(false)
                }
              }}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Sync with Stripe
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!subscriptionDetails) {
    return null
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Subscription Details
          </CardTitle>
          <div className="flex items-center gap-2">
            {getStatusBadge(subscriptionDetails.status)}
            <Button 
              variant="outline" 
              size="sm"
              onClick={fetchSubscriptionDetails}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <CardDescription>
          Your Premium subscription information and billing details
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Billing Period */}
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Current Billing Period
          </h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Started:</span>
              <p className="font-medium">{formatDate(subscriptionDetails.current_period_start)}</p>
            </div>
            <div>
              <span className="text-gray-600">Ends:</span>
              <p className="font-medium">{formatDate(subscriptionDetails.current_period_end)}</p>
            </div>
          </div>
        </div>

        {/* Cancellation Notice */}
        {subscriptionDetails.cancel_at_period_end && subscriptionDetails.is_active && (
          <Alert className="border-orange-200 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              <strong>Subscription Canceled:</strong> Your subscription has been canceled and will end on {formatDate(subscriptionDetails.current_period_end)}. 
              You will continue to have access to all premium features until then.
            </AlertDescription>
          </Alert>
        )}

        {/* Pricing Information */}
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900 flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Pricing
          </h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Amount:</span>
              <p className="font-medium">{formatAmount(subscriptionDetails.amount, subscriptionDetails.currency)}</p>
            </div>
            <div>
              <span className="text-gray-600">Billing:</span>
              <p className="font-medium capitalize">{subscriptionDetails.interval}ly</p>
            </div>
          </div>
        </div>

        {/* Customer Information */}
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900 flex items-center gap-2">
            <User className="h-4 w-4" />
            Customer Information
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-gray-400" />
              <span>{subscriptionDetails.customer_email}</span>
            </div>
            {subscriptionDetails.customer_name && (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-400" />
                <span>{subscriptionDetails.customer_name}</span>
              </div>
            )}
          </div>
        </div>

        {/* Renewal Information */}
        {subscriptionDetails.is_active && (
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Renewal Information
            </h4>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-green-800">
                    <strong>Next billing:</strong> {subscriptionDetails.next_billing_date ? formatDate(subscriptionDetails.next_billing_date) : 'Not available'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-green-600" />
                  <span className="text-green-800">
                    <strong>Days until renewal:</strong> {subscriptionDetails.days_until_renewal} days
                  </span>
                </div>
                {subscriptionDetails.next_billing_amount && (
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    <span className="text-green-800">
                      <strong>Next charge:</strong> {formatAmount(subscriptionDetails.next_billing_amount, subscriptionDetails.currency)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Cancellation Information */}
        {subscriptionDetails.cancel_at_period_end && (
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Cancellation Information
            </h4>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <span className="text-yellow-800">
                    <strong>Subscription will end:</strong> {formatDate(subscriptionDetails.current_period_end)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-yellow-600" />
                  <span className="text-yellow-800">
                    <strong>Days remaining:</strong> {subscriptionDetails.days_until_cancellation} days
                  </span>
                </div>
                {subscriptionDetails.canceled_at && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-yellow-600" />
                    <span className="text-yellow-800">
                      <strong>Canceled on:</strong> {formatDate(subscriptionDetails.canceled_at)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Trial Information */}
        {subscriptionDetails.trial_end && (
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Trial Information
            </h4>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-blue-600" />
                  <span className="text-blue-800">
                    <strong>Trial ends:</strong> {formatDate(subscriptionDetails.trial_end)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Management Actions */}
        <div className="pt-4 border-t">
          {/* Adaptive button based on subscription status */}
          {subscriptionDetails.cancel_at_period_end && subscriptionDetails.is_active ? (
            // Canceled but still active - show reactivate button
            <Button 
              variant="default" 
              className="w-full"
              onClick={async () => {
                if (!supabase) return
                if (!confirm('Are you sure you want to reactivate your subscription? This will resume monthly billing.')) {
                  return
                }
                
                try {
                  const token = await getSessionToken()
                  if (token) {
                    const response = await fetch('/api/reactivate-subscription', {
                      method: 'POST',
                      headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                      },
                    })
                    const data = await response.json()
                    if (response.ok) {
                      alert('Your subscription has been reactivated!')
                      window.location.reload()
                    } else {
                      alert(`Unable to reactivate subscription: ${data.error}`)
                    }
                  }
                } catch (error) {
                  console.error('Error reactivating subscription:', error)
                  handleAuthError(error, 'reactivateSubscription')
                  alert('An error occurred while reactivating your subscription.')
                }
              }}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Reactivate Subscription
            </Button>
          ) : subscriptionDetails.is_active ? (
            // Active subscription - show cancel button
            <Button 
              variant="destructive" 
              className="w-full"
              onClick={async () => {
                if (!supabase) return
                if (!confirm('Are you sure you want to cancel your subscription? This will cancel at the end of your current billing period and make your menu private.')) {
                  return
                }
                
                try {
                  const token = await getSessionToken()
                  if (token) {
                    const response = await fetch('/api/cancel-subscription', {
                      method: 'POST',
                      headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                      },
                    })
                    const data = await response.json()
                    if (response.ok) {
                      alert('Your subscription has been canceled and will end at the end of your current billing period.')
                      window.location.reload()
                    } else {
                      alert(`Unable to cancel subscription: ${data.error}`)
                    }
                  }
                } catch (error) {
                  console.error('Error canceling subscription:', error)
                  handleAuthError(error, 'cancelSubscription')
                  alert('An error occurred while canceling your subscription.')
                }
              }}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Cancel Subscription
            </Button>
          ) : (
            // No active subscription - show renew/upgrade button
            <Button 
              variant="default" 
              className="w-full"
              onClick={() => {
                // Redirect to upgrade page or open upgrade modal
                window.location.href = '/dashboard'
              }}
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Renew Subscription
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
