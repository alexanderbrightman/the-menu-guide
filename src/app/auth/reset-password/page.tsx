'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null)
  const router = useRouter()

  useEffect(() => {
    // Check if we have a valid session/token from the URL hash
    const checkToken = async () => {
      if (!supabase) {
        setIsValidToken(false)
        setError('Supabase client not configured')
        return
      }

      try {
        // Check URL hash for recovery tokens
        const hash = window.location.hash
        const hashParams = new URLSearchParams(hash.substring(1))
        const type = hashParams.get('type')
        const accessToken = hashParams.get('access_token')

        // If we have recovery tokens in the hash, Supabase will handle them automatically
        // with detectSessionInUrl enabled. We need to wait a moment for Supabase to process them.
        if (type === 'recovery' && accessToken) {
          // Wait for Supabase to process the hash tokens
          setTimeout(async () => {
            if (!supabase) {
              setIsValidToken(false)
              setError('Supabase client not configured')
              return
            }
            
            const { data: { session }, error: sessionError } = await supabase.auth.getSession()
            
            if (sessionError) {
              setIsValidToken(false)
              setError('Invalid or expired reset link. Please request a new password reset.')
              return
            }

            if (session) {
              setIsValidToken(true)
            } else {
              setIsValidToken(false)
              setError('Invalid or expired reset link. Please request a new password reset.')
            }
          }, 1000)
        } else {
          // Check if we already have a session (user might have already authenticated)
          if (!supabase) {
            setIsValidToken(false)
            setError('Supabase client not configured')
            return
          }
          
          const { data: { session } } = await supabase.auth.getSession()
          if (session) {
            setIsValidToken(true)
          } else {
            setIsValidToken(false)
            setError('No valid reset token found. Please request a new password reset.')
          }
        }
      } catch (err) {
        console.error('Error checking token:', err)
        setIsValidToken(false)
        setError('Error validating reset token. Please try again.')
      }
    }

    checkToken()
  }, [])

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    setError('')

    // Validation
    if (password.length < 6) {
      setError('Password must be at least 6 characters long')
      setLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    try {
      if (!supabase) {
        throw new Error('Supabase client not configured')
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      })

      if (updateError) {
        setError(updateError.message)
      } else {
        setMessage('Password reset successfully! Redirecting to sign in...')
        // Sign out the user so they need to sign in with their new password
        await supabase.auth.signOut()
        // Redirect to home page after 2 seconds (will show login form since user is logged out)
        setTimeout(() => {
          router.push('/')
        }, 2000)
      }
    } catch (err) {
      console.error('Password reset error:', err)
      setError('An error occurred while resetting your password')
    } finally {
      setLoading(false)
    }
  }

  if (isValidToken === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-sm text-gray-600">Validating reset link...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isValidToken === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invalid Reset Link</CardTitle>
            <CardDescription>{error || 'This password reset link is invalid or has expired.'}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => router.push('/')} 
              className="w-full"
            >
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Reset Your Password</CardTitle>
          <CardDescription>Enter your new password below</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordReset} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password"
                required
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                required
                minLength={6}
              />
            </div>
            {error && (
              <div className="p-3 text-sm text-center bg-red-50 text-red-800 rounded-md">
                {error}
              </div>
            )}
            {message && (
              <div className="p-3 text-sm text-center bg-green-50 text-green-800 rounded-md">
                {message}
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Resetting Password...' : 'Reset Password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

