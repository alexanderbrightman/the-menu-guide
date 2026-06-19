'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PasswordResetModal } from '@/components/auth/PasswordResetModal'
import { SpecialsCard, type Special } from '@/components/landing/SpecialsCard'
import { SpecialItemModal } from '@/components/landing/SpecialItemModal'
import { HappyHourCard, type HappyHourEntry } from '@/components/landing/HappyHourCard'
import { HappyHourModal } from '@/components/landing/HappyHourModal'
import { PreFixeCard, type PreFixeEntry } from '@/components/landing/PreFixeCard'
import { PreFixeModal } from '@/components/landing/PreFixeModal'
import { Header } from '@/components/landing/Header'
import { MapSection } from '@/components/landing/MapSection'
import { HomeTabSwitcher, type HomeTab } from '@/components/landing/HomeTabSwitcher'
import { FloatingSearchButton } from '@/components/landing/FloatingSearchButton'
import { useUserLocation } from '@/hooks/useUserLocation'

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

  const { location, denied, loading: locationLoading } = useUserLocation()

  const handleTabChange = (tab: HomeTab) => {
    const prevIdx = TAB_ORDER.indexOf(activeTab)
    const nextIdx = TAB_ORDER.indexOf(tab)
    setTabDirection(nextIdx > prevIdx ? 1 : -1)
    setActiveTab(tab)
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

  const section1 = (
    <section className="h-[100dvh] md:h-screen w-full snap-start flex flex-col relative">
      {/* Header in normal flow so it never overlaps the tabs */}
      <div className="relative z-30 flex-shrink-0">
        <Header onResetPasswordClick={() => setShowPasswordResetModal(true)} />
      </div>

      <HomeTabSwitcher activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Animated, scrollable content panel */}
      <div className="flex-1 min-h-0 relative overflow-hidden">
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
            <div className="h-full overflow-y-auto overscroll-contain px-4 pt-2 pb-28">
              <div className="max-w-3xl mx-auto w-full">
                {renderTabContent()}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  )

  const section2 = (
    <section
      className="h-[100dvh] w-full snap-start flex items-center justify-center px-4"
      style={{ isolation: 'isolate', backgroundColor: '#F5F5F5' }}
    >
      <div className="w-full max-w-md md:w-[480px] h-[85dvh] md:max-h-[700px]">
        <MapSection />
      </div>
    </section>
  )

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: '#F5F5F5', fontFamily: 'var(--font-raleway), sans-serif' }}
    >
      <div className="h-[100dvh] md:h-screen overflow-y-auto snap-y snap-mandatory scroll-smooth">
        {section1}
        {section2}
      </div>

      {/* Floating search — anchored to viewport, outside scroll/transform contexts */}
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
