'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { SettingsDialog } from '@/components/profile/SettingsDialog'
import { SubscriptionExpiryWarning } from '@/components/subscription/SubscriptionExpiryWarning'
import { SubscriptionDetailsCard } from '@/components/profile/SubscriptionDetailsCard'
import { UpgradeCard } from '@/components/payment/UpgradeCard'
import { Menu, Edit, Scan, LogOut, Settings, Utensils, Plus, FolderPlus } from 'lucide-react'
import { Profile } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'
import { validatePremiumAccess } from '@/lib/premium-validation'
import { CategoryDivider } from '@/components/public/CategoryDivider'

interface DashboardNavigationProps {
    signOut: () => Promise<void>
    signingOut: boolean
    onEditProfile: () => void
    profile: Profile | null
    user: User | null
    triggerClassName?: string
    contentBackgroundColor: string
    contentColor: string
    borderColorClass: string
}

export function DashboardNavigation({
    signOut,
    signingOut,
    onEditProfile,
    profile,
    user,
    triggerClassName,
    contentBackgroundColor,
    contentColor,
    borderColorClass,
}: DashboardNavigationProps) {
    const [isOpen, setIsOpen] = useState(false)
    const isDarkBackground = contentColor === '#ffffff'

    const handleViewMenu = () => {
        if (typeof window !== 'undefined' && profile?.username) {
            window.open(`${window.location.origin}/menu/${profile.username}`, '_blank')
        }
    }

    const handleNewItem = () => {
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('open-create-item'))
        }
    }

    const handleNewCategory = () => {
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('open-create-category'))
        }
    }

    const handleScanMenu = () => {
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('open-scan-menu'))
        }
    }

    const handleEditProfile = () => {
        onEditProfile()
    }

    const handleSignOut = async () => {
        await signOut()
        setIsOpen(false)
    }

    const hasPremiumAccess = validatePremiumAccess(profile, 'menu visibility').isValid

    return (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className={triggerClassName}
                >
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Menu</span>
                </Button>
            </SheetTrigger>
            <SheetContent
                style={{
                    backgroundColor: contentBackgroundColor,
                    color: contentColor,
                }}
                className={`border-l ${borderColorClass} overflow-y-auto w-full max-w-md sm:max-w-lg`}
            >
                <SheetHeader className="sr-only">
                    <SheetTitle>Tools Menu</SheetTitle>
                </SheetHeader>

                <div className="flex flex-col py-12 px-6 gap-4">

                    {/* Title Area */}
                    <div className="w-full">
                        <CategoryDivider title="TOOLS" isDarkBackground={isDarkBackground} />
                    </div>

                    <div className="flex flex-col w-full gap-6 max-w-sm mx-auto">
                        <div className="space-y-4 w-full">
                            {/* View Menu */}
                            {profile?.username && (
                                <Button
                                    variant="ghost"
                                    className="w-full justify-start gap-4 text-lg h-12 px-4 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                                    onClick={handleViewMenu}
                                    style={{ color: contentColor }}
                                >
                                    <Utensils className="h-5 w-5" />
                                    View Menu
                                </Button>
                            )}

                            {/* Add Menu Item */}
                            <Button
                                variant="ghost"
                                className="w-full justify-start gap-4 text-lg h-12 px-4 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                                onClick={handleNewItem}
                                style={{ color: contentColor }}
                            >
                                <Plus className="h-5 w-5" />
                                Add Menu Item
                            </Button>

                            {/* Add Category */}
                            <Button
                                variant="ghost"
                                className="w-full justify-start gap-4 text-lg h-12 px-4 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                                onClick={handleNewCategory}
                                style={{ color: contentColor }}
                            >
                                <FolderPlus className="h-5 w-5" />
                                Add Category
                            </Button>

                            {/* Scan Menu */}
                            {user && (
                                <Button
                                    variant="ghost"
                                    className="w-full justify-start gap-4 text-lg h-12 px-4 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                                    onClick={handleScanMenu}
                                    style={{ color: contentColor }}
                                >
                                    <Scan className="h-5 w-5" />
                                    Scan Menu
                                </Button>
                            )}

                            {/* Edit Profile */}
                            <Button
                                variant="ghost"
                                className="w-full justify-start gap-4 text-lg h-12 px-4 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                                onClick={handleEditProfile}
                                style={{ color: contentColor }}
                            >
                                <Edit className="h-5 w-5" />
                                Edit Profile
                            </Button>

                            {/* Settings */}
                            <div className="w-full">
                                <SettingsDialog>
                                    <Button
                                        variant="ghost"
                                        className="w-full justify-start gap-4 text-lg h-12 px-4 shadow-none hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                                        style={{ color: contentColor }}
                                    >
                                        <Settings className="h-5 w-5" />
                                        Settings
                                    </Button>
                                </SettingsDialog>
                            </div>

                            {/* Sign Out */}
                            <Button
                                variant="ghost"
                                className="w-full justify-start gap-4 text-lg h-12 px-4 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                                onClick={handleSignOut}
                                disabled={signingOut}
                                style={{ color: contentColor }}
                            >
                                <LogOut className="h-5 w-5" />
                                {signingOut ? 'Signing Out...' : 'Sign Out'}
                            </Button>
                        </div>

                        <div className="w-full pt-4">
                            <div className="rounded-xl border p-5 bg-background/5 backdrop-blur-sm space-y-5" style={{ borderColor: contentColor === '#ffffff' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)' }}>
                                <h3 className="font-semibold text-lg">Subscription</h3>
                                {hasPremiumAccess ? (
                                    <div className="space-y-4">
                                        <SubscriptionExpiryWarning showCard={true} />
                                        <SubscriptionDetailsCard />
                                    </div>
                                ) : (
                                    <UpgradeCard />
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    )
}
