'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Upload, Save, X } from 'lucide-react'

interface ProfileEditFormProps {
  onClose: () => void
}

export function ProfileEditForm({ onClose }: ProfileEditFormProps) {
  const { profile, refreshProfile } = useAuth()
  const [formData, setFormData] = useState({
    display_name: profile?.display_name || '',
    bio: profile?.bio || '',
    username: profile?.username || '',
    is_public: profile?.is_public || false
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [retryCount, setRetryCount] = useState(0)

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

      // Check if username is already taken by another user
      const { data: existingProfile, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', formData.username.trim())
        .neq('id', profile.id)
        .single()

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Username check error:', checkError)
        clearTimeout(timeoutId)
        setMessage('Error checking username availability')
        setLoading(false)
        return
      }

      if (existingProfile) {
        clearTimeout(timeoutId)
        setMessage('Username is already taken')
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
          is_public: formData.is_public
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
      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${profile.id}.${fileExt}`
      const filePath = `${profile.id}/${fileName}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true })

      if (uploadError) {
        console.error('Upload error:', uploadError)
        setMessage(`Upload error: ${uploadError.message}`)
        return
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      // Update profile with new avatar URL
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: urlData.publicUrl })
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
      setMessage('Error uploading avatar')
    }
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
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
                  <span>Change Avatar</span>
                </div>
              </Label>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
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
            <Input
              id="username"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              required
            />
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

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="is_public">Make Menu Public</Label>
                <p className="text-sm text-gray-500">
                  Allow customers to view your menu at /menu/{formData.username}
                </p>
              </div>
              <Switch
                id="is_public"
                checked={formData.is_public}
                onCheckedChange={(checked) => setFormData({ ...formData, is_public: checked })}
              />
            </div>
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
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
