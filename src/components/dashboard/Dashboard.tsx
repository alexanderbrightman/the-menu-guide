'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { LogOut, QrCode } from 'lucide-react'
import Image from 'next/image'
import { ProfileEditForm } from '@/components/profile/ProfileEditForm'
import { ScanMenuModal } from '@/components/menu/ScanMenuModal'
import { usePremiumFeature } from '@/hooks/usePremiumFeature'
import { SubscriptionExpiryWarning } from '@/components/subscription/SubscriptionExpiryWarning'
import { PrivateMenuPage } from '@/components/profile/PrivateMenuPage'

const DEFAULT_MENU_BACKGROUND_COLOR = '#F4F2EE'
const DEFAULT_MENU_FONT = 'Plus Jakarta Sans'
const FONT_FAMILY_MAP: Record<string, string> = {
  'Plus Jakarta Sans': '"Plus Jakarta Sans", sans-serif',
  'Fjalla One': '"Fjalla One", sans-serif',
  Georgia: 'Georgia, serif',
  'Times New Roman': '"Times New Roman", serif',
  Arial: 'Arial, sans-serif',
  'Courier New': '"Courier New", monospace',
}

const getContrastColor = (hexColor: string) => {
  if (!hexColor) return '#1f2937'
  const cleanHex = hexColor.replace('#', '')
  const normalized = cleanHex.length === 3
    ? cleanHex.split('').map((char) => char + char).join('')
    : cleanHex

  if (normalized.length !== 6) return '#1f2937'

  const r = parseInt(normalized.substring(0, 2), 16)
  const g = parseInt(normalized.substring(2, 4), 16)
  const b = parseInt(normalized.substring(4, 6), 16)

  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.6 ? '#1f2937' : '#ffffff'
}

