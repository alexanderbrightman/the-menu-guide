'use client'

import Image from 'next/image'
import Link from 'next/link'
import { X } from 'lucide-react'
import { motion } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import type { PreFixeEntry } from '@/components/landing/PreFixeCard'
import { getAllergenBorderColor } from '@/lib/utils'
import { glassCardStyle } from '@/lib/glass-styles'

interface Props {
  entry: PreFixeEntry
  onClose: () => void
}

export function PreFixeModal({ entry, onClose }: Props) {
  const { menu, restaurant } = entry

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-xl overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        className="w-full max-w-lg my-4 rounded-2xl overflow-hidden"
        style={glassCardStyle}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-black/5 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{menu.title}</h2>
            <p className="text-sm text-gray-500">{restaurant.display_name}</p>
            {menu.price != null && (
              <p className="text-sm font-medium text-gray-800 mt-1">${Number(menu.price).toFixed(2)}</p>
            )}
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-full hover:bg-black/5">
            <X className="h-5 w-5" />
          </button>
        </div>

        {menu.description && (
          <p className="px-5 py-3 text-sm text-gray-600 border-b border-black/5">{menu.description}</p>
        )}

        <div className="p-5 space-y-6 max-h-[60vh] overflow-y-auto">
          {(menu.courses || []).map((course) => (
            <div key={course.id}>
              <h3 className="text-xs font-semibold tracking-widest uppercase text-gray-500 mb-3">
                {course.name}
              </h3>
              <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide">
                {(course.prefxe_items || []).map((item) => (
                  <div
                    key={item.id}
                    className="flex-shrink-0 w-36 snap-start rounded-xl overflow-hidden border border-black/8 bg-white/60"
                  >
                    <div className="relative aspect-square bg-gray-100">
                      {item.image_url ? (
                        <Image src={item.image_url} alt={item.title} fill className="object-cover" sizes="144px" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-xl">🍽️</div>
                      )}
                    </div>
                    <div className="p-2">
                      <p className="text-xs font-semibold text-gray-900 truncate">{item.title}</p>
                      {item.description && (
                        <p className="text-[10px] text-gray-500 line-clamp-2 mt-0.5">{item.description}</p>
                      )}
                      {item.tags?.length > 0 && (
                        <div className="flex flex-wrap gap-0.5 mt-1">
                          {item.tags.map((tag) => (
                            <Badge
                              key={tag.id}
                              variant="outline"
                              className="text-[8px] px-1 py-0"
                              style={{ borderColor: getAllergenBorderColor(tag.name) }}
                            >
                              {tag.name}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="p-5 border-t border-black/5">
          <Link href={`/menu/${restaurant.username}`} className="text-sm font-medium text-blue-600 hover:underline">
            View full menu →
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
