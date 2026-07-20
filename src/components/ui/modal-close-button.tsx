'use client'

import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModalCloseButtonProps {
  onClose: () => void
  className?: string
}

/**
 * Apple-style modal dismiss control: circular material button,
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
        'bg-black/45 text-white backdrop-blur-xl',
        'border border-white/20 shadow-[0_1px_4px_rgba(0,0,0,0.2)]',
        'transition-transform active:scale-95',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60',
        className
      )}
      style={{
        top: 'max(0.75rem, env(safe-area-inset-top, 0px))',
        right: 'max(0.75rem, env(safe-area-inset-right, 0px))',
      }}
    >
      <X className="h-5 w-5" strokeWidth={2.25} aria-hidden="true" />
    </button>
  )
}
