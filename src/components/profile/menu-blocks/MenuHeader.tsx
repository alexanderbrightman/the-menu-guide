import Image from 'next/image'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Profile } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'
import { useMenuTheme } from '@/hooks/useMenuTheme'

interface MenuHeaderProps {
    profile: Profile | null
    user: User | null
    onNewCategory: () => void
    onNewItem: () => void
    message: string
    theme: ReturnType<typeof useMenuTheme>
}

export function MenuHeader({
    profile,
    user,
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
                    {/* Header content moved to Dashboard frame */}
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 md:gap-4 w-full px-4">

                    <Button
                        variant="outline"
                        size="sm"
                        className={`${outlineButtonClass} flex items-center gap-[3px] border ${getBorderColor()} rounded-lg`}
                        onClick={onNewCategory}
                    >
                        <Plus className="h-4 w-4" />
                        <span className="hidden sm:inline">New Category</span>
                        <span className="sm:hidden">Category</span>
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className={`${outlineButtonClass} flex items-center gap-[3px] border ${getBorderColor()} rounded-lg`}
                        onClick={onNewItem}
                    >
                        <Plus className="h-4 w-4" />
                        <span className="hidden sm:inline">New Item</span>
                        <span className="sm:hidden">Item</span>
                    </Button>
                </div>

                {message && (
                    <div
                        className={`max-w-2xl border px-4 py-3 text-sm sm:text-base font-medium rounded-lg shadow-sm ${getBorderColor()} ${message.toLowerCase().includes('error')
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
