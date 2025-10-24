'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Settings, CreditCard, AlertTriangle, CheckCircle, XCircle, Calendar } from 'lucide-react'

interface SubscriptionManagementProps {
  onClose?: () => void
}

export function SubscriptionManagement({ onClose }: SubscriptionManagementProps) {
  const { user, profile, refreshProfile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [showReactivateConfirm, setShowReactivateConfirm] = useState(false)

  const handleCancelSubscription = async () => {
    if (!user || !supabase) return

    setLoading(true)
    setMessage('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) {
        const response = await fetch('/api/cancel-subscription', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        })
        const data = await response.json()
        
        if (response.ok) {
          setMessage('Your subscription has been canceled and will end at the end of your current billing period.')
          setShowCancelConfirm(false)
          await refreshProfile()
        } else {
          setMessage(`Error: ${data.error}`)
        }
      }
    } catch (error) {
      console.error('Error canceling subscription:', error)
      setMessage('An error occurred while canceling your subscription.')
    } finally {
      setLoading(false)
    }
  }

  const handleReactivateSubscription = async () => {
    if (!user || !supabase) return

    setLoading(true)
    setMessage('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) {
        const response = await fetch('/api/reactivate-subscription', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        })
        const data = await response.json()
        
        if (response.ok) {
          setMessage('Your subscription has been reactivated!')
          setShowReactivateConfirm(false)
          await refreshProfile()
        } else {
          setMessage(`Error: ${data.error}`)
        }
      }
    } catch (error) {
      console.error('Error reactivating subscription:', error)
      setMessage('An error occurred while reactivating your subscription.')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getSubscriptionStatus = () => {
    if (!profile?.subscription_current_period_end) {
      return { status: 'active', message: 'Active subscription' }
    }

    const endDate = new Date(profile.subscription_current_period_end)
    const now = new Date()
    const isExpired = endDate < now

    if (isExpired) {
      return { status: 'expired', message: `Expired on ${formatDate(profile.subscription_current_period_end)}` }
    } else if ((profile as any).subscription_cancel_at_period_end) {
      return { status: 'canceling', message: `Canceling on ${formatDate(profile.subscription_current_period_end)}` }
    } else {
      return { status: 'active', message: `Active until ${formatDate(profile.subscription_current_period_end)}` }
    }
  }

  const subscriptionStatus = getSubscriptionStatus()

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Manage Subscription
          </DialogTitle>
          <DialogDescription>
            Manage your Premium subscription settings
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Subscription Status */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Current Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    {subscriptionStatus.status === 'active' && <CheckCircle className="h-4 w-4 text-green-600" />}
                    {subscriptionStatus.status === 'canceling' && <AlertTriangle className="h-4 w-4 text-orange-600" />}
                    {subscriptionStatus.status === 'expired' && <XCircle className="h-4 w-4 text-red-600" />}
                    <span className="font-medium">{subscriptionStatus.message}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">$18/month</p>
                </div>
                <div className="text-right">
                  {profile?.subscription_current_period_end && (
                    <div className="text-sm text-gray-600">
                      <Calendar className="h-3 w-3 inline mr-1" />
                      {formatDate(profile.subscription_current_period_end)}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Management Actions */}
          <div className="space-y-3">
            {subscriptionStatus.status === 'canceling' ? (
              <Button 
                onClick={() => setShowReactivateConfirm(true)}
                disabled={loading}
                className="w-full"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Reactivate Subscription
              </Button>
            ) : subscriptionStatus.status === 'active' ? (
              <Button 
                variant="destructive"
                onClick={() => setShowCancelConfirm(true)}
                disabled={loading}
                className="w-full"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Cancel Subscription
              </Button>
            ) : (
              <Alert className="border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  Your subscription has expired. Please renew to continue using premium features.
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Message */}
          {message && (
            <Alert className={message.includes('Error') ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {message}
              </AlertDescription>
            </Alert>
          )}

          {/* Close Button */}
          <div className="flex justify-end">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>

        {/* Cancel Confirmation */}
        <Dialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Cancel Subscription?</DialogTitle>
              <DialogDescription>
                Your subscription will be canceled and will end at the end of your current billing period. 
                You'll keep access to premium features until then.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowCancelConfirm(false)}>
                Keep Subscription
              </Button>
              <Button variant="destructive" onClick={handleCancelSubscription} disabled={loading}>
                {loading ? 'Canceling...' : 'Cancel Subscription'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Reactivate Confirmation */}
        <Dialog open={showReactivateConfirm} onOpenChange={setShowReactivateConfirm}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Reactivate Subscription?</DialogTitle>
              <DialogDescription>
                Your subscription will be reactivated and will continue billing monthly.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowReactivateConfirm(false)}>
                Keep Canceled
              </Button>
              <Button onClick={handleReactivateSubscription} disabled={loading}>
                {loading ? 'Reactivating...' : 'Reactivate'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  )
}
