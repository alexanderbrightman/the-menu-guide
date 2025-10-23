'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { Profile } from '@/lib/supabase'

interface AuthContextType {
  user: User | null
  profile: Profile | null
  loading: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  signingOut: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [signingOut, setSigningOut] = useState(false)

  const fetchProfile = async (userId: string) => {
    if (!supabase) return null
    
    try {
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
  }

  const refreshProfile = async () => {
    if (user && supabase) {
      const profileData = await fetchProfile(user.id)
      setProfile(profileData)
    }
  }

  const clearAuthData = async () => {
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
  }

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    const getSession = async () => {
      if (!supabase) {
        setLoading(false)
        return
      }
      
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Session error:', error)
          // If it's a refresh token error, clear the session
          if (error.message.includes('refresh token')) {
            setUser(null)
            setProfile(null)
            await clearAuthData()
          }
          setLoading(false)
          return
        }
        
        setUser(session?.user ?? null)
        
        if (session?.user) {
          const profileData = await fetchProfile(session.user.id)
          setProfile(profileData)
        }
      } catch (error) {
        console.error('Error getting session:', error)
        // Clear session on any error
        setUser(null)
        setProfile(null)
      } finally {
        setLoading(false)
      }
    }

    getSession()

    const { data: { subscription } } = supabase!.auth.onAuthStateChange(
      async (event, session) => {
        try {
          // Handle different auth events
          if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
            setUser(session?.user ?? null)
            if (!session?.user) {
              setProfile(null)
            }
          } else if (event === 'SIGNED_IN') {
            setUser(session?.user ?? null)
            if (session?.user) {
              const profileData = await fetchProfile(session.user.id)
              setProfile(profileData)
            }
          } else if (session?.user && session.user.id !== user?.id) {
            // Only fetch profile if user actually changed
            const profileData = await fetchProfile(session.user.id)
            setProfile(profileData)
            setUser(session.user)
          } else if (!session?.user) {
            setProfile(null)
            setUser(null)
          }
          
          setLoading(false)
        } catch (error) {
          console.error('Auth state change error:', error)
          // If there's an auth error, clear the session
          if (error instanceof Error && error.message.includes('refresh token')) {
            setUser(null)
            setProfile(null)
            // Clear any stored auth data
            await clearAuthData()
          }
          setLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    if (!supabase || signingOut) return
    
    setSigningOut(true)
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Error signing out:', error)
        // Still clear local state even if server signout fails
        setUser(null)
        setProfile(null)
      }
    } catch (error) {
      console.error('Error signing out:', error)
      // Clear local state on any error
      setUser(null)
      setProfile(null)
    } finally {
      setSigningOut(false)
    }
  }

  const value = {
    user,
    profile,
    loading,
    signOut,
    refreshProfile,
    signingOut
  }

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
