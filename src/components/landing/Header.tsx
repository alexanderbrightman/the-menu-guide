'use client'

import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { motion, animate, useMotionValue, useTransform } from 'framer-motion'
import {
  HomeTabSwitcher,
  HOME_COMPACT_SIZE,
  HOME_TABS,
  type HomeTab,
} from '@/components/landing/HomeTabSwitcher'
import { SiteMenu } from '@/components/landing/SiteMenu'
import { Menu, Search, X } from 'lucide-react'
import { SearchPanel } from '@/components/landing/SearchPanel'
import { CategoryDivider } from '@/components/public/CategoryDivider'

const CHROME_LINE = '#111111'
const CHROME_STROKE = 2
const LOOP_RADIUS = 17
/** Line races from the tab to the search loop. */
const SEARCH_LINE_MS = 400
/** Tabs exit left / field enters from the right. */
const SEARCH_SLIDE_MS = 600
const TAB_SPRING = { type: 'spring' as const, stiffness: 520, damping: 40, mass: 0.7 }
const LINE_EASE = [0.55, 0.0, 0.18, 1] as const
const SLIDE_EASE = [0.22, 1, 0.36, 1] as const

function roundPx(n: number) {
    return Math.round(n * 2) / 2
}

function relativeBox(el: HTMLElement, root: HTMLElement) {
    const a = el.getBoundingClientRect()
    const b = root.getBoundingClientRect()
    return {
        left: roundPx(a.left - b.left),
        top: roundPx(a.top - b.top),
        width: roundPx(a.width),
        height: roundPx(a.height),
    }
}

type TabStop = { start: number; length: number }

type ChromeTrack = {
    d: string
    length: number
    horizLen: number
    circleLen: number
    stops: Partial<Record<HomeTab, TabStop>>
}

type LineSeg = { start: number; length: number }

/**
 * Horizontal rail under the tabs, tangent to the bottom of a circle around search.
 * Sweep 0 from the bottom goes out the right, over the top, and around.
 */
function buildTrack(
    labels: { id: HomeTab; left: number; width: number }[],
    search: { cx: number; cy: number },
    radius: number,
): ChromeTrack | null {
    if (labels.length === 0) return null
    const railY = roundPx(search.cy + radius)
    const startX = roundPx(Math.min(...labels.map((l) => l.left)))
    const tangentX = roundPx(search.cx)
    if (tangentX <= startX + 8) return null

    const r = roundPx(radius)
    const topX = roundPx(search.cx)
    const topY = roundPx(search.cy - radius)
    const d = [
        `M ${startX} ${railY}`,
        `L ${tangentX} ${railY}`,
        `A ${r} ${r} 0 0 0 ${topX} ${topY}`,
        `A ${r} ${r} 0 0 0 ${tangentX} ${railY}`,
    ].join(' ')

    const horizLen = tangentX - startX
    const circleLen = 2 * Math.PI * r
    const stops: Partial<Record<HomeTab, TabStop>> = {}
    for (const label of labels) {
        stops[label.id] = {
            start: roundPx(label.left - startX),
            length: Math.max(2, label.width),
        }
    }

    return {
        d,
        length: horizLen + circleLen,
        horizLen,
        circleLen,
        stops,
    }
}

function sameTrack(a: ChromeTrack | null, b: ChromeTrack) {
    if (!a) return false
    return a.d === b.d && a.length === b.length
}

function circleSeg(track: ChromeTrack): LineSeg {
    return { start: track.horizLen, length: track.circleLen }
}

function tabSeg(track: ChromeTrack, tab: HomeTab): LineSeg | null {
    const stop = track.stops[tab]
    if (!stop) return null
    return { start: stop.start, length: stop.length }
}

interface HeaderProps {
    onLoginClick?: () => void
    onContactClick?: () => void
    onResetPasswordClick?: () => void
    activeTab: HomeTab
    onTabChange: (tab: HomeTab) => void
}

