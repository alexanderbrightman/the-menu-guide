'use client'

import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { createPortal } from 'react-dom'
import { motion, animate, useMotionValue, useTransform } from 'framer-motion'
import { AuthForm } from '@/components/auth/AuthForm'
import { glassCardStyle, glassTokens } from '@/lib/glass-styles'
import { useOverlayChromeColor } from '@/hooks/useChromeColor'
import { useFullscreenOverlay } from '@/hooks/useFullscreenOverlay'
import { CHROME_COLORS } from '@/lib/chrome-color'
import {
  HomeTabSwitcher,
  HOME_COMPACT_SIZE,
  HOME_TABS,
  type HomeTab,
} from '@/components/landing/HomeTabSwitcher'
import { Menu, Search, X } from 'lucide-react'
import { SearchPanel } from '@/components/landing/SearchPanel'
import { CategoryDivider } from '@/components/public/CategoryDivider'

const CHROME_LINE = '#111111'
const CHROME_STROKE = 2
const LOOP_RADIUS = 17
const FLIP_MS = 400
const TAB_SPRING = { type: 'spring' as const, stiffness: 520, damping: 40, mass: 0.7 }
const TRAVEL_EASE = [0.22, 1, 0.36, 1] as const

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

function travelMs(from: LineSeg, to: LineSeg) {
    const distance = Math.abs(to.start - from.start) + Math.abs(to.length - from.length)
    return Math.min(720, Math.max(420, 280 + distance * 0.95))
}

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
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const [expandedSection, setExpandedSection] = useState<'contact' | 'login' | null>(null)
    // Full-screen mobile menu shares app chrome; keep stack in sync for overscroll.
    useOverlayChromeColor(isMobileMenuOpen, CHROME_COLORS.app)
    const [isFlipped, setIsFlipped] = useState(false)
    const [contactFormData, setContactFormData] = useState({ name: '', email: '', message: '' })
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [containerHeight, setContainerHeight] = useState<number | undefined>(undefined)
    const headerRef = useRef<HTMLDivElement>(null)
    const frontRef = useRef<HTMLDivElement>(null)
    const backRef = useRef<HTMLDivElement>(null)
    const mobileMenuRef = useRef<HTMLDivElement>(null)
    const searchSlotRef = useRef<HTMLDivElement>(null)
    const chromeRef = useRef<HTMLDivElement>(null)
    const searchBtnRef = useRef<HTMLButtonElement>(null)
    const labelElsRef = useRef<(HTMLSpanElement | null)[]>([null, null, null])
    const labelCacheRef = useRef<{ id: HomeTab; left: number; width: number }[] | null>(null)
    const chromeTimersRef = useRef<number[]>([])
    const chromeBusyRef = useRef(false)
    const travelingRef = useRef(false)
    const hasSegRef = useRef(false)
    const activeTabRef = useRef(activeTab)
    const lineAtRef = useRef<'tab' | 'search'>('tab')
    const trackRef = useRef<ChromeTrack | null>(null)
    const segRef = useRef<LineSeg>({ start: 0, length: 0 })
    const startMv = useMotionValue(0)
    const lenMv = useMotionValue(0)
    const totalMv = useMotionValue(1)
    const dashOffset = useTransform(startMv, (value) => -value)
    const dashArray = useTransform([lenMv, totalMv], ([len, total]) => `${len} ${total}`)
    const [searchOpen, setSearchOpen] = useState(false)
    const [track, setTrack] = useState<ChromeTrack | null>(null)
    const [menuPortalReady, setMenuPortalReady] = useState(false)

    useEffect(() => {
        setMenuPortalReady(true)
    }, [])

    const clearChromeTimers = () => {
        chromeTimersRef.current.forEach((id) => window.clearTimeout(id))
        chromeTimersRef.current = []
    }

    const updateSeg = (next: LineSeg, transition: object | { duration: number }) => {
        segRef.current = next
        const snap = 'duration' in transition && transition.duration === 0
        if (snap) {
            startMv.set(next.start)
            lenMv.set(next.length)
            return
        }
        void animate(startMv, next.start, transition)
        void animate(lenMv, next.length, transition)
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
            // Folded labels (rotateX) shrink getBoundingClientRect. Caching
            // those, or mixing them with a moved search icon, makes the
            // returning underline stop short of the selected tab.
            const labelsReady = labels.length === HOME_TABS.length
            const freezeLabels = searchOpen || chromeBusyRef.current || travelingRef.current
            if (labelsReady && !freezeLabels) {
                labelCacheRef.current = labels
            }

            const source = labelsReady && !freezeLabels ? labels : labelCacheRef.current
            if (!source) return
            const resolved = buildTrack(source, searchPt, LOOP_RADIUS)
            if (!resolved) return

            if (!sameTrack(trackRef.current, resolved)) {
                trackRef.current = resolved
                totalMv.set(resolved.length)
                setTrack(resolved)
            }
            if (travelingRef.current) return
            const parked =
                lineAtRef.current === 'search' ? circleSeg(resolved) : tabSeg(resolved, activeTab)
            if (!parked) return
            if (parked.start === segRef.current.start && parked.length === segRef.current.length) return
            if (!hasSegRef.current) {
                hasSegRef.current = true
                updateSeg(parked, { duration: 0 })
                return
            }
            updateSeg(parked, lineAtRef.current === 'tab' ? TAB_SPRING : { duration: 0 })
        }

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
        const ms = travelMs(segRef.current, to)

        chromeBusyRef.current = true
        travelingRef.current = true
        lineAtRef.current = 'search'
        clearChromeTimers()
        updateSeg(to, { duration: ms / 1000, ease: TRAVEL_EASE })

        chromeTimersRef.current.push(
            window.setTimeout(() => {
                travelingRef.current = false
                setSearchOpen(true)
                chromeBusyRef.current = false
            }, ms)
        )
    }

    const closeSearch = () => {
        if (!searchOpen && lineAtRef.current === 'tab') return
        if (travelingRef.current && !searchOpen) return

        chromeBusyRef.current = true
        clearChromeTimers()
        setSearchOpen(false)

        chromeTimersRef.current.push(
            window.setTimeout(() => {
                const latest = trackRef.current
                const to = latest ? tabSeg(latest, activeTabRef.current) : null
                if (!latest || !to) {
                    lineAtRef.current = 'tab'
                    travelingRef.current = false
                    chromeBusyRef.current = false
                    return
                }
                travelingRef.current = true
                lineAtRef.current = 'tab'
                const ms = travelMs(segRef.current, to)
                updateSeg(to, { duration: ms / 1000, ease: TRAVEL_EASE })
                chromeTimersRef.current.push(
                    window.setTimeout(() => {
                        travelingRef.current = false
                        chromeBusyRef.current = false
                    }, ms)
                )
            }, FLIP_MS)
        )
    }

    const toggleSearch = () => {
        if (searchOpen || lineAtRef.current === 'search') {
            closeSearch()
            return
        }
        openSearch()
    }

    // Full-screen menu matches landing/modals: lock scroll and paint into iOS chrome.
    useFullscreenOverlay(isMobileMenuOpen)

    // Update container height when flipped state changes or content loads
    useEffect(() => {
        if (expandedSection === 'login') {
            const frontHeight = frontRef.current?.offsetHeight
            const backHeight = backRef.current?.offsetHeight

            if (isFlipped && backHeight) {
                setContainerHeight(backHeight)
            } else if (!isFlipped && frontHeight) {
                setContainerHeight(frontHeight)
            }
        }
    }, [isFlipped, expandedSection])

    // Close expanded section when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            // Check if click is outside header
            const isOutsideHeader = headerRef.current && !headerRef.current.contains(event.target as Node);

            // Check if click is inside mobile menu (if it's open)
            const isInsideMobileMenu = mobileMenuRef.current && mobileMenuRef.current.contains(event.target as Node);

            // Only close if outside header AND not inside mobile menu
            if (isOutsideHeader && !isInsideMobileMenu) {
                setExpandedSection(null)
            }
        }

        if (expandedSection) {
            document.addEventListener('mousedown', handleClickOutside)
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [expandedSection])

    useEffect(() => {
        if (!searchOpen) return
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') closeSearch()
        }
        document.addEventListener('keydown', onKey)
        return () => document.removeEventListener('keydown', onKey)
    }, [searchOpen]) // eslint-disable-line react-hooks/exhaustive-deps

    const toggleSection = (section: 'contact' | 'login') => {
        if (expandedSection === section) {
            setExpandedSection(null)
        } else {
            setExpandedSection(section)
        }
    }

    const handleContactSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)

        const subject = encodeURIComponent(`The Menu Guide - Contact from ${contactFormData.name}`)
        const body = encodeURIComponent(`Name: ${contactFormData.name}\nEmail: ${contactFormData.email}\n\nMessage:\n${contactFormData.message}`)
        window.location.href = `mailto:abalexbrightman@gmail.com?subject=${subject}&body=${body}`

        setContactFormData({ name: '', email: '', message: '' })
        setIsSubmitting(false)
        setExpandedSection(null)
    }

    const closeMobileMenu = () => {
        setIsMobileMenuOpen(false)
        setExpandedSection(null)
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
            <header ref={headerRef} className="relative z-30 w-full max-w-7xl mx-auto overflow-visible px-4 sm:px-6 lg:px-8 pt-[calc(env(safe-area-inset-top,0px)+0.5rem)] pb-3 md:pb-2" style={{ backgroundColor: 'transparent' }}>
                <CategoryDivider
                    title="The Menu Guide"
                    isDarkBackground={false}
                    fontFamily="var(--font-raleway), sans-serif"
                    as="h1"
                    className="my-0 mb-2 md:mb-2.5"
                />
                <div className="flex items-center gap-2 md:gap-3">
                    <div className="hidden md:block md:flex-1" aria-hidden />

                    <div ref={chromeRef} className="relative flex min-w-0 flex-1 items-center gap-2 overflow-visible md:flex-none" style={{ minWidth: 0 }}>
                        <div
                            ref={searchSlotRef}
                            className="relative min-w-0 flex-1 overflow-visible md:w-max md:flex-none"
                            style={{ height: HOME_COMPACT_SIZE, minWidth: 0, perspective: 920, transformStyle: 'preserve-3d' }}
                        >
                            <HomeTabSwitcher
                                variant="compact"
                                activeTab={activeTab}
                                onTabChange={onTabChange}
                                folded={searchOpen}
                                labelRefs={labelElsRef}
                            />
                            <motion.div
                                className="absolute inset-0"
                                initial={false}
                                animate={
                                    searchOpen
                                        ? { rotateX: 0, opacity: 1 }
                                        : { rotateX: -88, opacity: 0 }
                                }
                                transition={{
                                    duration: 0.4,
                                    ease: [0.22, 1, 0.36, 1],
                                    delay: searchOpen ? 0.08 : 0,
                                }}
                                style={{
                                    transformOrigin: '50% 0%',
                                    backfaceVisibility: 'hidden',
                                    WebkitBackfaceVisibility: 'hidden',
                                    pointerEvents: searchOpen ? 'auto' : 'none',
                                }}
                            >
                                <SearchPanel
                                    variant="header"
                                    enabled={searchOpen}
                                    anchorRef={searchSlotRef}
                                    onResultClick={closeSearch}
                                />
                            </motion.div>
                        </div>

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

                    <div className="relative ml-auto hidden md:flex md:flex-1 md:justify-end md:ml-0">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => {
                                    closeSearch()
                                    toggleSection('login')
                                    setIsFlipped(false)
                                }}
                                className="h-11 px-5 rounded-[12px] text-sm font-medium transition-all duration-200"
                                style={{
                                    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
                                    letterSpacing: '-0.01em',
                                    background: expandedSection === 'login' ? 'rgba(0,0,0,0.08)' : glassTokens.bg,
                                    backdropFilter: `blur(${glassTokens.blur}) saturate(${glassTokens.saturate})`,
                                    WebkitBackdropFilter: `blur(${glassTokens.blur}) saturate(${glassTokens.saturate})`,
                                    border: `0.5px solid ${glassTokens.border}`,
                                    boxShadow: glassTokens.shadow,
                                    color: '#1a1a1a',
                                }}
                            >
                                Sign In
                            </button>

                            <Link
                                href="/getting-started"
                                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                                style={{
                                    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
                                    letterSpacing: '-0.01em',
                                }}
                            >
                                Getting Started
                            </Link>
                        </div>

                        {/* Combined Flip Card Container */}
                        <div
                            className={`absolute right-0 top-full mt-2 w-[400px] perspective-[1000px] z-50 transition-all duration-300 ${expandedSection === 'login'
                                ? 'opacity-100 translate-y-0 pointer-events-auto'
                                : 'opacity-0 -translate-y-2 pointer-events-none'
                                }`}
                            style={{ height: containerHeight ? `${containerHeight}px` : 'auto' }}
                        >
                            <div
                                className={`relative w-full h-full transition-transform duration-500 [transform-style:preserve-3d] ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}
                            >
                                {/* Front Face: Login Form */}
                                <div
                                    ref={frontRef}
                                    className="absolute inset-0 w-full rounded-2xl p-6 [backface-visibility:hidden]"
                                    style={{
                                        height: 'fit-content',
                                        ...glassCardStyle,
                                        boxShadow: glassTokens.shadowLg,
                                    }}
                                >
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-lg font-semibold text-gray-900">Restaurant Login</h3>
                                        <button
                                            onClick={() => setIsFlipped(true)}
                                            className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
                                        >
                                            Contact
                                        </button>
                                    </div>
                                    <AuthForm
                                        onSuccess={() => setExpandedSection(null)}
                                        variant="default"
                                        labelColor="text-gray-700"
                                        onForgotPassword={() => {
                                            setExpandedSection(null)
                                            if (onResetPasswordClick) {
                                                onResetPasswordClick()
                                            }
                                        }}
                                    />
                                </div>

                                {/* Back Face: Contact Form */}
                                <div
                                    ref={backRef}
                                    className="absolute inset-0 w-full rounded-2xl p-6 [backface-visibility:hidden] [transform:rotateY(180deg)]"
                                    style={{
                                        height: 'fit-content',
                                        ...glassCardStyle,
                                        boxShadow: glassTokens.shadowLg,
                                    }}
                                >
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-lg font-semibold text-gray-900">Contact the Builder</h3>
                                        <button
                                            onClick={() => setIsFlipped(false)}
                                            className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors flex items-center gap-1"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                                            </svg>
                                            Back
                                        </button>
                                    </div>
                                    <form onSubmit={handleContactSubmit} className="space-y-4">
                                        <div>
                                            <label htmlFor="desktop-expand-contact-name" className="block text-sm font-medium text-gray-700 mb-1">
                                                Name
                                            </label>
                                            <input
                                                type="text"
                                                id="desktop-expand-contact-name"
                                                name="name"
                                                autoComplete="name"
                                                required
                                                value={contactFormData.name}
                                                onChange={(e) => setContactFormData({ ...contactFormData, name: e.target.value })}
                                                className="w-full px-4 py-2.5 bg-gray-100 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400/30 focus:border-gray-400 transition-all"
                                                placeholder="Your name"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="desktop-expand-contact-email" className="block text-sm font-medium text-gray-700 mb-1">
                                                Email
                                            </label>
                                            <input
                                                type="email"
                                                id="desktop-expand-contact-email"
                                                name="email"
                                                autoComplete="email"
                                                required
                                                value={contactFormData.email}
                                                onChange={(e) => setContactFormData({ ...contactFormData, email: e.target.value })}
                                                className="w-full px-4 py-2.5 bg-gray-100 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400/30 focus:border-gray-400 transition-all"
                                                placeholder="your@email.com"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="desktop-expand-contact-message" className="block text-sm font-medium text-gray-700 mb-1">
                                                Message
                                            </label>
                                            <textarea
                                                id="desktop-expand-contact-message"
                                                name="message"
                                                autoComplete="off"
                                                required
                                                rows={3}
                                                value={contactFormData.message}
                                                onChange={(e) => setContactFormData({ ...contactFormData, message: e.target.value })}
                                                className="w-full px-4 py-2.5 bg-gray-100 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400/30 focus:border-gray-400 transition-all resize-none"
                                                placeholder="How can we help?"
                                            />
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={isSubmitting}
                                            className="w-full h-9 rounded-full text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                            style={{
                                                background: 'linear-gradient(135deg, #FF6259, #E8453C)',
                                                boxShadow: '0 2px 8px rgba(232,69,60,0.3)',
                                                fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
                                                letterSpacing: '-0.01em',
                                            }}
                                        >
                                            {isSubmitting ? 'Sending...' : 'Send Message'}
                                        </button>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Mobile menu — plain icon, no chrome line */}
                    <button
                        type="button"
                        onClick={() => {
                            setIsFlipped(false)
                            setIsMobileMenuOpen(true)
                        }}
                        className="md:hidden flex flex-shrink-0 items-center justify-center bg-transparent text-[#111] active:scale-95 transition-transform"
                        style={{
                            height: HOME_COMPACT_SIZE,
                            width: HOME_COMPACT_SIZE,
                        }}
                        aria-label="Open menu"
                        aria-expanded={isMobileMenuOpen}
                    >
                        <Menu className="h-[18px] w-[18px]" strokeWidth={2.25} aria-hidden="true" />
                    </button>
                </div>
            </header>

            {/* Mobile full-screen menu — portaled so overflow/safe-area match landing + item popups */}
            {menuPortalReady &&
                createPortal(
                    <div
                        ref={mobileMenuRef}
                        className={`fullscreen-overlay md:hidden bg-[#F5F5F5] transition-opacity duration-300 ${isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                            }`}
                    >
                        <div className="h-full overflow-y-auto overscroll-contain">
                            <div className="flex min-h-full flex-col">
                                <div
                                    className="flex items-start justify-between gap-3 px-5 pb-3"
                                    style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1.25rem)' }}
                                >
                                    <h2
                                        className="min-w-0 text-[26px] leading-[1.15] font-normal tracking-wide text-gray-900"
                                        style={{ fontFamily: 'var(--font-raleway), sans-serif' }}
                                    >
                                        Welcome to
                                        <br />
                                        The Menu Guide
                                    </h2>
                                    <button
                                        onClick={closeMobileMenu}
                                        className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-full transition-all duration-200"
                                        style={{
                                            background: 'rgba(0,0,0,0.06)',
                                            border: '0.5px solid rgba(0,0,0,0.08)',
                                        }}
                                        aria-label="Close menu"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                </div>

                                <div className="px-4">
                                    <div
                                        className="rounded-2xl p-5"
                                        style={glassCardStyle}
                                    >
                                        <div className={`transition-all duration-300 ease-in-out ${isFlipped ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100 h-auto'}`}>
                                            <div className="flex justify-between items-center mb-4">
                                                <h3
                                                    className="text-lg font-semibold text-gray-900"
                                                    style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif' }}
                                                >
                                                    Restaurant Login
                                                </h3>
                                                <button
                                                    onClick={() => setIsFlipped(true)}
                                                    className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
                                                >
                                                    Contact
                                                </button>
                                            </div>
                                            <AuthForm
                                                onSuccess={closeMobileMenu}
                                                variant="default"
                                                labelColor="text-gray-700"
                                                onForgotPassword={() => {
                                                    closeMobileMenu()
                                                    if (onResetPasswordClick) {
                                                        onResetPasswordClick()
                                                    }
                                                }}
                                            />
                                        </div>

                                        <div className={`transition-all duration-300 ease-in-out ${isFlipped ? 'opacity-100 h-auto' : 'opacity-0 h-0 overflow-hidden'}`}>
                                            <div className="flex justify-between items-center mb-4">
                                                <h3
                                                    className="text-lg font-semibold text-gray-900"
                                                    style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif' }}
                                                >
                                                    Contact the Builder
                                                </h3>
                                                <button
                                                    onClick={() => setIsFlipped(false)}
                                                    className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors flex items-center gap-1"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                                                    </svg>
                                                    Back
                                                </button>
                                            </div>
                                            <form onSubmit={handleContactSubmit} className="space-y-4">
                                                <div>
                                                    <label htmlFor="mobile-contact-name" className="block text-sm font-medium text-gray-700 mb-1">
                                                        Name
                                                    </label>
                                                    <input
                                                        type="text"
                                                        id="mobile-contact-name"
                                                        name="name"
                                                        autoComplete="name"
                                                        required
                                                        value={contactFormData.name}
                                                        onChange={(e) => setContactFormData({ ...contactFormData, name: e.target.value })}
                                                        className="w-full px-4 py-2.5 bg-gray-100 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400/30 focus:border-gray-400 transition-all"
                                                        placeholder="Your name"
                                                    />
                                                </div>
                                                <div>
                                                    <label htmlFor="mobile-contact-email" className="block text-sm font-medium text-gray-700 mb-1">
                                                        Email
                                                    </label>
                                                    <input
                                                        type="email"
                                                        id="mobile-contact-email"
                                                        name="email"
                                                        autoComplete="email"
                                                        required
                                                        value={contactFormData.email}
                                                        onChange={(e) => setContactFormData({ ...contactFormData, email: e.target.value })}
                                                        className="w-full px-4 py-2.5 bg-gray-100 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400/30 focus:border-gray-400 transition-all"
                                                        placeholder="your@email.com"
                                                    />
                                                </div>
                                                <div>
                                                    <label htmlFor="mobile-contact-message" className="block text-sm font-medium text-gray-700 mb-1">
                                                        Message
                                                    </label>
                                                    <textarea
                                                        id="mobile-contact-message"
                                                        name="message"
                                                        autoComplete="off"
                                                        required
                                                        rows={3}
                                                        value={contactFormData.message}
                                                        onChange={(e) => setContactFormData({ ...contactFormData, message: e.target.value })}
                                                        className="w-full px-4 py-2.5 bg-gray-100 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400/30 focus:border-gray-400 transition-all resize-none"
                                                        placeholder="How can we help?"
                                                    />
                                                </div>
                                                <button
                                                    type="submit"
                                                    disabled={isSubmitting}
                                                    className="w-full h-9 rounded-full text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                                    style={{
                                                        background: 'linear-gradient(135deg, #FF6259, #E8453C)',
                                                        boxShadow: '0 2px 8px rgba(232,69,60,0.3)',
                                                        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
                                                        letterSpacing: '-0.01em',
                                                    }}
                                                >
                                                    {isSubmitting ? 'Sending...' : 'Send Message'}
                                                </button>
                                            </form>
                                        </div>
                                    </div>

                                    <Link
                                        href="/getting-started"
                                        onClick={closeMobileMenu}
                                        className="mt-3 flex items-center justify-between rounded-2xl px-5 py-4 text-[16px] font-medium text-gray-900"
                                        style={{
                                            ...glassCardStyle,
                                            fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
                                        }}
                                    >
                                        Getting Started
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                                            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                        </svg>
                                    </Link>

                                    <div className="w-full">
                                        <Image
                                            src="/CarolLogo.png"
                                            alt="The Menu Guide chef illustration"
                                            width={390}
                                            height={390}
                                            className="w-full h-auto block"
                                        />
                                        <p
                                            className="text-xs text-center pt-3 text-gray-500"
                                            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.5rem)' }}
                                        >
                                            Thanks for using The Menu Guide :)
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}
        </>
    )
}
