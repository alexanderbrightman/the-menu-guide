'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Crown, Check, Zap, Settings } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface UpgradeCardProps {
  onUpgrade?: () => void
}

export function UpgradeCard({ onUpgrade }: UpgradeCardProps) {
  const { user, profile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [managingSubscription, setManagingSubscription] = useState(false)

  const handleUpgrade = async () => {
    if (!user || !supabase) return

    setLoading(true)
    try {
      // Get the current session token
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        console.error('Not authenticated')
        return
      }

      // Create checkout session
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (response.ok && data.url) {
        // Redirect to Stripe checkout
        window.location.href = data.url
      } else {
        console.error('Error creating checkout session:', data.error)
      }
    } catch (error) {
      console.error('Error upgrading:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleManageSubscription = async () => {
    if (!user || !supabase) return

    setManagingSubscription(true)
    try {
      // Get the current session token
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        console.error('Not authenticated')
        return
      }

      // Create customer portal session
      const response = await fetch('/api/stripe/customer-portal', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (response.ok && data.url) {
        // Redirect to Stripe customer portal
        window.location.href = data.url
      } else {
        console.error('Error creating customer portal session:', data.error)
        // Show user-friendly error message
        alert(data.error || 'Unable to open subscription management. Please contact support.')
      }
    } catch (error) {
      console.error('Error managing subscription:', error)
    } finally {
      setManagingSubscription(false)
    }
  }

  if (profile?.subscription_status === 'pro') {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="text-green-800 flex items-center gap-2">
            <Crown className="h-5 w-5" />
            Pro Plan Active
          </CardTitle>
          <CardDescription className="text-green-700">
            You have access to all premium features
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant="default" className="bg-green-600">
              <Check className="h-3 w-3 mr-1" />
              Pro Member
            </Badge>
            <span className="text-sm text-green-600">
              $18/month
            </span>
          </div>
          
          {profile.subscription_current_period_end && (
            <div className="text-sm text-green-600">
              Next billing: {new Date(profile.subscription_current_period_end).toLocaleDateString()}
            </div>
          )}
          
          {profile.stripe_customer_id ? (
            <Button
              variant="outline"
              onClick={handleManageSubscription}
              disabled={managingSubscription}
              className="border-green-300 text-green-700 hover:bg-green-100"
            >
              <Settings className="h-4 w-4 mr-2" />
              {managingSubscription ? 'Opening...' : 'Manage Subscription'}
            </Button>
          ) : (
            <div className="text-sm text-green-600">
              Pro account (managed by admin)
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader>
        <CardTitle className="text-orange-800 flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Upgrade to Pro
        </CardTitle>
        <CardDescription className="text-orange-700">
          Unlock public menus, QR codes, and advanced features
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-orange-700">
            <Check className="h-4 w-4 text-green-600" />
            Public menu pages
          </div>
          <div className="flex items-center gap-2 text-sm text-orange-700">
            <Check className="h-4 w-4 text-green-600" />
            QR code generation
          </div>
          <div className="flex items-center gap-2 text-sm text-orange-700">
            <Check className="h-4 w-4 text-green-600" />
            Advanced analytics
          </div>
          <div className="flex items-center gap-2 text-sm text-orange-700">
            <Check className="h-4 w-4 text-green-600" />
            Priority support
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold text-orange-800">$18</div>
            <div className="text-sm text-orange-600">per month</div>
          </div>
          <Button 
            onClick={handleUpgrade}
            disabled={loading}
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            {loading ? 'Processing...' : 'Upgrade Now'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
