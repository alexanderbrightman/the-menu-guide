'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { QrCode, Utensils, Check, Copy } from 'lucide-react'
import Image from 'next/image'
import { ProfileEditForm } from '@/components/profile/ProfileEditForm'
import { ScanMenuModal } from '@/components/menu/ScanMenuModal'
import { usePremiumFeature } from '@/hooks/usePremiumFeature'
import { PrivateMenuPage } from '@/components/profile/PrivateMenuPage'
import { DashboardNavigation } from '@/components/dashboard/DashboardNavigation'

const DEFAULT_MENU_BACKGROUND_COLOR = '#F5F5F5'
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
  const [copied, setCopied] = useState(false)

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
  const primaryTextClass = isDarkBackground ? 'text-white' : 'text-gray-900'
  const subtleTextClass = isDarkBackground ? 'text-white/75' : 'text-gray-600'
  const outlineButtonClass = isDarkBackground
    ? 'border border-white !text-white hover:bg-white/10 bg-transparent rounded-lg'
    : 'border border-black !text-slate-900 hover:bg-slate-100 bg-transparent rounded-lg'
  const cardSurfaceClass = `rounded-2xl transition-colors ${isDarkBackground
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
            <div className="flex items-center gap-3">
              {profile?.avatar_url && (
                <div className="relative h-10 w-10 overflow-hidden rounded-full border border-black/10">
                  <Image
                    src={profile.avatar_url}
                    alt={profile.display_name || 'Profile'}
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              <h1
                className="text-xl font-bold"
                style={{ color: contrastColor, fontFamily: menuFontFamily }}
              >
                {profile?.display_name || 'Your Restaurant'}
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              {profile?.username && (
                <Button
                  variant="outline"
                  size="sm"
                  className={`${outlineButtonClass} flex items-center gap-2 border rounded-lg`}
                  onClick={() => window.open(`${window.location.origin}/menu/${profile.username}`, '_blank')}
                >
                  <Utensils className="h-4 w-4" />
                  <span className="hidden sm:inline">View Menu</span>
                </Button>
              )}
              <DashboardNavigation
                signOut={signOut}
                signingOut={signingOut}
                onEditProfile={() => setShowProfileEdit(true)}
                profile={profile}
                user={user}
                triggerClassName={outlineButtonClass}
                contentBackgroundColor={menuBackgroundColor}
                contentColor={contrastColor}
                borderColorClass={isDarkBackground ? 'border-white/20' : 'border-black/10'}
              />
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-col gap-16 pb-20">
        <PrivateMenuPage />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* QR Code Section */}
          {qrCodeUrl && (
            <div className={`mt-8 rounded-xl border shadow-sm overflow-hidden p-4 sm:p-5 ${isDarkBackground ? 'bg-white/5 border-white/20' : 'bg-white border-gray-200'}`}>
              {/* Top Row: Title/Desc on left, QR on right */}
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <QrCode className={`h-4 w-4 ${primaryTextClass}`} />
                    <h3 className={`font-bold text-base sm:text-lg leading-tight ${primaryTextClass}`}>
                      Menu QR Code
                    </h3>
                  </div>
                  <p className={`text-xs sm:text-sm ${subtleTextClass}`}>
                    Scan to view your digital menu instantly.
                  </p>
                </div>
                {/* QR Code - Upper Right */}
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 bg-white rounded-md overflow-hidden">
                  <Image
                    src={qrCodeUrl}
                    alt="Menu QR Code"
                    fill
                    className="object-contain"
                    unoptimized
                    priority
                  />
                </div>
              </div>

              {/* Link Box */}
              <div className={`flex items-center gap-2 p-2 rounded-lg border mb-3 ${isDarkBackground ? 'bg-black/20 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
                <code className={`text-[10px] sm:text-xs flex-1 truncate font-mono ${contrastColor === '#ffffff' ? 'text-white/90' : 'text-gray-600'}`}>
                  {typeof window !== 'undefined' ? window.location.origin : ''}/menu/{profile.username}
                </code>
                <Button
                  size="icon"
                  variant="ghost"
                  className={`h-6 w-6 flex-shrink-0 ${isDarkBackground ? 'hover:bg-white/10 text-white' : 'hover:bg-gray-200 text-gray-500'}`}
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/menu/${profile.username}`)
                    setCopied(true)
                    setTimeout(() => setCopied(false), 2000)
                  }}
                >
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                </Button>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className={`flex-1 text-xs h-8 ${outlineButtonClass}`}
                  onClick={downloadQRCode}
                >
                  Download
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className={`flex-1 text-xs h-8 ${outlineButtonClass}`}
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/menu/${profile.username}`)
                    setCopied(true)
                    setTimeout(() => setCopied(false), 2000)
                  }}
                >
                  {copied ? 'Copied' : 'Copy Link'}
                </Button>
              </div>
            </div>
          )}

          <div className="mt-6 space-y-4">

            {user && (
              <ScanMenuModal userId={user.id} hideTrigger onScanSuccess={() => { }} profile={profile} />
            )}
          </div>
        </div>
      </div>

      {showProfileEdit && <ProfileEditForm onClose={() => setShowProfileEdit(false)} />}
    </div>
  )
}
