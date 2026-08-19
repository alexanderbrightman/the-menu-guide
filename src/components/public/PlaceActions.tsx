'use client'

import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import type { CSSProperties } from 'react'
import { Calendar, ChevronDown, MapPin, Phone } from 'lucide-react'
import {
  formatHoursList,
  formatHoursStatus,
} from '@/lib/opening-hours'
import { mapsSearchUrl, reservationHref, telHref } from '@/lib/place-links'
import { glassTokens } from '@/lib/glass-styles'

export interface PlaceInfo {
  address?: string | null
  latitude?: number | null
  longitude?: number | null
  phone?: string | null
  reservation_url?: string | null
  opening_hours?: unknown
}

interface PlaceActionsProps {
  place: PlaceInfo
  isDark?: boolean
  compact?: boolean
  /** Glass chips on discover modals; hairline pills on the public menu. */
  surface?: 'menu' | 'glass'
  /** Single header row (public menu) vs stacked block (modals). */
  layout?: 'stack' | 'bar'
}

const APPLE_FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif'

const glassChip: CSSProperties = {
  background: 'rgba(255,255,255,0.45)',
  backdropFilter: `blur(12px) saturate(${glassTokens.saturate})`,
  WebkitBackdropFilter: `blur(12px) saturate(${glassTokens.saturate})`,
  border: '0.5px solid rgba(255,255,255,0.55)',
  boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
  fontFamily: APPLE_FONT,
}

const glassReserve: CSSProperties = {
  background: 'rgba(28,28,30,0.86)',
  color: '#fff',
  border: '0.5px solid rgba(255,255,255,0.18)',
  boxShadow: '0 1px 3px rgba(0,0,0,0.18)',
  fontFamily: APPLE_FONT,
}

function HoursMenu({
  open,
  onClose,
  anchorRef,
  hoursList,
  isDark,
  muted,
  ink,
}: {
  open: boolean
  onClose: () => void
  anchorRef: RefObject<HTMLElement | null>
  hoursList: { days: string; hours: string }[]
  isDark: boolean
  muted: string
  ink: string
}) {
  const panelRef = useRef<HTMLDListElement>(null)
  const [pos, setPos] = useState({ top: 0, left: 0 })

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) return
    const update = () => {
      const rect = anchorRef.current!.getBoundingClientRect()
      const width = panelRef.current?.offsetWidth || 196
      const center = rect.left + rect.width / 2
      const left = Math.min(
        Math.max(12, center - width / 2),
        window.innerWidth - width - 12
      )
      setPos({ top: rect.bottom + 8, left })
    }
    update()
    const frame = window.requestAnimationFrame(update)
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [open, anchorRef])

  useEffect(() => {
    if (!open) return
    const onPointer = (event: MouseEvent) => {
      const target = event.target as Node
      if (anchorRef.current?.contains(target) || panelRef.current?.contains(target)) return
      onClose()
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose, anchorRef])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <dl
      ref={panelRef}
      role="menu"
      className={`fixed z-[80] min-w-[12.25rem] rounded-xl border px-3 py-2.5 text-[12px] shadow-lg ${
        isDark ? 'border-white/15 bg-[#1a1a1a] text-white' : 'border-black/10 bg-white text-gray-900'
      }`}
      style={{ top: pos.top, left: pos.left }}
    >
      {hoursList.map((row) => (
        <div key={row.days} className="flex justify-between gap-4 py-0.5">
          <dt className={muted}>{row.days}</dt>
          <dd className={ink}>{row.hours}</dd>
        </div>
      ))}
    </dl>,
    document.body
  )
}

