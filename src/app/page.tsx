'use client'

import { useAuth } from '@/contexts/AuthContext'
import { Dashboard } from '@/components/dashboard/Dashboard'
import { SetupGuide } from '@/components/setup/SetupGuide'
import { LandingPage } from '@/components/landing/LandingPage'
import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, Suspense, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

function HomeContent() {
  const { user, loading, refreshProfile } = useAuth()
  const searchParams = useSearchParams()
  const router = useRouter()

  // Verify the completed checkout with the server. The server checks the
  // session against Stripe, so a forged ?success=true URL cannot grant premium.
  const verifyPayment = useCallback(async (sessionId: string) => {
    if (!user || !supabase) return null

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return null

      const response = await fetch('/api/payment-success', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId }),
      })

      const data = await response.json()

      if (!response.ok) {
        console.error('Payment verification failed:', data.error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error verifying payment:', error)
      return null
    }
  }, [user])

  // Handle payment success/cancel redirects from Stripe Checkout
  useEffect(() => {
    const success = searchParams.get('success')
    const canceled = searchParams.get('canceled')
    const sessionId = searchParams.get('session_id')

    const finish = () => {
      // Clean up URL params without adding to history
      setTimeout(() => router.replace('/'), 1000)
    }

    if (success === 'true' && sessionId) {
      verifyPayment(sessionId)
        .then((result) => {
          if (result?.success) {
            alert('🎉 Payment successful! Your account has been upgraded to Premium!')
          } else {
            // Payment may still be processing; the Stripe webhook will
            // upgrade the account once it confirms.
            alert('Thanks! Your payment is being confirmed. Your account will update automatically in a moment.')
          }
          return refreshProfile()
        })
        .catch((error) => {
          console.error('Error verifying payment:', error)
          return refreshProfile()
        })
        .finally(finish)
    } else if (success === 'true') {
      // No session ID: rely on the webhook, just refresh what we have
      refreshProfile().finally(finish)
    } else if (canceled === 'true') {
      alert('❌ Payment was canceled. You can try again anytime.')
      finish()
    }
  }, [searchParams, router, refreshProfile, verifyPayment])

  // Check if Supabase is configured
  const isSupabaseConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL && 
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your_supabase_project_url')

  if (!isSupabaseConfigured) {
    return <SetupGuide />
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (!user) {
    return <LandingPage />
  }

  // If user is authenticated, show dashboard
  return <Dashboard />
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  )
}
