'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Upload, RefreshCw } from 'lucide-react'
import { useImageUpload } from '@/hooks/useImageUpload'
import Image from 'next/image'
import { Switch } from '@/components/ui/switch'

interface ProfileEditFormProps {
  onClose: () => void
}

export function ProfileEditForm({ onClose }: ProfileEditFormProps) {
  const { profile, refreshProfile } = useAuth()
  const { uploadImage, uploading } = useImageUpload()

  const DEFAULT_MENU_FONT = 'Plus Jakarta Sans'
  const DEFAULT_MENU_BACKGROUND_COLOR = '#F4F2EE'
  const FONT_OPTIONS = [
    { label: 'Plus Jakarta Sans', value: 'Plus Jakarta Sans' },
    { label: 'Fjalla One', value: 'Fjalla One' },
    { label: 'Georgia', value: 'Georgia' },
    { label: 'Times New Roman', value: 'Times New Roman' },
    { label: 'Arial', value: 'Arial' },
    { label: 'Courier New', value: 'Courier New' }
  ]

  const FONT_FAMILY_MAP: Record<string, string> = {
    'Plus Jakarta Sans': '"Plus Jakarta Sans", sans-serif',
    'Fjalla One': '"Fjalla One", sans-serif',
    'Georgia': 'Georgia, serif',
    'Times New Roman': '"Times New Roman", serif',
    'Arial': 'Arial, sans-serif',
    'Courier New': '"Courier New", monospace',
  }

  const getContrastColor = useCallback((hexColor: string) => {
    if (!hexColor) return '#1f2937'
    const cleanHex = hexColor.replace('#', '')
    const normalizedHex = cleanHex.length === 3
      ? cleanHex.split('').map(char => char + char).join('')
      : cleanHex

    if (normalizedHex.length !== 6) return '#1f2937'

    const r = parseInt(normalizedHex.substring(0, 2), 16)
    const g = parseInt(normalizedHex.substring(2, 4), 16)
    const b = parseInt(normalizedHex.substring(4, 6), 16)

    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    return luminance > 0.6 ? '#1f2937' : '#ffffff'
  }, [])

  const [formData, setFormData] = useState({
    display_name: profile?.display_name || '',
    bio: profile?.bio || '',
    username: profile?.username || '',
    menu_font: profile?.menu_font || DEFAULT_MENU_FONT,
    menu_background_color: profile?.menu_background_color || DEFAULT_MENU_BACKGROUND_COLOR,
    show_display_name: profile?.show_display_name !== false // default to true
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>(
    profile?.username ? 'available' : 'idle'
  )
  const [usernameMessage, setUsernameMessage] = useState(
    profile?.username ? '✓ This is your current username' : ''
  )

  const handleResetTheme = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      menu_font: DEFAULT_MENU_FONT,
      menu_background_color: DEFAULT_MENU_BACKGROUND_COLOR
    }))
  }, [DEFAULT_MENU_FONT, DEFAULT_MENU_BACKGROUND_COLOR])

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
        username: profile.username || '',
        menu_font: profile.menu_font || DEFAULT_MENU_FONT,
        menu_background_color: profile.menu_background_color || DEFAULT_MENU_BACKGROUND_COLOR,
        show_display_name: profile.show_display_name !== false // default to true
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

  // Prevent auto-focus on mobile devices when dialog opens
  useEffect(() => {
    // Check if we're on a mobile device
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || 
                     ('ontouchstart' in window || navigator.maxTouchPoints > 0)
    
    if (isMobile) {
      // Function to blur focused inputs
      const blurFocusedInputs = () => {
        const activeElement = document.activeElement as HTMLElement
        if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
          activeElement.blur()
        }
      }

      // Blur immediately and after a short delay to catch browser auto-focus
      blurFocusedInputs()
      const timeoutId1 = setTimeout(blurFocusedInputs, 150)
      const timeoutId2 = setTimeout(blurFocusedInputs, 300)

      // Listen for focus events only for a short period after dialog opens
      // This prevents auto-focus but allows manual taps after ~500ms
      const handleFocus = (e: FocusEvent) => {
        const target = e.target as HTMLElement
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
          // Small delay to allow the focus to complete, then blur
          setTimeout(() => target.blur(), 10)
        }
      }

      document.addEventListener('focusin', handleFocus, true)

      // Remove the focus listener after 500ms to allow manual focus
      const removeListenerTimeout = setTimeout(() => {
        document.removeEventListener('focusin', handleFocus, true)
      }, 500)

      return () => {
        clearTimeout(timeoutId1)
        clearTimeout(timeoutId2)
        clearTimeout(removeListenerTimeout)
        document.removeEventListener('focusin', handleFocus, true)
      }
    }
  }, []) // Run once when component mounts (when dialog opens)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
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
          username: formData.username.trim(),
          menu_font: formData.menu_font,
          menu_background_color: formData.menu_background_color,
          show_display_name: formData.show_display_name
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
      <DialogContent className="sm:max-w-lg p-4 sm:p-5 md:p-6 overflow-hidden border border-black">
        <DialogHeader className="space-y-1 border-b border-black pb-3 sm:pb-4">
          <DialogTitle className="text-base sm:text-lg md:text-xl font-semibold text-center">Edit Profile</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4 max-h-[70vh] overflow-y-auto pr-1 sm:pr-2">
          {/* Header Photo */}
          <div className="relative overflow-hidden border border-black bg-gray-100">
            {profile?.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt="Menu header photo"
                width={900}
                height={360}
                className="h-32 sm:h-40 md:h-48 w-full object-cover"
                priority
              />
            ) : (
              <div className="flex h-32 sm:h-40 md:h-48 w-full items-center justify-center text-xs sm:text-sm text-gray-500">
                No header photo yet
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center">
              <Label
                htmlFor="avatar-upload"
                className="inline-flex cursor-pointer items-center gap-2 border border-black bg-white px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                <Upload className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Change menu header photo</span>
                <span className="sm:hidden">Change photo</span>
              </Label>
            </div>
            <input
              id="avatar-upload"
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              disabled={uploading}
              className="hidden"
            />
          </div>

          {/* Name + Username */}
          <div className="space-y-2 sm:space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="display_name" className="text-xs sm:text-sm">Restaurant name</Label>
              <Input
                id="display_name"
                value={formData.display_name}
                onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                required
                className="border border-black h-9 sm:h-10 text-sm sm:text-base"
              />
              <div className="flex items-center gap-2 pt-1">
                <Switch
                  id="show_display_name"
                  checked={formData.show_display_name}
                  onCheckedChange={(checked) => setFormData({ ...formData, show_display_name: checked })}
                />
                <Label htmlFor="show_display_name" className="text-xs sm:text-sm cursor-pointer">
                  Display restaurant name on public page
                </Label>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="username" className="text-xs sm:text-sm">Username</Label>
              <div className="relative">
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className={`pr-10 border h-9 sm:h-10 text-sm sm:text-base ${
                    usernameStatus === 'taken' || usernameStatus === 'invalid'
                      ? 'border-red-600 focus:border-red-600'
                      : usernameStatus === 'available'
                      ? 'border-green-600 focus:border-green-600'
                      : 'border-black'
                  }`}
                  required
                />
                {usernameStatus === 'checking' && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="h-3 w-3 sm:h-4 sm:w-4 animate-spin border border-blue-600 border-t-transparent"></div>
                  </div>
                )}
                {usernameStatus === 'available' && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-600">✓</div>
                )}
                {usernameStatus === 'taken' && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-red-600">✗</div>
                )}
              </div>
            </div>

            {usernameMessage && (
              <p
                className={`text-xs sm:text-sm ${
                  usernameStatus === 'available'
                    ? 'text-green-600'
                    : usernameStatus === 'taken' || usernameStatus === 'invalid'
                    ? 'text-red-600'
                    : 'text-gray-600'
                }`}
              >
                {usernameMessage}
              </p>
            )}
          </div>

          {/* Preview */}
          <div
            className="border border-black px-3 sm:px-4 py-3 sm:py-4 text-xs sm:text-sm transition-colors"
            style={{
              backgroundColor: formData.menu_background_color,
              color: getContrastColor(formData.menu_background_color),
              fontFamily: FONT_FAMILY_MAP[formData.menu_font] ?? formData.menu_font,
            }}
          >
            <p className="text-xs sm:text-sm font-semibold tracking-wide">The Menu Guide Preview</p>
          </div>

          {/* Theme controls */}
          <div className="space-y-2 sm:space-y-2.5">
            <div className="flex flex-row flex-wrap items-start gap-2 sm:gap-3">
              <div className="flex flex-col gap-1.5 sm:gap-2 min-w-[140px] sm:min-w-[150px] max-w-[200px] flex-none">
                <Label className="text-xs sm:text-sm font-medium">Menu font</Label>
                <Select
                  value={formData.menu_font}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, menu_font: value }))}
                >
                  <SelectTrigger className="w-full border border-black h-9 sm:h-10 text-xs sm:text-sm">
                    <SelectValue placeholder="Select a font" />
                  </SelectTrigger>
                  <SelectContent>
                    {FONT_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5 sm:gap-2 flex-none">
                <Label className="text-xs sm:text-sm font-medium">Menu background color</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="color"
                    value={formData.menu_background_color}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, menu_background_color: event.target.value }))
                    }
                    className="h-9 sm:h-10 w-14 sm:w-16 cursor-pointer border border-black p-1 bg-white"
                  />
                  <Button type="button" variant="outline" size="sm" className="border border-black" onClick={handleResetTheme}>
                    <RefreshCw className="mr-1 h-3 w-3 sm:h-4 sm:w-4" /> <span className="text-xs sm:text-sm">Reset</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Bio */}
          <div className="space-y-1.5">
            <Label htmlFor="bio" className="text-xs sm:text-sm">Bio</Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              placeholder="Tell customers about your restaurant..."
              rows={3}
              className="border border-black text-sm sm:text-base"
            />
          </div>

          {message && (
            <div
              className={`border p-2 sm:p-3 text-xs sm:text-sm ${
                message.includes('Error') || message.includes('error')
                  ? 'bg-red-50 text-red-600 border-red-600'
                  : 'bg-green-50 text-green-600 border-green-600'
              }`}
            >
              {message}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-black">
            <Button type="button" variant="outline" className="border border-black" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="border border-black"
              disabled={loading || usernameStatus === 'checking' || usernameStatus === 'taken' || usernameStatus === 'invalid'}
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
