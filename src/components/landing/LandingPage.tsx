'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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

const slideVariants = {
  enter: (direction: number) => ({ x: direction > 0 ? '100%' : '-100%', opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({ x: direction > 0 ? '-100%' : '100%', opacity: 0 }),
}

export function LandingPage() {
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<HomeTab>('specials')
  const [tabDirection, setTabDirection] = useState(0)

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
    const prevIdx = TAB_ORDER.indexOf(activeTab)
    const nextIdx = TAB_ORDER.indexOf(tab)
    setTabDirection(nextIdx > prevIdx ? 1 : -1)
    setActiveTab(tab)
    // New tab panel mounts scrolled to the top — show the header again.
    lastScrollY.current = 0
    setHeaderHidden(false)
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
      <motion.div
        className="relative z-30 flex-shrink-0 overflow-hidden bg-[#F5F5F5]"
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

      {/* Desktop: segmented tab switcher below the header.
          Mobile: tabs live in the bottom bar instead. */}
      <div className="hidden md:block flex-shrink-0">
        <HomeTabSwitcher activeTab={activeTab} onTabChange={handleTabChange} />
      </div>

      {/* Animated, scrollable content panel. On mobile this fills the
          space between the header and the bottom tab bar; only this
          region scrolls while header + tab bar stay pinned. */}
      <div className="flex-1 min-h-0 relative overflow-hidden bg-[#F5F5F5]">
        <AnimatePresence mode="wait" custom={tabDirection}>
          <motion.div
            key={activeTab}
            custom={tabDirection}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className="absolute inset-0"
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.12}
            onDragEnd={(_, info) => {
              if (info.offset.x < -80) {
                const idx = TAB_ORDER.indexOf(activeTab)
                if (idx < TAB_ORDER.length - 1) handleTabChange(TAB_ORDER[idx + 1])
              } else if (info.offset.x > 80) {
                const idx = TAB_ORDER.indexOf(activeTab)
                if (idx > 0) handleTabChange(TAB_ORDER[idx - 1])
              }
            }}
          >
            <div
              onScroll={handleContentScroll}
              className="h-full overflow-y-auto overscroll-contain bg-[#F5F5F5] px-4 pt-1 pb-[calc(env(safe-area-inset-bottom,0px)+76px)] md:pt-2 md:pb-10"
            >
              <div className="max-w-3xl mx-auto w-full">
                {renderTabContent()}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Mobile-only bottom navigation: tab pill + search button */}
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
