'use client'

import { useReducer } from 'react'
import Image from 'next/image'
import {
  disableSupabaseImageTransforms,
  getDisplayImageUrl,
} from '@/lib/supabase-image'

interface SmartImageProps {
  src: string
  alt: string
  className?: string
  sizes: string
  priority?: boolean
  onFatalError?: () => void
}

/**
 * next/image wrapper that requests a resized Supabase render, then falls
 * back to the original URL if transforms are unavailable. Cards stay
 * tappable while the bitmap streams in — the parent supplies the gray plate.
 */
export function SmartImage({
  src,
  alt,
  className,
  sizes,
  priority = false,
  onFatalError,
}: SmartImageProps) {
  const [, retry] = useReducer((count: number) => count + 1, 0)
  const currentSrc = getDisplayImageUrl(src)

  return (
    <Image
      src={currentSrc}
      alt={alt}
      fill
      sizes={sizes}
      className={className}
      priority={priority}
      loading={priority ? undefined : 'lazy'}
      decoding="async"
      onError={() => {
        if (currentSrc !== src) {
          disableSupabaseImageTransforms()
          retry()
          return
        }
        onFatalError?.()
      }}
    />
  )
}
