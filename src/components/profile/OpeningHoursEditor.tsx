'use client'

import {
  WEEKDAY_FULL,
  WEEKDAY_ORDER,
  copyHoursToDays,
  emptyOpeningHours,
  normalizeTime,
  parseOpeningHours,
  type OpeningHours,
  type Weekday,
} from '@/lib/opening-hours'

interface OpeningHoursEditorProps {
  value: unknown
  onChange: (hours: OpeningHours) => void
  primaryTextClass: string
  secondaryTextClass: string
  borderClass: string
}

export function OpeningHoursEditor({
  value,
  onChange,
  primaryTextClass,
  secondaryTextClass,
  borderClass,
}: OpeningHoursEditorProps) {
  const hours = parseOpeningHours(value) ?? emptyOpeningHours()
  const colorScheme = primaryTextClass.includes('text-white') ? 'dark' : 'light'

  const setDay = (day: Weekday, patch: Partial<OpeningHours[Weekday]>) => {
    onChange({
      ...hours,
      [day]: { ...hours[day], ...patch },
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        <button
          type="button"
          className="text-[13px] text-blue-500 hover:underline"
          onClick={() => onChange(copyHoursToDays(hours, 1, [1, 2, 3, 4, 5]))}
        >
          Use Monday for weekdays
        </button>
        <button
          type="button"
          className="text-[13px] text-blue-500 hover:underline"
          onClick={() => onChange(copyHoursToDays(hours, 1, WEEKDAY_ORDER))}
        >
          Use Monday every day
        </button>
      </div>

      <div className={`overflow-hidden rounded-xl border ${borderClass}`}>
        {WEEKDAY_ORDER.map((day, index) => {
          const entry = hours[day]
          return (
            <div
              key={day}
              className={`flex items-center gap-3 px-3 py-2.5 ${index > 0 ? `border-t ${borderClass}` : ''}`}
            >
              <span className={`w-10 flex-shrink-0 text-[13px] font-medium ${primaryTextClass}`}>
                {WEEKDAY_FULL[day].slice(0, 3)}
              </span>
              <button
                type="button"
                onClick={() => setDay(day, { closed: !entry.closed })}
                className={`w-14 flex-shrink-0 text-left text-[13px] font-medium ${
                  entry.closed ? secondaryTextClass : 'text-emerald-600'
                }`}
                aria-pressed={!entry.closed}
                aria-label={`${WEEKDAY_FULL[day]} ${entry.closed ? 'closed' : 'open'}`}
              >
                {entry.closed ? 'Closed' : 'Open'}
              </button>
              <div className="ml-auto flex min-w-0 items-center gap-1">
                <input
                  type="time"
                  value={entry.open}
                  disabled={entry.closed}
                  onChange={(e) => {
                    const next = normalizeTime(e.target.value)
                    if (next) setDay(day, { open: next })
                  }}
                  className={`h-8 w-[6.4rem] rounded-md border-0 bg-transparent px-1 text-right text-[13px] tabular-nums disabled:opacity-30 ${primaryTextClass}`}
                  style={{ colorScheme }}
                  aria-label={`${WEEKDAY_FULL[day]} opens`}
                />
                <span className={`text-[13px] ${secondaryTextClass}`}>–</span>
                <input
                  type="time"
                  value={entry.close}
                  disabled={entry.closed}
                  onChange={(e) => {
                    const next = normalizeTime(e.target.value)
                    if (next) setDay(day, { close: next })
                  }}
                  className={`h-8 w-[6.4rem] rounded-md border-0 bg-transparent px-1 text-[13px] tabular-nums disabled:opacity-30 ${primaryTextClass}`}
                  style={{ colorScheme }}
                  aria-label={`${WEEKDAY_FULL[day]} closes`}
                />
              </div>
            </div>
          )
        })}
      </div>
      <p className={`text-xs ${secondaryTextClass}`}>
        Overnight is fine — 5:00pm to 2:00am. Guests see Open or Closed from these times.
      </p>
    </div>
  )
}
