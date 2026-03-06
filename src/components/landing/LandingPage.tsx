'use client'

import { useState } from 'react'
import { PasswordResetModal } from '@/components/auth/PasswordResetModal'
import { SpecialsCard } from '@/components/landing/SpecialsCard'
import { SpecialItemModal } from '@/components/landing/SpecialItemModal'
import { SearchSection } from '@/components/landing/SearchSection'
import { Header } from '@/components/landing/Header'
import { MapSection } from '@/components/landing/MapSection'

interface Special {
  item: {
    id: string
    title: string
    description: string | null
    price: number | null
    image_url: string | null
    category: string | null
  }
  restaurant: {
    id: string
    username: string
    display_name: string
    avatar_url: string | null
    address: string | null
  }
  distance: number | null
}

export function LandingPage() {
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false)
  const [selectedSpecial, setSelectedSpecial] = useState<Special | null>(null)

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: '#F5F5F5', fontFamily: 'var(--font-raleway), sans-serif' }}
    >
      {/* Desktop View - Scroll Snap */}
      <div className="hidden md:block h-screen overflow-y-auto snap-y snap-mandatory scroll-smooth">

        {/* Fixed Header */}
        <div className="fixed top-0 left-0 right-0 z-50">
          <Header onResetPasswordClick={() => setShowPasswordResetModal(true)} />
        </div>

        {/* Section 1: Search + Specials */}
        <section className="min-h-screen w-full snap-start flex flex-col items-center px-4 pt-24 pb-8">
          <div className="w-full max-w-2xl flex flex-col gap-6 flex-1">
            <SearchSection />
            <SpecialsCard
              onItemClick={setSelectedSpecial}
              className="w-full flex-1"
            />
          </div>
        </section>

        {/* Section 2: Restaurant Map */}
        <section className="h-screen w-full snap-start flex items-center justify-center" style={{ isolation: 'isolate', backgroundColor: '#F5F5F5' }}>
          <div className="w-1/2 h-1/2 rounded-2xl overflow-hidden">
            <MapSection />
          </div>
        </section>

      </div>

      {/* Mobile View */}
      <div className="md:hidden h-[100dvh] overflow-y-auto snap-y snap-mandatory scroll-smooth">

        {/* Section 1: Search + Specials */}
        <section className="h-[100dvh] w-full snap-start flex flex-col relative">
          <div className="absolute top-0 left-0 right-0 z-50">
            <Header onResetPasswordClick={() => setShowPasswordResetModal(true)} />
          </div>

          <div className="flex-1 flex flex-col pt-20 pb-4 px-4 gap-4 min-h-0">
            <div className="flex-shrink-0">
              <SearchSection />
            </div>
            <div className="flex-1 min-h-0">
              <SpecialsCard
                onItemClick={setSelectedSpecial}
                className="w-full h-full"
                mobileFullHeight
              />
            </div>
          </div>
        </section>

        {/* Section 2: Restaurant Map */}
        <section className="h-[100dvh] w-full snap-start flex items-center justify-center" style={{ isolation: 'isolate', backgroundColor: '#F5F5F5' }}>
          <div className="w-5/6 h-3/4 rounded-2xl overflow-hidden">
            <MapSection />
          </div>
        </section>

      </div>

      {selectedSpecial && (
        <SpecialItemModal special={selectedSpecial} onClose={() => setSelectedSpecial(null)} />
      )}

      {showPasswordResetModal && (
        <PasswordResetModal onClose={() => setShowPasswordResetModal(false)} />
      )}
    </div>
  )
}
