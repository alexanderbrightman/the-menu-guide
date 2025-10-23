'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { LogOut, Settings, QrCode } from 'lucide-react'
import { ProfileEditForm } from '@/components/profile/ProfileEditForm'
import { CategoryManager } from '@/components/menu/CategoryManager'
import { MenuItemManager } from '@/components/menu/MenuItemManager'
import { UpgradeCard } from '@/components/payment/UpgradeCard'

export function Dashboard() {
  const { user, profile, signOut, signingOut } = useAuth()
  const [showProfileEdit, setShowProfileEdit] = useState(false)
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null)
  const [qrCodeLoading, setQrCodeLoading] = useState(false)

  const generateQRCode = async () => {
    if (!user || !supabase) return

    setQrCodeLoading(true)
    try {
      // Get the current session token
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        console.error('Not authenticated')
        return
      }

      // Generate QR code
      const response = await fetch('/api/qr-code', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        setQrCodeUrl(url)
      } else {
        console.error('Error generating QR code')
      }
    } catch (error) {
      console.error('Error generating QR code:', error)
    } finally {
      setQrCodeLoading(false)
    }
  }

  // Auto-generate QR code when component mounts
  useEffect(() => {
    if (user && profile && !qrCodeUrl && !qrCodeLoading) {
      generateQRCode()
    }
  }, [user, profile])

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

  if (!user || !profile) {
    return <div>Loading...</div>
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#DBD3CB' }}>
      {/* Header */}
      <header className="shadow-sm border-b" style={{ backgroundColor: '#F4F2EE' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <img 
                src="/logo_notext.png" 
                alt="The Menu Guide Logo" 
                className="h-10 w-10 object-contain"
              />
              <h1 className="text-xl font-semibold text-gray-900">The Menu Guide</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm" onClick={() => setShowProfileEdit(true)}>
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={signOut}
                disabled={signingOut}
              >
                <LogOut className="h-4 w-4 mr-2" />
                {signingOut ? 'Signing Out...' : 'Sign Out'}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Section */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center space-x-4">
              <Avatar className="h-24 w-24">
                <AvatarImage src={profile.avatar_url || ''} />
                <AvatarFallback>
                  {profile.display_name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-2xl">{profile.display_name}</CardTitle>
                <CardDescription className="text-lg">@{profile.username}</CardDescription>
                {profile.bio && (
                  <p className="text-gray-600 mt-2">{profile.bio}</p>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex space-x-4">
              <Button onClick={() => window.open(`/menu/${profile.username}`, '_blank')}>
                View Menu
              </Button>
              <Button variant="outline" onClick={() => setShowProfileEdit(true)}>
                <Settings className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Menu Management */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Categories */}
          <div className="lg:col-span-2">
            <CategoryManager />
          </div>

          {/* Menu Items */}
          <div className="lg:col-span-2">
            <MenuItemManager />
          </div>
        </div>

        {/* QR Code Section - Above Payment Portal */}
        {qrCodeUrl && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                Your Menu QR Code
              </CardTitle>
              <CardDescription>
                Download this QR code to add to your physical menu. Customers can scan it to view your digital menu.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center space-y-4">
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <img 
                    src={qrCodeUrl} 
                    alt="Menu QR Code" 
                    className="w-64 h-64 object-contain"
                  />
                </div>
                <div className="flex space-x-4">
                  <Button onClick={downloadQRCode} className="flex items-center gap-2">
                    <QrCode className="h-4 w-4" />
                    Download PNG
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/menu/${profile.username}`)
                    }}
                  >
                    Copy Link
                  </Button>
                </div>
                <p className="text-sm text-gray-600 text-center max-w-md">
                  The QR code links to: <br />
                  <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                    {window.location.origin}/menu/{profile.username}
                  </code>
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Subscription Status */}
        <div className="mt-8">
          <UpgradeCard />
        </div>
      </div>

      {/* Profile Edit Modal */}
      {showProfileEdit && (
        <ProfileEditForm onClose={() => setShowProfileEdit(false)} />
      )}
    </div>
  )
}
