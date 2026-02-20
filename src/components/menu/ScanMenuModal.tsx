"use client"

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScanLine, Upload, X, Crown } from 'lucide-react'
import { usePremiumFeature } from '@/hooks/usePremiumFeature'

import { Profile } from '@/lib/supabase'
import { useMenuTheme } from '@/hooks/useMenuTheme'

interface ScanMenuModalProps {
  userId: string
  onScanSuccess?: () => void
  hideTrigger?: boolean
  profile?: Profile | null
}

export function ScanMenuModal({ userId, onScanSuccess, hideTrigger = false, profile }: ScanMenuModalProps) {
  const [showModal, setShowModal] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const premiumAccess = usePremiumFeature('menu scanning')

  const {
    menuBackgroundColor,
    contrastColor,
    primaryTextClass,
    secondaryTextClass,
    getBorderColor,
    isDarkBackground
  } = useMenuTheme(profile || null)

  useEffect(() => {
    const openHandler = () => {
      // Allow modal to open even without premium access
      // We will show the UpgradeCard inside instead
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
            // Allow modal to open even without premium access
            setShowModal(true)
          }}
          variant="outline"
        >
          <ScanLine className="h-4 w-4 mr-2" />
          Scan Menu
        </Button>
      )}

      <Dialog open={showModal} onOpenChange={handleClose}>
        <DialogContent
          className={`w-[90vw] max-w-sm border ${getBorderColor()} p-0 gap-0 rounded-xl overflow-hidden shadow-xl [&>button]:hidden flex flex-col z-[200]`}
          style={{
            backgroundColor: menuBackgroundColor,
            color: contrastColor,
          }}
        >
          <div className={`flex items-center justify-between p-4 border-b ${getBorderColor()}`}>
            <div />
            <DialogTitle className={`text-base sm:text-lg font-semibold ${primaryTextClass} flex items-center gap-2`}>
              <ScanLine className="h-5 w-5" />
              Scan Your Menu
            </DialogTitle>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => handleClose(false)}
              className="h-8 w-8 hover:bg-transparent"
              style={{ color: contrastColor }}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="flex-1 p-6 flex flex-col justify-center space-y-8">
            {!premiumAccess.canAccess ? (
              <div className="flex flex-col items-center justify-center text-center space-y-4 py-4">
                <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center">
                  <Crown className="size-6 text-orange-600" />
                </div>
                <div className="space-y-2">
                  <h3 className={`text-lg font-semibold ${primaryTextClass}`}>Premium Feature</h3>
                  <p className={`text-sm ${secondaryTextClass} max-w-[250px] mx-auto`}>
                    Upgrade to Premium to unlock AI Menu Scanning and more.
                  </p>
                </div>
                <div className="flex flex-col w-full gap-2 pt-2">
                  <Button
                    onClick={() => {
                      if (profile?.stripe_customer_id) {
                        // Redirect to billing portal if they have a customer ID but not active
                        window.location.href = '/api/stripe/create-portal-session'
                      } else {
                        // Or trigger the upgrade card logic elsewhere. 
                        // For simplicity and "simple pop up" request, we'll link to subscription page 
                        // or just re-use the upgrade logic if we had it handy.
                        // But since UpgradeCard logic is complex, let's just use the UpgradeCard's internal logic
                        // functionality but via a simple button? No, UpgradeCard handles the session creation.
                        // Let's just create a new checkout session here.
                        const handleSimpleUpgrade = async () => {
                          setLoading(true);
                          try {
                            if (!supabase) return;
                            const { data: { session: authSession } } = await supabase.auth.getSession();
                            if (!authSession) return;
                            const res = await fetch('/api/stripe/create-checkout-session', {
                              method: 'POST',
                              headers: { Authorization: `Bearer ${authSession.access_token}` }
                            });
                            const data = await res.json();
                            if (data.url) window.location.href = data.url;
                            else alert('Error starting upgrade.');
                          } catch (e) {
                            console.error(e);
                            alert('Error starting upgrade.');
                          } finally {
                            setLoading(false);
                          }
                        };
                        handleSimpleUpgrade();
                      }
                    }}
                    className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                    disabled={loading}
                  >
                    {loading ? 'Loading...' : 'Upgrade Now'}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setShowModal(false)}
                    className={secondaryTextClass}
                  >
                    Maybe Later
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className={`text-sm ${secondaryTextClass} space-y-4 text-center`}>
                  <p className="font-medium text-lg">Upload a clear, well-lit image of your menu for best results.</p>
                  <div className="flex justify-center">
                    <ul className="space-y-2 text-sm text-left inline-block">
                      <li className="flex items-start gap-2">
                        <span className="mt-1">•</span>
                        <span>May take ~1 minute to download details.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="mt-1">•</span>
                        <span>Items are automatically added.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="mt-1">•</span>
                        <span>Verify menu items, then add images and allergen tags!</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <Input
                  id="menu-file-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                <div className="space-y-6">
                  {!loading && !message && (
                    <>
                      {filePreview ? (
                        <div className="space-y-4">
                          <div className="relative w-full h-48 rounded-xl border border-gray-200/60 overflow-hidden bg-white/80 backdrop-blur-sm mx-auto shadow-sm">
                            <Image
                              src={filePreview}
                              alt="Menu preview"
                              fill
                              className="object-contain"
                              sizes="100vw"
                              unoptimized
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute top-2 right-2 bg-white/90 hover:bg-white shadow-sm rounded-md border border-gray-200 p-1 h-auto"
                              onClick={handleRemoveFile}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          <p className={`text-xs text-center ${secondaryTextClass}`}>
                            {selectedFile?.name} ({((selectedFile?.size || 0) / 1024 / 1024).toFixed(2)} MB)
                          </p>
                        </div>
                      ) : (
                        <div
                          onClick={() => document.getElementById('menu-file-input')?.click()}
                          className={`border-2 border-dashed ${getBorderColor()} rounded-xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors`}
                        >
                          <Upload className={`h-8 w-8 ${secondaryTextClass}`} />
                          <span className={`text-sm font-medium ${secondaryTextClass}`}>Tap to select image</span>
                        </div>
                      )}

                      <div className="flex justify-center gap-3 pt-2">
                        <Button
                          variant="ghost"
                          onClick={() => handleClose(false)}
                          disabled={loading}
                          className={secondaryTextClass}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={selectedFile ? handleUpload : () => document.getElementById('menu-file-input')?.click()}
                          disabled={loading}
                          className="bg-green-600 hover:bg-green-700 text-white min-w-[140px]"
                        >
                          {selectedFile ? (
                            <>
                              <ScanLine className="h-4 w-4 mr-2" />
                              Scan Menu
                            </>
                          ) : (
                            'Select Image'
                          )}
                        </Button>
                      </div>
                    </>
                  )}

                  {loading && (
                    <div className="flex flex-col items-center justify-center py-4">
                      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-600 mb-6"></div>
                      <p className={`font-medium text-lg ${primaryTextClass}`}>
                        Processing your menu…
                      </p>
                      <p className={`text-sm mt-2 ${secondaryTextClass}`}>
                        This may take a few moments
                      </p>
                    </div>
                  )}

                  {message && (
                    <div className="py-2">
                      <div className={`p-4 rounded-lg text-center ${message.includes('✅')
                        ? 'bg-green-500/10 text-green-600 border border-green-500/20'
                        : 'bg-red-500/10 text-red-600 border border-red-500/20'
                        }`}>
                        <p className="text-sm font-medium">{message}</p>
                      </div>
                      {!loading && (
                        <div className="mt-6 flex justify-center">
                          <Button
                            onClick={() => handleClose(false)}
                            className={message.includes('✅') ? 'bg-green-600 hover:bg-green-700 text-white' : ''}
                          >
                            Close
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog >
    </>
  )
}
