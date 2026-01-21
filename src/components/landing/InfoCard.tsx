'use client'

import { useState } from 'react'
import Image from 'next/image'

export function InfoCard() {
    const [bohImageError, setBohImageError] = useState(false)

    return (
        <div className="rounded-lg flex flex-row items-center h-[240px] p-4 gap-4 w-full" style={{ backgroundColor: '#D4D2BF', border: '1px solid #D4D2BF' }}>
            {/* Illustration - BOH - Square on mobile, 4:3 on larger screens */}
            <div className="h-full aspect-square sm:aspect-[4/3] relative flex-shrink-0 shadow-sm">
                {!bohImageError && (
                    <Image
                        src="/BOH.jpeg"
                        alt="Restaurant kitchen illustration"
                        fill
                        className="object-cover rounded-lg"
                        sizes="(max-width: 768px) 50vw, 33vw"
                        priority
                        onError={() => {
                            console.warn('Failed to load BOH.jpeg, hiding image')
                            setBohImageError(true)
                        }}
                    />
                )}
            </div>
            {/* Content */}
            <div className="flex-1 flex items-center justify-center min-w-0">
                <p className="text-sm text-gray-900 leading-relaxed text-center">
                    After a decade of waiting tables in NYC, I'm driven to create a platform that empowers everyone in the restaurant industry, and hopefully make your day a bit smoother.
                </p>
            </div>
        </div>
    )
}
