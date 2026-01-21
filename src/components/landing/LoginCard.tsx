'use client'

import { AuthForm } from '@/components/auth/AuthForm'

interface LoginCardProps {
    onResetPasswordClick: () => void
}

export function LoginCard({ onResetPasswordClick }: LoginCardProps) {
    return (
        <div className="rounded-lg p-6 flex flex-col min-h-[340px] justify-center w-full" style={{ backgroundColor: '#6595BD', border: '1px solid #6595BD' }}>
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-light text-white">Restaurant Login</h2>
                <button
                    onClick={onResetPasswordClick}
                    className="text-sm text-white hover:text-gray-200 underline"
                >
                    Reset Password
                </button>
            </div>
            <AuthForm onSuccess={() => { }} labelColor="text-white" />
        </div>
    )
}
