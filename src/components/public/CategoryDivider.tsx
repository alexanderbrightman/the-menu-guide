import React from 'react'
import { cn } from '@/lib/utils'

interface CategoryDividerProps {
    title: string
    isDarkBackground: boolean
    fontFamily?: string
    /** Profile menus use sm; discover modals use md for a slightly larger label. */
    size?: 'sm' | 'md'
    /** Landmark heading when this mark is the page title. */
    as?: 'h1' | 'h2' | 'h3' | 'p'
    className?: string
}

export function CategoryDivider({
    title,
    isDarkBackground,
    fontFamily,
    size = 'sm',
    as: TitleTag = 'h3',
    className,
}: CategoryDividerProps) {
    const lineColor = isDarkBackground ? '#ffffff' : '#000000'
    const textColor = isDarkBackground ? 'text-white' : 'text-black'
    const lineBgClass = isDarkBackground ? 'bg-white' : 'bg-black'
    const titleSizeClass = size === 'md' ? 'text-[13px]' : 'text-[10.89px]'
    const scrollSize = size === 'md' ? 16 : 14
    const scrollHeight = size === 'md' ? 14 : 12

    return (
        <div
            className={cn(
                'flex items-center justify-center gap-3 sm:gap-4 w-full overflow-hidden',
                size === 'md' ? 'my-5' : 'my-4',
                className
            )}
        >
            {/* Left Side: Scroll -> Line */}
            <div className="flex-1 flex items-center">
                <svg
                    width={scrollSize}
                    height={scrollHeight}
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

            <TitleTag
                className={`${titleSizeClass} font-medium tracking-widest uppercase whitespace-nowrap px-2 ${textColor}`}
                style={{ fontFamily: fontFamily }}
            >
                {title}
            </TitleTag>

            {/* Right Side: Line -> Scroll (mirrored) */}
            <div className="flex-1 flex items-center transform rotate-180">
                <svg
                    width={scrollSize}
                    height={scrollHeight}
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
