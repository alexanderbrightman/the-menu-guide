import type { CSSProperties } from 'react'

/**
 * Single source of truth for the app's liquid-glass look.
 * Every frosted surface (modal islands, tab switcher, header pills,
 * search island, FAB) shares this translucency so the UI reads as
 * one consistent material — transparent enough to show context,
 * frosted enough to keep text readable.
 */
export const glassTokens = {
  /** Translucent white fill — lets the scene show through. */
  bg: 'rgba(255, 255, 255, 0.38)',
  /** Stronger frost compensates for the lighter fill. */
  blur: '40px',
  /** Vibrancy: richens the colors showing through the glass. */
  saturate: '180%',
  /** Specular rim highlight. */
  border: 'rgba(255, 255, 255, 0.55)',
  shadow: '0 1px 3px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.08)',
  shadowLg: '0 4px 28px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.06)',
} as const

const glassFilter = `blur(${glassTokens.blur}) saturate(${glassTokens.saturate})`

/** The canonical glass surface. Spread this onto any frosted element. */
export const glassStyle: CSSProperties = {
  background: glassTokens.bg,
  backdropFilter: glassFilter,
  WebkitBackdropFilter: glassFilter,
  border: `0.5px solid ${glassTokens.border}`,
  boxShadow: glassTokens.shadow,
}

export const glassCardStyle: CSSProperties = { ...glassStyle }

export const glassPanelStyle: CSSProperties = { ...glassStyle }

/**
 * Description island on menu item popups. 80% opaque so body copy stays
 * readable over the photo / blur without changing the rest of the glass UI.
 */
export const modalDescriptionGlassStyle: CSSProperties = {
  ...glassStyle,
  background: 'rgba(255, 255, 255, 0.8)',
}

/** Glass card that stays readable on light and dark menu backgrounds. */
export function getThemedGlassCardStyle(isDarkBackground: boolean): CSSProperties {
  if (isDarkBackground) {
    return {
      background: 'rgba(255,255,255,0.12)',
      backdropFilter: glassFilter,
      WebkitBackdropFilter: glassFilter,
      border: '0.5px solid rgba(255,255,255,0.22)',
      boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
    }
  }
  return glassCardStyle
}

/** Themed variant of {@link modalDescriptionGlassStyle} for public/private menu overlays. */
export function getThemedModalDescriptionGlassStyle(isDarkBackground: boolean): CSSProperties {
  if (isDarkBackground) {
    return {
      ...getThemedGlassCardStyle(true),
      background: 'rgba(26, 26, 26, 0.8)',
    }
  }
  return modalDescriptionGlassStyle
}

/** Top-row pills (restaurant, hours, close, share) — same fill as the description island. */
export const getModalChromeGlassStyle = getThemedModalDescriptionGlassStyle

export const glassFabStyle: CSSProperties = { ...glassStyle, boxShadow: glassTokens.shadowLg }

/**
 * Large sliding panels (site menu, dashboard sidebar). Slightly denser than
 * a card so form text stays readable, with a specular inner edge.
 */
export const glassSidebarStyle: CSSProperties = {
  background: 'rgba(255, 255, 255, 0.58)',
  backdropFilter: glassFilter,
  WebkitBackdropFilter: glassFilter,
  border: `0.5px solid ${glassTokens.border}`,
  boxShadow: `${glassTokens.shadowLg}, inset 0 1px 0 rgba(255,255,255,0.72)`,
}

export function getThemedGlassSidebarStyle(isDarkBackground: boolean): CSSProperties {
  if (isDarkBackground) {
    return {
      background: 'rgba(28, 28, 30, 0.58)',
      backdropFilter: glassFilter,
      WebkitBackdropFilter: glassFilter,
      border: '0.5px solid rgba(255,255,255,0.18)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.14)',
    }
  }
  return glassSidebarStyle
}

/** Tailwind equivalents of {@link glassStyle} for class-based surfaces. */
const GLASS_CLASS =
  'bg-white/40 backdrop-blur-[40px] backdrop-saturate-[1.8] border border-white/55'

export const glassClasses = {
  card: `${GLASS_CLASS} shadow-sm`,
  panel: `${GLASS_CLASS} shadow-sm`,
  tab: GLASS_CLASS,
  fab: `${GLASS_CLASS} shadow-lg`,
}

/**
 * Overlay chrome offset. The fullscreen shell is expanded by the safe-area
 * insets and is the containing block for these fixed controls (`contain:
 * layout`), so adding the inset again lands share/close/pills on the safe
 * side of the status bar — never in it, never flush to the screen.
 * 0.5rem / 0.75rem matches landing header spacing (pt-2 / px-3).
 */
export const modalChromeTop = 'calc(env(safe-area-inset-top, 0px) + 0.5rem)'
export const modalChromeLeft = 'calc(env(safe-area-inset-left, 0px) + 0.75rem)'
export const modalChromeRight = 'calc(env(safe-area-inset-right, 0px) + 0.75rem)'

/**
 * Top padding for fullscreen modal content columns so islands clear the
 * fixed close / restaurant chrome with the same 1rem gap used between islands.
 * Chrome: 0.5rem offset + 2.75rem (h-11) + 1rem gap = 4.25rem (+ safe area).
 */
export const modalContentTopPadClass =
  'pt-[calc(env(safe-area-inset-top,0px)+4.25rem)]'

/**
 * Bottom padding so modal content can scroll under iOS Safari’s translucent
 * toolbar (similar to public profile), with safe-area for the home indicator.
 */
export const modalContentBottomPadClass =
  'pb-[calc(env(safe-area-inset-bottom,0px)+5.5rem)]'

/** Soft lift for floating images (no glass rim). */
export const floatingImageShadow =
  '0 1px 3px rgba(0,0,0,0.08), 0 6px 20px rgba(0,0,0,0.10)'
