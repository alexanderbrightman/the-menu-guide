'use client'

import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createExtraDraft, type ExtraDraft, type ExtraKind } from '@/lib/menu-extras'

interface ExtrasEditorProps {
  extras: ExtraDraft[]
  onChange: (extras: ExtraDraft[]) => void
  textClass: string
  mutedClass: string
  borderClass: string
  disabled?: boolean
}

export function ExtrasEditor({
  extras,
  onChange,
  textClass,
  mutedClass,
  borderClass,
  disabled = false,
}: ExtrasEditorProps) {
  const updateRow = (id: string, patch: Partial<ExtraDraft>) => {
    onChange(extras.map((extra) => (extra.id === id ? { ...extra, ...patch } : extra)))
  }

  const addRow = (kind: ExtraKind) => {
    onChange([...extras, createExtraDraft(kind)])
  }

  return (
    <div className="space-y-2">
      <p className={`text-sm font-medium ${textClass}`}>Options & add-ons</p>
      {extras.length > 0 && (
        <div className="space-y-2">
          {extras.map((extra) => (
            <div key={extra.id} className="flex items-center gap-2">
              <span className={`w-14 shrink-0 text-[11px] font-medium uppercase tracking-wide ${mutedClass}`}>
                {extra.kind === 'variant' ? 'Option' : 'Add'}
              </span>
              <Input
                value={extra.name}
                onChange={(event) => updateRow(extra.id, { name: event.target.value })}
                placeholder={extra.kind === 'variant' ? 'Large' : 'Add crab'}
                disabled={disabled}
                className={`h-9 flex-1 bg-transparent text-sm ${borderClass}`}
              />
              <Input
                type="number"
                step="0.01"
                min="0"
                value={extra.price}
                onChange={(event) => updateRow(extra.id, { price: event.target.value })}
                placeholder="0.00"
                disabled={disabled}
                className={`h-9 w-20 shrink-0 bg-transparent text-sm ${borderClass}`}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={disabled}
                className={`h-8 w-8 shrink-0 ${mutedClass}`}
                onClick={() => onChange(extras.filter((row) => row.id !== extra.id))}
                aria-label="Remove extra"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2 pt-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled}
          className={`h-8 rounded-full text-xs ${borderClass} ${textClass}`}
          onClick={() => addRow('variant')}
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Option
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled}
          className={`h-8 rounded-full text-xs ${borderClass} ${textClass}`}
          onClick={() => addRow('addon')}
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add-on
        </Button>
      </div>
    </div>
  )
}
