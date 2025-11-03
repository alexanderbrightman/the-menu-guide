'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Upload, Save, X } from 'lucide-react'
import { useImageUpload } from '@/hooks/useImageUpload'

interface ProfileEditFormProps {
  onClose: () => void
}

export function ProfileEditForm({ onClose }: ProfileEditFormProps) {
  const { profile, refreshProfile } = useAuth()
  const { uploadImage, uploading } = useImageUpload()
  const [formData, setFormData] = useState({
    display_name: profile?.display_name || '',
    bio: profile?.bio || '',
    username: profile?.username || ''
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [retryCount, setRetryCount] = useState(0)
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>(
    profile?.username ? 'available' : 'idle'
  )
  const [usernameMessage, setUsernameMessage] = useState(
    profile?.username ? '✓ This is your current username' : ''
  )

  // Debounced username validation
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

    // If username hasn't changed from current profile, it's available
    if (username === profile?.username) {
      setUsernameStatus('available')
      setUsernameMessage('✓ This is your current username')
      return
    }

    setUsernameStatus('checking')
    setUsernameMessage('Checking availability...')

    try {
      if (!supabase) {
        setUsernameStatus('idle')
        setUsernameMessage('')
        return
      }

      const response = await fetch('/api/validate-username', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
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
  }, [profile?.username])

  // Update form data when profile changes
  useEffect(() => {
    if (profile) {
      setFormData({
        display_name: profile.display_name || '',
        bio: profile.bio || '',
        username: profile.username || ''
      })
      // Immediately validate if username is the same
      if (profile.username) {
        setUsernameStatus('available')
        setUsernameMessage('✓ This is your current username')
      }
    }
  }, [profile])

  // Debounce username validation
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      validateUsername(formData.username)
    }, 500) // 500ms delay

    return () => clearTimeout(timeoutId)
  }, [formData.username, validateUsername])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Form submitted, usernameStatus:', usernameStatus, 'loading:', loading)
    setLoading(true)
    setMessage('')

    if (!supabase || !profile) {
      setMessage('Supabase not configured or profile not found')
      setLoading(false)
      return
    }

    // Add timeout to prevent hanging
    const timeoutId = setTimeout(() => {
      setMessage('Save operation timed out. Please try again.')
      setLoading(false)
    }, 10000) // 10 second timeout

    try {
      // Validate required fields
      if (!formData.display_name.trim()) {
        clearTimeout(timeoutId)
        setMessage('Restaurant name is required')
        setLoading(false)
        return
      }

      if (!formData.username.trim()) {
        clearTimeout(timeoutId)
        setMessage('Username is required')
        setLoading(false)
        return
      }

      // Check username status before submitting
      if (usernameStatus === 'taken') {
        clearTimeout(timeoutId)
        setMessage('Username is already taken. Please choose a different one.')
        setLoading(false)
        return
      }

      if (usernameStatus === 'invalid') {
        clearTimeout(timeoutId)
        setMessage('Please fix the username validation errors before saving.')
        setLoading(false)
        return
      }

      if (usernameStatus === 'checking') {
        clearTimeout(timeoutId)
        setMessage('Please wait for username validation to complete.')
        setLoading(false)
        return
      }

      // Update profile
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: formData.display_name.trim(),
          bio: formData.bio.trim(),
          username: formData.username.trim()
        })
        .eq('id', profile.id)

      if (error) {
        console.error('Profile update error:', error)
        clearTimeout(timeoutId)
        setMessage(`Error: ${error.message}`)
        setLoading(false)
        return
      }

      // Refresh profile data with retry mechanism
      let refreshSuccess = false
      let attempts = 0
      const maxAttempts = 3

      while (!refreshSuccess && attempts < maxAttempts) {
        try {
          await refreshProfile()
          refreshSuccess = true
        } catch (refreshError) {
          console.error(`Profile refresh attempt ${attempts + 1} failed:`, refreshError)
          attempts++
          if (attempts < maxAttempts) {
            // Wait 1 second before retry
            await new Promise(resolve => setTimeout(resolve, 1000))
          }
        }
      }

      if (!refreshSuccess) {
        console.error('Profile refresh failed after all attempts')
        setMessage('Profile updated successfully, but there was an issue refreshing the data. Please refresh the page.')
      }

      // Clear timeout and close the dialog
      clearTimeout(timeoutId)
      onClose()
      
    } catch (error) {
      console.error('Profile update error:', error)
      clearTimeout(timeoutId)
      setMessage('An error occurred while updating your profile')
    } finally {
      setLoading(false)
    }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !profile || !supabase) return

    try {
      setMessage('Uploading avatar...')
      
      // Delete old avatar from storage if it exists
      if (profile.avatar_url) {
        try {
          // Extract file path from Supabase storage URL
          const urlParts = profile.avatar_url.split('/')
          const bucketIndex = urlParts.findIndex((part: string) => part === 'avatars')
          
          if (bucketIndex !== -1 && bucketIndex < urlParts.length - 1) {
            // Get path after bucket name (e.g., "userId/filename.webp")
            const oldAvatarPath = urlParts.slice(bucketIndex + 1).join('/')
            
            // Delete old avatar from storage
            const { error: deleteError } = await supabase.storage
              .from('avatars')
              .remove([oldAvatarPath])
            
            if (deleteError) {
              console.warn('Error deleting old avatar from storage:', deleteError)
              // Continue anyway - new upload can proceed
            } else {
              console.log('Old avatar deleted from storage')
            }
          }
        } catch (deleteError) {
          console.warn('Error deleting old avatar:', deleteError)
          // Continue anyway - new upload can proceed
        }
      }

      // Use optimized image upload hook
      const result = await uploadImage(file, profile.id, 'avatars', {
        quality: 0.8,
        format: 'webp'
      })

      // Update profile with new avatar URL
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: result.url })
        .eq('id', profile.id)

      if (error) {
        console.error('Profile update error:', error)
        setMessage(`Error updating avatar: ${error.message}`)
      } else {
        await refreshProfile()
        setMessage('Avatar updated successfully!')
      }
    } catch (error) {
      console.error('Avatar upload error:', error)
      setMessage('Error uploading avatar. Please try again.')
    }
  }

  const handleDialogOpenChange = (open: boolean) => {
    // Only close if explicitly closed (not during submission)
    if (!open && !loading) {
      onClose()
    }
  }

  return (
    <Dialog open={true} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>
            Update your restaurant information and profile details.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Avatar Upload */}
          <div className="flex items-center space-x-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={profile?.avatar_url || ''} />
              <AvatarFallback>
                {profile?.display_name?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <Label htmlFor="avatar-upload" className="cursor-pointer">
                <div className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-800">
                  <Upload className="h-4 w-4" />
                  <span>Change Menu Header</span>
                </div>
              </Label>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                disabled={uploading}
                className="hidden"
              />
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-2">
            <Label htmlFor="display_name">Restaurant Name</Label>
            <Input
              id="display_name"
              value={formData.display_name}
              onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <div className="relative">
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className={`pr-10 ${
                  usernameStatus === 'taken' || usernameStatus === 'invalid' 
                    ? 'border-red-500 focus:border-red-500' 
                    : usernameStatus === 'available' 
                    ? 'border-green-500 focus:border-green-500' 
                    : ''
                }`}
                required
              />
              {usernameStatus === 'checking' && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
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
              <p className={`text-sm ${
                usernameStatus === 'available' 
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
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              placeholder="Tell customers about your restaurant..."
              rows={3}
            />
          </div>

          {message && (
            <div className={`p-3 text-sm rounded-md ${
              message.includes('Error') || message.includes('error') 
                ? 'text-red-600 bg-red-50' 
                : 'text-green-600 bg-green-50'
            }`}>
              {message}
            </div>
          )}

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading || usernameStatus === 'checking' || usernameStatus === 'taken' || usernameStatus === 'invalid'}
              onClick={() => console.log('Button clicked, disabled:', loading || usernameStatus === 'checking' || usernameStatus === 'taken' || usernameStatus === 'invalid')}
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
