'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { X } from 'lucide-react'

export function PasswordResetModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [success, setSuccess] = useState(false)

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      if (!supabase) {
        throw new Error('Supabase client not configured')
      }

      // Get the redirect URL from environment or use default
      const redirectUrl = typeof window !== 'undefined' 
        ? `${window.location.origin}/auth/reset-password`
        : '/auth/reset-password'

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl
      })

      if (error) {
        console.error('Password reset error:', error)
        setMessage(error.message || 'Failed to send reset email. Please check your email address and try again.')
        setSuccess(false)
      } else {
        setMessage('Password reset email sent! Check your inbox (and spam folder) for instructions.')
        setSuccess(true)
      }
    } catch (error) {
      console.error('Password reset error:', error)
      setMessage('An error occurred while sending the reset email')
      setSuccess(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="rounded-2xl shadow-xl shadow-gray-300/12 border border-gray-200/60 max-w-sm w-full bg-white/90 backdrop-blur-md">
        <div className="p-6 pb-4">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-medium text-slate-900">Reset Password</h2>
              <p className="text-sm text-slate-600 mt-1">
                {success 
                  ? 'Check your email for reset instructions' 
                  : 'Enter your email address and we\'ll send you a reset link'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors group"
            >
              <X className="h-4 w-4 text-slate-500 group-hover:text-slate-700" />
            </button>
          </div>
        </div>
        <div className="px-6 pb-6">
          {success ? (
            <div className="space-y-4">
              <div className="p-3 text-sm text-center bg-green-50 text-green-800 rounded-md">
                {message}
              </div>
              <Button onClick={onClose} className="w-full">
                Close
              </Button>
            </div>
          ) : (
            <form onSubmit={handlePasswordReset} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email">Email</Label>
                <Input
                  id="reset-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                />
              </div>
              {message && (
                <div className={`p-3 text-sm text-center rounded-md ${
                  success 
                    ? 'bg-green-50 text-green-800' 
                    : 'bg-red-50 text-red-800'
                }`}>
                  {message}
                </div>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Sending...' : 'Send Reset Link'}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

