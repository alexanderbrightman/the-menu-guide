'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Paint the first `initial` items immediately, then reveal more as the
 * sentinel approaches the viewport. Keeps the first screen from decoding
 * every photo on mobile.
 */
export function useRevealOnScroll(total: number, initial = 6, step = 6) {
  const [visible, setVisible] = useState(initial)
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = sentinelRef.current
    if (!el || visible >= total) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisible((count) => Math.min(total, count + step))
        }
      },
      { rootMargin: '240px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [visible, total, step])

  return {
    visibleCount: Math.min(visible, total),
    sentinelRef,
    hasMore: visible < total,
  }
}
