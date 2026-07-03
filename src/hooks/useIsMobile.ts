'use client'

import { useState, useEffect } from 'react'

const MOBILE_QUERY = '(max-width: 767px)'

/** True when viewport is below the md breakpoint (768px). */
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY)
    const update = () => setIsMobile(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  return isMobile
}
