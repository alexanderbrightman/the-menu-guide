'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Search, X } from 'lucide-react'
import { SearchPanel } from '@/components/landing/SearchPanel'
import { glassFabStyle, glassTokens } from '@/lib/glass-styles'

interface FloatingSearchButtonProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function FloatingSearchButton({ open, onOpenChange }: FloatingSearchButtonProps) {
  return (
    <>
      {/* Dimmed backdrop */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/25 backdrop-blur-sm"
            onClick={() => onOpenChange(false)}
          />
        )}
      </AnimatePresence>

      {/* Search panel - drops in from the top as a floating island */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ y: '-120%', scale: 0.96, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: '-120%', scale: 0.96, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30, mass: 0.9 }}
            className="fixed left-4 right-4 z-50 mx-auto w-auto sm:max-w-[460px]"
            style={{
              top: 'calc(env(safe-area-inset-top, 0px) + 12px)',
              borderRadius: 28,
              overflow: 'hidden',
              background: glassTokens.bg,
              backdropFilter: `blur(${glassTokens.blur}) saturate(${glassTokens.saturate})`,
              WebkitBackdropFilter: `blur(${glassTokens.blur}) saturate(${glassTokens.saturate})`,
              border: `0.5px solid ${glassTokens.border}`,
              boxShadow:
                '0 1px 1px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.10), 0 24px 56px rgba(0,0,0,0.16)',
              transformOrigin: 'top center',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 pt-3.5 pb-1">
              <span className="text-[15px] font-semibold tracking-tight text-gray-900">
                Search restaurants
              </span>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                aria-label="Close search"
                className="flex h-7 w-7 items-center justify-center rounded-full bg-black/[0.04] text-gray-500 transition-colors hover:bg-black/[0.08] hover:text-gray-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <SearchPanel onResultClick={() => onOpenChange(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB - stays at the bottom, animates down off-screen when open */}
      <motion.button
        type="button"
        aria-label="Search restaurants"
        onClick={() => onOpenChange(!open)}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full flex items-center justify-center"
        style={{ ...glassFabStyle, pointerEvents: open ? 'none' : 'auto' }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        animate={open ? { y: 120, opacity: 0 } : { y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 360, damping: 30 }}
      >
        <Search className="h-5 w-5 text-gray-800" />
      </motion.button>
    </>
  )
}
