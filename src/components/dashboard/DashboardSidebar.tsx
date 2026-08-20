'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { SettingsDialog } from '@/components/profile/SettingsDialog'
import { QrCodeDialog } from '@/components/dashboard/QrCodeDialog'
import { Utensils, Plus, FolderPlus, Scan, Edit, Settings, LogOut, QrCode, Wine, UtensilsCrossed } from 'lucide-react'
import { Profile } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'
import { getThemedGlassSidebarStyle } from '@/lib/glass-styles'

interface DashboardSidebarProps {
    profile: Profile | null
    user: User | null
    activeView?: string
    onViewMenu: () => void
    onOpenPublicMenu: () => void
    onNewItem: () => void
    onNewCategory: () => void
    onScanMenu: () => void
    onHappyHour: () => void
    onPreFixe: () => void
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
    activeView,
    onViewMenu,
    onOpenPublicMenu,
    onNewItem,
    onNewCategory,
    onScanMenu,
    onHappyHour,
    onPreFixe,
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
        'happy-hour': '#FF006E',   // Pink
        'pre-fixe': '#FB5607',     // Orange
        'edit-profile': '#3A86FF', // Blue
        'settings': '#38B000',     // Green
        'qr-code': '#00BBF9',      // Cyan
        'sign-out': '#FF3B30',     // Red
    }

    const navItems: NavItem[] = [
        {
            id: 'view-menu',
            label: 'Menu',
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
            id: 'happy-hour',
            label: 'Promotions',
            icon: <Wine className={iconClass} />,
            onClick: onHappyHour,
        },
        {
            id: 'pre-fixe',
            label: 'Pre Fixe',
            icon: <UtensilsCrossed className={iconClass} />,
            onClick: onPreFixe,
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
        ? 'text-[11px] font-medium uppercase tracking-[0.08em] text-white/45'
        : 'text-[11px] font-medium uppercase tracking-[0.08em] text-black/35'

    const hairline = isDarkBackground ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)'
    const hoverBg = isDarkBackground ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'
    const appleFont = '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif'



    const handleNavClick = (item: NavItem) => {
        setActiveItem(item.id)
        item.onClick()
    }

    // Sync active highlight from parent view
    useEffect(() => {
        if (activeView === 'menu') setActiveItem('view-menu')
        else if (activeView === 'happy-hour') setActiveItem('happy-hour')
        else if (activeView === 'pre-fixe') setActiveItem('pre-fixe')
    }, [activeView])

    const rowClass = `
            w-full flex items-center gap-3 px-3.5 py-[11px] text-[15px] font-medium rounded-xl
            transition-colors duration-150 cursor-pointer relative group hover:bg-[var(--row-hover)]
        `

    const renderNavButton = (item: NavItem) => {
        const isActive = activeItem === item.id
        const itemColor = navItemColors[item.id] || contrastColor

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
            className: rowClass,
            style: {
                fontFamily: appleFont,
                letterSpacing: '-0.011em',
                ['--row-hover' as string]: hoverBg,
                backgroundColor: isActive ? hoverBg : undefined,
            } as React.CSSProperties,
        }

        if (item.isDialog && item.id === 'settings') {
            return (
                <SettingsDialog key={item.id} listenForGlobalOpen>
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
                className={rowClass}
                style={{
                    fontFamily: appleFont,
                    letterSpacing: '-0.011em',
                    ['--row-hover' as string]: hoverBg,
                    backgroundColor: isActive ? hoverBg : undefined,
                } as React.CSSProperties}
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
        <aside className="hidden lg:flex flex-col w-[292px] min-w-[292px] h-screen sticky top-0 p-3">
            <div
                className="flex flex-col h-full min-h-0 overflow-hidden rounded-[24px]"
                style={{ ...getThemedGlassSidebarStyle(isDarkBackground), color: contrastColor }}
            >
            {/* Profile Section - opens the public restaurant page */}
            <div
                className="px-4 pt-6 pb-5"
                style={{ borderBottom: `0.5px solid ${hairline}` }}
            >
                <button
                    type="button"
                    onClick={onOpenPublicMenu}
                    title="View your public restaurant page"
                    className="group flex items-center gap-3 w-full text-left rounded-2xl px-2 py-1.5 transition-colors hover:bg-[var(--row-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-current"
                    style={{ ['--row-hover' as string]: hoverBg } as React.CSSProperties}
                >
                    {profile?.avatar_url ? (
                        <div
                            className="relative h-11 w-11 overflow-hidden rounded-full flex-shrink-0"
                            style={{ boxShadow: `0 0 0 0.5px ${hairline}` }}
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
                            className="h-11 w-11 rounded-full flex items-center justify-center text-base font-semibold flex-shrink-0"
                            style={{
                                backgroundColor: isDarkBackground ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)',
                                color: contrastColor,
                            }}
                        >
                            {(profile?.display_name || 'U')[0].toUpperCase()}
                        </div>
                    )}
                    <div className="min-w-0">
                        <p
                            className="text-[15px] font-semibold truncate"
                            style={{ color: contrastColor, fontFamily: appleFont, letterSpacing: '-0.016em' }}
                        >
                            {profile?.display_name || 'Your Restaurant'}
                        </p>
                        <p
                            className="text-[12px] truncate"
                            style={{ color: contrastColor, opacity: 0.5, fontFamily: appleFont }}
                        >
                            View public page
                        </p>
                    </div>
                </button>
            </div>

            {/* Navigation Section */}
            <div className="flex-1 min-h-0 overflow-y-auto px-2.5 py-5">
                <p className={`px-3.5 mb-1.5 ${sectionLabelClass}`}>
                    Menu
                </p>
                <nav className="space-y-0.5">
                    {navItems.slice(0, 4).map(renderNavButton)}
                </nav>

                <p className={`px-3.5 mt-6 mb-1.5 ${sectionLabelClass}`}>
                    Promotions
                </p>
                <nav className="space-y-0.5">
                    {navItems.slice(4, 6).map(renderNavButton)}
                </nav>

                <p className={`px-3.5 mt-6 mb-1.5 ${sectionLabelClass}`}>
                    Account
                </p>
                <nav className="space-y-0.5">
                    {navItems.slice(6).map(renderNavButton)}
                    <QrCodeDialog
                        qrCodeUrl={qrCodeUrl}
                        menuLink={menuLink}
                        profileUsername={profile?.username || ''}
                        isDarkBackground={isDarkBackground}
                        contrastColor={contrastColor}
                        onDownload={onDownloadQr}
                    >
                        {renderCustomButton(
                            'qr-code',
                            <QrCode className="h-5 w-5 flex-shrink-0" />,
                            'QR Code',
                            () => setActiveItem('qr-code')
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

            <div className="w-full">
                <Image
                    src="/CarolLogo.png"
                    alt="Carol Logo"
                    width={260}
                    height={260}
                    className={`w-full h-auto block ${isDarkBackground ? 'invert' : ''}`}
                />
                <p
                    className="text-[11px] text-center pt-2 pb-5"
                    style={{ color: contrastColor, opacity: 0.45, fontFamily: appleFont }}
                >
                    Thanks for using The Menu Guide :)
                </p>
            </div>
            </div>
        </aside>
    )
}
