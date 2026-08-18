'use client'

import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getModalChromeGlassStyle, modalChromeRight, modalChromeTop } from '@/lib/glass-styles'

interface ModalCloseButtonProps {
  onClose: () => void
  className?: string
  /** Follows the description island. Homepage stays light; profile menus pass their theme. */
  isDark?: boolean
}

/**
 * Apple-style liquid-glass dismiss control: circular material button,
 * 44pt hit target, safe-area aware, always visible.
 */
export function ModalCloseButton({
  onClose,
  className,
  isDark = false,
}: ModalCloseButtonProps) {
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
        isDark ? 'text-white' : 'text-gray-900',
        'transition-transform active:scale-95',
        isDark
          ? 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60'
          : 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20',
        className
      )}
      style={{
        top: modalChromeTop,
        right: modalChromeRight,
        ...getModalChromeGlassStyle(isDark),
      }}
    >
      <X className="h-5 w-5" strokeWidth={2.25} aria-hidden="true" />
    </button>
  )
}
