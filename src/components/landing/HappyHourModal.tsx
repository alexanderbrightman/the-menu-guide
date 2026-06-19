'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { HappyHourEntry } from '@/components/landing/HappyHourCard'
import { formatScheduleBadge } from '@/lib/geo'
import { glassCardStyle } from '@/lib/glass-styles'

interface Props {
  entry: HappyHourEntry
  onClose: () => void
}

export function HappyHourModal({ entry, onClose }: Props) {
  const { menu, restaurant } = entry
  const photos = menu.photos || []
  const [photoIdx, setPhotoIdx] = useState(0)

  const prev = () => setPhotoIdx((i) => (i > 0 ? i - 1 : photos.length - 1))
  const next = () => setPhotoIdx((i) => (i < photos.length - 1 ? i + 1 : 0))

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-xl"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl"
        style={glassCardStyle}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative aspect-[4/3] bg-gray-100">
          {photos.length > 0 ? (
            <>
              <Image src={photos[photoIdx].image_url} alt={menu.title} fill className="object-cover rounded-t-2xl" />
              {photos.length > 1 && (
                <>
                  <button type="button" onClick={prev} className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/40 text-white">
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={next} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/40 text-white">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </>
              )}
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-4xl">🍸</div>
          )}
          <button type="button" onClick={onClose} className="absolute top-2 right-2 p-1.5 rounded-full bg-black/40 text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{menu.title}</h2>
            <p className="text-sm text-gray-500">{restaurant.display_name}</p>
            <p className="text-xs text-blue-600 mt-1">
              {formatScheduleBadge(menu.days_of_week, menu.start_time, menu.end_time)}
            </p>
          </div>
          {menu.description && (
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{menu.description}</p>
          )}
          <Link
            href={`/menu/${restaurant.username}`}
            className="inline-block text-sm font-medium text-blue-600 hover:underline"
          >
            View full menu →
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
