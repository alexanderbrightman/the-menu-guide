'use client'

import { useLayoutEffect, useRef, useState, type MutableRefObject } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { DISCOVER_TAB_GRID_CLASS } from '@/components/landing/DiscoverLayout'

export type HomeTab = 'specials' | 'happy-hour' | 'prefxe'

export const HOME_TABS: { id: HomeTab; label: string; shortLabel: string }[] = [
  { id: 'specials', label: 'Local Specials', shortLabel: 'Specials' },
  { id: 'happy-hour', label: 'Promotions', shortLabel: 'Promotions' },
  { id: 'prefxe', label: 'Pre Fixe', shortLabel: 'Pre Fixe' },
]

export const HOME_DOCK_SIZE = 44
export const HOME_COMPACT_SIZE = 40
export const HOME_DOCK_RADIUS = 999

const APPLE_FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif'
const LETTER_SPACING = '-0.025em'
const MD_BREAKPOINT = 768
const LG_BREAKPOINT = 1024
const LABEL_WEIGHT = 400

type PillFit = { font: number; pad: number; gap: number; mins: number[] }

function comfortableFit(desktop: boolean): PillFit {
  return desktop
    ? { font: 16, pad: 12, gap: 6, mins: [0, 0, 0] }
    : { font: 13, pad: 4, gap: 4, mins: [0, 0, 0] }
}

function labelsFor(desktop: boolean) {
  return HOME_TABS.map((tab) => (desktop ? tab.label : tab.shortLabel))
}

/**
 * Largest font + padding whose three labels plus gaps still fit `available`.
 * Extra slot width is shared via flex-grow, not by shrinking "Promotions".
 */
function fitPills(available: number, desktop: boolean, measure: (text: string, font: number) => number): PillFit {
  const labels = labelsFor(desktop)
  const fonts = desktop ? [16, 15, 14, 13, 12, 11] : [14, 13, 12, 11]
  const pads = desktop ? [12, 10, 8, 6, 4] : [8, 6, 4]
  const gap = desktop ? 6 : 4
  const budget = Math.max(0, available - 1)

  for (const font of fonts) {
    const textWidths = labels.map((label) => Math.ceil(measure(label, font)))
    for (const pad of pads) {
      const mins = textWidths.map((width) => width + pad * 2)
      const minSum = mins.reduce((sum, width) => sum + width, 0)
      if (minSum + gap * (HOME_TABS.length - 1) <= budget) {
        return { font, pad, gap, mins }
      }
    }
  }

  const textWidths = labels.map((label) => Math.ceil(measure(label, 11)))
  return {
    font: 11,
    pad: 4,
    gap,
    mins: textWidths.map((width) => width + 8),
  }
}

function sameFit(a: PillFit, b: PillFit) {
  return (
    a.font === b.font &&
    a.pad === b.pad &&
    a.gap === b.gap &&
    a.mins.length === b.mins.length &&
    a.mins.every((min, index) => min === b.mins[index])
  )
}

interface HomeTabSwitcherProps {
  activeTab: HomeTab
  onTabChange: (tab: HomeTab) => void
  /**
   * `compact` — header labels that hug their words.
   * `spread` — larger separate labels with space between them (desktop).
   */
  variant?: 'compact' | 'spread'
  /** Flip the compact labels backward; search occupies this same slot. */
  folded?: boolean
  /** Label spans in tab order — Header measures them for the chrome track. */
  labelRefs?: MutableRefObject<(HTMLSpanElement | null)[]>
  className?: string
}

