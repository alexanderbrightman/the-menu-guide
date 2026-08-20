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
    const { isDarkBackground } = theme
    if (!message) return null

    const isError = message.toLowerCase().includes('error')

    return (
        <div
            className="mb-4 rounded-[12px] px-4 py-3 text-[13px] font-medium tracking-tight"
            style={{
                backgroundColor: isError
                    ? isDarkBackground ? 'rgba(255,59,48,0.18)' : 'rgba(255,59,48,0.10)'
                    : isDarkBackground ? 'rgba(52,199,89,0.18)' : 'rgba(52,199,89,0.12)',
                color: isError
                    ? isDarkBackground ? '#FF8A80' : '#C41E12'
                    : isDarkBackground ? '#7DFFA6' : '#1B7A3A',
            }}
            role="status"
            aria-live="polite"
        >
            {message}
        </div>
    )
}
