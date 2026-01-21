'use client'

import { useState } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { PasswordResetModal } from '@/components/auth/PasswordResetModal'
import { SpecialsCard } from '@/components/landing/SpecialsCard'
import { SpecialItemModal } from '@/components/landing/SpecialItemModal'
import { SearchSection } from '@/components/landing/SearchSection'
import { TitleCard } from '@/components/landing/TitleCard'
import { LoginCard } from '@/components/landing/LoginCard'
import { InfoCard } from '@/components/landing/InfoCard'
import { ContactLink } from '@/components/landing/ContactLink'
import { Search, ArrowRight, Loader2, ChevronDown } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

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

  // Framer Motion Parallax Logic
  const { scrollY } = useScroll()
  // Map scroll distance to a slower vertical movement for Part 1. 
  // As user scrolls down (scrollY increases), move Part 1 up (negative y) but slowly.
  const y1 = useTransform(scrollY, [0, 1000], [0, -500])
  const rotateX1 = useTransform(scrollY, [0, 800], [0, 45])
  const scale1 = useTransform(scrollY, [0, 800], [1, 0.8])
  const opacity1 = useTransform(scrollY, [0, 600], [1, 0])

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

      {/* Mobile Layout (Parallax) - Hidden on Large Screens */}
      {/* Add perspective to container to make 3D rotation visible */}
      <div className="lg:hidden relative">
        {/* Part 1: Slow Moving Layer (Background) */}
        <div className="fixed top-0 left-0 right-0 z-0 h-[100dvh] bg-[#FAFAFA]" style={{ perspective: '1000px' }}>
          <motion.div
            className="w-full h-full p-4 flex flex-col justify-center gap-6"
            style={{
              y: y1,
              rotateX: rotateX1,
              scale: scale1,
              opacity: opacity1,
              transformOrigin: "top center"
            }}
          >
            <div className="flex-none pointer-events-auto">
              <SearchSection />
            </div>
            <div className="flex-none pointer-events-auto">
              <TitleCard />
            </div>
            <div className="flex-none relative w-full pointer-events-auto">
              {/* Fixed height to match desktop consistency and avoid stretching */}
              <SpecialsCard
                onItemClick={setSelectedSpecial}
                className="h-[340px] w-full"
              />
            </div>

            {/* Bouncing Arrow - Hint to scroll */}
            <div className="absolute bottom-2 left-0 right-0 flex justify-center pointer-events-none">
              <ChevronDown className="w-6 h-6 text-black animate-bounce-slow" />
            </div>
          </motion.div>
        </div>

        {/* Part 2: Overlay Layer (Foreground) */}
        <div className="relative z-10 w-full pointer-events-none">
          {/* Spacer to fully hide Part 2 initially */}
          <div className="h-[100dvh] w-full pointer-events-none"></div>

          {/* The actual content that slides up */}
          {/* Removed all borders and shadows to create "continuous background" look */}
          <div className="bg-[#FAFAFA] min-h-[100dvh] flex flex-col p-4 gap-6 pb-20 justify-center pointer-events-auto">
            <div className="flex flex-col gap-6 w-full">
              <LoginCard onResetPasswordClick={() => setShowPasswordResetModal(true)} />
              <InfoCard />
              <ContactLink />
            </div>
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
