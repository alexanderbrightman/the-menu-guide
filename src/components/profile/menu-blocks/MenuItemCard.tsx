import { useState, type ReactNode } from 'react'
import Image from 'next/image'
import { Edit, Trash2, Star } from 'lucide-react'
import { MenuItemWithRelations } from '@/lib/supabase'
import { useMenuTheme } from '@/hooks/useMenuTheme'

interface MenuItemCardProps {
    item: MenuItemWithRelations
    theme: ReturnType<typeof useMenuTheme>
    onEdit: () => void
    onDelete: () => void
    onToggleFavorite: () => void
    onToggleAvailability: () => void
    isFavorited: boolean
    onClick: () => void
}

function IconHit({
    label,
    onClick,
    fill,
    children,
}: {
    label: string
    onClick: () => void
    fill: string
    children: ReactNode
}) {
    return (
        <button
            type="button"
            aria-label={label}
            onClick={(e) => {
                e.stopPropagation()
                onClick()
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="h-8 w-8 flex items-center justify-center rounded-full transition-colors active:scale-[0.94]"
            style={{ backgroundColor: fill }}
        >
            {children}
        </button>
    )
}

export function MenuItemCard({
    item,
    theme,
    onEdit,
    onDelete,
    onToggleFavorite,
    onToggleAvailability,
    isFavorited,
    onClick,
}: MenuItemCardProps) {
    const {
        menuFontFamily,
        primaryTextClass,
        fill,
        isDarkBackground,
    } = theme

    const isAvailable = item.is_available ?? true
    const [imageError, setImageError] = useState(false)
    const showPlaceholder = !item.image_url || imageError
    const imageSrc = showPlaceholder ? '/MenuImgPlaceholder.png' : item.image_url!
    const iconColor = isDarkBackground ? 'rgba(255,255,255,0.88)' : 'rgba(0,0,0,0.78)'

    const actionButtons = (
        <div className="flex items-center justify-between w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-1">
                <IconHit
                    label={isFavorited ? 'Remove from specials' : 'Add to specials'}
                    onClick={onToggleFavorite}
                    fill={fill}
                >
                    <Star
                        className="h-3.5 w-3.5"
                        strokeWidth={1.75}
                        style={{
                            color: isFavorited ? '#FF9F0A' : iconColor,
                            fill: isFavorited ? '#FF9F0A' : 'none',
                        }}
                    />
                </IconHit>
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation()
                        onToggleAvailability()
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="h-8 px-2.5 rounded-full text-[11px] font-semibold tracking-tight transition-colors active:scale-[0.96]"
                    style={
                        !isAvailable
                            ? { backgroundColor: '#FF3B30', color: '#fff' }
                            : { backgroundColor: fill, color: iconColor }
                    }
                >
                    86&apos;d
                </button>
            </div>
            <div className="flex items-center gap-1">
                <IconHit label="Edit item" onClick={onEdit} fill={fill}>
                    <Edit className="h-3.5 w-3.5" strokeWidth={1.75} style={{ color: iconColor }} />
                </IconHit>
                <IconHit label="Delete item" onClick={onDelete} fill={fill}>
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} style={{ color: iconColor }} />
                </IconHit>
            </div>
        </div>
    )

    const image = (
        <Image
            key={item.image_url || 'placeholder'}
            src={imageSrc}
            alt={item.title}
            fill
            className={`object-cover ${showPlaceholder ? 'scale-125' : ''} ${!isAvailable ? 'grayscale' : ''}`}
            style={showPlaceholder && isDarkBackground ? { filter: 'invert(1)' } : undefined}
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            onError={() => {
                if (item.image_url) {
                    console.warn(`Failed to load menu item image: ${item.image_url}`)
                    setImageError(true)
                }
            }}
        />
    )

    const unavailableBadge = !isAvailable && (
        <div className="absolute top-2 left-2 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide text-white bg-black/55 backdrop-blur-sm">
            86&apos;d
        </div>
    )

    return (
        <div className={`group relative flex flex-col h-full ${!isAvailable ? 'opacity-70' : ''}`}>
            <button
                type="button"
                className="cursor-pointer text-left w-full"
                onClick={onClick}
            >
                <div className="transition-transform duration-200 ease-out group-hover:scale-[0.98] group-active:scale-[0.96]">
                    <div
                        className={`relative aspect-[4/3] overflow-hidden rounded-2xl ${
                            isDarkBackground ? 'bg-white/10' : 'bg-black/[0.04]'
                        }`}
                        style={{
                            boxShadow: '0 1px 2px rgba(0,0,0,0.06), 0 8px 20px rgba(0,0,0,0.08)',
                        }}
                    >
                        {image}
                        {unavailableBadge}
                    </div>
                    <div className="pt-2.5 px-0.5">
                        <h3
                            className={`text-[13.5px] sm:text-[15px] font-semibold leading-tight truncate ${primaryTextClass} ${
                                !isAvailable ? 'line-through decoration-black/30' : ''
                            }`}
                            style={{ fontFamily: menuFontFamily, letterSpacing: '-0.016em' }}
                            title={item.title}
                        >
                            {item.title}
                        </h3>
                    </div>
                </div>
            </button>
            <div className="mt-2.5">{actionButtons}</div>
        </div>
    )
}
