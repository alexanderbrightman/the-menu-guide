'use client'

import { useAuth } from '@/contexts/AuthContext'
import { Dashboard } from '@/components/dashboard/Dashboard'
import { SetupGuide } from '@/components/setup/SetupGuide'
import { LandingPage } from '@/components/landing/LandingPage'
import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, Suspense } from 'react'
import { supabase } from '@/lib/supabase'

function HomeContent() {
  const { user, loading, refreshProfile } = useAuth()
  const searchParams = useSearchParams()
  const router = useRouter()

  // Handle payment success/cancel messages
  useEffect(() => {
    const success = searchParams.get('success')
    const canceled = searchParams.get('canceled')
    
    if (success === 'true') {
      console.log('Payment success detected, updating subscription...')
      alert('🎉 Payment successful! Your account has been upgraded to Premium!')
      
      // Immediately update subscription status and set is_public = true
      updateSubscriptionStatus().then((result) => {
        console.log('Payment success API result:', result)
        
        if (result?.success) {
          // Refresh profile to get updated data
          refreshProfile().then((profileData) => {
            console.log('Refreshed profile after payment:', profileData)
            
            // Clean up URL params and replace in history to avoid localhost redirect issues
            setTimeout(() => {
              router.replace('/')
            }, 1000)
          }).catch((error) => {
            console.error('Error refreshing profile after payment:', error)
            // Still redirect even if refresh fails
            setTimeout(() => {
              router.replace('/')
            }, 1000)
          })
        } else {
          console.error('Payment success API failed:', result)
          // Still try to refresh and redirect
          refreshProfile().then(() => {
            setTimeout(() => {
              router.replace('/')
            }, 1000)
          })
        }
      }).catch((error) => {
        console.error('Error updating subscription status:', error)
        // Still try to refresh and redirect
        refreshProfile().then(() => {
          setTimeout(() => {
            router.replace('/')
          }, 1000)
        })
      })
    } else if (canceled === 'true') {
      alert('❌ Payment was canceled. You can try again anytime.')
      // Clean up URL params and redirect without adding to history
      setTimeout(() => {
        router.replace('/')
      }, 1000)
    }
  }, [searchParams, router, refreshProfile])

  // Function to immediately update subscription status after payment
  const updateSubscriptionStatus = async () => {
    if (!user || !supabase) return null

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return null

      // Call our dedicated payment success API
      const response = await fetch('/api/payment-success', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (!response.ok) {
        console.error('Failed to update subscription status:', data.error)
        return null
      }

      console.log('Payment success API response:', data)
      return data
    } catch (error) {
      console.error('Error updating subscription status:', error)
      return null
    }
  }

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