export function Dashboard() {
  const { user, profile, signOut, signingOut } = useAuth()
  const [showProfileEdit, setShowProfileEdit] = useState(false)
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null)

  const menuBackgroundColor = profile?.menu_background_color || DEFAULT_MENU_BACKGROUND_COLOR
  const menuFont = profile?.menu_font || DEFAULT_MENU_FONT

  const contrastColor = useMemo(
    () => getContrastColor(menuBackgroundColor),
    [menuBackgroundColor]
  )
  const isDarkBackground = contrastColor === '#ffffff'
  const menuFontFamily = useMemo(
    () => FONT_FAMILY_MAP[menuFont] ?? menuFont,
    [menuFont]
  )
  const subtleTextClass = isDarkBackground ? 'text-white/75' : 'text-gray-600'
  const outlineButtonClass = isDarkBackground
    ? 'border-white/60 !text-white hover:bg-white/10 bg-transparent'
    : 'border-slate-400 !text-slate-900 hover:bg-slate-100 bg-transparent'
  const cardSurfaceClass = `rounded-2xl transition-colors ${
    isDarkBackground
      ? 'bg-white/10 text-white shadow-xl shadow-black/20'
      : 'bg-white/95 shadow-sm'
  }`

  // Premium feature validation
  const qrCodeAccess = usePremiumFeature('QR code generation')

  const profileUsername = profile?.username || ''

  const generateQRCode = useCallback(async () => {
    if (!user) return

    // Check premium access before proceeding
    if (!qrCodeAccess.canAccess) {
      alert(qrCodeAccess.message)
      return
    }

    if (!supabase) {
      console.error('Supabase client is not configured')
      alert('Unable to generate QR code right now. Please try again later.')
      return
    }

    try {
      // Get the current session token
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        console.error('Not authenticated')
        return
      }

      // Generate QR code with username to force regeneration
      const response = await fetch(`/api/qr-code?username=${profileUsername}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        // Revoke old blob URL if it exists to prevent memory leaks
        if (qrCodeUrl) {
          URL.revokeObjectURL(qrCodeUrl)
        }
        setQrCodeUrl(url)
      } else {
        const errorData = await response.json()
        console.error('Error generating QR code:', errorData.error)
        alert(errorData.error || 'Failed to generate QR code')
      }
    } catch (error) {
      console.error('Error generating QR code:', error)
      alert('Failed to generate QR code. Please try again.')
    }
  }, [user, profileUsername, qrCodeAccess, qrCodeUrl])

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (qrCodeUrl) {
        URL.revokeObjectURL(qrCodeUrl)
      }
    }
  }, [qrCodeUrl])

  // Auto-generate QR code when component mounts or profile username changes (only for premium users)
  useEffect(() => {
    if (user && profile && qrCodeAccess.canAccess && profileUsername && !qrCodeUrl) {
      generateQRCode()
    }
  }, [user, profile, profileUsername, qrCodeAccess.canAccess, qrCodeUrl, generateQRCode])

  const downloadQRCode = () => {
    if (qrCodeUrl) {
      const link = document.createElement('a')
      link.href = qrCodeUrl
      link.download = `menu-qr-code-${profile?.username}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  useEffect(() => {
    if (typeof document === 'undefined') return

    const previousBodyBg = document.body.style.backgroundColor
    const previousHtmlBg = document.documentElement.style.backgroundColor
    document.body.style.backgroundColor = menuBackgroundColor
    document.documentElement.style.backgroundColor = menuBackgroundColor

    return () => {
      document.body.style.backgroundColor = previousBodyBg
      document.documentElement.style.backgroundColor = previousHtmlBg
    }
  }, [menuBackgroundColor])

  if (!user || !profile) {
    return <div>Loading...</div>
  }

  return (
    <div
      className="min-h-screen transition-colors"
      style={{
        backgroundColor: menuBackgroundColor,
        color: contrastColor,
        fontFamily: menuFontFamily,
      }}
    >
      {/* Safe area overlay - adapts to background color (dark or light) */}
      <div
        className="fixed top-0 left-0 right-0 z-50 pointer-events-none"
        style={{
          height: 'env(safe-area-inset-top, 0px)',
          background: menuBackgroundColor, // Matches the page background
        }}
      />
      
      <header 
        className="border-b border-white/10 backdrop-blur-sm" 
        style={{ 
          backgroundColor: menuBackgroundColor,
          paddingTop: 'env(safe-area-inset-top, 0px)',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 gap-4">
            <a
              href="https://themenuguide.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-2xl font-semibold hover:opacity-80 transition-opacity cursor-pointer"
              style={{ color: contrastColor, fontFamily: menuFontFamily }}
            >
              The Menu Guide
            </a>
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={signOut}
                disabled={signingOut}
                className={outlineButtonClass}
              >
                <LogOut className="h-4 w-4 mr-2" />
                {signingOut ? 'Signing Out...' : 'Sign Out'}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-col gap-16 pb-20">
        <PrivateMenuPage onEditProfile={() => setShowProfileEdit(true)} />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* QR Code Section */}
          {qrCodeUrl && (
            <div className="mt-6 space-y-4">
              <div className="flex flex-col items-center text-center gap-1.5">
                <div className="flex items-center gap-2" style={{ color: contrastColor }}>
                  <QrCode className="h-5 w-5" />
                  <span className="text-lg font-semibold">Your Menu QR Code</span>
                </div>
                <p className={`text-sm max-w-2xl ${subtleTextClass}`}>
                  Download this QR code to add to your physical menu. Customers can scan it to view your digital menu.
                </p>
              </div>
              <div className="flex flex-col items-center space-y-3">
                <div className="bg-white/80 backdrop-blur-md p-4 rounded-xl shadow-lg shadow-gray-200/12 border border-gray-200/60">
                  <Image
                    src={qrCodeUrl}
                    alt="Menu QR Code"
                    width={256}
                    height={256}
                    className="h-64 w-64 object-contain"
                    unoptimized
                    priority
                  />
                </div>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <Button
                    variant="outline"
                    className={`${outlineButtonClass} flex items-center gap-2`}
                    onClick={downloadQRCode}
                  >
                    <QrCode className="h-4 w-4" />
                    Download PNG
                  </Button>
                  <Button
                    variant="outline"
                    className={outlineButtonClass}
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/menu/${profile.username}`)
                    }}
                  >
                    Copy Link
                  </Button>
                </div>
                <p className={`text-sm text-center max-w-md ${subtleTextClass}`}>
                  The QR code links to: <br />
                  <code
                    className="px-2 py-1 rounded text-xs"
                    style={{
                      backgroundColor: isDarkBackground ? 'rgba(255,255,255,0.12)' : 'rgba(17,24,39,0.08)',
                      color: contrastColor,
                    }}
                  >
                    {window.location.origin}/menu/{profile.username}
                  </code>
                </p>
              </div>
            </div>
          )}

          <div className="mt-6 space-y-4">
            <div className={cardSurfaceClass}>
              <SubscriptionExpiryWarning showCard={true} />
            </div>
            {user && (
              <ScanMenuModal userId={user.id} hideTrigger onScanSuccess={() => {}} />
            )}
          </div>
        </div>
      </div>

      {showProfileEdit && <ProfileEditForm onClose={() => setShowProfileEdit(false)} />}
    </div>
  )
}
