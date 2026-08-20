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
    const secondaryTextClass = isDarkBackground ? 'text-white/75' : 'text-black/65'
    const mutedTextClass = isDarkBackground ? 'text-white/45' : 'text-black/40'

    const hairline = isDarkBackground ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.08)'
    const fill = isDarkBackground ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.05)'
    const fillHover = isDarkBackground ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.09)'

    const chipClass = isDarkBackground
        ? 'rounded-full border-0 bg-white/10 !text-white hover:bg-white/16'
        : 'rounded-full border-0 bg-black/[0.06] !text-black hover:bg-black/[0.10]'

    const groupedClass = isDarkBackground
        ? 'rounded-[12px] border-0 bg-white/10'
        : 'rounded-[12px] border-0 bg-black/[0.05]'

    const labelClass = isDarkBackground
        ? 'text-[13px] font-medium text-white/65'
        : 'text-[13px] font-medium text-black/55'

    const accentButtonClass = isDarkBackground
        ? 'border-0 bg-white text-black hover:bg-white/90 rounded-full'
        : 'border-0 bg-black text-white hover:bg-black/85 rounded-full'

    const outlineButtonClass = chipClass

    const fieldClass = isDarkBackground
        ? 'h-11 rounded-[10px] border-0 bg-white/10 text-white placeholder:text-white/35 shadow-none focus-visible:ring-2 focus-visible:ring-white/30'
        : 'h-11 rounded-[10px] border-0 bg-black/[0.05] text-black placeholder:text-black/35 shadow-none focus-visible:ring-2 focus-visible:ring-black/15'

    const focusRingClass = isDarkBackground
        ? 'focus-visible:ring-white/60 focus-visible:ring-offset-white/5'
        : 'focus-visible:ring-gray-800/25 focus-visible:ring-offset-gray-100'

    const getBorderColor = () => {
        return isDarkBackground ? 'border-white/15' : 'border-black/10'
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
        hairline,
        fill,
        fillHover,
        chipClass,
        groupedClass,
        labelClass,
        accentButtonClass,
        outlineButtonClass,
        fieldClass,
        focusRingClass,
        getBorderColor,
    }
}
