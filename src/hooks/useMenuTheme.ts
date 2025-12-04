import { useMemo } from 'react'
import { Profile } from '@/lib/supabase'
import { getContrastColor } from '@/lib/utils'
import { DEFAULT_MENU_FONT, DEFAULT_MENU_BACKGROUND_COLOR, FONT_FAMILY_MAP } from '@/lib/fonts'

export function useMenuTheme(profile: Profile | null) {
    const menuFont = profile?.menu_font || DEFAULT_MENU_FONT
    const menuBackgroundColor = profile?.menu_background_color || DEFAULT_MENU_BACKGROUND_COLOR

    const contrastColor = useMemo(() => getContrastColor(menuBackgroundColor), [menuBackgroundColor])
    const isDarkBackground = contrastColor === '#ffffff'

    const menuFontFamily = useMemo(
        () => FONT_FAMILY_MAP[menuFont] ?? menuFont,
        [menuFont]
    )

    const primaryTextClass = isDarkBackground ? 'text-white' : 'text-slate-900'
    const secondaryTextClass = isDarkBackground ? 'text-gray-100/90' : 'text-slate-600'
    const mutedTextClass = isDarkBackground ? 'text-gray-200/80' : 'text-slate-500'

    const accentButtonClass = isDarkBackground
        ? 'border border-white/90 bg-transparent !text-white hover:bg-white/15'
        : 'border border-slate-900 bg-transparent !text-slate-900 hover:bg-slate-100'

    const outlineButtonClass = isDarkBackground
        ? 'border border-white/60 bg-transparent !text-white hover:bg-white/10'
        : 'border border-slate-400 bg-transparent !text-slate-900 hover:bg-slate-100'

    const focusRingClass = isDarkBackground
        ? 'focus-visible:ring-white/60 focus-visible:ring-offset-white/5'
        : 'focus-visible:ring-gray-800/25 focus-visible:ring-offset-gray-100'

    const getBorderColor = () => {
        return isDarkBackground ? 'border-white' : 'border-black'
    }

    return {
        menuFont,
        menuBackgroundColor,
        contrastColor,
        isDarkBackground,
        menuFontFamily,
        primaryTextClass,
        secondaryTextClass,
        mutedTextClass,
        accentButtonClass,
        outlineButtonClass,
        focusRingClass,
        getBorderColor,
    }
}
