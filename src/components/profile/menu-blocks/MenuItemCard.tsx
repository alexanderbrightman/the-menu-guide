import Image from 'next/image'
import { Edit, Trash2, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
        outlineButtonClass,
        getBorderColor,
        isDarkBackground,
    } = theme

    const isAvailable = item.is_available ?? true

    return (
        <div
            className={`group relative flex flex-col cursor-pointer border h-full ${getBorderColor()} hover:opacity-80 transition-opacity duration-200 ${isDarkBackground ? 'bg-white/5' : 'bg-white'
                } ${!isAvailable ? 'opacity-60' : ''}`}
            onClick={onClick}
        >
            {item.image_url && (
                <div className={`relative aspect-[3/2] overflow-hidden border-b ${getBorderColor()}`}>
                    <Image
                        src={item.image_url}
                        alt={item.title}
                        fill
                        className={`object-cover ${!isAvailable ? 'grayscale' : ''}`}
                        sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                    />
                    {!isAvailable && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                            <span className="font-bold text-white tracking-wider border-2 border-white px-2 py-1 rotate-[-15deg]">
                                86&apos;D
                            </span>
                        </div>
                    )}
                </div>
            )}
            <div className="flex-1 flex flex-col p-2 sm:p-3">
                <div className="mb-2">
                    <h3
                        className={`font-semibold text-sm sm:text-base md:text-lg truncate ${primaryTextClass} ${!isAvailable ? 'line-through decoration-slate-500' : ''}`}
                        style={{ fontFamily: menuFontFamily }}
                        title={item.title}
                    >
                        {item.title}
                    </h3>
                </div>
                <div className="flex items-center justify-between mt-auto pt-2" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                onToggleFavorite()
                            }}
                            onPointerDown={(e) => e.stopPropagation()}
                            className={`h-6 w-6 sm:h-7 sm:w-7 flex items-center justify-center transition-colors border border-black rounded ${isFavorited
                                ? isDarkBackground
                                    ? 'text-yellow-400 hover:text-yellow-300'
                                    : 'text-yellow-600 hover:text-yellow-700'
                                : 'text-black hover:text-gray-700'
                                }`}
                            aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
                        >
                            <Star
                                className={`h-3 w-3 sm:h-4 sm:w-4 ${isFavorited ? 'fill-current' : 'text-black'}`}
                            />
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                onToggleAvailability()
                            }}
                            onPointerDown={(e) => e.stopPropagation()}
                            className={`h-6 sm:h-7 px-1.5 flex items-center justify-center text-[10px] sm:text-xs font-bold border rounded transition-colors ${!isAvailable
                                ? 'bg-red-500 text-white border-red-500 hover:bg-red-600'
                                : 'border-black text-black hover:bg-red-500 hover:text-white hover:border-red-500'
                                }`}
                        >
                            86&apos;D
                        </button>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2">
                        <Button
                            size="icon-sm"
                            variant="outline"
                            className={`${outlineButtonClass} border ${getBorderColor()}`}
                            onClick={onEdit}
                            onPointerDown={(e) => e.stopPropagation()}
                        >
                            <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                        <Button
                            size="icon-sm"
                            variant="outline"
                            className={`${outlineButtonClass} border ${getBorderColor()}`}
                            onClick={onDelete}
                            onPointerDown={(e) => e.stopPropagation()}
                        >
                            <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
