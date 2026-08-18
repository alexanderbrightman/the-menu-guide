'use client'

import { formatPrice } from '@/lib/currency'
import { splitExtras } from '@/lib/menu-extras'
import { cn } from '@/lib/utils'

interface DishExtrasListProps {
  extras?: { id?: string; kind: string; name: string; price: number; sort_order?: number }[] | null
  currency?: string
  textClass: string
  className?: string
}

export function DishExtrasList({ extras, currency, textClass, className }: DishExtrasListProps) {
  const { variants, addons } = splitExtras(extras)
  if (variants.length === 0 && addons.length === 0) return null

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {variants.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {variants.map((extra, index) => (
            <li
              key={extra.id || `variant-${index}`}
              className={`flex items-baseline justify-between gap-4 text-sm ${textClass}`}
            >
              <span>{extra.name}</span>
              <span className="tabular-nums notranslate whitespace-nowrap">
                {formatPrice(extra.price, currency)}
              </span>
            </li>
          ))}
        </ul>
      )}
      {addons.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {addons.map((extra, index) => (
            <li
              key={extra.id || `addon-${index}`}
              className={`flex items-baseline justify-between gap-4 text-sm ${textClass}`}
            >
              <span>{extra.name}</span>
              <span className="tabular-nums notranslate whitespace-nowrap">
                +{formatPrice(extra.price, currency)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
