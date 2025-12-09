import Image from 'next/image'
import { Scan, Edit, Link2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SettingsDialog } from '@/components/profile/SettingsDialog'
import { Profile } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'
import { useMenuTheme } from '@/hooks/useMenuTheme'

interface MenuHeaderProps {
    profile: Profile | null
    user: User | null
    onEditProfile?: () => void
    onScanMenu: () => void
    onNewCategory: () => void
    onNewItem: () => void
    message: string
    theme: ReturnType<typeof useMenuTheme>
}

export function MenuHeader({
    profile,
    user,
    onEditProfile,
    onScanMenu,
    onNewCategory,
    onNewItem,
    message,
    theme,
}: MenuHeaderProps) {
    const {
        menuFontFamily,
        primaryTextClass,
        outlineButtonClass,
        getBorderColor,
        isDarkBackground,
    } = theme

    const usernameLink =
        typeof window !== 'undefined' && profile?.username
            ? `${window.location.origin}/menu/${profile.username}`
            : null

    return (
        <header className="space-y-4 sm:space-y-6">
            <div className="flex flex-col items-center text-center space-y-3 sm:space-y-4">
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
                    {profile?.avatar_url && (
                        <Image
                            src={profile.avatar_url}
                            alt={profile.display_name || 'Menu photo'}
                            width={120}
                            height={120}
                            className="object-cover h-20 w-20 sm:h-24 sm:w-24"
                        />
                    )}
                    <h1
                        className={`font-bold leading-tight ${primaryTextClass}`}
                        style={{ fontSize: 'clamp(28px, 5vw, 42px)', fontFamily: menuFontFamily }}
                    >
                        {profile?.display_name || 'Your Restaurant'}
                    </h1>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 md:gap-4 w-full px-4">
                    {user && (
                        <Button
                            variant="outline"
                            size="sm"
                            className={`${outlineButtonClass} flex items-center gap-[3px] border ${getBorderColor()}`}
                            onClick={onScanMenu}
                        >
                            <Scan className="h-4 w-4" />
                            <span className="hidden sm:inline">Scan Menu</span>
                            <span className="sm:hidden">Scan</span>
                        </Button>
                    )}
                    {onEditProfile && (
                        <Button
                            variant="outline"
                            size="sm"
                            className={`${outlineButtonClass} flex items-center gap-[3px] border ${getBorderColor()}`}
                            onClick={onEditProfile}
                        >
                            <Edit className="h-4 w-4" />
                            <span className="hidden sm:inline">Edit Profile</span>
                            <span className="sm:hidden">Edit</span>
                        </Button>
                    )}
                    <SettingsDialog triggerClassName={`${outlineButtonClass} flex items-center gap-[3px] border ${getBorderColor()}`} />
                    {usernameLink && (
                        <Button
                            variant="outline"
                            size="sm"
                            className={`${outlineButtonClass} flex items-center gap-[3px] border ${getBorderColor()}`}
                            onClick={() => window.open(usernameLink, '_blank')}
                        >
                            <Link2 className="h-4 w-4" />
                            <span className="hidden sm:inline">View Menu</span>
                            <span className="sm:hidden">Menu</span>
                        </Button>
                    )}
                    <Button
                        variant="outline"
                        size="sm"
                        className={`${outlineButtonClass} flex items-center gap-[3px] border ${getBorderColor()}`}
                        onClick={onNewCategory}
                    >
                        <Plus className="h-4 w-4" />
                        <span className="hidden sm:inline">New Category</span>
                        <span className="sm:hidden">Category</span>
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className={`${outlineButtonClass} flex items-center gap-[3px] border ${getBorderColor()}`}
                        onClick={onNewItem}
                    >
                        <Plus className="h-4 w-4" />
                        <span className="hidden sm:inline">New Item</span>
                        <span className="sm:hidden">Item</span>
                    </Button>
                </div>

                {message && (
                    <div
                        className={`max-w-2xl border px-4 py-3 text-sm sm:text-base font-medium rounded-md shadow-sm ${getBorderColor()} ${message.toLowerCase().includes('error')
                            ? isDarkBackground
                                ? 'bg-red-900/30 text-red-100'
                                : 'bg-red-50 text-red-800'
                            : isDarkBackground
                                ? 'bg-emerald-900/30 text-emerald-100'
                                : 'bg-emerald-50 text-emerald-800'
                            }`}
                        role="status"
                        aria-live="polite"
                    >
                        {message}
                    </div>
                )}
            </div>
        </header>
    )
}