export function PlaceActions({
  place,
  isDark = false,
  compact = false,
  surface = 'menu',
  layout = 'stack',
}: PlaceActionsProps) {
  const [hoursOpen, setHoursOpen] = useState(false)
  const hoursButtonRef = useRef<HTMLButtonElement>(null)
  const status = formatHoursStatus(place.opening_hours)
  const hoursList = formatHoursList(place.opening_hours)
  const mapsUrl =
    place.address || (place.latitude != null && place.longitude != null)
      ? mapsSearchUrl(place.address || '', place.latitude, place.longitude)
      : null
  const callHref = place.phone ? telHref(place.phone) : null
  const reserveHref = reservationHref(place.reservation_url)

  const isGlass = surface === 'glass'
  const isBar = layout === 'bar'
  const isCurrentlyOpen = Boolean(status?.startsWith('Open'))
  const muted = isDark ? 'text-white/65' : 'text-gray-500'
  const ink = isDark ? 'text-white' : 'text-gray-900'
  const showHours = !compact && hoursList.length > 0

  const menuChip = isDark
    ? 'border-white/20 text-white hover:bg-white/10'
    : 'border-black/12 text-gray-900 hover:bg-black/[0.04]'

  const hasActions = Boolean(callHref || mapsUrl || reserveHref || status)
  if (!hasActions) return null

  const iconBtnClass = isDark
    ? 'inline-flex items-center justify-center rounded-full p-2 text-white transition-colors hover:bg-white/10'
    : 'inline-flex items-center justify-center rounded-full p-2 text-gray-900 transition-colors hover:bg-gray-100'

  const statusClass = `inline-flex min-w-0 items-center gap-1.5 text-[13px] ${
    isGlass ? 'text-gray-600' : muted
  } ${isBar ? 'px-2' : ''}`
  const statusDot = (
    <span
      className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${
        isCurrentlyOpen ? 'bg-emerald-500' : 'bg-gray-400/80'
      }`}
      aria-hidden
    />
  )

  const statusEl = status && (
    showHours ? (
      <>
        <button
          ref={hoursButtonRef}
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setHoursOpen((open) => !open)
          }}
          className={`${statusClass} max-w-full rounded-full text-left transition-opacity hover:opacity-80`}
          style={isGlass ? { fontFamily: APPLE_FONT } : undefined}
          aria-expanded={hoursOpen}
          aria-haspopup="menu"
          aria-label={`Opening hours, ${status}`}
        >
          {statusDot}
          <span className="truncate">{status}</span>
          <ChevronDown
            className={`h-3.5 w-3.5 flex-shrink-0 opacity-70 transition-transform ${
              hoursOpen ? 'rotate-180' : ''
            }`}
            aria-hidden
          />
        </button>
        <HoursMenu
          open={hoursOpen}
          onClose={() => setHoursOpen(false)}
          anchorRef={hoursButtonRef}
          hoursList={hoursList}
          isDark={isDark}
          muted={muted}
          ink={ink}
        />
      </>
    ) : (
      <span
        className={statusClass}
        style={isGlass ? { fontFamily: APPLE_FONT } : undefined}
      >
        {statusDot}
        <span className="truncate">{status}</span>
      </span>
    )
  )

  const headerLinks = (
    <div className="flex flex-shrink-0 items-center">
      {callHref && (
        <a
          href={callHref}
          onClick={(e) => e.stopPropagation()}
          className={iconBtnClass}
          aria-label="Call"
          title="Call"
        >
          <Phone className="h-5 w-5" strokeWidth={1.5} />
        </a>
      )}
      {mapsUrl && (
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className={iconBtnClass}
          aria-label="Directions"
          title="Directions"
        >
          <MapPin className="h-5 w-5" strokeWidth={1.5} />
        </a>
      )}
      {reserveHref && (
        <a
          href={reserveHref}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className={iconBtnClass}
          aria-label="Reserve"
          title="Reserve"
        >
          <Calendar className="h-5 w-5" strokeWidth={1.5} />
        </a>
      )}
    </div>
  )

  const chipClass = isGlass
    ? 'inline-flex items-center gap-1.5 rounded-full px-3 py-[7px] text-[13px] font-medium text-gray-800 transition-transform active:scale-[0.97]'
    : `inline-flex items-center gap-1.5 rounded-full border px-2.5 py-[5px] text-[13px] font-medium whitespace-nowrap transition-colors ${menuChip}`

  const stackLinks = (
    <>
      {callHref && (
        <a
          href={callHref}
          onClick={(e) => e.stopPropagation()}
          className={chipClass}
          style={isGlass ? glassChip : undefined}
        >
          <Phone className="h-3.5 w-3.5 opacity-70" strokeWidth={2} />
          Call
        </a>
      )}
      {mapsUrl && (
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className={chipClass}
          style={isGlass ? glassChip : undefined}
        >
          <MapPin className="h-3.5 w-3.5 opacity-70" strokeWidth={2} />
          Directions
        </a>
      )}
      {reserveHref && (
        <a
          href={reserveHref}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className={chipClass}
          style={isGlass ? glassReserve : undefined}
        >
          <Calendar className="h-3.5 w-3.5 opacity-80" strokeWidth={2} />
          Reserve
        </a>
      )}
    </>
  )

  if (isBar) {
    return (
      <div className="flex min-w-0 w-full items-center justify-end">
        {statusEl}
        {headerLinks}
      </div>
    )
  }

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center gap-2">
        {statusEl}
      </div>
      <div className="flex flex-wrap gap-1.5">{stackLinks}</div>
    </div>
  )
}