export function HomeTabSwitcher({
  activeTab,
  onTabChange,
  variant = 'spread',
  folded = false,
  labelRefs,
  className,
}: HomeTabSwitcherProps) {
  const listRef = useRef<HTMLDivElement>(null)
  const [desktop, setDesktop] = useState(false)
  const [columnLayout, setColumnLayout] = useState(false)
  const [fit, setFit] = useState<PillFit>(comfortableFit(false))

  useLayoutEffect(() => {
    if (variant !== 'compact') return
    const list = listRef.current
    if (!list) return

    const probe = document.createElement('span')
    probe.setAttribute('aria-hidden', 'true')
    probe.style.cssText = [
      'position:absolute',
      'left:-9999px',
      'top:0',
      'visibility:hidden',
      'pointer-events:none',
      'white-space:nowrap',
      `font-family:${APPLE_FONT}`,
      `font-weight:${LABEL_WEIGHT}`,
      `letter-spacing:${LETTER_SPACING}`,
    ].join(';')
    document.body.appendChild(probe)

    const measure = (text: string, font: number) => {
      probe.style.fontSize = `${font}px`
      probe.textContent = text
      const domWidth = probe.getBoundingClientRect().width
      if (domWidth > 0) return domWidth
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) return 0
      ctx.font = `${LABEL_WEIGHT} ${font}px ${APPLE_FONT}`
      const letterExtra = (text.length - 1) * font * -0.025
      return ctx.measureText(text).width + letterExtra
    }

    const apply = () => {
      const isDesktop = window.innerWidth >= MD_BREAKPOINT
      const isColumns = window.innerWidth >= LG_BREAKPOINT
      setDesktop((prev) => (prev === isDesktop ? prev : isDesktop))
      setColumnLayout((prev) => (prev === isColumns ? prev : isColumns))

      // Keep previous metrics while search is flipped in so the row width
      // cannot shove the search icon.
      if (folded) return
      // Desktop columns are sized by the specials grid, not by leftover chrome.
      if (isColumns) {
        setFit((prev) => (sameFit(prev, comfortableFit(true)) ? prev : comfortableFit(true)))
        return
      }

      const available = list.parentElement?.clientWidth || list.clientWidth
      if (available <= 0) return
      const next = fitPills(available, isDesktop, measure)
      setFit((prev) => (sameFit(prev, next) ? prev : next))
    }

    apply()
    const slot = list.parentElement
    const observer = new ResizeObserver(() => {
      apply()
    })
    if (slot) observer.observe(slot)
    window.addEventListener('resize', apply)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', apply)
      probe.remove()
    }
  }, [variant, folded])

  if (variant === 'compact') {
    return (
      <div
        ref={listRef}
        role="tablist"
        aria-label="Browse menus"
        aria-hidden={folded}
        className={cn(
          'relative flex h-full min-w-0 w-full items-center',
          DISCOVER_TAB_GRID_CLASS,
          className
        )}
        style={{
          gap: columnLayout ? undefined : fit.gap,
          minWidth: 0,
        }}
      >
        {HOME_TABS.map((tab, index) => {
          const isActive = activeTab === tab.id
          const label = desktop ? tab.label : tab.shortLabel
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-label={tab.label}
              tabIndex={folded ? -1 : 0}
              onClick={() => onTabChange(tab.id)}
              className="flex items-center justify-center overflow-visible whitespace-nowrap bg-transparent font-normal lg:w-full"
              style={{
                fontFamily: APPLE_FONT,
                fontSize: columnLayout ? 16 : fit.font,
                fontWeight: LABEL_WEIGHT,
                letterSpacing: LETTER_SPACING,
                height: HOME_COMPACT_SIZE,
                flexGrow: columnLayout ? 0 : 1,
                flexShrink: 0,
                flexBasis: columnLayout ? 'auto' : 0,
                minWidth: columnLayout ? 0 : fit.mins[index] || undefined,
                paddingLeft: columnLayout ? 0 : fit.pad,
                paddingRight: columnLayout ? 0 : fit.pad,
                color: isActive ? '#111111' : 'rgba(17,17,17,0.62)',
                pointerEvents: folded ? 'none' : 'auto',
              }}
            >
              <span
                ref={(node) => {
                  if (labelRefs) labelRefs.current[index] = node
                }}
                className="whitespace-nowrap"
              >
                {label}
              </span>
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div
      role="tablist"
      aria-label="Browse menus"
      className={cn('flex items-center gap-2', className)}
    >
      {HOME_TABS.map((tab) => {
        const isActive = tab.id === activeTab
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onTabChange(tab.id)}
            className="relative h-11 shrink-0 whitespace-nowrap bg-transparent px-5 text-[16px] font-normal tracking-tight"
            style={{
              fontFamily: APPLE_FONT,
              color: isActive ? '#111111' : 'rgba(17,17,17,0.62)',
            }}
          >
            <span className="relative inline-block">
              {tab.label}
              {isActive && (
                <motion.span
                  layoutId="home-tab-underline-spread"
                  className="absolute -bottom-1 left-0 right-0 h-[2px] rounded-full bg-[#111]"
                  transition={{ type: 'spring', stiffness: 520, damping: 40, mass: 0.7 }}
                />
              )}
            </span>
          </button>
        )
      })}
    </div>
  )
}

export { HOME_TABS as TABS }
