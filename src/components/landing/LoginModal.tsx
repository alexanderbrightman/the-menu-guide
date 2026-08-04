'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'
import { AuthForm } from '@/components/auth/AuthForm'
import { glassCardStyle, glassTokens } from '@/lib/glass-styles'
import { useOverlayChromeColor } from '@/hooks/useChromeColor'
import { CHROME_COLORS } from '@/lib/chrome-color'

interface LoginModalProps {
    onClose: () => void
    onResetPasswordClick?: () => void
}

export function LoginModal({ onClose, onResetPasswordClick }: LoginModalProps) {
    useOverlayChromeColor(true, CHROME_COLORS.overlayDim)
    // Lock body scroll when modal is open
    useEffect(() => {
        document.body.style.overflow = 'hidden'
        return () => {
            document.body.style.overflow = 'unset'
        }
    }, [])

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                className="relative w-full max-w-md rounded-2xl p-6 animate-in zoom-in-95 duration-200"
                style={{ ...glassCardStyle, boxShadow: glassTokens.shadowLg }}
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 transition-colors"
                >
                    <X size={24} />
                </button>

                <div className="flex items-center justify-between mb-6 pr-8">
                    <h2 className="text-2xl font-semibold text-gray-900">Restaurant Login</h2>
                </div>

                <AuthForm
                    onSuccess={onClose}
                    labelColor="text-gray-700"
                    onForgotPassword={onResetPasswordClick}
                />
            </div>

            {/* Click backdrop to close */}
            <div className="absolute inset-0 -z-10" onClick={onClose} />
        </div>
    )
}
