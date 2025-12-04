import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface SortableItemProps {
    id: string
    children: React.ReactNode
    className?: string
    style?: React.CSSProperties
}

export function SortableItem({ id, children, className, style }: SortableItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id })

    const dndStyle: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 50 : 'auto',
        position: 'relative',
        touchAction: 'none', // Important for touch devices
        ...style,
    }

    return (
        <div ref={setNodeRef} style={dndStyle} className={className} {...attributes} {...listeners}>
            {children}
        </div>
    )
}
