import { ChevronDown, ChevronUp, Plus, Edit, Trash2, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MenuItemWithRelations } from '@/lib/supabase'
import { useMenuTheme } from '@/hooks/useMenuTheme'
import { MenuItemCard } from './MenuItemCard'
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable'
import { SortableItem } from '@/components/ui/sortable-item'
import { useState, useRef, useEffect } from 'react'
import { Input } from '@/components/ui/input'

interface MenuCategorySectionProps {
    id: string
    title: string
    items: MenuItemWithRelations[]
    isOpen: boolean
    onToggle: () => void
    onAddItem?: () => void
    onEditCategory?: () => void
    onRenameCategory?: (id: string, newName: string) => Promise<void>
    onDeleteCategory?: () => void
    onEditItem: (item: MenuItemWithRelations) => void
    onDeleteItem: (itemId: string) => void
    onToggleFavorite: (itemId: string) => void
    onToggleAvailability: (itemId: string) => void
    onItemClick: (item: MenuItemWithRelations) => void
    favoritedIds: Set<string>
    theme: ReturnType<typeof useMenuTheme>
    emptyMessage?: string
    subtitle?: string
    isSortable?: boolean
}

export function MenuCategorySection({
    id,
    title,
    items,
    isOpen,
    onToggle,
    onAddItem,
    onEditCategory,
    onRenameCategory,
    onDeleteCategory,
    onEditItem,
    onDeleteItem,
    onToggleFavorite,
    onToggleAvailability,
    onItemClick,
    favoritedIds,
    theme,
    emptyMessage = 'No items in this category.',
    subtitle,
    isSortable = false,
}: MenuCategorySectionProps) {
    const {
        menuFontFamily,
        primaryTextClass,
        mutedTextClass,
        outlineButtonClass,
        focusRingClass,
        getBorderColor,
        isDarkBackground,
    } = theme

    const itemCount = items.length
    const [isEditing, setIsEditing] = useState(false)
    const [editedTitle, setEditedTitle] = useState(title)
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus()
        }
    }, [isEditing])

    const handleSave = async () => {
        if (editedTitle.trim() && onRenameCategory) {
            await onRenameCategory(id, editedTitle.trim())
            setIsEditing(false)
        }
    }

    const handleCancel = () => {
        setEditedTitle(title)
        setIsEditing(false)
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSave()
        } else if (e.key === 'Escape') {
            handleCancel()
        }
    }

    return (
        <section
            className={`border ${getBorderColor()} ${isDarkBackground ? 'bg-white/5' : 'bg-white/80'
                } rounded-xl overflow-hidden`}
        >
            <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-5">
                <div className="flex items-start justify-between">
                    {isEditing ? (
                        <div className="flex-1 flex items-center gap-2 mr-4">
                            <Input
                                ref={inputRef}
                                value={editedTitle}
                                onChange={(e) => setEditedTitle(e.target.value)}
                                onKeyDown={handleKeyDown}
                                className={`text-lg sm:text-xl md:text-2xl font-semibold h-auto py-1 px-2 ${primaryTextClass}`}
                                style={{ fontFamily: menuFontFamily }}
                                onClick={(e) => e.stopPropagation()}
                            />
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    handleSave()
                                }}
                                className="h-8 w-8 p-0 rounded-lg"
                            >
                                <Check className="h-4 w-4 text-green-500" />
                            </Button>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    handleCancel()
                                }}
                                className="h-8 w-8 p-0 rounded-lg"
                            >
                                <X className="h-4 w-4 text-red-500" />
                            </Button>
                        </div>
                    ) : (
                        <button
                            type="button"
                            className={`w-full flex items-start justify-between text-left cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${focusRingClass}`}
                            onClick={onToggle}
                            onPointerDown={(e) => e.stopPropagation()}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                    event.preventDefault()
                                    onToggle()
                                }
                            }}
                        >
                            <div>
                                <h2
                                    className={`text-lg sm:text-xl md:text-2xl font-semibold ${primaryTextClass}`}
                                    style={{ fontFamily: menuFontFamily }}
                                >
                                    {title}
                                </h2>
                                <p className={`text-xs sm:text-sm mt-1 ${mutedTextClass}`}>
                                    {subtitle || `${itemCount} item${itemCount === 1 ? '' : 's'}`}
                                </p>
                            </div>
                            <span className="mt-1">
                                {isOpen ? (
                                    <ChevronUp className="h-4 w-4 sm:h-5 sm:w-5" />
                                ) : (
                                    <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5" />
                                )}
                            </span>
                        </button>
                    )}
                </div>

                {(onAddItem || onEditCategory || onDeleteCategory || onRenameCategory) && !isEditing && (
                    <div className="flex flex-wrap items-center gap-2 mt-3 sm:mt-4">
                        {onAddItem && (
                            <Button
                                size="sm"
                                variant="outline"
                                className={`${outlineButtonClass} flex items-center gap-1 border ${getBorderColor()} rounded-lg`}
                                onClick={(event) => {
                                    event.stopPropagation()
                                    onAddItem()
                                }}
                                onPointerDown={(e) => e.stopPropagation()}
                            >
                                <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                                <span className="text-xs sm:text-sm">Item</span>
                            </Button>
                        )}
                        {(onEditCategory || onRenameCategory) && (
                            <Button
                                size="sm"
                                variant="outline"
                                className={`${outlineButtonClass} flex items-center gap-1 border ${getBorderColor()} rounded-lg`}
                                onClick={(event) => {
                                    event.stopPropagation()
                                    if (onRenameCategory) {
                                        setEditedTitle(title)
                                        setIsEditing(true)
                                    } else if (onEditCategory) {
                                        onEditCategory()
                                    }
                                }}
                                onPointerDown={(e) => e.stopPropagation()}
                            >
                                <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                                <span className="text-xs sm:text-sm">Edit</span>
                            </Button>
                        )}
                        {onDeleteCategory && (
                            <Button
                                size="sm"
                                variant="outline"
                                className={`${outlineButtonClass} flex items-center gap-1 border ${getBorderColor()} rounded-lg`}
                                onClick={(event) => {
                                    event.stopPropagation()
                                    onDeleteCategory()
                                }}
                                onPointerDown={(e) => e.stopPropagation()}
                            >
                                <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                                <span className="text-xs sm:text-sm">Delete</span>
                            </Button>
                        )}
                    </div>
                )}
            </div>

            {isOpen && (
                <div className={`border-t ${getBorderColor()} px-3 sm:px-4 md:px-6 py-4 sm:py-5 md:py-6`}>
                    {itemCount === 0 ? (
                        <div className={`text-xs sm:text-sm ${mutedTextClass}`}>
                            {emptyMessage}
                        </div>
                    ) : (
                        <SortableContext
                            items={items.map(i => i.id)}
                            strategy={rectSortingStrategy}
                            disabled={!isSortable}
                        >
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
                                {items.map((item) => (
                                    <SortableItem key={item.id} id={item.id} className="h-full">
                                        <MenuItemCard
                                            item={item}
                                            theme={theme}
                                            onEdit={() => onEditItem(item)}
                                            onDelete={() => onDeleteItem(item.id)}
                                            onToggleFavorite={() => onToggleFavorite(item.id)}
                                            onToggleAvailability={() => onToggleAvailability(item.id)}
                                            isFavorited={favoritedIds.has(item.id)}
                                            onClick={() => onItemClick(item)}
                                        />
                                    </SortableItem>
                                ))}
                            </div>
                        </SortableContext>
                    )}
                </div>
            )}
        </section>
    )
}
