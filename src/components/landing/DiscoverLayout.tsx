'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { glassCardStyle } from '@/lib/glass-styles'

const APPLE_FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif'

/**
 * Shared, readable card text block.
 * - Title stays on one line (truncate) so every card keeps the same height
 * - Restaurant name is a higher-contrast secondary label
 * - Optional meta line (schedule / distance / price)
 * Typography scales up slightly from mobile to desktop, Apple-style.
 */
export function DiscoverCardBody({
  title,
  subtitle,
  meta,
}: {
  title: string
  subtitle: string
  meta?: React.ReactNode
}) {
  return (
    <div className="p-3 sm:p-3.5">
      <h3
        className="text-[13.5px] sm:text-[15px] font-semibold leading-tight text-[#1d1d1f] truncate"
        style={{ fontFamily: APPLE_FONT, letterSpacing: '-0.01em' }}
      >
        {title}
      </h3>
      <p
        className="text-[12px] sm:text-[13px] text-[#6e6e73] mt-1 truncate"
        style={{ fontFamily: APPLE_FONT }}
      >
        {subtitle}
      </p>
      {meta && (
        <p
          className="text-[11px] sm:text-[12px] text-[#86868b] mt-1.5 truncate"
          style={{ fontFamily: APPLE_FONT }}
        >
          {meta}
        </p>
      )}
    </div>
  )
}

export function SectionDivider({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-center gap-4 w-full overflow-hidden px-4 mb-2 flex-shrink-0">
      <div className="flex-1 flex items-center">
        <div className="flex-1 h-px bg-gray-400/60" />
      </div>
      <h2 className="text-[11px] font-medium tracking-widest uppercase whitespace-nowrap text-gray-700">
        {title}
      </h2>
      <div className="flex-1 flex items-center">
        <div className="flex-1 h-px bg-gray-400/60" />
      </div>
    </div>
  )
}

export function DiscoverCardShell({
  children,
  onClick,
}: {
  children: React.ReactNode
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group cursor-pointer text-left w-full"
    >
      <div
        className="rounded-2xl overflow-hidden transition-transform duration-200 ease-out group-hover:scale-[0.98] group-active:scale-[0.96]"
        style={glassCardStyle}
      >
        {children}
      </div>
    </button>
  )
}

export function PaginationControls({
  currentPage,
  totalPages,
  onPrev,
  onNext,
}: {
  currentPage: number
  totalPages: number
  onPrev: () => void
  onNext: () => void
}) {
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-center gap-5 mt-5 flex-shrink-0">
      <button
        type="button"
        onClick={onPrev}
        disabled={currentPage === 0}
        aria-label="Previous page"
        className={`p-2 rounded-full transition-colors ${currentPage === 0 ? 'text-gray-300' : 'text-gray-600 hover:bg-black/5 active:bg-black/10'}`}
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <span className="text-xs font-medium text-gray-400 tabular-nums">{currentPage + 1} / {totalPages}</span>
      <button
        type="button"
        onClick={onNext}
        disabled={currentPage === totalPages - 1}
        aria-label="Next page"
        className={`p-2 rounded-full transition-colors ${currentPage === totalPages - 1 ? 'text-gray-300' : 'text-gray-600 hover:bg-black/5 active:bg-black/10'}`}
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  )
}

export function LoadingPanel({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center min-h-[200px] p-8">
      <div className="text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-gray-700 mx-auto mb-2" />
        <p className="text-gray-500 text-sm">{message}</p>
      </div>
    </div>
  )
}

export function EmptyPanel({ message }: { message: string }) {
  return (
    <div className="p-8 text-center text-gray-500 text-sm">{message}</div>
  )
}
