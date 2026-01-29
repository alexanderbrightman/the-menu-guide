"use client"

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { QrCode, Copy, ExternalLink, Smartphone, Check } from 'lucide-react'
import { Profile } from '@/lib/supabase'
import QRCodeLib from 'qrcode'
import Image from 'next/image'

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
        width: 160,
        margin: 1,
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
      <DialogContent className="max-w-2xl w-full p-0 gap-0 overflow-hidden rounded-xl border-0 shadow-2xl">
        <div className="flex flex-col md:flex-row h-full">
          {/* Left Side: QR Code (Visual) */}
          <div className="w-full md:w-5/12 bg-zinc-50 flex flex-col items-center justify-center p-8 border-b md:border-b-0 md:border-r border-zinc-100 relative overflow-hidden">
            {/* Background decorations */}
            <div className="absolute top-0 left-0 w-32 h-32 bg-indigo-50/50 rounded-full -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 right-0 w-24 h-24 bg-orange-50/50 rounded-full translate-x-1/3 translate-y-1/3" />

            {/* QR Code Card */}
            <div className="relative bg-white p-4 rounded-xl shadow-[0_2px_20px_-4px_rgba(0,0,0,0.1)] border border-zinc-100 transform transition-transform hover:scale-105 duration-300">
              {qrCodeDataUrl ? (
                <div className="relative">
                  <Image
                    src={qrCodeDataUrl}
                    alt="Menu QR Code"
                    width={140}
                    height={140}
                    className="rounded-sm"
                    unoptimized
                    priority
                  />
                  {!profile.is_public && (
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center rounded-sm">
                      <Badge variant="secondary" className="shadow-sm border-gray-200">Private</Badge>
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-[140px] h-[140px] bg-zinc-100 flex items-center justify-center rounded-sm animate-pulse">
                  <QrCode className="h-8 w-8 text-zinc-300" />
                </div>
              )}
            </div>

            <p className="mt-4 text-xs font-medium text-zinc-500 text-center max-w-[150px]">
              Scan to view menu
            </p>
          </div>

          {/* Right Side: Details & Actions */}
          <div className="flex-1 p-6 md:p-8 flex flex-col bg-white">
            <DialogHeader className="mb-6 p-0">
              <div className="flex items-center gap-2 mb-1.5">
                <Badge
                  variant={profile.is_public ? "default" : "secondary"}
                  className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 h-auto ${profile.is_public ? "bg-green-100 text-green-700 hover:bg-green-100" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-100"}`}
                >
                  {profile.is_public ? "Active" : "Private"}
                </Badge>
                {!profile.is_public && (
                  <span className="text-[10px] text-zinc-400">Not visible to customers</span>
                )}
              </div>
              <DialogTitle className="text-xl md:text-2xl font-bold text-zinc-900 tracking-tight">
                Share Your Menu
              </DialogTitle>
              <DialogDescription className="text-zinc-500 text-sm mt-1">
                Give customers instant access to your digital menu.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 flex-1 flex flex-col justify-center">
              {/* Link Input Group */}
              <div className="space-y-1.5">
                <div className="text-xs font-medium text-zinc-500 px-1 uppercase tracking-wider">Public Link</div>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1 group">
                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-zinc-400">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </div>
                    <div className="w-full pl-9 pr-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-lg text-sm text-zinc-600 font-mono truncate transition-colors group-hover:border-zinc-300 group-hover:bg-zinc-50/80">
                      {publicUrl}
                    </div>
                  </div>
                  <Button
                    onClick={copyToClipboard}
                    className={`shrink-0 transition-all duration-200 w-[100px] ${copied
                      ? "bg-green-600 hover:bg-green-700 text-white shadow-none ring-0 border-transparent"
                      : "bg-zinc-900 hover:bg-zinc-800 text-white shadow-sm"}`}
                  >
                    {copied ? (
                      <>
                        <Check className="h-3.5 w-3.5 mr-1.5" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 mr-1.5" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Action Buttons Grid */}
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  onClick={openInNewTab}
                  className="h-auto py-3 px-4 border-zinc-200 hover:bg-zinc-50 text-zinc-700 justify-start"
                >
                  <div className="flex flex-col items-start gap-1">
                    <span className="text-xs font-semibold text-zinc-900 flex items-center">
                      Open Menu <ExternalLink className="h-3 w-3 ml-1 opacity-50" />
                    </span>
                    <span className="text-[10px] text-zinc-500 font-normal">View as customer</span>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  onClick={async () => {
                    if (navigator.share) {
                      try {
                        await navigator.share({
                          title: `${profile.display_name} Menu`,
                          text: `Check out our menu!`,
                          url: publicUrl,
                        })
                      } catch (err) {
                        console.error('Error sharing', err)
                      }
                    } else {
                      copyToClipboard()
                    }
                  }}
                  className="h-auto py-3 px-4 border-zinc-200 hover:bg-zinc-50 text-zinc-700 justify-start"
                >
                  <div className="flex flex-col items-start gap-1">
                    <span className="text-xs font-semibold text-zinc-900 flex items-center">
                      Share Link <Smartphone className="h-3 w-3 ml-1 opacity-50" />
                    </span>
                    <span className="text-[10px] text-zinc-500 font-normal">Send to device</span>
                  </div>
                </Button>
              </div>
            </div>

            {/* Footer / Close (Mobile mostly) */}
            <div className="mt-8 md:hidden">
              <Button variant="ghost" onClick={onClose} className="w-full text-zinc-500 hover:text-zinc-900">
                Close
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
