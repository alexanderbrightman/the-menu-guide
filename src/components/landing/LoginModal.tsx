'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'
import { AuthForm } from '@/components/auth/AuthForm'

interface LoginModalProps {
    onClose: () => void
    onResetPasswordClick?: () => void
}

export function LoginModal({ onClose, onResetPasswordClick }: LoginModalProps) {
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
                className="relative w-full max-w-md bg-[#6595BD] rounded-lg shadow-xl p-6 border border-[#6595BD] animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 text-white/80 hover:text-white transition-colors"
                >
                    <X size={24} />
                </button>

                <div className="flex items-center justify-between mb-6 pr-8">
                    <h2 className="text-2xl font-light text-white">Restaurant Login</h2>
                </div>

                <AuthForm
                    onSuccess={onClose}
                    labelColor="text-white"
                    onForgotPassword={onResetPasswordClick}
                />
            </div>

            {/* Click backdrop to close */}
            <div className="absolute inset-0 -z-10" onClick={onClose} />
        </div>
    )
}
