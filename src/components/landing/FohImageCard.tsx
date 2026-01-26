'use client'

import { useState } from 'react'
import Image from 'next/image'

export function FohImageCard({ fill = false, className = '' }: { fill?: boolean; className?: string }) {
    const [fohImageError, setFohImageError] = useState(false)

    if (fill) {
        return (
            <div className={`relative w-full overflow-hidden ${className}`}>
                <div className="relative w-full h-full rounded-t-2xl overflow-hidden shadow-lg">
                    {!fohImageError && (
                        <Image
                            src="/FOH.jpeg"
                            alt="Restaurant illustration"
                            fill
                            sizes="(max-width: 768px) 100vw, 50vw"
                            className="object-cover"
                            priority
                            onError={() => {
                                console.warn('Failed to load FOH.jpeg, hiding image')
                                setFohImageError(true)
                            }}
                        />
                    )}
                </div>
            </div>
        )
    }

    return (
        <div className={`w-full h-auto ${className}`}>
            <div className="relative w-full rounded-t-2xl overflow-hidden shadow-lg">
                {!fohImageError && (
                    <Image
                        src="/FOH.jpeg"
                        alt="Restaurant illustration"
                        width={0}
                        height={0}
                        sizes="(max-width: 768px) 100vw, 50vw"
                        style={{ width: '100%', height: 'auto' }}
                        priority
                        onError={() => {
                            console.warn('Failed to load FOH.jpeg, hiding image')
                            setFohImageError(true)
                        }}
                    />
                )}
            </div>
        </div>
    )
}
