'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog'
import { QrCode, Check, Copy, Download, X } from 'lucide-react'
import {
  getThemedGlassCardStyle,
  glassTokens,
  floatingImageShadow,
} from '@/lib/glass-styles'

const APPLE_FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif'

interface QrCodeDialogProps {
  qrCodeUrl: string | null
  menuLink: string
  profileUsername: string
  isDarkBackground: boolean
  contrastColor: string
  outlineButtonClass?: string
  onDownload: () => void
  /** Controlled open state (mobile nav). Omit for trigger mode (sidebar). */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children?: React.ReactNode
}

export function QrCodeDialog({
  qrCodeUrl,
  menuLink,
  isDarkBackground,
  contrastColor,
  onDownload,
  open,
  onOpenChange,
  children,
}: QrCodeDialogProps) {
  const [copied, setCopied] = useState(false)
  const controlled = open !== undefined

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(menuLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for older WebViews
      const input = document.createElement('input')
      input.value = menuLink
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const muted = isDarkBackground ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.55)'
  const glassPanel = getThemedGlassCardStyle(isDarkBackground)

  const innerGlass = {
    background: isDarkBackground ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.45)',
    backdropFilter: `blur(16px) saturate(${glassTokens.saturate})`,
    WebkitBackdropFilter: `blur(16px) saturate(${glassTokens.saturate})`,
    border: isDarkBackground
      ? '0.5px solid rgba(255,255,255,0.18)'
      : `0.5px solid ${glassTokens.border}`,
  } as const

  const actionBtnClass =
    'flex-1 h-11 inline-flex items-center justify-center gap-2 rounded-full text-[14px] font-semibold transition-transform active:scale-[0.97] disabled:opacity-40'

  const plateSize = { width: 'min(70vw, 15.5rem)', height: 'min(70vw, 15.5rem)' }

  const content = (
    <DialogContent
      showCloseButton={false}
      className="w-[min(100vw-1.5rem,26rem)] sm:max-w-md gap-0 border-0 bg-transparent p-0 shadow-none overflow-visible max-h-[calc(100dvh-2rem-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px))]"
      style={{
        color: contrastColor,
        fontFamily: APPLE_FONT,
      }}
    >
      {/*
        Outer shell owns radius + border so the rim is never clipped by overflow.
        Inner scroll area clips children to the same radius.
      */}
      <div
        className="max-h-[calc(100dvh-2rem-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px))] rounded-[28px]"
        style={{
          ...glassPanel,
          boxShadow: glassTokens.shadowLg,
        }}
      >
        <div className="max-h-[inherit] overflow-y-auto overscroll-contain rounded-[28px]">
          {/* Header */}
          <div className="flex items-center justify-between gap-3 px-5 pt-6 pb-3 sm:px-6 sm:pt-7">
            <DialogTitle
              className="flex items-center gap-2.5 text-[17px] font-semibold tracking-tight m-0"
              style={{ letterSpacing: '-0.02em', color: contrastColor }}
            >
              <span
                className="flex h-9 w-9 items-center justify-center rounded-full"
                style={innerGlass}
              >
                <QrCode className="h-4 w-4" strokeWidth={2.25} />
              </span>
              Menu QR Code
            </DialogTitle>

            <DialogClose
              className="flex h-9 w-9 items-center justify-center rounded-full transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
              style={{
                background: isDarkBackground ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
                backdropFilter: `blur(${glassTokens.blur}) saturate(${glassTokens.saturate})`,
                WebkitBackdropFilter: `blur(${glassTokens.blur}) saturate(${glassTokens.saturate})`,
                border: isDarkBackground
                  ? '0.5px solid rgba(255,255,255,0.2)'
                  : '0.5px solid rgba(0,0,0,0.08)',
                color: contrastColor,
              }}
              aria-label="Close"
            >
              <X className="h-4 w-4" strokeWidth={2.25} />
            </DialogClose>
          </div>

          <div className="flex flex-col items-center gap-4 px-5 pb-6 sm:gap-5 sm:px-6 sm:pb-7">
            {/*
              Native <img> (not next/image fill): keeps a real bitmap in the DOM so
              browsers expose right-click → Copy Image, and the plate cannot collapse.
            */}
            {qrCodeUrl ? (
              <div
                className="flex shrink-0 items-center justify-center overflow-hidden rounded-[22px] bg-white p-4 sm:p-5"
                style={{
                  ...plateSize,
                  boxShadow: floatingImageShadow,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrCodeUrl}
                  alt="Menu QR Code"
                  width={256}
                  height={256}
                  draggable
                  className="h-full w-full select-auto rounded-xl object-contain"
                />
              </div>
            ) : (
              <div
                className="flex shrink-0 flex-col items-center justify-center gap-2 overflow-hidden rounded-[22px]"
                style={{
                  ...innerGlass,
                  ...plateSize,
                }}
              >
                <div
                  className="h-5 w-5 rounded-full border-2 border-t-transparent animate-spin"
                  style={{ borderColor: `${contrastColor}40`, borderTopColor: 'transparent' }}
                />
                <p className="text-[13px]" style={{ color: muted }}>
                  Generating…
                </p>
              </div>
            )}

            <p
              className="text-[13px] sm:text-[14px] text-center leading-snug max-w-[18rem]"
              style={{ color: muted }}
            >
              Scan to open your digital menu instantly.
            </p>

            {/* Link island */}
            <div
              className="w-full flex items-center gap-2 rounded-2xl px-3 py-2.5 min-w-0"
              style={innerGlass}
            >
              <code
                className="text-[12px] sm:text-[13px] flex-1 min-w-0 truncate block"
                style={{
                  fontFamily: APPLE_FONT,
                  color: contrastColor,
                  letterSpacing: '-0.01em',
                }}
              >
                {menuLink.replace(/^https?:\/\//, '')}
              </code>
              <button
                type="button"
                onClick={handleCopy}
                aria-label={copied ? 'Copied' : 'Copy link'}
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full transition-transform active:scale-95"
                style={{
                  background: isDarkBackground ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)',
                  color: contrastColor,
                }}
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                ) : (
                  <Copy className="h-3.5 w-3.5" strokeWidth={2.25} />
                )}
              </button>
            </div>

            {/* Actions */}
            <div className="flex gap-2.5 w-full">
              <button
                type="button"
                onClick={onDownload}
                disabled={!qrCodeUrl}
                className={actionBtnClass}
                style={{
                  ...innerGlass,
                  color: contrastColor,
                }}
              >
                <Download className="h-4 w-4" strokeWidth={2.25} />
                Download
              </button>
              <button
                type="button"
                onClick={handleCopy}
                className={actionBtnClass}
                style={{
                  ...innerGlass,
                  color: contrastColor,
                }}
              >
                {copied ? (
                  <Check className="h-4 w-4" strokeWidth={2.5} />
                ) : (
                  <Copy className="h-4 w-4" strokeWidth={2.25} />
                )}
                {copied ? 'Copied' : 'Copy Link'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </DialogContent>
  )

  if (controlled) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        {content}
      </Dialog>
    )
  }

  return (
    <Dialog>
      {children ? <DialogTrigger asChild>{children}</DialogTrigger> : null}
      {content}
    </Dialog>
  )
}
