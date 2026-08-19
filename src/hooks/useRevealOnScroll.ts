'use client'

import { useEffect, useRef, useState } from 'react'

function getScrollParent(el: HTMLElement | null): Element | null {
  let node = el?.parentElement ?? null
  while (node) {
    const { overflowY } = getComputedStyle(node)
    if (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') {
      return node
    }
    node = node.parentElement
  }
  return null
}

/**
 * Paint the first `initial` items immediately, then reveal more as the
 * sentinel approaches the scrollport. Keeps the first screen from decoding
 * every photo at once.
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
      { root: getScrollParent(el), rootMargin: '320px' }
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
