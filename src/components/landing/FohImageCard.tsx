'use client'

import { useState } from 'react'
import Image from 'next/image'

export function FohImageCard({ className = '' }: { className?: string }) {
    const [fohImageError, setFohImageError] = useState(false)

    return (
        <div className={`w-full h-auto ${className}`}>
            {!fohImageError && (
                <Image
                    src="/FOH.png"
                    alt="Restaurant illustration"
                    width={0}
                    height={0}
                    sizes="(max-width: 768px) 100vw, 50vw"
                    style={{ width: '100%', height: 'auto' }}
                    priority
                    onError={() => {
                        console.warn('Failed to load FOH.png, hiding image')
                        setFohImageError(true)
                    }}
                />
            )}
        </div>
    )
}
