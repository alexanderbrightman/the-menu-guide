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
import { Upload, RefreshCw, X, Check, Palette, MapPin, ArrowLeft } from 'lucide-react'
import { useImageUpload } from '@/hooks/useImageUpload'
import Image from 'next/image'
import { Switch } from '@/components/ui/switch'
import { getContrastColor } from '@/lib/utils'
import { useMenuTheme } from '@/hooks/useMenuTheme'
import { geocodeAddress } from '@/lib/geocoding'
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
    address: profile?.address || '',
    menu_font: profile?.menu_font || DEFAULT_MENU_FONT,
    menu_background_color: profile?.menu_background_color || DEFAULT_MENU_BACKGROUND_COLOR,
    show_display_name: profile?.show_display_name !== false // default to true
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  // Address editing state
  const [view, setView] = useState<'MAIN' | 'ADDRESS'>('MAIN')
  const [addressForm, setAddressForm] = useState({
    street: '',
    unit: '',
    city: '',
    state: '',
    zip: ''
  })

  // Initialize address form when opening
  const handleOpenAddress = () => {
    // Simple pre-fill: put everything in street if we can't parse it easily
    // In a real app, we might store these structured fields in the DB
    setAddressForm({
      street: formData.address,
      unit: '',
      city: '',
      state: '',
      zip: ''
    })
    setView('ADDRESS')
  }

  const handleSaveAddress = () => {
    // Combine fields into a single string
    // Format: Street[ Unit], City, State Zip
    let parts = []

    // Line 1: Street + Unit
    let line1 = addressForm.street.trim()
    if (addressForm.unit.trim()) {
      line1 += line1 ? `, ${addressForm.unit.trim()}` : addressForm.unit.trim()
    }
    if (line1) parts.push(line1)

    // Line 2: City, State Zip
    let line2 = []
    if (addressForm.city.trim()) line2.push(addressForm.city.trim())

    let stateZip = []
    if (addressForm.state.trim()) stateZip.push(addressForm.state.trim())
    if (addressForm.zip.trim()) stateZip.push(addressForm.zip.trim())

    if (stateZip.length > 0) {
      line2.push(stateZip.join(' '))
    }

    // Join City and State/Zip with comma
    if (line2.length > 0) {
      parts.push(line2.join(', '))
    }

    const fullAddress = parts.join(', ')

    setFormData(prev => ({ ...prev, address: fullAddress }))
    setView('MAIN')
  }

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
        address: profile.address || '',
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

      // Geocode address if provided
      let latitude: number | null = null
      let longitude: number | null = null
      const address = formData.address.trim()

      if (address) {
        setMessage('Geocoding address...')
        const geocodeResult = await geocodeAddress(address)

        if (geocodeResult) {
          latitude = geocodeResult.latitude
          longitude = geocodeResult.longitude
        } else {
          clearTimeout(timeoutId)
          setMessage('Could not find coordinates for this address. Please check the address and try again.')
          setLoading(false)
          return
        }
      }

      // Update profile
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: formData.display_name.trim(),
          bio: formData.bio.trim(),
          instagram_url: instagramUrl || null,
          website_url: websiteUrl || null,
          address: address || null,
          latitude: latitude,
          longitude: longitude,
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
        className={`w-full max-w-full h-[100dvh] sm:h-auto sm:max-h-[85vh] sm:w-full sm:max-w-xl border-0 sm:border ${getBorderColor()} p-0 gap-0 sm:rounded-xl overflow-hidden transition-all duration-300 [&>button]:hidden flex flex-col`}
        style={{
          backgroundColor: menuBackgroundColor,
          color: contrastColor,
        }}
      >
        {view === 'MAIN' ? (
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
                <Label className={primaryTextClass}>Profile Image</Label>
                <div className="flex justify-center sm:justify-start">
                  <div className={`relative h-32 w-32 sm:h-40 sm:w-40 overflow-hidden rounded-full bg-secondary/20 group`}>
                    {profile?.avatar_url ? (
                      <Image
                        src={profile.avatar_url}
                        alt="Profile image"
                        fill
                        className="object-cover transition-opacity group-hover:opacity-90"
                        priority
                      />
                    ) : (
                      <div className={`flex h-full w-full items-center justify-center text-xs sm:text-sm ${secondaryTextClass}`}>
                        No image
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
                {/* Preview Card */}
                <div
                  className="rounded-lg p-8 text-center transition-colors border-2 shadow-md flex items-center justify-center min-h-[120px]"
                  style={{
                    backgroundColor: formData.menu_background_color,
                    color: getContrastColor(formData.menu_background_color),
                    fontFamily: FONT_FAMILY_MAP[formData.menu_font] ?? formData.menu_font,
                    borderColor: getBorderColor()
                  }}
                >
                  <p className="text-xl sm:text-2xl font-medium tracking-wide">
                    {formData.display_name || 'Restaurant Name'}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className={primaryTextClass}>Font Style</Label>
                    <Select
                      value={formData.menu_font}
                      onValueChange={(value) => setFormData((prev) => ({ ...prev, menu_font: value }))}
                    >
                      <SelectTrigger className={`w-full h-12 border-2 ${getBorderColor()} bg-transparent`}>
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
                    <Label className={primaryTextClass}>Background Color</Label>
                    <div className="flex gap-2">
                      <div className="flex-1 h-12 relative rounded-md overflow-hidden border-2 shadow-sm transition-transform hover:scale-[1.01] active:scale-[0.99] bg-white dark:bg-zinc-900 group" style={{ borderColor: getBorderColor() }}>
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                          <Palette className="h-6 w-6 text-zinc-500 group-hover:text-zinc-700 dark:text-zinc-400 dark:group-hover:text-zinc-200 transition-colors" />
                        </div>
                        <input
                          type="color"
                          value={formData.menu_background_color}
                          onChange={(event) =>
                            setFormData((prev) => ({ ...prev, menu_background_color: event.target.value }))
                          }
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          title="Choose color"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        className={`${outlineButtonClass} border-2 ${getBorderColor()} h-12 w-12 px-0`}
                        onClick={handleResetTheme}
                        title="Reset details"
                      >
                        <RefreshCw className="h-5 w-5" />
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

              {/* Location */}
              <div className="space-y-4 pt-2">
                <Label className={`${primaryTextClass} text-base font-semibold flex items-center gap-2`}>
                  <MapPin className="h-4 w-4" />
                  Location
                </Label>
                <div className="space-y-2">
                  <Label htmlFor="address" className={secondaryTextClass}>Restaurant Address</Label>
                  <div
                    id="address"
                    onClick={handleOpenAddress}
                    className={`h-11 border ${getBorderColor()} bg-transparent text-base flex items-center px-3 cursor-pointer overflow-hidden rounded-md hover:bg-secondary/10 transition-colors`}
                  >
                    {formData.address ? (
                      <span className="truncate">{formData.address}</span>
                    ) : (
                      <span className={`opacity-50 ${secondaryTextClass}`}>Tap to add address...</span>
                    )}
                  </div>
                  <p className={`text-xs ${secondaryTextClass} mt-1`}>
                    This helps customers find nearby specials on the homepage.
                  </p>
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
        ) : (
          <div className="flex flex-col flex-1 min-h-0 w-full">
            {/* Address Edit Header */}
            <div className={`flex items-center justify-between p-4 border-b ${getBorderColor()}`}>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setView('MAIN')}
                className="text-base font-normal hover:bg-transparent px-2 -ml-2 sm:px-4 sm:ml-0 gap-1"
                style={{ color: isDarkBackground ? '#ffffff' : '#000000' }}
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>

              <DialogTitle className={`text-base sm:text-lg font-semibold ${primaryTextClass}`}>
                Address
              </DialogTitle>

              <Button
                type="button"
                onClick={handleSaveAddress}
                variant="ghost"
                className="text-base font-semibold hover:bg-transparent px-2 -mr-2 sm:px-4 sm:mr-0 text-blue-500 hover:text-blue-600"
              >
                Done
              </Button>
            </div>

            {/* Address Form Fields */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="addr_street" className={primaryTextClass}>Street Address</Label>
                  <Input
                    id="addr_street"
                    value={addressForm.street}
                    onChange={e => setAddressForm({ ...addressForm, street: e.target.value })}
                    placeholder="123 Main St"
                    className={`h-11 border ${getBorderColor()} bg-transparent text-base`}
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="addr_unit" className={primaryTextClass}>Apt / Suite / Unit (Optional)</Label>
                  <Input
                    id="addr_unit"
                    value={addressForm.unit}
                    onChange={e => setAddressForm({ ...addressForm, unit: e.target.value })}
                    placeholder="Apt 4B"
                    className={`h-11 border ${getBorderColor()} bg-transparent text-base`}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="addr_city" className={primaryTextClass}>City</Label>
                    <Input
                      id="addr_city"
                      value={addressForm.city}
                      onChange={e => setAddressForm({ ...addressForm, city: e.target.value })}
                      placeholder="New York"
                      className={`h-11 border ${getBorderColor()} bg-transparent text-base`}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="addr_state" className={primaryTextClass}>State</Label>
                    <Input
                      id="addr_state"
                      value={addressForm.state}
                      onChange={e => setAddressForm({ ...addressForm, state: e.target.value })}
                      placeholder="NY"
                      className={`h-11 border ${getBorderColor()} bg-transparent text-base`}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="addr_zip" className={primaryTextClass}>Zip Code</Label>
                  <Input
                    id="addr_zip"
                    value={addressForm.zip}
                    onChange={e => setAddressForm({ ...addressForm, zip: e.target.value })}
                    placeholder="10001"
                    className={`h-11 border ${getBorderColor()} bg-transparent text-base`}
                  />
                </div>
              </div>
              <div className="pb-10 sm:pb-0" />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

