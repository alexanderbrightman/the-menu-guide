'use client'

import { useState } from 'react'
import { PasswordResetModal } from '@/components/auth/PasswordResetModal'
import { SpecialsCard } from '@/components/landing/SpecialsCard'
import { SpecialItemModal } from '@/components/landing/SpecialItemModal'
import { SearchSection } from '@/components/landing/SearchSection'
import { FohImageCard } from '@/components/landing/FohImageCard'

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
      className="min-h-screen bg-[#FAFAFA]"
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

      {/* Desktop View */}
      <div className="hidden md:flex flex-col min-h-screen">
        <Header onLoginClick={() => setShowLoginModal(true)} />

        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-6 flex flex-col justify-center">

          {/* Content Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full items-stretch">
            {/* Left Column: Search & Specials */}
            <div className="flex flex-col gap-6 w-full h-full">
              <SearchSection />
              <SpecialsCard
                onItemClick={setSelectedSpecial}
                className="flex-1 w-full"
              />
            </div>

            {/* Right Column: Info, FOH Image, Contact */}
            <div className="flex flex-col gap-6 w-full h-full">
              <div className="w-full">
                <InfoTextCard />
              </div>
              <div className="flex-1 w-full relative min-h-[300px]">
                <FohImageCard fill className="rounded-lg object-cover h-full" />
              </div>
              <div className="flex justify-center">
                <ContactLink />
              </div>
            </div>
          </div>

        </main>
      </div>

      {/* Mobile View - Scroll Snap */}
      <div className="md:hidden h-[100dvh] overflow-y-auto snap-y snap-mandatory scroll-smooth">

        {/* Section 1: Header + Search */}
        <section className="h-[100dvh] w-full snap-start flex flex-col relative">
          <div className="absolute top-0 left-0 right-0 z-50">
            <Header onLoginClick={() => setShowLoginModal(true)} />
          </div>
          <div className="flex-1 flex items-center justify-center px-4 w-full">
            <SearchSection />
          </div>
          {/* Visual cue to scroll */}
          <div className="absolute bottom-8 left-0 right-0 flex justify-center animate-bounce-slow text-gray-400">
            <span className="text-sm">Scroll for Local Specials</span>
          </div>
        </section>

        {/* Section 2: Specials */}
        <section className="h-[100dvh] w-full snap-start flex flex-col p-4 py-12">
          <SpecialsCard
            onItemClick={setSelectedSpecial}
            className="w-full h-full"
            mobileFullHeight
          />
        </section>

        {/* Section 3: Info + Image + Contact */}
        <section className="h-[100dvh] w-full snap-start flex flex-col p-4 justify-between py-8 gap-4">
          <div className="flex-shrink-0">
            <InfoTextCard />
          </div>

          <div className="flex-1 flex items-center justify-center min-h-0 py-4">
            <div className="relative w-full h-full max-h-[60vh] aspect-[3/4] rounded-lg overflow-hidden border border-black">
              <FohImageCard fill className="h-full" />
            </div>
          </div>

          <div className="flex-shrink-0 flex justify-center pb-8">
            <ContactLink />
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
