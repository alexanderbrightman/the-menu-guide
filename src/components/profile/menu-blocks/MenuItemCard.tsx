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
    isFavorited: boolean
    onClick: () => void
}

export function MenuItemCard({
    item,
    theme,
    onEdit,
    onDelete,
    onToggleFavorite,
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

    return (
        <div
            className={`group relative flex flex-col cursor-pointer border ${getBorderColor()} hover:opacity-80 transition-opacity duration-200 ${isDarkBackground ? 'bg-white/5' : 'bg-white'
                }`}
            onClick={onClick}
        >
            {item.image_url && (
                <div className={`relative aspect-[3/2] overflow-hidden border-b ${getBorderColor()}`}>
                    <Image
                        src={item.image_url}
                        alt={item.title}
                        fill
                        className="object-cover"
                        sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                    />
                </div>
            )}
            <div className="flex-1 flex flex-col p-2 sm:p-3">
                <div className="flex items-center justify-between mb-2">
                    <h3
                        className={`font-semibold text-xs sm:text-sm md:text-base flex-1 ${primaryTextClass}`}
                        style={{ fontFamily: menuFontFamily }}
                    >
                        {item.title}
                    </h3>
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            onToggleFavorite()
                        }}
                        className={`p-1 transition-colors ${isFavorited
                                ? isDarkBackground
                                    ? 'text-yellow-400 hover:text-yellow-300'
                                    : 'text-yellow-600 hover:text-yellow-700'
                                : isDarkBackground
                                    ? 'text-white/40 hover:text-white/60'
                                    : 'text-slate-400 hover:text-slate-600'
                            }`}
                        aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
                    >
                        <Star
                            className={`h-3 w-3 sm:h-4 sm:w-4 ${isFavorited ? 'fill-current' : ''}`}
                        />
                    </button>
                </div>
                <div className="flex justify-end gap-1 sm:gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button
                        size="icon-sm"
                        variant="outline"
                        className={`${outlineButtonClass} border ${getBorderColor()}`}
                        onClick={onEdit}
                    >
                        <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                    <Button
                        size="icon-sm"
                        variant="outline"
                        className={`${outlineButtonClass} border ${getBorderColor()}`}
                        onClick={onDelete}
                    >
                        <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                </div>
            </div>
        </div>
    )
}
