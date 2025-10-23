'use client'

import { useAuth } from '@/contexts/AuthContext'
import { AuthForm } from '@/components/auth/AuthForm'
import { Dashboard } from '@/components/dashboard/Dashboard'
import { SetupGuide } from '@/components/setup/SetupGuide'
import { LandingPage } from '@/components/landing/LandingPage'
import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, Suspense } from 'react'

function HomeContent() {
  const { user, loading, refreshProfile } = useAuth()
  const searchParams = useSearchParams()
  const router = useRouter()

  // Handle payment success/cancel messages
  useEffect(() => {
    const success = searchParams.get('success')
    const canceled = searchParams.get('canceled')
    
    if (success === 'true') {
      alert('🎉 Payment successful! Your account has been upgraded to Premium!')
      refreshProfile() // Refresh profile to get updated subscription status
      // Redirect to dashboard after showing success message
      setTimeout(() => {
        router.push('/dashboard')
      }, 1000)
    } else if (canceled === 'true') {
      alert('❌ Payment was canceled. You can try again anytime.')
      // Redirect to dashboard after showing cancel message
      setTimeout(() => {
        router.push('/dashboard')
      }, 1000)
    }
  }, [searchParams, router, refreshProfile])

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
