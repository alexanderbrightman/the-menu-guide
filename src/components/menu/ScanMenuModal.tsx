"use client"

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScanLine, Upload, X } from 'lucide-react'
import { usePremiumFeature } from '@/hooks/usePremiumFeature'

interface ScanMenuModalProps {
  userId: string
  onScanSuccess?: () => void
  hideTrigger?: boolean
}

export function ScanMenuModal({ userId, onScanSuccess, hideTrigger = false }: ScanMenuModalProps) {
  const [showModal, setShowModal] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const premiumAccess = usePremiumFeature('menu scanning')

  useEffect(() => {
    const openHandler = () => {
      if (!premiumAccess.canAccess) {
        alert(premiumAccess.message || 'This is a premium feature. Please upgrade to use Scan Menu.')
        return
      }
      setShowModal(true)
    }
    window.addEventListener('open-scan-menu', openHandler)
    return () => window.removeEventListener('open-scan-menu', openHandler)
  }, [premiumAccess.canAccess, premiumAccess.message])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setMessage(null)
      
      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = (e) => {
          setFilePreview(e.target?.result as string)
        }
        reader.readAsDataURL(file)
      } else {
        setFilePreview(null)
      }
    }
  }

  const handleRemoveFile = () => {
    setSelectedFile(null)
    setFilePreview(null)
    setMessage(null)
    // Reset file input
    const fileInput = document.getElementById('menu-file-input') as HTMLInputElement
    if (fileInput) {
      fileInput.value = ''
    }
  }

  const handleUpload = async () => {
    if (!selectedFile || !supabase) return
    
    setLoading(true)
    setMessage(null)

    try {
      // Get session token
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setMessage('❌ Error: Not authenticated. Please sign in again.')
        setLoading(false)
        return
      }

      // Create FormData
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('userId', userId)

      // Send to API
      const res = await fetch('/api/scan-menu', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        body: formData
      })

      const data = await res.json()

      if (res.ok) {
        const itemCount = data.itemsInserted || 0
        const categoryCount = data.categoriesCreated || 0
        
        let successMsg = `✅ Successfully imported ${itemCount} menu item${itemCount !== 1 ? 's' : ''}!`
        if (categoryCount > 0) {
          successMsg += ` Created ${categoryCount} categor${categoryCount !== 1 ? 'ies' : 'y'}.`
        }
        
        setMessage(successMsg)
        
        // Trigger refresh callback after a delay to ensure database is committed
        setTimeout(() => {
          onScanSuccess?.()
        }, 1500)
        
        // Close modal after showing success
        setTimeout(() => {
          if (!loading) {
            setShowModal(false)
            setSelectedFile(null)
            setFilePreview(null)
            setMessage(null)
          }
        }, 3000)
      } else {
        setMessage(`❌ ${data.error || 'Failed to import menu. Please try again.'}`)
      }
    } catch (error) {
      console.error('Error uploading menu:', error)
      setMessage('❌ An error occurred while uploading. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = (open: boolean) => {
    if (!open && !loading) {
      setShowModal(false)
      setSelectedFile(null)
      setFilePreview(null)
      setMessage(null)
    }
  }

  return (
    <>
      {!hideTrigger && (
        <Button
          onClick={() => {
            if (!premiumAccess.canAccess) {
              alert(premiumAccess.message || 'This is a premium feature. Please upgrade to use Scan Menu.')
              return
            }
            setShowModal(true)
          }}
          variant="outline"
        >
          <ScanLine className="h-4 w-4 mr-2" />
          Scan Menu
        </Button>
      )}

      <Dialog open={showModal} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ScanLine className="h-5 w-5" />
              Scan Your Menu
            </DialogTitle>
            <DialogDescription>
              Upload a photo or PDF of your menu and we'll extract the items automatically
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {!loading && !message && (
              <>
                {filePreview ? (
                  <div className="space-y-3">
                    <div className="relative">
                      <img
                        src={filePreview}
                        alt="Menu preview"
                        className="w-full max-h-64 object-contain rounded-lg border border-gray-200"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute top-2 right-2 bg-white/90 hover:bg-white"
                        onClick={handleRemoveFile}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-sm text-gray-600">
                      {selectedFile?.name} ({((selectedFile?.size || 0) / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <Upload className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                    <label htmlFor="menu-file-input" className="cursor-pointer">
                      <p className="text-sm font-medium text-gray-700 mb-1">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-xs text-gray-500">
                        Images (JPEG, PNG, WebP) or PDF • Max 10MB
                      </p>
                    </label>
                    <Input
                      id="menu-file-input"
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </div>
                )}
                
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => handleClose(false)}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleUpload}
                    disabled={!selectedFile || loading}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload & Scan
                  </Button>
                </div>
              </>
            )}

            {loading && (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-green-600 mb-4"></div>
                <p className="text-gray-700 font-medium">
                  Processing your menu…
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  This may take a few moments
                </p>
              </div>
            )}

            {message && (
              <div className="py-4">
                <div className={`p-4 rounded-lg ${
                  message.includes('✅') 
                    ? 'bg-green-50 text-green-800 border border-green-200' 
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}>
                  <p className="text-sm font-medium">{message}</p>
                </div>
                {!loading && (
                  <div className="mt-4 flex justify-end">
                    <Button
                      onClick={() => handleClose(false)}
                      variant={message.includes('✅') ? 'default' : 'outline'}
                      className={message.includes('✅') ? 'bg-green-600 hover:bg-green-700' : ''}
                    >
                      Close
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

