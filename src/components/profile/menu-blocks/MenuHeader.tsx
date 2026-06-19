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
    message,
    theme,
}: MenuHeaderProps) {
    const {
        getBorderColor,
        isDarkBackground,
    } = theme

    return (
        <header className="space-y-4 sm:space-y-6">
            <div className="flex flex-col items-center text-center space-y-3 sm:space-y-4">
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
                    {/* Header content moved to Dashboard frame */}
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
