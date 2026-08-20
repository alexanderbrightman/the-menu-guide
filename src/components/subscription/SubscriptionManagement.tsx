'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Settings, CreditCard, AlertTriangle, CheckCircle, XCircle, Calendar } from 'lucide-react'
import { openCustomerPortal } from '@/lib/stripe-client'

interface SubscriptionManagementProps {
  onClose?: () => void
}

export function SubscriptionManagement({ onClose }: SubscriptionManagementProps) {
  const { profile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleManageBilling = async () => {
    setLoading(true)
    setMessage('')

    try {
      await openCustomerPortal()
    } catch (error) {
      console.error('Error opening billing portal:', error)
      setMessage(error instanceof Error ? error.message : 'Unable to open billing portal')
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
    } else if (profile.subscription_cancel_at_period_end) {
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
            Manage billing
          </DialogTitle>
          <DialogDescription>
            Subscription status is shown here. Card updates, cancellation, and invoices are handled in Stripe.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
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
                  <p className="text-sm text-gray-600 mt-1">$30/month</p>
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

          {profile?.stripe_customer_id ? (
            <div className="space-y-2">
              <Button
                onClick={handleManageBilling}
                disabled={loading}
                className="w-full"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                {loading ? 'Opening...' : 'Manage billing'}
              </Button>
              <p className="text-xs text-gray-500 text-center">
                Update card, cancel, download invoices, and more
              </p>
            </div>
          ) : (
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                No billing account is linked yet. Use Publish Your Menu to start a subscription.
              </AlertDescription>
            </Alert>
          )}

          {message && (
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {message}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
