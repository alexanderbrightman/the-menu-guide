'use client'

import { useAuth } from '@/contexts/AuthContext'
import { AuthForm } from '@/components/auth/AuthForm'
import { Dashboard } from '@/components/dashboard/Dashboard'
import { SetupGuide } from '@/components/setup/SetupGuide'
import { useSearchParams } from 'next/navigation'
import { useEffect } from 'react'

export default function Home() {
  const { user, loading, refreshProfile } = useAuth()
  const searchParams = useSearchParams()

  // Handle payment success/cancel messages
  useEffect(() => {
    const success = searchParams.get('success')
    const canceled = searchParams.get('canceled')
    
    if (success === 'true') {
      alert('🎉 Payment successful! Your account has been upgraded to Pro!')
      refreshProfile() // Refresh profile to get updated subscription status
    } else if (canceled === 'true') {
      alert('❌ Payment was canceled. You can try again anytime.')
    }
  }, [searchParams, refreshProfile])

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
    return <AuthForm />
  }

  return <Dashboard />
}
