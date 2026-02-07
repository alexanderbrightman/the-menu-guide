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

// Dining images component - shared between mobile and desktop
function DiningImages() {
  return (
    <div className="w-full flex justify-center items-center gap-4 md:gap-6">
      <div className="w-1/3 max-w-[200px] md:max-w-[350px]">
        <Image
          src="/dining1.png"
          alt="Dining illustration 1"
          width={350}
          height={262}
          className="w-full h-auto object-contain"
          priority
        />
      </div>
      <div className="w-1/3 max-w-[200px] md:max-w-[350px]">
        <Image
          src="/dining2.png"
          alt="Dining illustration 2"
          width={350}
          height={262}
          className="w-full h-auto object-contain"
          priority
        />
      </div>
      <div className="w-1/3 max-w-[200px] md:max-w-[350px]">
        <Image
          src="/dining3.png"
          alt="Dining illustration 3"
          width={350}
          height={262}
          className="w-full h-auto object-contain"
          priority
        />
      </div>
    </div>
  )
}

export function LandingPage() {
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false)
  const [selectedSpecial, setSelectedSpecial] = useState<Special | null>(null)

  return (
    <div
      className="min-h-screen"
      style={{ backgroundImage: 'linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 100%)' }}
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
        <section className="min-h-screen w-full snap-start flex flex-col items-center justify-center px-4 pt-20 pb-8 relative">
          {/* Images positioned above the search bar - wider container */}
          <div className="absolute left-0 right-0 flex justify-center" style={{ top: 'calc(50% - 220px)' }}>
            <div className="w-full max-w-5xl px-4">
              <DiningImages />
            </div>
          </div>
          {/* Search bar container - this is the TRUE center */}
          <div className="w-full max-w-2xl flex flex-col items-center relative">
            {/* Search bar at center */}
            <SearchSection />
          </div>
          {/* Visual cue to scroll */}
          <div className="absolute bottom-8 left-0 right-0 flex justify-center animate-bounce-slow text-gray-400">
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
            <div className="relative w-full max-h-[60vh] aspect-[3/4] rounded-lg overflow-hidden border border-black">
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

          {/* Vertical stack: dining1 → search → dining2 → dining3 */}
          <div className="flex-1 flex flex-col items-center justify-center pt-16 pb-16 px-4 gap-4">
            {/* Image 1 - full width */}
            <div className="w-full flex justify-center">
              <Image
                src="/dining1.png"
                alt="Dining illustration 1"
                width={400}
                height={300}
                className="w-full max-w-md h-auto object-contain"
                priority
              />
            </div>

            {/* Search bar */}
            <div className="w-full max-w-2xl">
              <SearchSection />
            </div>

            {/* Image 2 - full width */}
            <div className="w-full flex justify-center">
              <Image
                src="/dining2.png"
                alt="Dining illustration 2"
                width={400}
                height={300}
                className="w-full max-w-md h-auto object-contain"
                priority
              />
            </div>

            {/* Image 3 - full width */}
            <div className="w-full flex justify-center">
              <Image
                src="/dining3.png"
                alt="Dining illustration 3"
                width={400}
                height={300}
                className="w-full max-w-md h-auto object-contain"
                priority
              />
            </div>
          </div>

          {/* Visual cue to scroll */}
          <div className="absolute bottom-8 left-0 right-0 flex justify-center animate-bounce-slow text-gray-400">
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
            <div className="relative w-full h-full max-h-[60vh] aspect-[3/4] rounded-lg overflow-hidden border border-black">
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
