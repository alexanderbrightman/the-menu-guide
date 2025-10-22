'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { LogOut, Settings, QrCode } from 'lucide-react'
import { ProfileEditForm } from '@/components/profile/ProfileEditForm'
import { CategoryManager } from '@/components/menu/CategoryManager'
import { MenuItemManager } from '@/components/menu/MenuItemManager'
import { QRCodeDialog } from '@/components/public/QRCodeDialog'
import { UpgradeCard } from '@/components/payment/UpgradeCard'

export function Dashboard() {
  const { user, profile, signOut } = useAuth()
  const [showProfileEdit, setShowProfileEdit] = useState(false)
  const [showQRCode, setShowQRCode] = useState(false)

  if (!user || !profile) {
    return <div>Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-gray-900">The Menu Guide</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm" onClick={() => setShowProfileEdit(true)}>
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
              <Button variant="outline" size="sm" onClick={signOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
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
              <Avatar className="h-16 w-16">
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
                <div className="flex items-center space-x-2 mt-2">
                  <Badge variant={profile.subscription_status === 'pro' ? 'default' : 'secondary'}>
                    {profile.subscription_status === 'pro' ? 'Pro Plan' : 'Free Plan'}
                  </Badge>
                  {profile.is_public && (
                    <Badge variant="outline">Public</Badge>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex space-x-4">
              <Button onClick={() => setShowQRCode(true)}>
                <QrCode className="h-4 w-4 mr-2" />
                View QR Code
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

        {/* Subscription Status */}
        <div className="mt-8">
          <UpgradeCard />
        </div>
      </div>

      {/* Profile Edit Modal */}
      {showProfileEdit && (
        <ProfileEditForm onClose={() => setShowProfileEdit(false)} />
      )}

      {/* QR Code Dialog */}
      <QRCodeDialog
        profile={profile}
        isOpen={showQRCode}
        onClose={() => setShowQRCode(false)}
      />
    </div>
  )
}
