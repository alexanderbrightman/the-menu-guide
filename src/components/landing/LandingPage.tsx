'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { PasswordResetModal } from '@/components/auth/PasswordResetModal'
import { SpecialsCard, type Special } from '@/components/landing/SpecialsCard'
import { SpecialItemModal } from '@/components/landing/SpecialItemModal'
import { HappyHourCard, type HappyHourEntry } from '@/components/landing/HappyHourCard'
import { HappyHourModal } from '@/components/landing/HappyHourModal'
import { PreFixeCard, type PreFixeEntry } from '@/components/landing/PreFixeCard'
import { PreFixeModal } from '@/components/landing/PreFixeModal'
import { Header } from '@/components/landing/Header'
import { HomeTabSwitcher, type HomeTab } from '@/components/landing/HomeTabSwitcher'
import { MobileTabBar } from '@/components/landing/MobileTabBar'
import { FloatingSearchButton } from '@/components/landing/FloatingSearchButton'
import { useUserLocation } from '@/hooks/useUserLocation'
import { useIsMobile } from '@/hooks/useIsMobile'

const TAB_ORDER: HomeTab[] = ['specials', 'happy-hour', 'prefxe']
const SWIPE_THRESHOLD_PX = 56

export function LandingPage() {
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<HomeTab>('specials')

  const [selectedSpecial, setSelectedSpecial] = useState<Special | null>(null)
  const [selectedHappyHour, setSelectedHappyHour] = useState<HappyHourEntry | null>(null)
  const [selectedPreFixe, setSelectedPreFixe] = useState<PreFixeEntry | null>(null)

  // User location feeds the discover APIs, which sort results by
  // nearest restaurant server-side (lat/lng query params).
  const { location, denied, loading: locationLoading } = useUserLocation()

  const isMobile = useIsMobile()

  // Collapse the header as the user scrolls down through the items so the
  // cards get full view; reveal it again on scroll up / at the top. Mobile only.
  const [headerHidden, setHeaderHidden] = useState(false)
  const [headerHeight, setHeaderHeight] = useState<number>()
  const headerInnerRef = useRef<HTMLDivElement>(null)
  const lastScrollY = useRef(0)
  const swipeStart = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    if (!headerInnerRef.current) return
    const measure = () => setHeaderHeight(headerInnerRef.current?.offsetHeight)
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  const handleContentScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (!isMobile) return
    const y = e.currentTarget.scrollTop
    const last = lastScrollY.current
    if (y <= 8) {
      setHeaderHidden(false)
    } else if (y > last + 4) {
      setHeaderHidden(true)
    } else if (y < last - 4) {
      setHeaderHidden(false)
    }
    lastScrollY.current = y
  }

  // Extend the home background through safe areas and overscroll on mobile.
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const apply = () => {
      document.documentElement.classList.toggle('landing-mobile-bg', mq.matches)
    }
    apply()
    mq.addEventListener('change', apply)
    return () => {
      mq.removeEventListener('change', apply)
      document.documentElement.classList.remove('landing-mobile-bg')
    }
  }, [])

  const handleTabChange = (tab: HomeTab) => {
    setActiveTab(tab)
    // New tab panel mounts scrolled to the top — show the header again.
    lastScrollY.current = 0
    setHeaderHidden(false)
  }

  // Lightweight horizontal swipe: no Framer drag on the image-heavy panels.
  // Only switches tabs when the gesture is clearly horizontal past a threshold.
  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0]
    swipeStart.current = { x: t.clientX, y: t.clientY }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    const start = swipeStart.current
    swipeStart.current = null
    if (!start) return

    const t = e.changedTouches[0]
    const dx = t.clientX - start.x
    const dy = t.clientY - start.y
    if (Math.abs(dx) < SWIPE_THRESHOLD_PX) return
    if (Math.abs(dx) < Math.abs(dy) * 1.2) return // prefer vertical scroll

    const idx = TAB_ORDER.indexOf(activeTab)
    if (dx < 0 && idx < TAB_ORDER.length - 1) {
      handleTabChange(TAB_ORDER[idx + 1])
    } else if (dx > 0 && idx > 0) {
      handleTabChange(TAB_ORDER[idx - 1])
    }
  }

  const tabPanelProps = {
    location,
    locationDenied: denied,
    locationLoading,
    className: 'w-full',
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'specials':
        return <SpecialsCard {...tabPanelProps} onItemClick={setSelectedSpecial} />
      case 'happy-hour':
        return <HappyHourCard {...tabPanelProps} onItemClick={setSelectedHappyHour} />
      case 'prefxe':
        return <PreFixeCard {...tabPanelProps} onItemClick={setSelectedPreFixe} />
    }
  }

  return (
    <div
      className="h-[100dvh] md:h-screen flex flex-col overflow-hidden bg-[#F5F5F5] min-h-[100dvh]"
      style={{ fontFamily: 'var(--font-raleway), sans-serif' }}
    >
      {/* Header in normal flow so it never overlaps the content. On mobile it
          collapses to reclaim vertical space as the user scrolls the items. */}
      {/* overflow-hidden is mobile-only: it clips the collapsing header animation.
          On desktop it must be visible so the Sign In dropdown can paint below the header. */}
      <motion.div
        className="relative z-30 flex-shrink-0 overflow-hidden md:overflow-visible bg-[#F5F5F5]"
        initial={false}
        animate={{
          height: isMobile ? (headerHidden ? 0 : headerHeight ?? 'auto') : 'auto',
        }}
        transition={{ type: 'spring', stiffness: 400, damping: 40 }}
      >
        <div ref={headerInnerRef}>
          <Header onResetPasswordClick={() => setShowPasswordResetModal(true)} />
        </div>
      </motion.div>

      {/* Desktop: three discrete tab buttons below the header.
          Mobile: tabs live in the bottom bar instead. */}
      <div className="hidden md:block flex-shrink-0">
        <HomeTabSwitcher activeTab={activeTab} onTabChange={handleTabChange} />
      </div>

      {/* Instant tab panels — no slide remount animation (that was the ~4s lag).
          Touch swipe still advances tabs when the gesture is clearly horizontal. */}
      <div
        className="flex-1 min-h-0 relative overflow-hidden bg-[#F5F5F5]"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div
          onScroll={handleContentScroll}
          className="h-full overflow-y-auto overscroll-contain bg-[#F5F5F5] px-4 pt-1 pb-[calc(env(safe-area-inset-bottom,0px)+76px)] md:pt-2 md:pb-10"
        >
          <div className="max-w-3xl mx-auto w-full">
            {renderTabContent()}
          </div>
        </div>
      </div>

      {/* Mobile-only bottom navigation: tab buttons + search button */}
      <MobileTabBar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onSearchClick={() => setSearchOpen(true)}
      />

      {/* Search overlay. The trigger FAB renders on desktop only;
          on mobile the bottom bar's search button opens the same panel. */}
      <FloatingSearchButton open={searchOpen} onOpenChange={setSearchOpen} />

      {selectedSpecial && (
        <SpecialItemModal special={selectedSpecial} onClose={() => setSelectedSpecial(null)} />
      )}
      {selectedHappyHour && (
        <HappyHourModal entry={selectedHappyHour} onClose={() => setSelectedHappyHour(null)} />
      )}
      {selectedPreFixe && (
        <PreFixeModal entry={selectedPreFixe} onClose={() => setSelectedPreFixe(null)} />
      )}
      {showPasswordResetModal && (
        <PasswordResetModal onClose={() => setShowPasswordResetModal(false)} />
      )}
    </div>
  )
}
