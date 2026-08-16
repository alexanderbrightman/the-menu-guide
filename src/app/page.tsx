'use client'

import { useAuth } from '@/contexts/AuthContext'
import { LandingPage } from '@/components/landing/LandingPage'
import { BootShell } from '@/components/ui/boot-shell'
import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, Suspense, useCallback, useSyncExternalStore } from 'react'
import dynamic from 'next/dynamic'
import { supabase } from '@/lib/supabase'

const Dashboard = dynamic(
  () => import('@/components/dashboard/Dashboard').then((mod) => ({ default: mod.Dashboard })),
  { ssr: false, loading: () => <BootShell /> }
)

const SetupGuide = dynamic(
  () => import('@/components/setup/SetupGuide').then((mod) => ({ default: mod.SetupGuide })),
  { ssr: false }
)

function hasStoredSupabaseSession() {
  try {
    return Object.keys(localStorage).some(
      (key) => key.startsWith('sb-') && key.includes('auth-token')
    )
  } catch {
    return false
  }
}

function PaymentRedirectHandler() {
  const { user, refreshProfile } = useAuth()
  const searchParams = useSearchParams()
  const router = useRouter()

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

  useEffect(() => {
    const success = searchParams.get('success')
    const canceled = searchParams.get('canceled')
    const sessionId = searchParams.get('session_id')

    const finish = () => {
      setTimeout(() => router.replace('/'), 1000)
    }

    if (success === 'true' && sessionId) {
      verifyPayment(sessionId)
        .then((result) => {
          if (result?.success) {
            alert('🎉 Payment successful! Your account has been upgraded to Premium!')
          } else {
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
      refreshProfile().finally(finish)
    } else if (canceled === 'true') {
      alert('❌ Payment was canceled. You can try again anytime.')
      finish()
    }
  }, [searchParams, router, refreshProfile, verifyPayment])

  return null
}

function subscribeToAuthStorage(onStoreChange: () => void) {
  window.addEventListener('storage', onStoreChange)
  return () => window.removeEventListener('storage', onStoreChange)
}

function HomeContent() {
  const { user, loading } = useAuth()
  const sessionHint = useSyncExternalStore(
    subscribeToAuthStorage,
    hasStoredSupabaseSession,
    () => false
  )

  const isSupabaseConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your_supabase_project_url')

  if (!isSupabaseConfigured) {
    return <SetupGuide />
  }

  // Restaurant owners with a stored session: keep a blank shell so the
  // marketing grid does not flash. Guests never wait on auth.
  if (user && !loading) {
    return <Dashboard />
  }

  if (loading && sessionHint) {
    return <BootShell />
  }

  return <LandingPage />
}

export default function Home() {
  return (
    <>
      <HomeContent />
      <Suspense fallback={null}>
        <PaymentRedirectHandler />
      </Suspense>
    </>
  )
}
