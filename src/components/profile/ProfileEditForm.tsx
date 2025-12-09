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
import { Upload, RefreshCw, X, Check } from 'lucide-react'
import { useImageUpload } from '@/hooks/useImageUpload'
import Image from 'next/image'
import { Switch } from '@/components/ui/switch'
import { getContrastColor } from '@/lib/utils'
import { useMenuTheme } from '@/hooks/useMenuTheme'
import {
  DEFAULT_MENU_FONT,
  DEFAULT_MENU_BACKGROUND_COLOR,
  FONT_OPTIONS,
  FONT_FAMILY_MAP
} from '@/lib/fonts'

interface ProfileEditFormProps {
  onClose: () => void
}

export function ProfileEditForm({ onClose }: ProfileEditFormProps) {
  const { profile, refreshProfile } = useAuth()
  const { uploadImage, uploading } = useImageUpload()

  const [formData, setFormData] = useState({
    display_name: profile?.display_name || '',
    bio: profile?.bio || '',
    instagram_url: profile?.instagram_url || '',
    website_url: profile?.website_url || '',
    menu_font: profile?.menu_font || DEFAULT_MENU_FONT,
    menu_background_color: profile?.menu_background_color || DEFAULT_MENU_BACKGROUND_COLOR,
    show_display_name: profile?.show_display_name !== false // default to true
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleResetTheme = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      menu_font: DEFAULT_MENU_FONT,
      menu_background_color: DEFAULT_MENU_BACKGROUND_COLOR
    }))
  }, [])

  // Update form data when profile changes
  useEffect(() => {
    if (profile) {
      setFormData({
        display_name: profile.display_name || '',
        bio: profile.bio || '',
        instagram_url: profile.instagram_url || '',
        website_url: profile.website_url || '',
        menu_font: profile.menu_font || DEFAULT_MENU_FONT,
        menu_background_color: profile.menu_background_color || DEFAULT_MENU_BACKGROUND_COLOR,
        show_display_name: profile.show_display_name !== false // default to true
      })
    }
  }, [profile])

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

      // Validate URLs if provided
      const instagramUrl = formData.instagram_url.trim()
      const websiteUrl = formData.website_url.trim()

      if (instagramUrl && !instagramUrl.match(/^https?:\/\//)) {
        clearTimeout(timeoutId)
        setMessage('Instagram URL must start with http:// or https://')
        setLoading(false)
        return
      }

      if (websiteUrl && !websiteUrl.match(/^https?:\/\//)) {
        clearTimeout(timeoutId)
        setMessage('Website URL must start with http:// or https://')
        setLoading(false)
        return
      }

      // Update profile
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: formData.display_name.trim(),
          bio: formData.bio.trim(),
          instagram_url: instagramUrl || null,
          website_url: websiteUrl || null,
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

  const {
    menuBackgroundColor,
    contrastColor,
    primaryTextClass,
    secondaryTextClass,
    outlineButtonClass,
    accentButtonClass,
    getBorderColor,
    isDarkBackground
  } = useMenuTheme(profile)

  return (
    <Dialog open={true} onOpenChange={handleDialogOpenChange}>
      <DialogContent
        className={`w-full h-[100dvh] sm:h-auto sm:max-h-[85vh] sm:w-full sm:max-w-xl border-0 sm:border ${getBorderColor()} p-0 gap-0 sm:rounded-xl overflow-hidden transition-all duration-300 [&>button]:hidden flex flex-col`}
        style={{
          backgroundColor: menuBackgroundColor,
          color: contrastColor,
        }}
      >
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 w-full">
          {/* Header */}
          <div className={`flex items-center justify-between p-4 border-b ${getBorderColor()}`}>
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="text-base font-normal hover:bg-transparent px-2 -ml-2 sm:px-4 sm:ml-0"
              style={{ color: isDarkBackground ? '#ffffff' : '#000000' }}
            >
              Cancel
            </Button>

            <DialogTitle className={`text-base sm:text-lg font-semibold ${primaryTextClass}`}>
              Edit Profile
            </DialogTitle>

            <Button
              type="submit"
              disabled={loading}
              variant="ghost"
              className="text-base font-semibold hover:bg-transparent px-2 -mr-2 sm:px-4 sm:mr-0 text-blue-500 hover:text-blue-600"
            >
              {loading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                'Save'
              )}
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            {/* Header Photo */}
            <div className="space-y-2">
              <Label className={primaryTextClass}>Cover Photo</Label>
              <div className={`relative overflow-hidden rounded-md border ${getBorderColor()} bg-secondary/20 group`}>
                {profile?.avatar_url ? (
                  <Image
                    src={profile.avatar_url}
                    alt="Menu header photo"
                    width={900}
                    height={360}
                    className="h-32 sm:h-40 md:h-48 w-full object-cover transition-opacity group-hover:opacity-90"
                    priority
                  />
                ) : (
                  <div className={`flex h-32 sm:h-40 md:h-48 w-full items-center justify-center text-xs sm:text-sm ${secondaryTextClass}`}>
                    No header photo
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                  <Label
                    htmlFor="avatar-upload"
                    className="cursor-pointer bg-white text-black px-4 py-2 rounded-full text-sm font-medium hover:bg-white/90 transition-colors shadow-sm"
                  >
                    Change
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
            </div>

            {/* Name + Username */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="display_name" className={primaryTextClass}>Restaurant Name</Label>
                <Input
                  id="display_name"
                  value={formData.display_name}
                  onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                  required
                  className={`h-11 border ${getBorderColor()} bg-transparent text-base`}
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border" style={{ borderColor: getBorderColor() }}>
                <Label htmlFor="show_display_name" className={`${primaryTextClass} text-sm cursor-pointer flex-1`}>
                  Show name on public page
                </Label>
                <Switch
                  id="show_display_name"
                  checked={formData.show_display_name}
                  onCheckedChange={(checked) => setFormData({ ...formData, show_display_name: checked })}
                />
              </div>
            </div>

            {/* Theme controls */}
            <div className="space-y-4 pt-2">
              <Label className={`${primaryTextClass} text-base font-semibold`}>Appearance</Label>

              {/* Preview Card */}
              <div
                className="rounded-lg p-4 text-center transition-colors border shadow-sm"
                style={{
                  backgroundColor: formData.menu_background_color,
                  color: getContrastColor(formData.menu_background_color),
                  fontFamily: FONT_FAMILY_MAP[formData.menu_font] ?? formData.menu_font,
                  borderColor: getBorderColor()
                }}
              >
                <p className="text-sm font-medium tracking-wide">Preview: {formData.display_name || 'Restaurant Name'}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className={primaryTextClass}>Avg Font</Label>
                  <Select
                    value={formData.menu_font}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, menu_font: value }))}
                  >
                    <SelectTrigger className={`w-full h-11 border ${getBorderColor()} bg-transparent`}>
                      <SelectValue placeholder="Select font" />
                    </SelectTrigger>
                    <SelectContent>
                      {FONT_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <span style={{ fontFamily: FONT_FAMILY_MAP[option.value] }}>
                            {option.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className={primaryTextClass}>Background</Label>
                  <div className="flex gap-2">
                    <div className="flex-1 h-11 relative rounded-md overflow-hidden border" style={{ borderColor: getBorderColor() }}>
                      <input
                        type="color"
                        value={formData.menu_background_color}
                        onChange={(event) =>
                          setFormData((prev) => ({ ...prev, menu_background_color: event.target.value }))
                        }
                        className="absolute -top-2 -left-2 w-[150%] h-[150%] cursor-pointer p-0 border-0"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className={`${outlineButtonClass} border ${getBorderColor()} h-11`}
                      onClick={handleResetTheme}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Bio */}
            <div className="space-y-2 pt-2">
              <Label htmlFor="bio" className={primaryTextClass}>Bio</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder="Tell customers about your restaurant..."
                rows={3}
                className={`resize-none border ${getBorderColor()} bg-transparent text-base`}
              />
            </div>

            {/* Social Links */}
            <div className="space-y-4 pt-2">
              <Label className={`${primaryTextClass} text-base font-semibold`}>Social Media</Label>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="instagram_url" className={secondaryTextClass}>Instagram URL</Label>
                  <Input
                    id="instagram_url"
                    type="url"
                    value={formData.instagram_url}
                    onChange={(e) => setFormData({ ...formData, instagram_url: e.target.value })}
                    placeholder="https://instagram.com/..."
                    className={`h-11 border ${getBorderColor()} bg-transparent text-base`}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website_url" className={secondaryTextClass}>Website URL</Label>
                  <Input
                    id="website_url"
                    type="url"
                    value={formData.website_url}
                    onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                    placeholder="https://..."
                    className={`h-11 border ${getBorderColor()} bg-transparent text-base`}
                  />
                </div>
              </div>
            </div>

            {message && (
              <div
                className={`rounded-md p-3 text-sm ${message.includes('Error') || message.includes('error')
                  ? 'bg-red-500/10 text-red-600 border border-red-500/20'
                  : 'bg-green-500/10 text-green-600 border border-green-500/20'
                  }`}
              >
                {message}
              </div>
            )}
            <div className="pb-10 sm:pb-0" /> {/* Spacer for bottom safe area */}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

