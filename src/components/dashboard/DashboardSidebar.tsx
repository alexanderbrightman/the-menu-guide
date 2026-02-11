'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { SettingsDialog } from '@/components/profile/SettingsDialog'
import { QrCodeDialog } from '@/components/dashboard/QrCodeDialog'
import { Utensils, Plus, FolderPlus, Scan, Edit, Settings, LogOut, QrCode } from 'lucide-react'
import { Profile } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'

interface DashboardSidebarProps {
    profile: Profile | null
    user: User | null
    onViewMenu: () => void
    onNewItem: () => void
    onNewCategory: () => void
    onScanMenu: () => void
    onEditProfile: () => void
    onSignOut: () => Promise<void>
    signingOut: boolean
    qrCodeUrl: string | null
    menuLink: string
    onDownloadQr: () => void
    outlineButtonClass: string
    backgroundColor: string
    contrastColor: string
    isDarkBackground: boolean
    borderColorClass: string
}

interface NavItem {
    id: string
    label: string
    icon: React.ReactNode
    onClick: () => void
    isDialog?: boolean
}

export function DashboardSidebar({
    profile,
    user,
    onViewMenu,
    onNewItem,
    onNewCategory,
    onScanMenu,
    onEditProfile,
    onSignOut,
    signingOut,
    qrCodeUrl,
    menuLink,
    onDownloadQr,
    outlineButtonClass,
    backgroundColor,
    contrastColor,
    isDarkBackground,
    borderColorClass,
}: DashboardSidebarProps) {
    const [activeItem, setActiveItem] = useState<string>('')

    const iconClass = 'h-5 w-5 flex-shrink-0'

    // Allergen colors mapped to nav items
    // Vibrant palette mapped to nav items
    const navItemColors: Record<string, string> = {
        'view-menu': '#FFBE0B',    // Amber
        'add-item': '#FB5607',     // Orange
        'add-category': '#FF006E', // Pink
        'scan-menu': '#8338EC',    // Purple
        'edit-profile': '#3A86FF', // Blue
        'settings': '#38B000',     // Green
        'qr-code': '#00BBF9',      // Cyan
        'sign-out': '#FF3B30',     // Red
    }

    const navItems: NavItem[] = [
        {
            id: 'view-menu',
            label: 'View Menu',
            icon: <Utensils className={iconClass} />,
            onClick: onViewMenu,
        },
        {
            id: 'add-item',
            label: 'Add Menu Item',
            icon: <Plus className={iconClass} />,
            onClick: onNewItem,
        },
        {
            id: 'add-category',
            label: 'Add Category',
            icon: <FolderPlus className={iconClass} />,
            onClick: onNewCategory,
        },
        {
            id: 'scan-menu',
            label: 'Scan Menu',
            icon: <Scan className={iconClass} />,
            onClick: onScanMenu,
        },
        {
            id: 'edit-profile',
            label: 'Edit Profile',
            icon: <Edit className={iconClass} />,
            onClick: onEditProfile,
        },
        {
            id: 'settings',
            label: 'Settings',
            icon: <Settings className={iconClass} />,
            onClick: () => { },
            isDialog: true,
        },
    ]

    const sectionLabelClass = isDarkBackground
        ? 'text-white/50'
        : 'text-gray-400'



    const handleNavClick = (item: NavItem) => {
        setActiveItem(item.id)
        item.onClick()
    }

    const renderNavButton = (item: NavItem) => {
        const isActive = activeItem === item.id
        const itemColor = navItemColors[item.id] || contrastColor

        const baseClasses = `
            w-full flex items-center gap-3 px-4 py-3 text-base font-medium rounded-lg
            transition-all duration-150 cursor-pointer relative group
        `

        const buttonContent = (
            <>
                <span
                    className="transition-colors duration-200"
                    style={{
                        color: contrastColor,
                        // @ts-ignore
                        '--icon-hover-color': itemColor
                    }}
                >
                    {/* Using a wrapper to apply hover color via CSS variable */}
                    <span className="group-hover:text-[var(--icon-hover-color)] transition-colors duration-200">
                        {item.icon}
                    </span>
                </span>
                <span style={{ color: contrastColor, transition: 'color 0.2s ease' }}>
                    {item.label}
                </span>
            </>
        )

        const buttonProps = {
            className: baseClasses,
        }

        if (item.isDialog && item.id === 'settings') {
            return (
                <SettingsDialog key={item.id}>
                    <button
                        {...buttonProps}
                    >
                        {buttonContent}
                    </button>
                </SettingsDialog>
            )
        }

        return (
            <button
                key={item.id}
                {...buttonProps}
                onClick={() => handleNavClick(item)}
            >
                {buttonContent}
            </button>
        )
    }

    // Helper for QR Code and Sign Out buttons since they are outside the navItems array
    const renderCustomButton = (id: string, icon: React.ReactNode, label: React.ReactNode, onClick: () => void, disabled = false) => {
        const isActive = activeItem === id
        const itemColor = navItemColors[id] || contrastColor

        return (
            <button
                className={`
                    w-full flex items-center gap-3 px-4 py-3 text-base font-medium rounded-lg
                    transition-all duration-150 cursor-pointer relative group
                `}
                onClick={() => {
                    setActiveItem(id)
                    onClick()
                }}
                disabled={disabled}
            >
                <span
                    className="transition-colors duration-200"
                    style={{
                        color: contrastColor,
                        // @ts-ignore
                        '--icon-hover-color': itemColor
                    }}
                >
                    <span className="group-hover:text-[var(--icon-hover-color)] transition-colors duration-200">
                        {icon}
                    </span>
                </span>
                <span style={{ color: contrastColor, transition: 'color 0.2s ease' }}>
                    {label}
                </span>
            </button>
        )
    }

    return (
        <aside
            className="hidden lg:flex flex-col w-[280px] min-w-[280px] h-screen sticky top-0 border-r overflow-y-auto"
            style={{
                backgroundColor,
                color: contrastColor,
                borderColor: contrastColor, // Use high contrast border color
            }}
        >
            {/* Profile Section */}
            <div
                className="px-5 pt-8 pb-6 border-b"
                style={{ borderColor: contrastColor }} // Explicit border color
            >
                <div className="flex items-center gap-3">
                    {profile?.avatar_url ? (
                        <div
                            className="relative h-12 w-12 overflow-hidden rounded-full border flex-shrink-0"
                            style={{ borderColor: contrastColor }}
                        >
                            <Image
                                src={profile.avatar_url}
                                alt={profile.display_name || 'Profile'}
                                fill
                                className="object-cover"
                            />
                        </div>
                    ) : (
                        <div
                            className="h-12 w-12 rounded-full border flex items-center justify-center text-base font-semibold flex-shrink-0"
                            style={{
                                backgroundColor: isDarkBackground ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)',
                                color: contrastColor,
                                borderColor: contrastColor,
                            }}
                        >
                            {(profile?.display_name || 'U')[0].toUpperCase()}
                        </div>
                    )}
                    <div className="min-w-0">
                        <p className="text-lg font-semibold truncate" style={{ color: contrastColor }}>
                            {profile?.display_name || 'Your Restaurant'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Navigation Section */}
            <div className="px-3 py-6">
                <p className={`text-sm font-semibold uppercase tracking-wider px-4 mb-3 ${sectionLabelClass}`}>
                    Menu
                </p>
                <nav className="space-y-1">
                    {navItems.slice(0, 4).map(renderNavButton)}
                </nav>

                <p className={`text-sm font-semibold uppercase tracking-wider px-4 mt-8 mb-3 ${sectionLabelClass}`}>
                    Account
                </p>
                <nav className="space-y-1">
                    {navItems.slice(4).map(renderNavButton)}
                    <QrCodeDialog
                        qrCodeUrl={qrCodeUrl}
                        menuLink={menuLink}
                        profileUsername={profile?.username || ''}
                        isDarkBackground={isDarkBackground}
                        contrastColor={contrastColor}
                        outlineButtonClass={outlineButtonClass}
                        onDownload={onDownloadQr}
                    >
                        {/* We need to wrap the custom button in a div or fragment because QrCodeDialog expects a trigger */}
                        {/* Actually QrCodeDialog uses cloneElement or just renders children, let's treat it as a trigger */}
                        {renderCustomButton(
                            'qr-code',
                            <QrCode className="h-5 w-5 flex-shrink-0" />,
                            'QR Code',
                            () => { } // Dialog handles the click usually, but we need to set active state. 
                            // The QrCodeDialog likely passes onClick to its child.
                            // To be safe, we wrap the button logic inside the trigger
                        )}
                    </QrCodeDialog>
                    {renderCustomButton(
                        'sign-out',
                        <LogOut className="h-5 w-5 flex-shrink-0" />,
                        signingOut ? 'Signing Out...' : 'Sign Out',
                        onSignOut,
                        signingOut
                    )}
                </nav>
            </div>

            {/* Logo */}

            <div className="mt-auto w-full">
                <Image
                    src="/CarolLogo.png"
                    alt="Carol Logo"
                    width={260}
                    height={260}
                    className={`w-full h-auto block ${isDarkBackground ? 'invert' : ''}`}
                />
                <p className="text-xs text-center pt-4 pb-8" style={{ color: contrastColor }}>
                    Thanks for using The Menu Guide :)
                </p>
            </div>
        </aside>
    )
}
