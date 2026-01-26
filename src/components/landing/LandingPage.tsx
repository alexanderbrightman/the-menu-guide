'use client'

import { useState } from 'react'
import { PasswordResetModal } from '@/components/auth/PasswordResetModal'
import { SpecialsCard } from '@/components/landing/SpecialsCard'
import { SpecialItemModal } from '@/components/landing/SpecialItemModal'
import { SearchSection } from '@/components/landing/SearchSection'
import { FohImageCard } from '@/components/landing/FohImageCard'
import { BohImageCard } from '@/components/landing/BohImageCard'
import { InfoTextCard } from '@/components/landing/InfoTextCard'
import { ContactLink } from '@/components/landing/ContactLink'
import { Header } from '@/components/landing/Header'
import { LoginModal } from '@/components/landing/LoginModal'

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
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false)
  const [selectedSpecial, setSelectedSpecial] = useState<Special | null>(null)

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
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

      <Header onLoginClick={() => setShowLoginModal(true)} />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6">

        {/* Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full items-stretch">
          {/* Left Column: Search & Specials */}
          <div className="flex flex-col gap-6 w-full">
            <SearchSection />
            <SpecialsCard
              onItemClick={setSelectedSpecial}
              className="h-[460px] w-full"
            />
          </div>

          {/* Right Column: Images */}
          <div className="flex flex-col gap-6 w-full">
            {/* Desktop View: Full Height Images */}
            <div className="hidden md:flex flex-col w-full h-full">
              <FohImageCard fill className="flex-1" />
              <BohImageCard fill className="flex-1" />
            </div>

            {/* Mobile View: Stacked Images */}
            <div className="flex md:hidden flex-col w-full">
              <FohImageCard />
              <BohImageCard />
            </div>
          </div>
        </div>

        {/* Info Text */}
        <div className="w-full">
          <InfoTextCard />
        </div>

        {/* Contact Link */}
        <div className="flex justify-center mt-4">
          <ContactLink />
        </div>

      </main>

      {/* Modals */}
      {
        selectedSpecial && (
          <SpecialItemModal special={selectedSpecial} onClose={() => setSelectedSpecial(null)} />
        )
      }

      {
        showLoginModal && (
          <LoginModal
            onClose={() => setShowLoginModal(false)}
            onResetPasswordClick={() => {
              setShowLoginModal(false)
              setShowPasswordResetModal(true)
            }}
          />
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
