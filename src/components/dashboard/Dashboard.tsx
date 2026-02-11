'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Utensils, LogOut } from 'lucide-react'
import Image from 'next/image'
import { ProfileEditForm } from '@/components/profile/ProfileEditForm'
import { ScanMenuModal } from '@/components/menu/ScanMenuModal'
import { usePremiumFeature } from '@/hooks/usePremiumFeature'
import { PrivateMenuPage } from '@/components/profile/PrivateMenuPage'
import { DashboardNavigation } from '@/components/dashboard/DashboardNavigation'
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar'
import { QrCodeDialog } from '@/components/dashboard/QrCodeDialog'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { QrCode, Check, Copy, Download } from 'lucide-react'

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
  const [showQrDialog, setShowQrDialog] = useState(false)
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

  // Premium feature validation
  const qrCodeAccess = usePremiumFeature('QR code generation')

  const profileUsername = profile?.username || ''

  // Sidebar action handlers
  const handleViewMenu = useCallback(() => {
    if (profile?.username && typeof window !== 'undefined') {
      window.open(`${window.location.origin}/menu/${profile.username}`, '_blank')
    }
  }, [profile?.username])

  const handleNewItem = useCallback(() => {
    window.dispatchEvent(new CustomEvent('open-create-item'))
  }, [])

  const handleNewCategory = useCallback(() => {
    window.dispatchEvent(new CustomEvent('open-create-category'))
  }, [])

  const handleScanMenu = useCallback(() => {
    window.dispatchEvent(new CustomEvent('open-scan-menu'))
  }, [])

  const handleSignOut = useCallback(async () => {
    await signOut()
  }, [signOut])

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

  // Listen for edit profile event from mobile toolbar
  useEffect(() => {
    const handleOpenEditProfile = () => setShowProfileEdit(true)
    const handleOpenQrCode = () => setShowQrDialog(true)
    window.addEventListener('open-edit-profile', handleOpenEditProfile)
    window.addEventListener('open-qr-code', handleOpenQrCode)
    return () => {
      window.removeEventListener('open-edit-profile', handleOpenEditProfile)
      window.removeEventListener('open-qr-code', handleOpenQrCode)
    }
  }, [])

  if (!user || !profile) {
    return <div>Loading...</div>
  }

  return (
    <div
      className="min-h-screen transition-colors flex"
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
          background: menuBackgroundColor,
        }}
      />

      {/* Desktop Sidebar - Hidden on mobile */}
      <DashboardSidebar
        profile={profile}
        user={user}
        onViewMenu={handleViewMenu}
        onNewItem={handleNewItem}
        onNewCategory={handleNewCategory}
        onScanMenu={handleScanMenu}
        onEditProfile={() => setShowProfileEdit(true)}
        onSignOut={handleSignOut}
        signingOut={signingOut}
        qrCodeUrl={qrCodeUrl}
        menuLink={typeof window !== 'undefined' ? `${window.location.origin}/menu/${profile.username}` : `/menu/${profile.username}`}
        onDownloadQr={downloadQRCode}
        outlineButtonClass={outlineButtonClass}
        backgroundColor={menuBackgroundColor}
        contrastColor={contrastColor}
        isDarkBackground={isDarkBackground}
        borderColorClass={isDarkBackground ? 'border-white/10' : 'border-black/8'}
      />

      {/* Main Content Area */}
      <div className="flex-1 min-w-0">
        <header
          className="border-b backdrop-blur-sm lg:hidden"
          style={{
            backgroundColor: menuBackgroundColor,
            paddingTop: 'env(safe-area-inset-top, 0px)',
            borderColor: isDarkBackground ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
          }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16 gap-4">
              {/* Left: Avatar + name on mobile, empty on desktop */}
              <div className="flex items-center gap-3 lg:hidden">
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
              {/* Desktop: empty left spacer */}
              <div className="hidden lg:block" />

              {/* Right: Sign Out (always) + mobile-only hamburger + View Menu */}
              <div className="flex items-center space-x-4">
                {/* View Menu - mobile only */}
                {profile?.username && (
                  <Button
                    variant="outline"
                    size="sm"
                    className={`${outlineButtonClass} flex items-center gap-2 border rounded-lg lg:hidden`}
                    onClick={() => window.open(`${window.location.origin}/menu/${profile.username}`, '_blank')}
                  >
                    <Utensils className="h-4 w-4" />
                    <span className="hidden sm:inline">View Menu</span>
                  </Button>
                )}

                {/* Sign Out button - always visible */}
                <Button
                  variant="outline"
                  size="sm"
                  className={`${outlineButtonClass} flex items-center gap-2 border rounded-lg`}
                  onClick={handleSignOut}
                  disabled={signingOut}
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">{signingOut ? 'Signing Out...' : 'Sign Out'}</span>
                </Button>


              </div>
            </div>
          </div>
        </header>

        <div className="flex flex-col gap-16 lg:gap-4 pb-20 lg:pt-4">
          <PrivateMenuPage />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mt-6 space-y-4">

              {user && (
                <ScanMenuModal userId={user.id} hideTrigger onScanSuccess={() => { }} profile={profile} />
              )}
            </div>
          </div>
        </div>
      </div>

      {showProfileEdit && <ProfileEditForm onClose={() => setShowProfileEdit(false)} />}

      {/* Mobile QR Code Dialog */}
      <Dialog open={showQrDialog} onOpenChange={setShowQrDialog}>
        <DialogContent
          className="sm:max-w-md border-0"
          style={{
            backgroundColor: isDarkBackground ? '#1a1a2e' : '#ffffff',
            color: contrastColor,
          }}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold" style={{ color: contrastColor }}>
              <QrCode className="h-5 w-5" />
              Menu QR Code
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-5 py-4">
            {qrCodeUrl ? (
              <div className="relative w-48 h-48 bg-white rounded-xl overflow-hidden shadow-lg p-3">
                <Image
                  src={qrCodeUrl}
                  alt="Menu QR Code"
                  fill
                  className="object-contain p-2"
                  unoptimized
                  priority
                />
              </div>
            ) : (
              <div
                className="w-48 h-48 rounded-xl flex items-center justify-center"
                style={{
                  backgroundColor: isDarkBackground ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                  border: `1px solid ${isDarkBackground ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
                }}
              >
                <p className="text-sm opacity-50">Generating...</p>
              </div>
            )}
            <p className="text-sm text-center opacity-60">
              Scan to view your digital menu instantly.
            </p>
            <div
              className="w-full flex items-center gap-2 p-3 rounded-lg border"
              style={{
                backgroundColor: isDarkBackground ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)',
                borderColor: isDarkBackground ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
              }}
            >
              <code className="text-xs flex-1 truncate font-mono opacity-75">
                {typeof window !== 'undefined' ? window.location.origin : ''}/menu/{profile.username}
              </code>
              <Button
                size="icon"
                variant="ghost"
                className={`h-7 w-7 flex-shrink-0 ${isDarkBackground ? 'hover:bg-white/10' : 'hover:bg-gray-200'}`}
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/menu/${profile.username}`)
                  setCopied(true)
                  setTimeout(() => setCopied(false), 2000)
                }}
                style={{ color: contrastColor }}
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
            </div>
            <div className="flex gap-3 w-full">
              <Button
                size="sm"
                variant="outline"
                className={`flex-1 h-10 gap-2 ${outlineButtonClass}`}
                onClick={downloadQRCode}
                disabled={!qrCodeUrl}
              >
                <Download className="h-4 w-4" />
                Download
              </Button>
              <Button
                size="sm"
                variant="outline"
                className={`flex-1 h-10 gap-2 ${outlineButtonClass}`}
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/menu/${profile.username}`)
                  setCopied(true)
                  setTimeout(() => setCopied(false), 2000)
                }}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Copied!' : 'Copy Link'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
