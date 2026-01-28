'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function AuthForm({ onSuccess, onForgotPassword, labelColor = 'text-gray-900' }: { onSuccess?: () => void; onForgotPassword?: () => void; labelColor?: string }) {
  const [activeForm, setActiveForm] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle')
  const [usernameMessage, setUsernameMessage] = useState('')

  // Username validation for sign-up
  const validateUsername = useCallback(async (username: string) => {
    if (!username.trim()) {
      setUsernameStatus('idle')
      setUsernameMessage('')
      return
    }

    // Basic validation
    if (username.length < 3) {
      setUsernameStatus('invalid')
      setUsernameMessage('Username must be at least 3 characters')
      return
    }

    if (username.length > 20) {
      setUsernameStatus('invalid')
      setUsernameMessage('Username must be less than 20 characters')
      return
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      setUsernameStatus('invalid')
      setUsernameMessage('Username can only contain letters, numbers, hyphens, and underscores')
      return
    }

    setUsernameStatus('checking')
    setUsernameMessage('Checking availability...')

    try {
      const response = await fetch('/api/validate-username', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username: username.trim() })
      })

      if (response.ok) {
        const result = await response.json()
        if (result.available) {
          setUsernameStatus('available')
          setUsernameMessage('✓ Username is available')
        } else {
          setUsernameStatus('taken')
          setUsernameMessage(`✗ ${result.message}`)
        }
      } else {
        setUsernameStatus('idle')
        setUsernameMessage('')
      }
    } catch (error) {
      console.error('Username validation error:', error)
      setUsernameStatus('idle')
      setUsernameMessage('')
    }
  }, [])

  // Debounce username validation
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      validateUsername(username)
    }, 500) // 500ms delay

    return () => clearTimeout(timeoutId)
  }, [username, validateUsername])

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    // Check username validation before proceeding
    if (usernameStatus === 'taken') {
      setMessage('Username is already taken. Please choose a different one.')
      setLoading(false)
      return
    }

    if (usernameStatus === 'invalid') {
      setMessage('Please fix the username validation errors before signing up.')
      setLoading(false)
      return
    }

    if (usernameStatus === 'checking') {
      setMessage('Please wait for username validation to complete.')
      setLoading(false)
      return
    }

    if (usernameStatus !== 'available') {
      setMessage('Please enter a valid username.')
      setLoading(false)
      return
    }

    try {
      if (!supabase) {
        throw new Error('Supabase client not configured')
      }
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
            display_name: displayName
          }
        }
      })

      if (error) {
        setMessage(error.message)
      } else {
        setMessage('Check your email for the confirmation link!')
      }
    } catch (error) {
      console.error('Sign up error:', error)
      setMessage('An error occurred during sign up')
    } finally {
      setLoading(false)
    }
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      if (!supabase) {
        throw new Error('Supabase client not configured')
      }
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        setMessage(error.message)
      } else {
        onSuccess?.()
      }
    } catch (error) {
      console.error('Sign in error:', error)
      setMessage('An error occurred during sign in')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full">
      {/* Button selector */}
      <div className="flex gap-3 mb-6">
        <div className="flex-1 min-w-0">
          <Button
            type="button"
            onClick={() => setActiveForm('signin')}
            className={`w-full text-gray-900 hover:bg-white/90 bg-white/80 backdrop-blur-md rounded-lg shadow-lg shadow-gray-200/12 hover:shadow-xl hover:shadow-gray-300/12 transition-all text-sm py-2 px-4 h-10 ${activeForm === 'signin' ? 'border-2 border-black' : 'border border-black/30'
              }`}
          >
            Sign In
          </Button>
        </div>

        {/* Sign Up button */}
        <div className="flex-1 min-w-0">
          <Button
            type="button"
            onClick={() => setActiveForm('signup')}
            className={`w-full text-gray-900 hover:bg-white/90 bg-white/80 backdrop-blur-md rounded-lg shadow-lg shadow-gray-200/12 hover:shadow-xl hover:shadow-gray-300/12 transition-all text-sm py-2 px-4 h-10 ${activeForm === 'signup' ? 'border-2 border-black' : 'border border-black/30'
              }`}
          >
            Sign Up
          </Button>
        </div>
      </div>

      {/* Sign In Form */}
      {activeForm === 'signin' && (
        <form onSubmit={handleSignIn} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="signin-email" className={labelColor}>Email</Label>
            <Input
              id="signin-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-white/80 backdrop-blur-sm border-black text-gray-900 placeholder:text-gray-500 focus:border-black rounded-lg"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="signin-password" className={labelColor}>Password</Label>
            <Input
              id="signin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-white/80 backdrop-blur-sm border-black text-gray-900 placeholder:text-gray-500 focus:border-black rounded-lg"
              required
            />
          </div>
          <Button
            type="submit"
            className="w-full border border-black text-gray-900 hover:bg-white/90 bg-white/80 backdrop-blur-md rounded-lg shadow-lg shadow-gray-200/12 hover:shadow-xl hover:shadow-gray-300/12"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
          {onForgotPassword && (
            <div className="text-center">
              <button
                type="button"
                onClick={onForgotPassword}
                className={`text-sm hover:text-gray-900 underline ${labelColor}`}
              >
                Forgot Password?
              </button>
            </div>
          )}
        </form>
      )}

      {/* Sign Up Form */}
      {activeForm === 'signup' && (
        <form onSubmit={handleSignUp} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="signup-email" className={labelColor}>Email</Label>
            <Input
              id="signup-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-white/80 backdrop-blur-sm border-black text-gray-900 placeholder:text-gray-500 focus:border-black rounded-lg"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="signup-username" className={labelColor}>Username</Label>
            <div className="relative">
              <Input
                id="signup-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={`pr-10 bg-white/80 backdrop-blur-sm border-black text-gray-900 placeholder:text-gray-500 focus:border-black rounded-lg ${usernameStatus === 'taken' || usernameStatus === 'invalid'
                  ? 'border-red-500 focus:border-red-500'
                  : usernameStatus === 'available'
                    ? 'border-green-500 focus:border-green-500'
                    : ''
                  }`}
                required
              />
              {usernameStatus === 'checking' && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                </div>
              )}
              {usernameStatus === 'available' && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="text-green-600">✓</div>
                </div>
              )}
              {usernameStatus === 'taken' && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="text-red-600">✗</div>
                </div>
              )}
            </div>
            {usernameMessage && (
              <p className={`text-sm ${usernameStatus === 'available'
                ? 'text-green-600'
                : usernameStatus === 'taken' || usernameStatus === 'invalid'
                  ? 'text-red-600'
                  : 'text-gray-600'
                }`}>
                {usernameMessage}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="signup-display-name" className={labelColor}>Restaurant Name</Label>
            <Input
              id="signup-display-name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="bg-white/80 backdrop-blur-sm border-black text-gray-900 placeholder:text-gray-500 focus:border-black rounded-lg"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="signup-password" className={labelColor}>Password</Label>
            <Input
              id="signup-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-white/80 backdrop-blur-sm border-black text-gray-900 placeholder:text-gray-500 focus:border-black rounded-lg"
              required
            />
          </div>
          <Button
            type="submit"
            className="w-full border border-black text-gray-900 hover:bg-white/90 bg-white/80 backdrop-blur-md rounded-lg shadow-lg shadow-gray-200/12 hover:shadow-xl hover:shadow-gray-300/12"
            disabled={loading || usernameStatus === 'checking' || usernameStatus === 'taken' || usernameStatus === 'invalid'}
          >
            {loading ? 'Signing up...' : 'Sign Up'}
          </Button>
        </form>
      )}

      {message && (
        <div
          className="mt-4 p-3 text-sm text-center rounded-lg text-gray-900 border border-black bg-gray-50/80 backdrop-blur-sm"
        >
          {message}
        </div>
      )}
    </div>
  )
}

