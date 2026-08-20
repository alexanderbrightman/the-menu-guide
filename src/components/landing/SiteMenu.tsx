'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { createPortal } from 'react-dom'
import { AuthForm } from '@/components/auth/AuthForm'
import { glassCardStyle } from '@/lib/glass-styles'
import { useOverlayChromeColor } from '@/hooks/useChromeColor'
import { useFullscreenOverlay } from '@/hooks/useFullscreenOverlay'
import { CHROME_COLORS } from '@/lib/chrome-color'

const APPLE_FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif'

interface SiteMenuProps {
  open: boolean
  onClose: () => void
  onForgotPassword?: () => void
}

export function SiteMenu({ open, onClose, onForgotPassword }: SiteMenuProps) {
  const [ready, setReady] = useState(false)
  const [showContact, setShowContact] = useState(false)
  const [contactFormData, setContactFormData] = useState({ name: '', email: '', message: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    setReady(true)
  }, [])

  useEffect(() => {
    if (!open) setShowContact(false)
  }, [open])

  useOverlayChromeColor(open, CHROME_COLORS.app)
  useFullscreenOverlay(open, { paintChrome: false })

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    const subject = encodeURIComponent(`The Menu Guide - Contact from ${contactFormData.name}`)
    const body = encodeURIComponent(
      `Name: ${contactFormData.name}\nEmail: ${contactFormData.email}\n\nMessage:\n${contactFormData.message}`
    )
    window.location.href = `mailto:abalexbrightman@gmail.com?subject=${subject}&body=${body}`

    setContactFormData({ name: '', email: '', message: '' })
    setIsSubmitting(false)
    onClose()
  }

  if (!ready || !open) return null

  const fieldClass =
    'w-full px-4 py-2.5 bg-white/55 border border-black/8 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black/15 transition-all'

  return createPortal(
    <>
      <button
        type="button"
        className="site-menu-backdrop opacity-100"
        aria-label="Close menu"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="site-menu-title"
        className="site-menu-panel opacity-100 translate-x-0"
      >
        <div className="h-full overflow-y-auto overscroll-contain">
          <div className="flex min-h-full flex-col">
            <div
              className="flex items-start justify-between gap-3 px-5 pb-3"
              style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1.25rem)' }}
            >
              <h2
                id="site-menu-title"
                className="min-w-0 text-[26px] leading-[1.15] font-normal tracking-wide text-gray-900"
                style={{ fontFamily: 'var(--font-raleway), sans-serif' }}
              >
                Welcome to
                <br />
                The Menu Guide
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-full transition-all duration-200"
                style={{
                  background: 'rgba(255,255,255,0.55)',
                  border: '0.5px solid rgba(255,255,255,0.7)',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                }}
                aria-label="Close menu"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            <div className="px-4">
              <div className="rounded-2xl p-5" style={glassCardStyle}>
                <div className={`transition-all duration-300 ease-in-out ${showContact ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100 h-auto'}`}>
                  <div className="flex justify-between items-center mb-4">
                    <h3
                      className="text-lg font-semibold text-gray-900"
                      style={{ fontFamily: APPLE_FONT }}
                    >
                      Restaurant Login
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowContact(true)}
                      className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
                    >
                      Contact
                    </button>
                  </div>
                  <AuthForm
                    onSuccess={onClose}
                    variant="default"
                    labelColor="text-gray-700"
                    onForgotPassword={() => {
                      onClose()
                      onForgotPassword?.()
                    }}
                  />
                </div>

                <div className={`transition-all duration-300 ease-in-out ${showContact ? 'opacity-100 h-auto' : 'opacity-0 h-0 overflow-hidden'}`}>
                  <div className="flex justify-between items-center mb-4">
                    <h3
                      className="text-lg font-semibold text-gray-900"
                      style={{ fontFamily: APPLE_FONT }}
                    >
                      Contact the Builder
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowContact(false)}
                      className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors flex items-center gap-1"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                      </svg>
                      Back
                    </button>
                  </div>
                  <form onSubmit={handleContactSubmit} className="space-y-4">
                    <div>
                      <label htmlFor="menu-contact-name" className="block text-sm font-medium text-gray-700 mb-1">
                        Name
                      </label>
                      <input
                        type="text"
                        id="menu-contact-name"
                        name="name"
                        autoComplete="name"
                        required
                        value={contactFormData.name}
                        onChange={(e) => setContactFormData({ ...contactFormData, name: e.target.value })}
                        className={fieldClass}
                        placeholder="Your name"
                      />
                    </div>
                    <div>
                      <label htmlFor="menu-contact-email" className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        id="menu-contact-email"
                        name="email"
                        autoComplete="email"
                        required
                        value={contactFormData.email}
                        onChange={(e) => setContactFormData({ ...contactFormData, email: e.target.value })}
                        className={fieldClass}
                        placeholder="your@email.com"
                      />
                    </div>
                    <div>
                      <label htmlFor="menu-contact-message" className="block text-sm font-medium text-gray-700 mb-1">
                        Message
                      </label>
                      <textarea
                        id="menu-contact-message"
                        name="message"
                        autoComplete="off"
                        required
                        rows={3}
                        value={contactFormData.message}
                        onChange={(e) => setContactFormData({ ...contactFormData, message: e.target.value })}
                        className={`${fieldClass} resize-none`}
                        placeholder="How can we help?"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full h-9 rounded-full text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      style={{
                        background: '#1c1c1e',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.12)',
                        fontFamily: APPLE_FONT,
                        letterSpacing: '-0.01em',
                      }}
                    >
                      {isSubmitting ? 'Sending...' : 'Send Message'}
                    </button>
                  </form>
                </div>
              </div>

              <Link
                href="/getting-started"
                onClick={onClose}
                className="mt-3 flex items-center justify-between rounded-2xl px-5 py-4 text-[16px] font-medium text-gray-900"
                style={{
                  ...glassCardStyle,
                  fontFamily: APPLE_FONT,
                }}
              >
                Getting Started
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </Link>

              <div className="w-full">
                <Image
                  src="/CarolLogo.png"
                  alt="The Menu Guide chef illustration"
                  width={390}
                  height={390}
                  className="w-full h-auto block"
                />
                <p
                  className="text-xs text-center pt-3 text-gray-500"
                  style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.5rem)' }}
                >
                  Thanks for using The Menu Guide :)
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body
  )
}
