'use client'

import { useState } from 'react'
import { PasswordResetModal } from '@/components/auth/PasswordResetModal'
import { SpecialsCard } from '@/components/landing/SpecialsCard'
import { SpecialItemModal } from '@/components/landing/SpecialItemModal'
import { SearchSection } from '@/components/landing/SearchSection'
import { TitleCard } from '@/components/landing/TitleCard'
import { LoginCard } from '@/components/landing/LoginCard'
import { InfoCard } from '@/components/landing/InfoCard'
import { ContactLink } from '@/components/landing/ContactLink'

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
      style={{
        fontFamily: 'var(--font-nunito)',
        backgroundColor: '#FAFAFA'
      }}
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

      {/* Mobile Layout - Hidden on Large Screens */}
      <div className="lg:hidden">
        {/* Part 1: First screen - centered in viewport */}
        <div className="min-h-[100dvh] bg-[#FAFAFA] p-4 flex flex-col justify-center gap-6">
          <div className="flex-none">
            <SearchSection />
          </div>
          <div className="flex-none">
            <TitleCard />
          </div>
          <div className="flex-none relative w-full">
            <SpecialsCard
              onItemClick={setSelectedSpecial}
              className="h-[340px] w-full"
            />
          </div>
        </div>

        {/* Part 2: Second screen - centered in viewport */}
        <div className="min-h-[100dvh] bg-[#FAFAFA] flex flex-col p-4 gap-6 justify-center">
          <div className="flex flex-col gap-6 w-full">
            <LoginCard onResetPasswordClick={() => setShowPasswordResetModal(true)} />
            <InfoCard />
            <ContactLink />
          </div>
        </div>
      </div>

      {/* Desktop Layout - Hidden on Small Screens */}
      <div className="hidden lg:block max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 relative z-0">
        {/* Search Bar - Full Width at Top */}
        <div className="mb-6">
          <SearchSection />
        </div>

        {/* Card Grid - Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="flex flex-col gap-6">
            <TitleCard />
            <SpecialsCard
              onItemClick={setSelectedSpecial}
              className="h-[340px]"
            />
          </div>

          {/* Right Column */}
          <div className="flex flex-col gap-6">
            <LoginCard onResetPasswordClick={() => setShowPasswordResetModal(true)} />
            <InfoCard />
          </div>
        </div>

        {/* Contact the Builder Link - Centered Below Cards */}
        <ContactLink />
      </div>

      {/* Modals */}
      {selectedSpecial && (
        <SpecialItemModal special={selectedSpecial} onClose={() => setSelectedSpecial(null)} />
      )}

      {showPasswordResetModal && (
        <PasswordResetModal onClose={() => setShowPasswordResetModal(false)} />
      )}
    </div>
  )
}
