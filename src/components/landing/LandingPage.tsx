'use client'

import { useState, useEffect, useRef } from 'react'
import { PasswordResetModal } from '@/components/auth/PasswordResetModal'
import { SpecialsCard, type Special } from '@/components/landing/SpecialsCard'
import { SpecialItemModal } from '@/components/landing/SpecialItemModal'
import { HappyHourCard, type HappyHourEntry } from '@/components/landing/HappyHourCard'
import { HappyHourModal } from '@/components/landing/HappyHourModal'
import { PreFixeCard, type PreFixeEntry } from '@/components/landing/PreFixeCard'
import { PreFixeModal } from '@/components/landing/PreFixeModal'
import { Header } from '@/components/landing/Header'
import { type HomeTab } from '@/components/landing/HomeTabSwitcher'
import { useUserLocation } from '@/hooks/useUserLocation'
import { useChromeColor } from '@/hooks/useChromeColor'
import { CHROME_COLORS } from '@/lib/chrome-color'

const TAB_ORDER: HomeTab[] = ['specials', 'happy-hour', 'prefxe']
const SWIPE_THRESHOLD_PX = 56

export function LandingPage() {
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false)
  const [activeTab, setActiveTab] = useState<HomeTab>('specials')

  const [selectedSpecial, setSelectedSpecial] = useState<Special | null>(null)
  const [selectedHappyHour, setSelectedHappyHour] = useState<HappyHourEntry | null>(null)
  const [selectedPreFixe, setSelectedPreFixe] = useState<PreFixeEntry | null>(null)

  // User location feeds the discover APIs, which sort results by
  // nearest restaurant server-side (lat/lng query params).
  const { location, denied } = useUserLocation()

  // Warm the other tabs after first paint so switching does not wait on JSON.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetch('/api/happy-hour?discover=1')
      void fetch('/api/prefxe?discover=1')
    }, 400)
    return () => window.clearTimeout(timer)
  }, [])

  useChromeColor(CHROME_COLORS.app)

  const swipeStart = useRef<{ x: number; y: number } | null>(null)

  const handleTabChange = (tab: HomeTab) => {
    setActiveTab(tab)
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
      <div className="relative z-30 flex-shrink-0 bg-[#F5F5F5] px-4">
        <div className="mx-auto w-full max-w-3xl">
          <Header
            activeTab={activeTab}
            onTabChange={handleTabChange}
            onResetPasswordClick={() => setShowPasswordResetModal(true)}
          />
        </div>
      </div>

      <div
        className="flex-1 min-h-0 relative overflow-hidden bg-[#F5F5F5]"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="h-full overflow-y-auto overscroll-contain bg-[#F5F5F5] px-4 pt-1 pb-[calc(env(safe-area-inset-bottom,0px)+16px)] md:pt-2 md:pb-10">
          <div className="max-w-3xl mx-auto w-full">
            {renderTabContent()}
          </div>
        </div>
      </div>

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