export function Header({ onResetPasswordClick, activeTab, onTabChange }: HeaderProps) {
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const headerRef = useRef<HTMLDivElement>(null)
    const searchSlotRef = useRef<HTMLDivElement>(null)
    const chromeRef = useRef<HTMLDivElement>(null)
    const searchBtnRef = useRef<HTMLButtonElement>(null)
    const labelElsRef = useRef<(HTMLSpanElement | null)[]>([null, null, null])
    const labelCacheRef = useRef<{ id: HomeTab; left: number; width: number }[] | null>(null)
    const chromeTimersRef = useRef<number[]>([])
    const chromeBusyRef = useRef(false)
    const travelGenRef = useRef(0)
    const hasSegRef = useRef(false)
    const activeTabRef = useRef(activeTab)
    const lineAtRef = useRef<'tab' | 'search'>('tab')
    const trackRef = useRef<ChromeTrack | null>(null)
    const destRef = useRef<LineSeg>({ start: 0, length: 0 })
    const applyRef = useRef<() => void>(() => {})
    const startMv = useMotionValue(0)
    const lenMv = useMotionValue(0)
    const totalMv = useMotionValue(1)
    const dashOffset = useTransform(startMv, (value) => -value)
    const dashArray = useTransform([lenMv, totalMv], ([len, total]) => `${len} ${total}`)
    const [searchOpen, setSearchOpen] = useState(false)
    const [track, setTrack] = useState<ChromeTrack | null>(null)

    const clearChromeTimers = () => {
        chromeTimersRef.current.forEach((id) => window.clearTimeout(id))
        chromeTimersRef.current = []
    }

    const sameSeg = (a: LineSeg, b: LineSeg) => a.start === b.start && a.length === b.length

    const updateSeg = (next: LineSeg, transition: object | { duration: number }) => {
        destRef.current = next
        const snap = 'duration' in transition && transition.duration === 0
        const gen = ++travelGenRef.current
        if (snap) {
            startMv.set(next.start)
            lenMv.set(next.length)
            return
        }
        const controls = [
            animate(startMv, next.start, transition),
            animate(lenMv, next.length, transition),
        ]
        void Promise.all(controls).then(() => {
            if (gen !== travelGenRef.current) return
            applyRef.current()
        })
    }

    useLayoutEffect(() => {
        const chrome = chromeRef.current
        if (!chrome) return

        const apply = () => {
            activeTabRef.current = activeTab
            const button = searchBtnRef.current
            if (!button) return
            const btn = relativeBox(button, chrome)
            const searchPt = {
                cx: roundPx(btn.left + btn.width / 2),
                cy: roundPx(btn.top + btn.height / 2),
            }

            const labels: { id: HomeTab; left: number; width: number }[] = []
            HOME_TABS.forEach((tab, index) => {
                const el = labelElsRef.current[index]
                if (!el) return
                const box = relativeBox(el, chrome)
                if (box.width < 2 || box.height < 8) return
                labels.push({ id: tab.id, left: box.left, width: box.width })
            })
            // Tabs slide off-screen while search is open; measuring them then
            // parks the underline on a bogus coordinate.
            const labelsReady = labels.length === HOME_TABS.length
            const freezeLabels = searchOpen || chromeBusyRef.current
            if (labelsReady && !freezeLabels) {
                labelCacheRef.current = labels
            }

            const source = labelsReady && !freezeLabels ? labels : labelCacheRef.current
            if (!source) return
            const resolved = buildTrack(source, searchPt, LOOP_RADIUS)
            if (!resolved) return

            const trackChanged = !sameTrack(trackRef.current, resolved)
            if (trackChanged) {
                trackRef.current = resolved
                totalMv.set(resolved.length)
                setTrack(resolved)
            }

            const parked =
                lineAtRef.current === 'search' ? circleSeg(resolved) : tabSeg(resolved, activeTab)
            if (!parked) return
            if (!trackChanged && sameSeg(parked, destRef.current)) return
            if (!hasSegRef.current) {
                hasSegRef.current = true
                updateSeg(parked, { duration: 0 })
                return
            }
            updateSeg(
                parked,
                lineAtRef.current === 'tab' ? TAB_SPRING : { duration: 0 }
            )
        }

        applyRef.current = apply
        apply()
        const observer = new ResizeObserver(apply)
        observer.observe(chrome)
        if (searchSlotRef.current) observer.observe(searchSlotRef.current)
        if (searchBtnRef.current) observer.observe(searchBtnRef.current)
        labelElsRef.current.forEach((el) => {
            if (el) observer.observe(el)
        })
        window.addEventListener('resize', apply)
        return () => {
            observer.disconnect()
            window.removeEventListener('resize', apply)
        }
    }, [activeTab, searchOpen])

    useEffect(() => {
        return () => clearChromeTimers()
    }, [])

    const openSearch = () => {
        if (chromeBusyRef.current || searchOpen || lineAtRef.current === 'search') return
        const currentTrack = trackRef.current
        if (!currentTrack) return
        const to = circleSeg(currentTrack)

        chromeBusyRef.current = true
        lineAtRef.current = 'search'
        clearChromeTimers()
        updateSeg(to, { duration: SEARCH_LINE_MS / 1000, ease: LINE_EASE })

        chromeTimersRef.current.push(
            window.setTimeout(() => {
                setSearchOpen(true)
            }, SEARCH_LINE_MS)
        )
        chromeTimersRef.current.push(
            window.setTimeout(() => {
                chromeBusyRef.current = false
                applyRef.current()
            }, SEARCH_LINE_MS + SEARCH_SLIDE_MS)
        )
    }

    const closeSearch = () => {
        if (!searchOpen && lineAtRef.current === 'tab') return

        chromeBusyRef.current = true
        clearChromeTimers()
        setSearchOpen(false)

        chromeTimersRef.current.push(
            window.setTimeout(() => {
                const latest = trackRef.current
                lineAtRef.current = 'tab'
                const to = latest ? tabSeg(latest, activeTabRef.current) : null
                if (!latest || !to) {
                    chromeBusyRef.current = false
                    applyRef.current()
                    return
                }
                updateSeg(to, { duration: SEARCH_LINE_MS / 1000, ease: LINE_EASE })
                chromeTimersRef.current.push(
                    window.setTimeout(() => {
                        chromeBusyRef.current = false
                        applyRef.current()
                    }, SEARCH_LINE_MS)
                )
            }, SEARCH_SLIDE_MS)
        )
    }

    const toggleSearch = () => {
        if (searchOpen || lineAtRef.current === 'search') {
            closeSearch()
            return
        }
        openSearch()
    }

    useEffect(() => {
        if (!searchOpen) return
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') closeSearch()
        }
        document.addEventListener('keydown', onKey)
        return () => document.removeEventListener('keydown', onKey)
    }, [searchOpen]) // eslint-disable-line react-hooks/exhaustive-deps

    const openMenu = () => {
        closeSearch()
        setIsMenuOpen(true)
    }

    return (
        <>
            {searchOpen && (
                <button
                    type="button"
                    className="fixed inset-0 z-[25]"
                    aria-label="Close search"
                    onClick={closeSearch}
                />
            )}
            <header ref={headerRef} className="relative z-30 w-full overflow-visible pt-[calc(env(safe-area-inset-top,0px)+0.5rem)] pb-3 md:pb-2" style={{ backgroundColor: 'transparent' }}>
                <div className="relative mx-auto w-full max-w-3xl">
                <CategoryDivider
                    title="The Menu Guide"
                    isDarkBackground={false}
                    fontFamily="var(--font-raleway), sans-serif"
                    as="h1"
                    className="my-0 mb-2 md:mb-2.5 lg:-mr-[5.75rem]"
                />
                <div ref={chromeRef} className="relative flex items-center gap-2 overflow-visible lg:block">
                    <div
                        ref={searchSlotRef}
                        className="relative min-w-0 flex-1 overflow-hidden lg:w-full"
                        style={{ height: HOME_COMPACT_SIZE, minWidth: 0 }}
                    >
                            <motion.div
                                className="h-full w-full"
                                initial={false}
                                animate={
                                    searchOpen
                                        ? { x: '-112%', opacity: 0 }
                                        : { x: 0, opacity: 1 }
                                }
                                transition={{ duration: SEARCH_SLIDE_MS / 1000, ease: SLIDE_EASE }}
                                style={{ pointerEvents: searchOpen ? 'none' : 'auto' }}
                            >
                                <HomeTabSwitcher
                                    variant="compact"
                                    activeTab={activeTab}
                                    onTabChange={onTabChange}
                                    folded={searchOpen}
                                    labelRefs={labelElsRef}
                                />
                            </motion.div>
                            <motion.div
                                className="absolute inset-0"
                                initial={false}
                                animate={
                                    searchOpen
                                        ? { x: 0, opacity: 1 }
                                        : { x: '112%', opacity: 0 }
                                }
                                transition={{ duration: SEARCH_SLIDE_MS / 1000, ease: SLIDE_EASE }}
                                style={{ pointerEvents: searchOpen ? 'auto' : 'none' }}
                            >
                                <SearchPanel
                                    variant="header"
                                    enabled={searchOpen}
                                    anchorRef={searchSlotRef}
                                    onResultClick={closeSearch}
                                />
                            </motion.div>
                    </div>

                    <div className="relative z-10 flex flex-shrink-0 items-center lg:absolute lg:right-0 lg:top-1/2 lg:-translate-y-1/2 lg:translate-x-full lg:pl-3">
                        <button
                            ref={searchBtnRef}
                            type="button"
                            onClick={toggleSearch}
                            className="relative z-[3] flex flex-shrink-0 items-center justify-center bg-transparent text-[#111] active:scale-95 transition-transform"
                            style={{
                                height: HOME_COMPACT_SIZE,
                                width: HOME_COMPACT_SIZE,
                            }}
                            aria-label={searchOpen ? 'Close search' : 'Search restaurants'}
                            aria-expanded={searchOpen}
                        >
                            {searchOpen ? <X className="h-[18px] w-[18px]" strokeWidth={2.25} /> : <Search className="h-[18px] w-[18px]" strokeWidth={2.25} />}
                        </button>

                        <button
                            type="button"
                            onClick={openMenu}
                            className="relative z-10 flex flex-shrink-0 items-center justify-center bg-transparent text-[#111] active:scale-95 transition-transform"
                            style={{
                                height: HOME_COMPACT_SIZE,
                                width: HOME_COMPACT_SIZE,
                            }}
                            aria-label="Open menu"
                            aria-expanded={isMenuOpen}
                        >
                            <Menu className="h-[18px] w-[18px]" strokeWidth={2.25} aria-hidden="true" />
                        </button>
                    </div>

                    {track && (
                        <svg
                            aria-hidden
                            className="pointer-events-none absolute inset-0 z-[4] overflow-visible"
                            width="100%"
                            height="100%"
                            style={{ overflow: 'visible' }}
                        >
                            <motion.path
                                d={track.d}
                                fill="none"
                                stroke={CHROME_LINE}
                                strokeWidth={CHROME_STROKE}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                style={{
                                    strokeDasharray: dashArray,
                                    strokeDashoffset: dashOffset,
                                }}
                            />
                        </svg>
                    )}
                </div>
                </div>
            </header>

            <SiteMenu
                open={isMenuOpen}
                onClose={() => setIsMenuOpen(false)}
                onForgotPassword={onResetPasswordClick}
            />
        </>
    )
}
