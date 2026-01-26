'use client'

import { useState } from 'react'
import Image from 'next/image'

export function BohImageCard({ fill = false, className = '' }: { fill?: boolean; className?: string }) {
    const [bohImageError, setBohImageError] = useState(false)

    if (fill) {
        return (
            <div className={`relative w-full overflow-hidden ${className}`}>
                <div className="relative w-full h-full rounded-b-2xl overflow-hidden shadow-lg">
                    {!bohImageError && (
                        <Image
                            src="/BOH.jpeg"
                            alt="Restaurant kitchen illustration"
                            fill
                            sizes="(max-width: 768px) 100vw, 50vw"
                            className="object-cover"
                            priority
                            onError={() => {
                                console.warn('Failed to load BOH.jpeg, hiding image')
                                setBohImageError(true)
                            }}
                        />
                    )}
                </div>
            </div>
        )
    }

    return (
        <div className={`w-full h-auto ${className}`}>
            <div className="relative w-full rounded-b-2xl overflow-hidden shadow-lg">
                {!bohImageError && (
                    <Image
                        src="/BOH.jpeg"
                        alt="Restaurant kitchen illustration"
                        width={0}
                        height={0}
                        sizes="(max-width: 768px) 100vw, 50vw"
                        style={{ width: '100%', height: 'auto' }}
                        priority
                        onError={() => {
                            console.warn('Failed to load BOH.jpeg, hiding image')
                            setBohImageError(true)
                        }}
                    />
                )}
            </div>
        </div>
    )
}
