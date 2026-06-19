import type { CSSProperties } from 'react'

/**
 * Single source of truth for the app's liquid-glass look.
 * Every frosted surface on the home page (cards, tab switcher, header
 * pills, search island, and the search FAB) shares this exact
 * translucency so the UI reads as one consistent material.
 */
export const glassTokens = {
  /** Frosted white fill — matches the floating search button. */
  bg: 'rgba(255, 255, 255, 0.65)',
  blur: '24px',
  /** Vibrancy: richens the colors showing through the glass. */
  saturate: '180%',
  border: 'rgba(255, 255, 255, 0.5)',
  shadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06)',
  shadowLg: '0 4px 24px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)',
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

export const glassFabStyle: CSSProperties = { ...glassStyle, boxShadow: glassTokens.shadowLg }

/** Tailwind equivalents of {@link glassStyle} for class-based surfaces. */
const GLASS_CLASS = 'bg-white/65 backdrop-blur-[24px] backdrop-saturate-[1.8] border border-white/50'

export const glassClasses = {
  card: `${GLASS_CLASS} shadow-sm`,
  panel: `${GLASS_CLASS} shadow-sm`,
  tab: GLASS_CLASS,
  fab: `${GLASS_CLASS} shadow-lg`,
}
