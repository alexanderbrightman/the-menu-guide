'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AuthForm } from '@/components/auth/AuthForm'
import { PasswordResetModal } from '@/components/auth/PasswordResetModal'

export function GettingStartedPage() {
    const [showPasswordResetModal, setShowPasswordResetModal] = useState(false)

    const steps = [
        {
            number: '1',
            color: 'border-[#F4A261]',
            title: 'Create Your Account',
            description: 'Sign up with your email, choose a unique username for your restaurant, and set your restaurant name. Your username becomes your personal menu link — themenuguide.com/menu/your-username.',

        },
        {
            number: '2',
            color: 'border-[#457B9D]', // Fish
            title: 'Set Up Your Profile',
            description: 'Customize your restaurant\'s presence — add your logo, write a bio, enter your address, choose a font style, and toggle dark mode to match your brand\'s aesthetic.',

        },
        {
            number: '3',
            color: 'border-[#E9C46A]', // Gluten
            title: 'Build Your Menu',
            description: 'Add categories like "Appetizers" or "Desserts", then fill them with items — each with a name, description, price, and photo. Mark items as specials to feature them on the home page.',

        },
        {
            number: '4',
            color: 'border-[#BC6C25]',
            title: 'Share Your Menu',
            description: 'Download your unique QR code from the dashboard or copy your public link. Place the QR code on tables, windows, or flyers — customers scan it and instantly see your live menu.',

        },
    ]

    return (
        <div
            className="min-h-screen"
            style={{ backgroundColor: '#f9f1e7', fontFamily: 'var(--font-raleway), sans-serif' }}
        >
            {/* Header */}
            <header className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-2">
                <div className="flex justify-between items-center">
                    <Link
                        href="/"
                        className="text-2xl md:text-3xl font-normal tracking-wide hover:opacity-80 transition-opacity text-gray-900"
                        style={{ fontFamily: 'var(--font-raleway), sans-serif' }}
                    >
                        The Menu Guide
                    </Link>
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                        </svg>
                        Back to Home
                    </Link>
                </div>
            </header>

            {/* Main content */}
            <main className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">

                {/* Hero */}
                <div className="text-center mb-16 md:mb-24">
                    <h1 className="text-3xl md:text-5xl font-light tracking-wide text-gray-900 mb-4">
                        Getting Started
                    </h1>
                    <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
                        Set up your restaurant&apos;s digital menu in minutes. Here&apos;s everything you need to know.
                    </p>
                </div>

                {/* Steps */}
                <div className="space-y-6 md:space-y-8 mb-20 md:mb-28">
                    {steps.map((step) => (
                        <div
                            key={step.number}
                            className="group relative bg-white/60 backdrop-blur-sm border border-gray-200 rounded-2xl p-6 md:p-8 shadow-sm hover:shadow-md hover:bg-white/80 transition-all duration-300"
                        >
                            <div className="flex gap-5 md:gap-6">
                                {/* Step number + icon */}
                                <div className="flex-shrink-0 flex flex-col items-center gap-2">
                                    <span className="text-xs font-semibold tracking-widest text-gray-400 uppercase">
                                        Step
                                    </span>
                                    <div className={`w-12 h-12 rounded-xl border ${step.color} bg-transparent flex items-center justify-center text-lg font-semibold text-gray-900`}>
                                        {step.number}
                                    </div>

                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-xl md:text-2xl font-medium text-gray-900 mb-2">
                                        {step.title}
                                    </h3>
                                    <p className="text-gray-600 leading-relaxed text-sm md:text-base">
                                        {step.description}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Signup Portal */}
                <div className="max-w-md mx-auto">
                    <div className="text-center mb-8">
                        <h2 className="text-2xl md:text-3xl font-light tracking-wide text-gray-900 mb-3">
                            Create Your Account
                        </h2>
                        <p className="text-gray-600 text-sm md:text-base">
                            Ready to get started? Sign up below and build your menu today.
                        </p>
                    </div>

                    <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-xl shadow-black/10 p-6 md:p-8 border border-gray-200">
                        <AuthForm
                            onSuccess={() => {
                                window.location.href = '/'
                            }}
                            variant="default"
                            labelColor="text-gray-700"
                            onForgotPassword={() => setShowPasswordResetModal(true)}
                            initialView="signup"
                            allowToggle={false}
                        />
                    </div>
                </div>

                {/* Footer link */}
                <div className="text-center mt-16">
                    <Link
                        href="/"
                        className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
                    >
                        ← Back to The Menu Guide
                    </Link>
                </div>
            </main>

            {showPasswordResetModal && (
                <PasswordResetModal onClose={() => setShowPasswordResetModal(false)} />
            )}
        </div>
    )
}
