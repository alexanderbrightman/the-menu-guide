'use client'

import { useEffect, useLayoutEffect, useState, type MouseEvent } from 'react'
import { createPortal } from 'react-dom'
import { Check, Share } from 'lucide-react'
import { cn } from '@/lib/utils'
import { glassTokens } from '@/lib/glass-styles'

interface ShareButtonProps {
  url: string
  title: string
  text?: string
  /** Inline matches Instagram/Globe under the restaurant name. Overlay pairs with close. */
  variant?: 'inline' | 'overlay'
  label: string
  className?: string
  isDark?: boolean
}

function CopiedLinkToast() {
  const [mounted, setMounted] = useState(false)
  useLayoutEffect(() => {
    setMounted(true)
  }, [])
  if (!mounted) return null

  return createPortal(
    <div
      data-copied-toast
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed left-1/2 z-[120] flex -translate-x-1/2 items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-medium tracking-tight"
      style={{
        bottom: 'max(1.25rem, calc(env(safe-area-inset-bottom, 0px) + 0.75rem))',
        background: 'rgba(28,28,30,0.92)',
        backdropFilter: `blur(16px) saturate(${glassTokens.saturate})`,
        WebkitBackdropFilter: `blur(16px) saturate(${glassTokens.saturate})`,
        border: '0.5px solid rgba(255,255,255,0.18)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.28)',
        color: '#fff',
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
      }}
    >
      <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
      Copied Link
    </div>,
    document.body
  )
}

export function ShareButton({
  url,
  title,
  text,
  variant = 'inline',
  label,
  className,
  isDark = false,
}: ShareButtonProps) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(false), 2200)
    return () => window.clearTimeout(timer)
  }, [copied])

  const onShare = async (event: MouseEvent) => {
    event.stopPropagation()
    event.preventDefault()

    setCopied(true)

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url)
      } else {
        throw new Error('clipboard unavailable')
      }
    } catch {
      const field = document.createElement('textarea')
      field.value = url
      field.setAttribute('readonly', '')
      field.style.position = 'fixed'
      field.style.left = '-9999px'
      document.body.appendChild(field)
      field.select()
      try {
        document.execCommand('copy')
      } finally {
        document.body.removeChild(field)
      }
    }

    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, text: text || title, url })
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return
      }
    }
  }

  const aria = copied ? 'Copied link' : label
  const toast = copied ? <CopiedLinkToast /> : null

  if (variant === 'overlay') {
    return (
      <>
        <button
          type="button"
          onClick={onShare}
          aria-label={aria}
          title={aria}
          className={cn(
            'fixed z-[110] flex h-11 w-11 items-center justify-center rounded-full',
            'text-white',
            'transition-transform active:scale-95',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60',
            className
          )}
          style={{
            top: 'max(0.75rem, env(safe-area-inset-top, 0px))',
            left: 'max(0.75rem, env(safe-area-inset-left, 0px))',
            background: 'rgba(0,0,0,0.32)',
            backdropFilter: `blur(${glassTokens.blur}) saturate(${glassTokens.saturate})`,
            WebkitBackdropFilter: `blur(${glassTokens.blur}) saturate(${glassTokens.saturate})`,
            border: '0.5px solid rgba(255,255,255,0.2)',
            boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
          }}
        >
          {copied ? (
            <Check className="h-5 w-5" strokeWidth={2.25} aria-hidden />
          ) : (
            <Share className="h-5 w-5" strokeWidth={2.25} aria-hidden />
          )}
        </button>
        {toast}
      </>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={onShare}
        aria-label={aria}
        title={aria}
        className={cn(
          'p-1.5 sm:p-2 rounded-full transition-colors',
          isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100',
          className
        )}
        style={{ color: isDark ? '#ffffff' : '#000000' }}
      >
        {copied ? (
          <Check size={16} className="sm:w-5 sm:h-5" strokeWidth={1.75} aria-hidden />
        ) : (
          <Share size={16} className="sm:w-5 sm:h-5" strokeWidth={1.75} aria-hidden />
        )}
      </button>
      {toast}
    </>
  )
}
