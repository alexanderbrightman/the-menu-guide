'use client'

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { Profile } from '@/lib/supabase'
import { getSafeSession, handleAuthError, isRefreshTokenError } from '@/lib/auth-utils'

interface AuthContextType {
  user: User | null
  profile: Profile | null
  loading: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  refreshSubscription: () => Promise<void>
  signingOut: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [signingOut, setSigningOut] = useState(false)

  const fetchProfile = useCallback(async (userId: string, _forceRefresh = false) => {
    if (!supabase) return null
    
    try {
      // Use a simple query without cache busting for now
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Error fetching profile:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error fetching profile:', error)
      return null
    }
  }, [])

  const refreshProfile = useCallback(async () => {
    if (user && supabase) {
      const profileData = await fetchProfile(user.id, true) // Force refresh
      setProfile(profileData)
      return profileData
    }
    return null
  }, [user, fetchProfile])

  const refreshSubscription = useCallback(async () => {
    if (!user || !supabase) return

    try {
      const { session, error } = await getSafeSession()
      if (error || !session?.access_token) {
        if (error) {
          handleAuthError(new Error(error), 'refreshSubscription')
        }
        return
      }

      const response = await fetch('/api/refresh-subscription', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        // Refresh the profile to get updated subscription status
        await refreshProfile()
      }
    } catch (error) {
      handleAuthError(error, 'refreshSubscription')
    }
  }, [user, refreshProfile])

  const clearAuthData = useCallback(async () => {
    try {
      if (supabase) {
        await supabase.auth.signOut()
      }
      // Clear any stored auth data from localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('sb-' + process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0] + '-auth-token')
      }
    } catch (error) {
      console.error('Error clearing auth data:', error)
    }
  }, [])

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    let mounted = true
    let subscription: { unsubscribe: () => void } | null = null

    const initializeAuth = async () => {
      try {
        console.log('Initializing auth...')
        const { session, error } = await getSafeSession()
        console.log('Initial session result:', { hasSession: !!session, error })
        
        if (error) {
          console.error('Session error:', error)
          // If it's a refresh token error, clear the session
          if (error.includes('refresh token') || error.includes('Session expired')) {
            console.log('Clearing expired session')
            if (mounted) {
              setUser(null)
              setProfile(null)
              await clearAuthData()
            }
          }
          return
        }
        
        if (mounted) {
          if (session?.user) {
            console.log('Valid session found, setting user:', session.user.email)
            setUser(session.user)
            
            const profileData = await fetchProfile(session.user.id)
            console.log('Profile data:', profileData ? 'found' : 'not found')
            setProfile(profileData)
          } else {
            console.log('No session found, clearing user state')
            setUser(null)
            setProfile(null)
          }
        }
      } catch (error) {
        console.error('Error getting session:', error)
        handleAuthError(error, 'getSession')
        // Clear session on any error
        if (mounted) {
          setUser(null)
          setProfile(null)
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
      
      // Only set up auth state listener after initial session is loaded
      if (mounted && supabase) {
        const authSubscription = supabase.auth.onAuthStateChange(
          async (event, session) => {
            console.log('Auth state changed:', event, 'has session:', !!session)
            
            if (!mounted) return
            
            try {
              if (event === 'SIGNED_OUT') {
                setUser(null)
                setProfile(null)
              } else if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN' || event === 'USER_UPDATED') {
                setUser(session?.user ?? null)
                if (session?.user) {
                  const profileData = await fetchProfile(session.user.id)
                  setProfile(profileData)
                }
              } else if (!session?.user) {
                setProfile(null)
                setUser(null)
              }
            } catch (error) {
              // Suppress refresh token errors - they're handled gracefully
              if (isRefreshTokenError(error)) {
                console.log('Refresh token error in auth state change, clearing session')
                setUser(null)
                setProfile(null)
                await clearAuthData()
              } else {
                console.error('Auth state change error:', error)
                handleAuthError(error, 'onAuthStateChange')
              }
            }
          }
        )
        subscription = authSubscription.data.subscription
      }
    }

    // Listen for custom auth refresh error events
    const handleRefreshError = () => {
      console.log('Custom auth refresh error event received')
      if (mounted) {
        setUser(null)
        setProfile(null)
        clearAuthData()
      }
    }
    
    if (typeof window !== 'undefined') {
      window.addEventListener('auth:refresh-error', handleRefreshError)
    }

    initializeAuth()

    return () => {
      mounted = false
      if (subscription) {
        subscription.unsubscribe()
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('auth:refresh-error', handleRefreshError)
      }
    }
  }, [fetchProfile, clearAuthData])

  const signOut = useCallback(async () => {
    console.log('SignOut called, supabase:', !!supabase, 'signingOut:', signingOut)
    
    if (!supabase || signingOut) {
      console.log('SignOut early return - supabase:', !!supabase, 'signingOut:', signingOut)
      return
    }
    
    setSigningOut(true)
    try {
      console.log('Attempting to sign out...')
      
      // Always clear local state first
      setUser(null)
      setProfile(null)
      
      // Try to sign out from Supabase, but don't fail if session is missing
      try {
        const { error } = await supabase.auth.signOut()
        console.log('SignOut result:', { error })
        
        if (error && !error.message.includes('Auth session missing')) {
          console.error('Error signing out:', error)
        }
      } catch (signOutError: unknown) {
        // If it's a session missing error, that's actually fine - we're already signed out
        if (signOutError instanceof Error) {
          if (!signOutError.message.includes('Auth session missing')) {
            console.error('Error signing out:', signOutError)
          } else {
            console.log('Session already missing, clearing local state only')
          }
        } else {
          console.error('Unknown error signing out:', signOutError)
        }
      }
      
      // Clear any stored auth data from localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('sb-' + process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0] + '-auth-token')
        // Clear all Supabase-related localStorage items
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('sb-')) {
            localStorage.removeItem(key)
          }
        })
      }
      
      console.log('SignOut completed successfully')
    } catch (error) {
      console.error('Error in signOut:', error)
      // Clear local state on any error
      setUser(null)
      setProfile(null)
    } finally {
      setSigningOut(false)
    }
  }, [signingOut])

  const value = useMemo(() => ({
    user,
    profile,
    loading,
    signOut,
    refreshProfile,
    refreshSubscription,
    signingOut
  }), [user, profile, loading, signOut, refreshProfile, refreshSubscription, signingOut])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
