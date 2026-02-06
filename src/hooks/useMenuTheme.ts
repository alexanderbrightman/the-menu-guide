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

    const primaryTextClass = isDarkBackground ? 'text-white' : 'text-black'
    const secondaryTextClass = isDarkBackground ? 'text-white' : 'text-black'
    const mutedTextClass = isDarkBackground ? 'text-white/80' : 'text-black'

    const accentButtonClass = isDarkBackground
        ? 'border border-white/90 bg-transparent !text-white hover:bg-white/15 rounded-lg'
        : 'border border-black bg-transparent !text-black hover:bg-slate-100 rounded-lg'

    const outlineButtonClass = isDarkBackground
        ? 'border border-white/60 bg-transparent !text-white hover:bg-white/10 rounded-lg'
        : 'border border-black bg-transparent !text-black hover:bg-slate-100 rounded-lg'

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
