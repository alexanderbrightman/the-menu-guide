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
    const [contactFormData, setContactFormData] = useState({ name: '', email: '', message: '' })
    const [isSubmitting, setIsSubmitting] = useState(false)
    const headerRef = useRef<HTMLDivElement>(null)
    const mobileMenuRef = useRef<HTMLDivElement>(null)

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
                        className="text-2xl md:text-3xl font-bold hover:opacity-80 transition-opacity text-white font-mono"
                    >
                        The Menu Guide
                    </Link>

                    {/* Desktop buttons with expanding forms */}
                    <div className="hidden md:block relative">
                        <div className="flex items-center gap-3">
                            <Button
                                onClick={() => toggleSection('contact')}
                                variant="ghost"
                                className={`text-white hover:bg-white/10 rounded-lg transition-all ${expandedSection === 'contact' ? 'bg-white/20 shadow-md' : ''}`}
                            >
                                Contact
                            </Button>

                            <Button
                                onClick={() => toggleSection('login')}
                                variant="outline"
                                className={`border-white text-white hover:bg-white/10 hover:text-white rounded-lg transition-all ${expandedSection === 'login' ? 'bg-white/20 shadow-md' : 'bg-transparent'}`}
                            >
                                Sign In
                            </Button>
                        </div>

                        {/* Expanding Contact Form */}
                        <div
                            className={`absolute right-0 top-full mt-2 w-[400px] transition-all duration-300 ease-out origin-top z-50 ${expandedSection === 'contact'
                                ? 'opacity-100 scale-y-100 translate-y-0'
                                : 'opacity-0 scale-y-0 -translate-y-2 pointer-events-none'
                                }`}
                        >
                            <div className="bg-black/80 backdrop-blur-md rounded-2xl shadow-xl shadow-black/40 p-6 border border-white/10">
                                <h3 className="text-lg font-semibold text-white mb-4">Contact the Builder</h3>
                                <form onSubmit={handleContactSubmit} className="space-y-4">
                                    <div>
                                        <label htmlFor="desktop-expand-contact-name" className="block text-sm font-medium text-white/80 mb-1">
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
                                            className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all"
                                            placeholder="Your name"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="desktop-expand-contact-email" className="block text-sm font-medium text-white/80 mb-1">
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
                                            className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all"
                                            placeholder="your@email.com"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="desktop-expand-contact-message" className="block text-sm font-medium text-white/80 mb-1">
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
                                            className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all resize-none"
                                            placeholder="How can we help?"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="w-full h-9 border border-white text-white hover:bg-white/10 bg-transparent backdrop-blur-md rounded-lg shadow-lg shadow-black/20 hover:shadow-xl hover:shadow-black/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                    >
                                        {isSubmitting ? 'Sending...' : 'Send Message'}
                                    </button>
                                </form>
                            </div>
                        </div>

                        {/* Expanding Login Form */}
                        <div
                            className={`absolute right-0 top-full mt-2 w-[400px] transition-all duration-300 ease-out origin-top z-50 ${expandedSection === 'login'
                                ? 'opacity-100 scale-y-100 translate-y-0'
                                : 'opacity-0 scale-y-0 -translate-y-2 pointer-events-none'
                                }`}
                        >
                            <div className="bg-black/80 backdrop-blur-md rounded-2xl shadow-xl shadow-black/40 p-6 border border-white/10">
                                <h3 className="text-lg font-semibold text-white mb-4">Restaurant Login</h3>
                                <AuthForm
                                    onSuccess={() => setExpandedSection(null)}
                                    variant="glass-dark"
                                    labelColor="text-white/80"
                                    onForgotPassword={() => {
                                        setExpandedSection(null)
                                        if (onResetPasswordClick) {
                                            onResetPasswordClick()
                                        }
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Mobile hamburger button */}
                    <button
                        onClick={() => setIsMobileMenuOpen(true)}
                        className="md:hidden p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
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
                style={{ backgroundImage: 'linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 100%)' }}
            >
                <div className="h-full flex flex-col">
                    {/* Header with close button */}
                    <div className="flex justify-between items-center px-4 pt-6 pb-4">
                        <Link
                            href="/"
                            onClick={closeMobileMenu}
                            className="text-2xl font-bold text-white font-mono"
                        >
                            The Menu Guide
                        </Link>
                        <button
                            onClick={closeMobileMenu}
                            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
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
                                className="w-full py-4 px-5 text-left text-lg font-medium rounded-xl transition-all duration-300 text-white/80 hover:bg-white/10"
                            >
                                Home
                            </a>

                            {/* Login Button & Form */}
                            <div className="overflow-hidden">
                                <button
                                    onClick={() => toggleSection('login')}
                                    className={`w-full py-4 px-5 text-left text-lg font-medium rounded-xl transition-all duration-300 flex justify-between items-center ${expandedSection === 'login'
                                        ? 'bg-white/10 text-white shadow-md'
                                        : 'text-white/80 hover:bg-white/10'
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
                                    <div className="p-5 mt-2 bg-white/5 border border-white/10 rounded-xl">
                                        <AuthForm
                                            onSuccess={closeMobileMenu}
                                            variant="glass-dark"
                                            labelColor="text-white/80"
                                            onForgotPassword={() => {
                                                closeMobileMenu()
                                                if (onResetPasswordClick) {
                                                    onResetPasswordClick()
                                                }
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Contact Button & Form */}
                            <div className="overflow-hidden">
                                <button
                                    onClick={() => toggleSection('contact')}
                                    className={`w-full py-4 px-5 text-left text-lg font-medium rounded-xl transition-all duration-300 flex justify-between items-center ${expandedSection === 'contact'
                                        ? 'bg-white/10 text-white shadow-md'
                                        : 'text-white/80 hover:bg-white/10'
                                        }`}
                                >
                                    <span>Contact the Builder</span>
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className={`h-5 w-5 transition-transform duration-300 ${expandedSection === 'contact' ? 'rotate-180' : ''}`}
                                        viewBox="0 0 20 20"
                                        fill="currentColor"
                                    >
                                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                </button>

                                <div
                                    className={`transition-all duration-300 ease-in-out overflow-hidden ${expandedSection === 'contact' ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
                                        }`}
                                >
                                    <form onSubmit={handleContactSubmit} className="p-5 mt-2 bg-white/5 border border-white/10 rounded-xl space-y-4">
                                        <div>
                                            <label htmlFor="mobile-contact-name" className="block text-sm font-medium text-white/80 mb-1">
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
                                                className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all"
                                                placeholder="Your name"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="mobile-contact-email" className="block text-sm font-medium text-white/80 mb-1">
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
                                                className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all"
                                                placeholder="your@email.com"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="mobile-contact-message" className="block text-sm font-medium text-white/80 mb-1">
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
                                                className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all resize-none"
                                                placeholder="How can we help?"
                                            />
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={isSubmitting}
                                            className="w-full h-9 border border-white text-white hover:bg-white/10 bg-transparent backdrop-blur-md rounded-lg shadow-lg shadow-black/20 hover:shadow-xl hover:shadow-black/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                        >
                                            {isSubmitting ? 'Sending...' : 'Send Message'}
                                        </button>
                                    </form>
                                </div>
                            </div>
                        </nav>
                    </div>
                </div>
            </div>
        </>
    )
}
