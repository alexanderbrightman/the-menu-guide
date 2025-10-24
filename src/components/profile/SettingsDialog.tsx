'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Settings, Globe, Eye, EyeOff, Trash2, AlertTriangle, Check } from 'lucide-react'
import { SubscriptionDetailsCard } from './SubscriptionDetailsCard'
import { SubscriptionExpiryWarning } from '@/components/subscription/SubscriptionExpiryWarning'
import { validatePremiumAccess } from '@/lib/premium-validation'

export function SettingsDialog() {
  const { user, profile, refreshProfile } = useAuth()
  const [showSettings, setShowSettings] = useState(false)
  const [isPublic, setIsPublic] = useState(profile?.is_public || false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Check premium access using the enhanced validation
  const premiumValidation = validatePremiumAccess(profile, 'menu visibility')
  const hasPremiumAccess = premiumValidation.isValid

  // Sync isPublic state with profile data
  useEffect(() => {
    if (profile) {
      console.log('Profile changed, updating isPublic to:', profile.is_public)
      setIsPublic(profile.is_public || false)
    }
  }, [profile?.is_public]) // Only depend on the specific field we care about

  const handleTogglePublic = async (checked: boolean) => {
    if (!user || !supabase) return

    setLoading(true)
    setMessage('')

    try {
      // Get the current session token
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('Not authenticated')
      }

      // Update profile visibility
      const response = await fetch('/api/profiles', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          is_public: checked
        })
      })

      const data = await response.json()

      if (response.ok) {
        console.log('Profile update successful, new is_public:', checked)
        setMessage(checked ? 'Menu is now public and visible to customers!' : 'Menu is now private.')
        
        // Immediately update the local state
        setIsPublic(checked)
        
        // Refresh profile data from the server
        await refreshProfile()
        
        // Clear the message after a few seconds
        setTimeout(() => {
          setMessage('')
        }, 3000)
      } else {
        throw new Error(data.error || 'Failed to update settings')
      }
    } catch (error) {
      console.error('Error updating settings:', error)
      setMessage(error instanceof Error ? error.message : 'An error occurred')
      // Revert the switch state
      setIsPublic(!checked)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!user || !supabase) return

    setDeleting(true)
    setMessage('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('Not authenticated')
      }

      const response = await fetch('/api/delete-account', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (response.ok) {
        setMessage('Account deleted successfully. You will be redirected to the home page.')
        setShowDeleteConfirm(false)
        setDeleteConfirmText('')
        
        // Clear local storage and redirect after a short delay
        setTimeout(() => {
          localStorage.clear()
          window.location.href = '/'
        }, 2000)
      } else {
        throw new Error(data.error || 'Failed to delete account')
      }
    } catch (error) {
      console.error('Error deleting account:', error)
      setMessage(error instanceof Error ? error.message : 'An error occurred while deleting your account')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Dialog open={showSettings} onOpenChange={setShowSettings}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4 mr-2" />
          Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] max-w-2xl h-[90vh] max-h-[800px] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Account Settings
          </DialogTitle>
          <DialogDescription>
            Manage your account preferences and subscription
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-1 py-2">
          <div className="space-y-4 pb-4">
            {/* Menu Visibility Settings */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Menu Visibility
                </CardTitle>
                <CardDescription className="text-sm">
                  Control whether your menu is visible to customers
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {isPublic ? (
                        <Eye className="h-4 w-4 text-green-600" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      )}
                      <span className="font-medium">
                        {isPublic ? 'Menu is Public' : 'Menu is Private'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {isPublic 
                        ? 'Customers can view your menu at /menu/' + profile?.username
                        : 'Your menu is only visible to you'
                      }
                    </p>
                  </div>
                  <Switch
                    checked={isPublic}
                    onCheckedChange={handleTogglePublic}
                    disabled={loading || !hasPremiumAccess}
                  />
                </div>

                {!hasPremiumAccess && (
                  <Alert className="border-orange-200 bg-orange-50">
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                    <AlertDescription className="text-orange-800">
                      <strong>Premium Required:</strong> {premiumValidation.error || 'You need a Premium subscription to make your menu public.'}
                    </AlertDescription>
                  </Alert>
                )}

                {message && (
                  <div className={`p-3 text-sm rounded-md ${
                    message.includes('error') || message.includes('Error') || message.includes('Failed')
                      ? 'text-red-600 bg-red-50' 
                      : 'text-green-600 bg-green-50'
                  }`}>
                    {message}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Subscription Details */}
            {hasPremiumAccess && (
              <>
                <SubscriptionExpiryWarning />
                <SubscriptionDetailsCard />
              </>
            )}

            {/* Delete Account Section */}
            <Card className="shadow-sm border-red-200 bg-red-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-red-800 flex items-center gap-2">
                  <Trash2 className="h-4 w-4" />
                  Delete Account
                </CardTitle>
                <CardDescription className="text-sm text-red-700">
                  Permanently delete your account and all associated data
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Alert className="border-red-300 bg-red-100">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800 text-sm">
                    <strong>Warning:</strong> This action cannot be undone. All your data will be permanently deleted.
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <h4 className="font-medium text-red-800 text-sm">What will be deleted:</h4>
                  <ul className="text-xs text-red-700 space-y-1 ml-4">
                    <li className="flex items-center gap-2">
                      <Check className="h-3 w-3" />
                      Your profile and personal information
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3 w-3" />
                      All menu items and categories
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3 w-3" />
                      Your Stripe subscription (if active)
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3 w-3" />
                      All uploaded images and files
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3 w-3" />
                      Your account login credentials
                    </li>
                  </ul>
                </div>

                <Button 
                  variant="destructive" 
                  className="w-full text-sm"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={deleting}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {deleting ? 'Deleting Account...' : 'Delete My Account'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="flex-shrink-0 flex justify-end pt-3 border-t bg-white">
          <Button variant="outline" size="sm" onClick={() => setShowSettings(false)}>
            Close
          </Button>
        </div>
      </DialogContent>

      {/* Delete Account Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-800 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Confirm Account Deletion
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. All your data will be permanently deleted.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Alert className="border-red-300 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <strong>Warning:</strong> This will permanently delete your account and all associated data.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="confirm-text" className="text-sm font-medium">
                Type "DELETE" to confirm:
              </Label>
              <Input
                id="confirm-text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Type DELETE here"
                className="border-red-200 focus:border-red-400"
              />
            </div>

            {message && (
              <div className={`p-3 text-sm rounded-md ${
                message.includes('success') 
                  ? 'text-green-600 bg-green-50' 
                  : 'text-red-600 bg-red-50'
              }`}>
                {message}
              </div>
            )}

            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowDeleteConfirm(false)
                  setDeleteConfirmText('')
                  setMessage('')
                }}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button 
                variant="destructive"
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== 'DELETE' || deleting}
              >
                {deleting ? 'Deleting...' : 'Delete Account'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}
