'use client'

export function InfoTextCard({ className = "" }: { className?: string }) {
    return (
        <div className={`rounded-lg flex flex-col items-center justify-center p-6 w-full ${className}`}>
            <p className="text-sm text-gray-700 leading-relaxed text-center">
                After a decade of waiting tables in NYC, I'm driven to create a platform that empowers everyone in the restaurant industry, and hopefully make your day a bit smoother.
            </p>
        </div>
    )
}
