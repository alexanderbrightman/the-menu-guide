'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { AuthForm } from '@/components/auth/AuthForm'

interface HeaderProps {
    onLoginClick?: () => void
    onContactClick?: () => void
    onResetPasswordClick?: () => void
}

export function Header({ onResetPasswordClick }: HeaderProps) {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const [expandedSection, setExpandedSection] = useState<'contact' | 'login' | null>(null)
    const [isFlipped, setIsFlipped] = useState(false)
    const [contactFormData, setContactFormData] = useState({ name: '', email: '', message: '' })
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [containerHeight, setContainerHeight] = useState<number | undefined>(undefined)
    const headerRef = useRef<HTMLDivElement>(null)
    const frontRef = useRef<HTMLDivElement>(null)
    const backRef = useRef<HTMLDivElement>(null)
    const mobileMenuRef = useRef<HTMLDivElement>(null)

    // Update container height when flipped state changes or content loads
    useEffect(() => {
        if (expandedSection === 'login') {
            const frontHeight = frontRef.current?.offsetHeight
            const backHeight = backRef.current?.offsetHeight

            if (isFlipped && backHeight) {
                setContainerHeight(backHeight)
            } else if (!isFlipped && frontHeight) {
                setContainerHeight(frontHeight)
            }
        }
    }, [isFlipped, expandedSection])
    // Lock body scroll when mobile menu is open
    useEffect(() => {
        if (isMobileMenuOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = 'unset'
        }
        return () => {
            document.body.style.overflow = 'unset'
        }
    }, [isMobileMenuOpen])

    // Close expanded section when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            // Check if click is outside header
            const isOutsideHeader = headerRef.current && !headerRef.current.contains(event.target as Node);

            // Check if click is inside mobile menu (if it's open)
            const isInsideMobileMenu = mobileMenuRef.current && mobileMenuRef.current.contains(event.target as Node);

            // Only close if outside header AND not inside mobile menu
            if (isOutsideHeader && !isInsideMobileMenu) {
                setExpandedSection(null)
            }
        }

        if (expandedSection) {
            document.addEventListener('mousedown', handleClickOutside)
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [expandedSection])

    const toggleSection = (section: 'contact' | 'login') => {
        if (expandedSection === section) {
            setExpandedSection(null)
        } else {
            setExpandedSection(section)
        }
    }

    const handleContactSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)

        const subject = encodeURIComponent(`The Menu Guide - Contact from ${contactFormData.name}`)
        const body = encodeURIComponent(`Name: ${contactFormData.name}\nEmail: ${contactFormData.email}\n\nMessage:\n${contactFormData.message}`)
        window.location.href = `mailto:abalexbrightman@gmail.com?subject=${subject}&body=${body}`

        setContactFormData({ name: '', email: '', message: '' })
        setIsSubmitting(false)
        setExpandedSection(null)
    }

    const closeMobileMenu = () => {
        setIsMobileMenuOpen(false)
        setExpandedSection(null)
    }

    return (
        <>
            <header ref={headerRef} className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-2" style={{ backgroundColor: 'transparent' }}>
                <div className="flex justify-between items-center">
                    <Link
                        href="/"
                        className="text-2xl md:text-3xl font-normal tracking-wide hover:opacity-80 transition-opacity text-gray-900"
                        style={{ fontFamily: 'var(--font-raleway), sans-serif' }}
                    >
                        The Menu Guide
                    </Link>

                    {/* Desktop buttons with expanding forms */}
                    <div className="hidden md:block relative">
                        <div className="flex items-center gap-6">
                            <Button
                                onClick={() => {
                                    toggleSection('login')
                                    setIsFlipped(false)
                                }}
                                variant="outline"
                                className={`border-gray-900 text-gray-900 hover:bg-gray-900/10 rounded-lg transition-all ${expandedSection === 'login' ? 'bg-gray-900/10 shadow-md' : 'bg-transparent'}`}
                            >
                                Sign In
                            </Button>

                            <Link href="/getting-started">
                                <Button
                                    variant="ghost"
                                    className="text-gray-900 hover:bg-gray-900/10 rounded-lg transition-all underline underline-offset-4"
                                >
                                    Getting Started
                                </Button>
                            </Link>
                        </div>

                        {/* Combined Flip Card Container */}
                        <div
                            className={`absolute right-0 top-full mt-2 w-[400px] perspective-[1000px] z-50 transition-all duration-300 ${expandedSection === 'login'
                                ? 'opacity-100 translate-y-0 pointer-events-auto'
                                : 'opacity-0 -translate-y-2 pointer-events-none'
                                }`}
                            style={{ height: containerHeight ? `${containerHeight}px` : 'auto' }}
                        >
                            <div
                                className={`relative w-full h-full transition-transform duration-500 [transform-style:preserve-3d] ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}
                            >
                                {/* Front Face: Login Form */}
                                <div
                                    ref={frontRef}
                                    className="absolute inset-0 w-full bg-white/95 backdrop-blur-md rounded-2xl shadow-xl shadow-black/20 p-6 border border-gray-200 [backface-visibility:hidden]"
                                    style={{ height: 'fit-content' }}
                                >
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-lg font-semibold text-gray-900">Restaurant Login</h3>
                                        <button
                                            onClick={() => setIsFlipped(true)}
                                            className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
                                        >
                                            Contact
                                        </button>
                                    </div>
                                    <AuthForm
                                        onSuccess={() => setExpandedSection(null)}
                                        variant="default"
                                        labelColor="text-gray-700"
                                        onForgotPassword={() => {
                                            setExpandedSection(null)
                                            if (onResetPasswordClick) {
                                                onResetPasswordClick()
                                            }
                                        }}
                                    />
                                </div>

                                {/* Back Face: Contact Form */}
                                <div
                                    ref={backRef}
                                    className="absolute inset-0 w-full bg-white/95 backdrop-blur-md rounded-2xl shadow-xl shadow-black/20 p-6 border border-gray-200 [backface-visibility:hidden] [transform:rotateY(180deg)]"
                                    style={{ height: 'fit-content' }}
                                >
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-lg font-semibold text-gray-900">Contact the Builder</h3>
                                        <button
                                            onClick={() => setIsFlipped(false)}
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
                                            <label htmlFor="desktop-expand-contact-name" className="block text-sm font-medium text-gray-700 mb-1">
                                                Name
                                            </label>
                                            <input
                                                type="text"
                                                id="desktop-expand-contact-name"
                                                name="name"
                                                autoComplete="name"
                                                required
                                                value={contactFormData.name}
                                                onChange={(e) => setContactFormData({ ...contactFormData, name: e.target.value })}
                                                className="w-full px-4 py-2.5 bg-gray-100 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all"
                                                placeholder="Your name"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="desktop-expand-contact-email" className="block text-sm font-medium text-gray-700 mb-1">
                                                Email
                                            </label>
                                            <input
                                                type="email"
                                                id="desktop-expand-contact-email"
                                                name="email"
                                                autoComplete="email"
                                                required
                                                value={contactFormData.email}
                                                onChange={(e) => setContactFormData({ ...contactFormData, email: e.target.value })}
                                                className="w-full px-4 py-2.5 bg-gray-100 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all"
                                                placeholder="your@email.com"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="desktop-expand-contact-message" className="block text-sm font-medium text-gray-700 mb-1">
                                                Message
                                            </label>
                                            <textarea
                                                id="desktop-expand-contact-message"
                                                name="message"
                                                autoComplete="off"
                                                required
                                                rows={3}
                                                value={contactFormData.message}
                                                onChange={(e) => setContactFormData({ ...contactFormData, message: e.target.value })}
                                                className="w-full px-4 py-2.5 bg-gray-100 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all resize-none"
                                                placeholder="How can we help?"
                                            />
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={isSubmitting}
                                            className="w-full h-9 border border-gray-900 text-gray-900 hover:bg-gray-900/10 bg-transparent rounded-lg shadow-lg shadow-black/10 hover:shadow-xl hover:shadow-black/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                        >
                                            {isSubmitting ? 'Sending...' : 'Send Message'}
                                        </button>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Mobile hamburger button */}
                    <button
                        onClick={() => setIsMobileMenuOpen(true)}
                        className="md:hidden p-2 text-gray-900 hover:bg-gray-900/10 rounded-lg transition-colors"
                        aria-label="Open menu"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                </div>
            </header>

            {/* Mobile full-screen menu */}
            <div
                ref={mobileMenuRef}
                className={`md:hidden fixed inset-0 z-50 transition-opacity duration-300 ${isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                    }`}
                style={{ backgroundColor: '#f9f1e7' }}
            >
                <div className="h-full flex flex-col">
                    {/* Header with close button */}
                    <div className="flex justify-between items-center px-4 pt-6 pb-4">
                        <Link
                            href="/"
                            onClick={closeMobileMenu}
                            className="text-2xl font-normal tracking-wide text-gray-900"
                            style={{ fontFamily: 'var(--font-raleway), sans-serif' }}
                        >
                            The Menu Guide
                        </Link>
                        <button
                            onClick={closeMobileMenu}
                            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-900/10 rounded-full transition-colors"
                            aria-label="Close menu"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </button>
                    </div>

                    {/* Menu content */}
                    <div className="flex-1 overflow-y-auto px-4 py-6">
                        <nav className="flex flex-col gap-2">
                            {/* Home Link */}
                            <a
                                href="https://www.themenuguide.com"
                                className="w-full py-4 px-5 text-left text-lg font-medium rounded-xl transition-all duration-300 text-gray-700 hover:bg-gray-900/10"
                            >
                                Home
                            </a>

                            {/* Login Button & Form */}

                            <div className="overflow-hidden">
                                <button
                                    onClick={() => {
                                        toggleSection('login')
                                        setIsFlipped(false)
                                    }}
                                    className={`w-full py-4 px-5 text-left text-lg font-medium rounded-xl transition-all duration-300 flex justify-between items-center ${expandedSection === 'login'
                                        ? 'bg-gray-900/10 text-gray-900 shadow-md'
                                        : 'text-gray-700 hover:bg-gray-900/10'
                                        }`}
                                >
                                    <span>Log In</span>
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className={`h-5 w-5 transition-transform duration-300 ${expandedSection === 'login' ? 'rotate-180' : ''}`}
                                        viewBox="0 0 20 20"
                                        fill="currentColor"
                                    >
                                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                </button>

                                <div
                                    className={`transition-all duration-300 ease-in-out overflow-hidden ${expandedSection === 'login' ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
                                        }`}
                                >
                                    {/* Front Face: Login Form */}
                                    <div className={`transition-all duration-300 ease-in-out ${isFlipped ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100 h-auto'}`}>
                                        <div className="p-5 mt-2 bg-white/80 border border-gray-200 rounded-xl">
                                            <div className="flex justify-between items-center mb-4">
                                                <h3 className="text-lg font-semibold text-gray-900">Restaurant Login</h3>
                                                <button
                                                    onClick={() => setIsFlipped(true)}
                                                    className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
                                                >
                                                    Contact
                                                </button>
                                            </div>
                                            <AuthForm
                                                onSuccess={closeMobileMenu}
                                                variant="default"
                                                labelColor="text-gray-700"
                                                onForgotPassword={() => {
                                                    closeMobileMenu()
                                                    if (onResetPasswordClick) {
                                                        onResetPasswordClick()
                                                    }
                                                }}
                                            />
                                        </div>
                                    </div>

                                    {/* Back Face: Contact Form */}
                                    <div className={`transition-all duration-300 ease-in-out ${isFlipped ? 'opacity-100 h-auto' : 'opacity-0 h-0 overflow-hidden'}`}>
                                        <div className="p-5 mt-2 bg-white/80 border border-gray-200 rounded-xl">
                                            <div className="flex justify-between items-center mb-4">
                                                <h3 className="text-lg font-semibold text-gray-900">Contact the Builder</h3>
                                                <button
                                                    onClick={() => setIsFlipped(false)}
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
                                                    <label htmlFor="mobile-contact-name" className="block text-sm font-medium text-gray-700 mb-1">
                                                        Name
                                                    </label>
                                                    <input
                                                        type="text"
                                                        id="mobile-contact-name"
                                                        name="name"
                                                        autoComplete="name"
                                                        required
                                                        value={contactFormData.name}
                                                        onChange={(e) => setContactFormData({ ...contactFormData, name: e.target.value })}
                                                        className="w-full px-4 py-2.5 bg-gray-100 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all"
                                                        placeholder="Your name"
                                                    />
                                                </div>
                                                <div>
                                                    <label htmlFor="mobile-contact-email" className="block text-sm font-medium text-gray-700 mb-1">
                                                        Email
                                                    </label>
                                                    <input
                                                        type="email"
                                                        id="mobile-contact-email"
                                                        name="email"
                                                        autoComplete="email"
                                                        required
                                                        value={contactFormData.email}
                                                        onChange={(e) => setContactFormData({ ...contactFormData, email: e.target.value })}
                                                        className="w-full px-4 py-2.5 bg-gray-100 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all"
                                                        placeholder="your@email.com"
                                                    />
                                                </div>
                                                <div>
                                                    <label htmlFor="mobile-contact-message" className="block text-sm font-medium text-gray-700 mb-1">
                                                        Message
                                                    </label>
                                                    <textarea
                                                        id="mobile-contact-message"
                                                        name="message"
                                                        autoComplete="off"
                                                        required
                                                        rows={3}
                                                        value={contactFormData.message}
                                                        onChange={(e) => setContactFormData({ ...contactFormData, message: e.target.value })}
                                                        className="w-full px-4 py-2.5 bg-gray-100 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all resize-none"
                                                        placeholder="How can we help?"
                                                    />
                                                </div>
                                                <button
                                                    type="submit"
                                                    disabled={isSubmitting}
                                                    className="w-full h-9 border border-gray-900 text-gray-900 hover:bg-gray-900/10 bg-transparent rounded-lg shadow-lg shadow-black/10 hover:shadow-xl hover:shadow-black/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                                >
                                                    {isSubmitting ? 'Sending...' : 'Send Message'}
                                                </button>
                                            </form>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Getting Started Link */}
                            <Link
                                href="/getting-started"
                                onClick={closeMobileMenu}
                                className="w-full py-4 px-5 text-left text-lg font-medium rounded-xl transition-all duration-300 text-gray-700 hover:bg-gray-900/10"
                            >
                                Getting Started
                            </Link>
                        </nav>
                    </div>
                </div>
            </div >
        </>
    )
}
