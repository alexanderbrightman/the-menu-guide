'use client'

import { useState } from 'react'
import Image from 'next/image'
import { PasswordResetModal } from '@/components/auth/PasswordResetModal'
import { SpecialsCard } from '@/components/landing/SpecialsCard'
import { SpecialItemModal } from '@/components/landing/SpecialItemModal'
import { SearchSection } from '@/components/landing/SearchSection'
import { FohImageCard } from '@/components/landing/FohImageCard'
import { InfoTextCard } from '@/components/landing/InfoTextCard'
import { Header } from '@/components/landing/Header'

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
      style={{ backgroundColor: '#f5f0e8', fontFamily: 'var(--font-raleway), sans-serif' }}
    >
      <style jsx global>{`
        @keyframes swing {
          0%,
          100% {
            transform: translateX(0);
          }
          50% {
            transform: translateX(5px);
          }
        }
        .arrow-swing-animation {
          animation: swing 1s ease-in-out infinite;
        }
        @keyframes bounce {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(5px);
          }
        }
        .animate-bounce-slow {
          animation: bounce 2s infinite;
        }
      `}</style>

      {/* Desktop View - Scroll Snap */}
      <div className="hidden md:block h-screen overflow-y-auto snap-y snap-mandatory scroll-smooth">

        {/* Fixed Header */}
        <div className="fixed top-0 left-0 right-0 z-50">
          <Header
            onResetPasswordClick={() => setShowPasswordResetModal(true)}
          />
        </div>

        {/* Section 1: Images + Search */}
        <section className="min-h-screen w-full snap-start flex flex-col items-center justify-center px-4 pt-20 pb-16 relative">
          <div className="w-full max-w-3xl flex flex-col items-center justify-center gap-8 flex-1">
            {/* Dining2 above search */}
            <div className="w-full max-w-[500px]">
              <Image
                src="/dining2.png"
                alt="Dining illustration"
                width={500}
                height={375}
                className="w-full h-auto object-contain"
                priority
              />
            </div>

            {/* Search bar */}
            <div className="w-full max-w-2xl">
              <SearchSection />
            </div>

            {/* Dining3 below search */}
            <div className="w-full max-w-[500px]">
              <Image
                src="/dining3.png"
                alt="Dining illustration"
                width={500}
                height={375}
                className="w-full h-auto object-contain"
                priority
              />
            </div>
          </div>

          {/* Visual cue to scroll */}
          <div className="absolute bottom-8 left-0 right-0 flex justify-center animate-bounce-slow text-gray-600">
            <span className="text-sm">Scroll for Local Specials</span>
          </div>
        </section>

        {/* Section 2: Specials */}
        <section className="min-h-screen w-full snap-start flex flex-col items-center justify-center px-4 py-8">
          <div className="w-full max-w-2xl flex flex-col items-center">
            <SpecialsCard
              onItemClick={setSelectedSpecial}
              className="w-full"
            />
          </div>
        </section>

        {/* Section 3: Info, FOH Image */}
        <section className="min-h-screen w-full snap-start flex flex-col items-center justify-center px-4 py-8">
          <div className="w-full max-w-2xl flex flex-col items-center gap-8">
            <InfoTextCard />
            <div className="relative w-full max-h-[60vh] aspect-[3/4] rounded-lg overflow-hidden border border-gray-800">
              <FohImageCard fill className="rounded-lg object-cover h-full" />
            </div>
          </div>
        </section>

      </div>

      {/* Mobile View - Scroll Snap (identical layout to desktop, except Header shows side menu button) */}
      <div className="md:hidden h-[100dvh] overflow-y-auto snap-y snap-mandatory scroll-smooth">

        {/* Section 1: Header + Images + Search - Mobile vertical stack layout */}
        <section className="h-[100dvh] w-full snap-start flex flex-col relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 z-50">
            <Header
              onResetPasswordClick={() => setShowPasswordResetModal(true)}
            />
          </div>

          {/* Vertical stack: dining2 → search → dining3 with equal spacing */}
          <div className="flex-1 flex flex-col items-center justify-between pt-20 pb-16 px-0 min-h-0">
            {/* Dining2 above search - full width */}
            <div className="flex-1 w-full flex items-center justify-center">
              <Image
                src="/dining2.png"
                alt="Dining illustration"
                width={600}
                height={450}
                className="w-full h-auto max-h-[30vh] object-contain px-4"
                priority
              />
            </div>

            {/* Search bar */}
            <div className="w-full px-4 flex-shrink-0 z-10">
              <SearchSection />
            </div>

            {/* Dining3 below search - full width */}
            <div className="flex-1 w-full flex items-center justify-center">
              <Image
                src="/dining3.png"
                alt="Dining illustration"
                width={600}
                height={450}
                className="w-full h-auto max-h-[30vh] object-contain px-4"
                priority
              />
            </div>
          </div>

          {/* Visual cue to scroll */}
          <div className="absolute bottom-8 left-0 right-0 flex justify-center animate-bounce-slow text-gray-600">
            <span className="text-sm">Scroll for Local Specials</span>
          </div>
        </section>

        {/* Section 2: Specials */}
        <section className="h-[100dvh] w-full snap-start flex flex-col items-center justify-center p-4 py-12">
          <SpecialsCard
            onItemClick={setSelectedSpecial}
            className="w-full h-full"
            mobileFullHeight
          />
        </section>

        {/* Section 3: Info + Image */}
        <section className="h-[100dvh] w-full snap-start flex flex-col p-4 justify-center py-8 gap-4">
          <div className="flex-shrink-0">
            <InfoTextCard />
          </div>

          <div className="flex-1 flex items-center justify-center min-h-0 py-4">
            <div className="relative w-full h-full max-h-[60vh] aspect-[3/4] rounded-lg overflow-hidden border border-gray-800">
              <FohImageCard fill className="h-full" />
            </div>
          </div>
        </section>

      </div>

      {/* Modals */}
      {
        selectedSpecial && (
          <SpecialItemModal special={selectedSpecial} onClose={() => setSelectedSpecial(null)} />
        )
      }



      {
        showPasswordResetModal && (
          <PasswordResetModal onClose={() => setShowPasswordResetModal(false)} />
        )
      }
    </div >
  )
}
