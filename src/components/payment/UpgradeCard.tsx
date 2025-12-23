'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Crown, Check, Zap, Settings } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { validatePremiumAccess } from '@/lib/premium-validation'
import { SubscriptionManagement } from '@/components/subscription/SubscriptionManagement'

interface UpgradeCardProps {
  onUpgrade?: () => void
}

export function UpgradeCard({ onUpgrade: _onUpgrade }: UpgradeCardProps) {
  const { user, profile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [showSubscriptionManagement, setShowSubscriptionManagement] = useState(false)

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

      // Create checkout session with timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      const data = await response.json()

      if (response.ok && data.url) {
        // Redirect to Stripe checkout immediately
        window.location.href = data.url
      } else {
        console.error('Error creating checkout session:', data.error)

        // Check if it's a configuration error
        if (data.error === 'Payment system not configured') {
          alert('Payment system is not configured for local development. Please test payments on the live site or add Stripe test keys to your .env.local file.')
        } else {
          alert('Unable to process payment. Please try again.')
        }
      }
    } catch (error) {
      console.error('Error upgrading:', error)
      if (error instanceof Error && error.name === 'AbortError') {
        alert('Payment request timed out. Please try again.')
      } else {
        alert('Unable to process payment. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleManageSubscription = () => {
    setShowSubscriptionManagement(true)
  }

  const premiumValidation = validatePremiumAccess(profile, 'premium features')
  const hasPremiumAccess = premiumValidation.isValid

  const premiumCard = hasPremiumAccess ? (
    <Card className="border-green-200 bg-green-50">
      <CardHeader>
        <CardTitle className="text-green-800 flex items-center gap-2">
          <Crown className="h-5 w-5" />
          Premium Plan Active
        </CardTitle>
        <CardDescription className="text-green-700">
          You have access to all premium features
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Badge variant="default" className="bg-green-600">
            <Check className="h-3 w-3 mr-1" />
            Premium Member
          </Badge>
          <span className="text-sm text-green-600">
            $30/month
          </span>
        </div>

        {profile?.subscription_current_period_end && (
          <div className="text-sm text-green-600">
            Next billing: {new Date(profile.subscription_current_period_end).toLocaleDateString()}
          </div>
        )}

        {profile?.stripe_customer_id ? (
          <Button
            variant="outline"
            onClick={handleManageSubscription}
            disabled={loading}
            className="border-green-300 text-green-700 hover:bg-green-100"
          >
            <Settings className="h-4 w-4 mr-2" />
            {loading ? 'Opening...' : 'Manage Subscription'}
          </Button>
        ) : (
          <div className="text-sm text-green-600">
            Premium account
          </div>
        )}
      </CardContent>
    </Card>
  ) : null

  const upgradeCard = (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader>
        <CardTitle className="text-orange-800 flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Upgrade to Premium
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
            AI menu scanner
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold text-orange-800">$30</div>
            <div className="text-sm text-orange-600">per month</div>
          </div>
          <Button
            onClick={handleUpgrade}
            disabled={loading}
            className="bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating Payment...' : 'Publish Your Menu'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <>
      {hasPremiumAccess ? premiumCard : upgradeCard}

      {/* Subscription Management Modal */}
      {showSubscriptionManagement && (
        <SubscriptionManagement
          onClose={() => setShowSubscriptionManagement(false)}
        />
      )}
    </>
  )
}
