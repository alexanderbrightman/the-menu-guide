'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface HeaderProps {
    onLoginClick: () => void
}

export function Header({ onLoginClick }: HeaderProps) {
    return (
        <header className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-2">
            <div className="flex justify-between items-center">
                <Link
                    href="/"
                    className="text-2xl md:text-3xl font-light hover:opacity-80 transition-opacity text-slate-900 font-mono"
                >
                    The Menu Guide
                </Link>
                <Button
                    onClick={onLoginClick}
                    variant="outline"
                    className="border-black text-slate-900 hover:bg-gray-100 rounded-lg"
                >
                    Log In
                </Button>
            </div>
        </header>
    )
}
