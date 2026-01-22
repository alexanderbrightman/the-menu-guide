'use client'

import { useState } from 'react'
import Image from 'next/image'

export function TitleCard() {
    const [fohImageError, setFohImageError] = useState(false)

    return (
        <div className="rounded-lg flex flex-row items-center h-[240px] p-4 gap-4 w-full" style={{ backgroundColor: '#41766E', border: '1px solid #41766E' }}>
            {/* Title */}
            <div className="flex-1 flex items-center justify-center min-w-0 z-10">
                <h1 className="font-light text-white leading-tight text-5xl sm:text-6xl">
                    <div>The</div>
                    <div>Menu</div>
                    <div>Guide</div>
                </h1>
            </div>
            {/* Illustration - FOH - Square on mobile, 4:3 on larger screens */}
            <div className="h-full aspect-square sm:aspect-[4/3] relative flex-shrink-0 shadow-sm">
                {!fohImageError && (
                    <Image
                        src="/FOH.jpeg"
                        alt="Restaurant illustration"
                        fill
                        className="object-cover rounded-lg"
                        sizes="(max-width: 768px) 50vw, 33vw"
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
