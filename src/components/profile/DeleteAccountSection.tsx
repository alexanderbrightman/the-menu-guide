'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Trash2, AlertTriangle, X, Check } from 'lucide-react'

export function DeleteAccountSection() {
  const { user, signOut } = useAuth()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [confirmationText, setConfirmationText] = useState('')
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const handleDeleteAccount = async () => {
    if (!user || !supabase) return

    // Validate confirmation text
    if (confirmationText !== 'DELETE') {
      setDeleteError('Please type "DELETE" to confirm account deletion.')
      return
    }

    setIsDeleting(true)
    setDeleteError(null)

    try {
      // Get the current session token
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('Not authenticated')
      }

      // Call delete account API
      const response = await fetch('/api/delete-account', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (response.ok) {
        // Account deleted successfully
        alert('✅ Your account has been permanently deleted. You will now be signed out.')
        
        // Sign out and redirect to home page
        await signOut()
        window.location.href = '/'
      } else {
        throw new Error(data.error || 'Failed to delete account')
      }
    } catch (error) {
      console.error('Error deleting account:', error)
      setDeleteError(error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.')
    } finally {
      setIsDeleting(false)
    }
  }

  const resetDialog = () => {
    setConfirmationText('')
    setDeleteError(null)
    setShowDeleteDialog(false)
  }

  return (
    <Card className="border-red-200 bg-red-50">
      <CardHeader>
        <CardTitle className="text-red-800 flex items-center gap-2">
          <Trash2 className="h-5 w-5" />
          Delete Account
        </CardTitle>
        <CardDescription className="text-red-700">
          Permanently delete your account and all associated data
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Alert className="mb-4 border-red-300 bg-red-100">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>Warning:</strong> This action cannot be undone. All your data will be permanently deleted.
          </AlertDescription>
        </Alert>

        <div className="space-y-3 mb-4">
          <h4 className="font-medium text-red-800">What will be deleted:</h4>
          <ul className="text-sm text-red-700 space-y-1 ml-4">
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

        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogTrigger asChild>
            <Button 
              variant="destructive" 
              className="w-full"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete My Account
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-red-800 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Confirm Account Deletion
              </DialogTitle>
              <DialogDescription className="text-gray-700">
                This action cannot be undone. Please read the warnings carefully.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <Alert className="border-red-300 bg-red-100">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  <strong>Final Warning:</strong> All your data will be permanently deleted and cannot be recovered.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Type <code className="bg-gray-100 px-1 rounded">DELETE</code> to confirm:
                </label>
                <input
                  type="text"
                  value={confirmationText}
                  onChange={(e) => setConfirmationText(e.target.value)}
                  placeholder="Type DELETE here"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  disabled={isDeleting}
                />
              </div>

              {deleteError && (
                <Alert className="border-red-300 bg-red-100">
                  <X className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">
                    {deleteError}
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={resetDialog}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteAccount}
                disabled={isDeleting || confirmationText !== 'DELETE'}
                className="min-w-[120px]"
              >
                {isDeleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Account
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}
