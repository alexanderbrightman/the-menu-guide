'use client'

import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Search, ArrowRight, Loader2 } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { useRestaurantSearch } from '@/hooks/useRestaurantSearch'
import { glassTokens } from '@/lib/glass-styles'
import { HOME_COMPACT_SIZE, HOME_DOCK_RADIUS } from '@/components/landing/HomeTabSwitcher'
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

interface SearchPanelProps {
  onResultClick?: () => void
  resultsMaxHeight?: number
  /** Compact field that occupies the header tab slot. */
  variant?: 'popover' | 'header'
  /** When false, hide results and skip autofocus (header search closed). */
  enabled?: boolean
  /** Untransformed header slot — results sit below this, not the flipping field. */
  anchorRef?: RefObject<HTMLElement | null>
}

const APPLE_FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif'
const DESKTOP_MQ = 768
const DESKTOP_SEARCH_MIN = 320
const DESKTOP_SEARCH_MAX = 512
const SEARCH_INK = '#1a1a1a'
const CHROME_LINE = '#111111'

/** White fill so typed text has contrast. Quiet edge only — the track line is separate. */
const headerFieldStyle: CSSProperties = {
  background: '#FFFFFF',
  border: '1px solid rgba(17,17,17,0.12)',
  boxShadow: 'none',
}

/** Standalone popover keeps the same monochrome hairline. */
const popoverFieldStyle: CSSProperties = {
  background: '#FFFFFF',
  border: `2px solid ${CHROME_LINE}`,
  boxShadow: 'none',
}

/** Heavier frost than the search field so names stay readable over photos. */
const resultsSurface: CSSProperties = {
  background: 'rgba(255, 255, 255, 0.94)',
  backdropFilter: `blur(${glassTokens.blur}) saturate(${glassTokens.saturate})`,
  WebkitBackdropFilter: `blur(${glassTokens.blur}) saturate(${glassTokens.saturate})`,
  border: `0.5px solid ${glassTokens.border}`,
  boxShadow: glassTokens.shadowLg,
}

function pagePad() {
  const width = window.innerWidth
  if (width >= 1024) return 32
  if (width >= 640) return 24
  return 16
}

