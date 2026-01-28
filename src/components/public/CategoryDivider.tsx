import React from 'react'

interface CategoryDividerProps {
    title: string
    isDarkBackground: boolean
    fontFamily?: string
}

export function CategoryDivider({ title, isDarkBackground, fontFamily }: CategoryDividerProps) {
    const lineColor = isDarkBackground ? '#ffffff' : '#000000'
    const textColor = isDarkBackground ? 'text-white' : 'text-slate-900'
    const lineBgClass = isDarkBackground ? 'bg-white' : 'bg-black'

    return (
        <div className="flex items-center justify-center gap-4 my-4 w-full overflow-hidden">

            {/* Left Side: Scroll -> Line */}
            <div className="flex-1 flex items-center">
                <svg
                    width="14"
                    height="12"
                    viewBox="0 0 14 12"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="flex-none"
                >
                    {/* Scroll Path - extended to edge with Line */}
                    <path
                        d="M12 6 C 6 6 2 9 4 11 C 6 13 10 9 8 5 C 6 1 1 3 1 6"
                        stroke={lineColor}
                        strokeWidth="1"
                        fill="none"
                    />
                    {/* Connection line extending from the path start (12,6) to the edge (14,6) */}
                    <line x1="12" y1="6" x2="14" y2="6" stroke={lineColor} strokeWidth="1" />
                </svg>
                <div className={`flex-1 h-[1px] ${lineBgClass} -ml-[1px]`}></div>
            </div>

            {/* Title */}
            <h3
                className={`text-[10.89px] font-medium tracking-widest uppercase whitespace-nowrap px-2 ${textColor}`}
                style={{ fontFamily: fontFamily }}
            >
                {title}
            </h3>

            {/* Right Side: Line -> Scroll (Rotated 180 of the Left Side) */}
            <div className="flex-1 flex items-center transform rotate-180">
                <svg
                    width="14"
                    height="12"
                    viewBox="0 0 14 12"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="flex-none"
                >
                    <path
                        d="M12 6 C 6 6 2 9 4 11 C 6 13 10 9 8 5 C 6 1 1 3 1 6"
                        stroke={lineColor}
                        strokeWidth="1"
                        fill="none"
                    />
                    <line x1="12" y1="6" x2="14" y2="6" stroke={lineColor} strokeWidth="1" />
                </svg>
                <div className={`flex-1 h-[1px] ${lineBgClass} -ml-[1px]`}></div>
            </div>
        </div>
    )
}
