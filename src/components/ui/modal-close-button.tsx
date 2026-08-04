'use client'

import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { glassTokens } from '@/lib/glass-styles'

interface ModalCloseButtonProps {
  onClose: () => void
  className?: string
}

/**
 * Apple-style liquid-glass dismiss control: circular material button,
 * 44pt hit target, safe-area aware, always visible.
 */
export function ModalCloseButton({ onClose, className }: ModalCloseButtonProps) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onClose()
      }}
      aria-label="Close"
      className={cn(
        'fixed z-[110] flex h-11 w-11 items-center justify-center rounded-full',
        'text-white',
        'transition-transform active:scale-95',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60',
        className
      )}
      style={{
        top: 'max(0.75rem, env(safe-area-inset-top, 0px))',
        right: 'max(0.75rem, env(safe-area-inset-right, 0px))',
        background: 'rgba(0,0,0,0.32)',
        backdropFilter: `blur(${glassTokens.blur}) saturate(${glassTokens.saturate})`,
        WebkitBackdropFilter: `blur(${glassTokens.blur}) saturate(${glassTokens.saturate})`,
        border: '0.5px solid rgba(255,255,255,0.2)',
        boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
      }}
    >
      <X className="h-5 w-5" strokeWidth={2.25} aria-hidden="true" />
    </button>
  )
}