export function SearchPanel({
  onResultClick,
  resultsMaxHeight = 288,
  variant = 'popover',
  enabled = true,
  anchorRef,
}: SearchPanelProps) {
  const router = useRouter()
  const fieldWrapRef = useRef<HTMLLabelElement>(null)
  const { searchQuery, setSearchQuery, searchResults, isSearching, clearSearch } = useRestaurantSearch()
  const [loadingResult, setLoadingResult] = useState<string | null>(null)
  const isHeader = variant === 'header'
  const showResults = enabled && searchQuery.trim().length > 0
  const firstResult = searchResults[0]

  const [resultsPos, setResultsPos] = useState({
    top: 0,
    left: 0,
    width: 0,
    maxHeight: resultsMaxHeight,
  })
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!enabled) clearSearch()
  }, [enabled, clearSearch])

  useEffect(() => {
    if (!isHeader) return
    const input = fieldWrapRef.current?.querySelector('input')
    if (!enabled) {
      input?.blur()
      return
    }
    const id = window.setTimeout(() => input?.focus(), 480)
    return () => window.clearTimeout(id)
  }, [enabled, isHeader])

  useLayoutEffect(() => {
    if (!isHeader || !enabled) return
    const update = () => {
      const el = anchorRef?.current ?? fieldWrapRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const pad = pagePad()
      const desktop = window.innerWidth >= DESKTOP_MQ
      const maxWidth = Math.min(DESKTOP_SEARCH_MAX, window.innerWidth - pad * 2)
      const width = desktop
        ? Math.max(rect.width, Math.min(maxWidth, Math.max(DESKTOP_SEARCH_MIN, rect.width)))
        : rect.width
      let left = rect.left
      if (left + width > window.innerWidth - pad) {
        left = Math.max(pad, window.innerWidth - pad - width)
      }
      setResultsPos({
        top: rect.bottom + 8,
        left,
        width,
        maxHeight: Math.max(160, Math.min(420, window.innerHeight - rect.bottom - 24)),
      })
    }
    update()
    const delayed = window.setTimeout(update, 520)
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.clearTimeout(delayed)
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [enabled, isHeader, anchorRef, showResults])

  const openFirstResult = () => {
    if (!firstResult) return
    setLoadingResult(firstResult.username)
    onResultClick?.()
    router.push(`/menu/${firstResult.username}`)
  }

  const handleFieldKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return
    event.preventDefault()
    openFirstResult()
  }

  const field = (
    <label
      ref={fieldWrapRef}
      className="relative flex w-full items-center gap-2.5"
      style={{
        ...(isHeader ? headerFieldStyle : popoverFieldStyle),
        borderRadius: HOME_DOCK_RADIUS,
        height: isHeader ? HOME_COMPACT_SIZE : 44,
        paddingLeft: isHeader ? 12 : 16,
        paddingRight: isHeader ? 8 : 12,
      }}
    >
      <Search className="h-[18px] w-[18px] flex-shrink-0" style={{ color: SEARCH_INK }} />
      <Input
        type="text"
        autoComplete="off"
        autoFocus={!isHeader}
        placeholder="Search restaurants..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onKeyDown={handleFieldKeyDown}
        className="h-auto flex-1 border-0 bg-transparent p-0 text-[16px] text-gray-900 placeholder:text-gray-500 shadow-none focus-visible:ring-0"
      />
      <button
        type="button"
        onClick={openFirstResult}
        disabled={!firstResult}
        aria-label="Open first restaurant"
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full transition-opacity disabled:opacity-30"
        style={{ color: SEARCH_INK }}
      >
        <ArrowRight className="h-[18px] w-[18px]" />
      </button>
    </label>
  )

  const listMaxHeight = isHeader ? resultsPos.maxHeight : resultsMaxHeight

  const results = (
    <AnimatePresence initial={false}>
      {showResults && (
        <motion.div
          key="search-results"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="overflow-hidden"
        >
          <div
            className="overflow-y-auto rounded-[16px]"
            style={{ ...resultsSurface, maxHeight: listMaxHeight, fontFamily: APPLE_FONT }}
          >
            {isSearching ? (
              <div className="p-6 text-center text-[15px] text-gray-600">
                <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                Searching...
              </div>
            ) : searchResults.length > 0 ? (
              <div className="py-2">
                {searchResults.map((restaurant) => (
                  <Link
                    key={restaurant.username}
                    href={`/menu/${restaurant.username}`}
                    prefetch
                    onClick={() => {
                      setLoadingResult(restaurant.username)
                      onResultClick?.()
                    }}
                    onMouseEnter={() => router.prefetch(`/menu/${restaurant.username}`)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-3 mx-1.5 rounded-xl transition-colors',
                      loadingResult === restaurant.username ? 'bg-black/[0.06]' : 'hover:bg-black/[0.04]'
                    )}
                  >
                    {restaurant.avatar_url ? (
                      <Image
                        src={restaurant.avatar_url}
                        alt={restaurant.display_name}
                        width={44}
                        height={44}
                        className="h-11 w-11 flex-shrink-0 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-gray-200 text-[15px] font-semibold text-gray-700">
                        {restaurant.display_name.charAt(0)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-[16px] font-semibold leading-tight tracking-tight text-gray-900">
                        {restaurant.display_name}
                      </p>
                      <p className="mt-0.5 truncate text-[13px] leading-snug text-gray-600">
                        @{restaurant.username}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="p-6 text-center text-[15px] text-gray-600">No restaurants found</p>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  if (isHeader) {
    return (
      <div className="relative h-full w-full">
        {field}
        {mounted &&
          enabled &&
          resultsPos.width > 0 &&
          createPortal(
            <div
              className="pointer-events-none fixed z-50"
              style={{
                top: resultsPos.top,
                left: resultsPos.left,
                width: resultsPos.width,
              }}
            >
              <div className="pointer-events-auto">{results}</div>
            </div>,
            document.body
          )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {field}
      {results}
    </div>
  )
}

/** Legacy inline search — kept for backwards compatibility */
export function SearchSection() {
  return (
    <div className="w-full max-w-2xl mx-auto">
      <SearchPanel />
    </div>
  )
}
