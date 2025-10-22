'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { QrCode, Copy, ExternalLink, Smartphone } from 'lucide-react'
import { Profile } from '@/lib/supabase'
import QRCodeLib from 'qrcode'

interface QRCodeDialogProps {
  profile: Profile
  isOpen: boolean
  onClose: () => void
}

export function QRCodeDialog({ profile, isOpen, onClose }: QRCodeDialogProps) {
  const [copied, setCopied] = useState(false)
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('')
  
  const publicUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/menu/${profile.username}`
  
  // Generate QR code when dialog opens
  useEffect(() => {
    if (isOpen && publicUrl) {
      QRCodeLib.toDataURL(publicUrl, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      })
      .then(setQrCodeDataUrl)
      .catch(console.error)
    }
  }, [isOpen, publicUrl])
  
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const openInNewTab = () => {
    window.open(publicUrl, '_blank')
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl w-full mx-4">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            QR Code & Share Link
          </DialogTitle>
          <DialogDescription>
            Share your menu with customers using the QR code or direct link
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* QR Code */}
          <Card className="w-full">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-xl">QR Code</CardTitle>
              <CardDescription className="text-base">
                Customers can scan this to view your menu
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center px-6 pb-6">
              <div className="bg-white p-6 rounded-lg border-2 border-gray-200 w-fit mx-auto">
                {qrCodeDataUrl ? (
                  <img 
                    src={qrCodeDataUrl} 
                    alt="QR Code" 
                    className="w-56 h-56"
                  />
                ) : (
                  <div className="w-56 h-56 bg-gray-100 flex items-center justify-center rounded">
                    <div className="text-center text-gray-500">
                      <QrCode className="h-20 w-20 mx-auto mb-2" />
                      <p className="text-sm">Generating QR Code...</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Share Link */}
          <Card className="w-full">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl">Share Link</CardTitle>
              <CardDescription className="text-base">
                Direct link to your public menu
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 px-6 pb-6">
              <div className="flex items-center gap-3">
                <div className="flex-1 p-3 bg-gray-50 rounded border text-sm font-mono break-all">
                  {publicUrl}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyToClipboard}
                  className="shrink-0"
                >
                  <Copy className="h-4 w-4 mr-1" />
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
              </div>
              
              <div className="flex gap-3">
                <Button variant="outline" size="sm" onClick={openInNewTab} className="flex-1">
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Open Menu
                </Button>
                <Button variant="outline" size="sm" onClick={copyToClipboard} className="flex-1">
                  <Smartphone className="h-4 w-4 mr-1" />
                  Share Link
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Status */}
          <div className="text-center py-4">
            <Badge variant={profile.is_public ? "default" : "secondary"} className="text-base px-4 py-2">
              {profile.is_public ? "Public Menu Active" : "Menu Not Public"}
            </Badge>
            {!profile.is_public && (
              <p className="text-sm text-gray-500 mt-3">
                Enable public access in your profile settings
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
