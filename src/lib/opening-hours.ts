/** 0 = Sunday … 6 = Saturday, matching Date#getDay() */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6

export interface DayHours {
  closed: boolean
  open: string
  close: string
}

export type OpeningHours = Record<Weekday, DayHours>

export const WEEKDAY_ORDER: Weekday[] = [1, 2, 3, 4, 5, 6, 0]

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  0: 'Sun',
  1: 'Mon',
  2: 'Tue',
  3: 'Wed',
  4: 'Thu',
  5: 'Fri',
  6: 'Sat',
}

export const WEEKDAY_FULL: Record<Weekday, string> = {
  0: 'Sunday',
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
}

const DEFAULT_OPEN = '11:00'
const DEFAULT_CLOSE = '22:00'

export function emptyOpeningHours(): OpeningHours {
  const hours = {} as OpeningHours
  for (const day of WEEKDAY_ORDER) {
    hours[day] = {
      closed: day === 0,
      open: DEFAULT_OPEN,
      close: DEFAULT_CLOSE,
    }
  }
  return hours
}

export function normalizeTime(value: string): string | null {
  const match = value.trim().match(/^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/)
  if (!match) return null
  return `${match[1]}:${match[2]}`
}

export function isValidTime(value: string): boolean {
  return normalizeTime(value) !== null
}

export function parseOpeningHours(value: unknown): OpeningHours | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Record<string, unknown>
  const hours = {} as OpeningHours
  for (let d = 0; d <= 6; d++) {
    const day = d as Weekday
    const entry = raw[String(day)] ?? raw[d as unknown as string]
    if (!entry || typeof entry !== 'object') return null
    const rec = entry as Record<string, unknown>
    const open = typeof rec.open === 'string' ? normalizeTime(rec.open) : null
    const close = typeof rec.close === 'string' ? normalizeTime(rec.close) : null
    hours[day] = {
      closed: Boolean(rec.closed),
      open: open ?? DEFAULT_OPEN,
      close: close ?? DEFAULT_CLOSE,
    }
  }
  return hours
}

export function serializeOpeningHours(hours: OpeningHours): Record<string, DayHours> {
  const out: Record<string, DayHours> = {}
  for (let d = 0; d <= 6; d++) {
    const day = d as Weekday
    out[String(d)] = {
      closed: Boolean(hours[day].closed),
      open: hours[day].open,
      close: hours[day].close,
    }
  }
  return out
}

export function hasAnyOpenDay(hours: OpeningHours | null | undefined): boolean {
  if (!hours) return false
  return WEEKDAY_ORDER.some((day) => !hours[day].closed)
}

function minutesFromMidnight(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

function yesterdayOf(day: Weekday): Weekday {
  return ((day + 6) % 7) as Weekday
}

/** True when close is earlier than open (e.g. 5:00pm–2:00am). */
function isOvernight(entry: DayHours): boolean {
  if (entry.closed) return false
  return minutesFromMidnight(entry.open) > minutesFromMidnight(entry.close)
}

function currentlyOpen(hours: OpeningHours, now: Date): { open: boolean; until: string | null } {
  const day = now.getDay() as Weekday
  const current = now.getHours() * 60 + now.getMinutes()
  const yesterday = yesterdayOf(day)
  const yest = hours[yesterday]

  if (yest && isOvernight(yest) && current < minutesFromMidnight(yest.close)) {
    return { open: true, until: yest.close }
  }

  const today = hours[day]
  if (!today || today.closed) return { open: false, until: null }

  const start = minutesFromMidnight(today.open)
  const end = minutesFromMidnight(today.close)
  // Same open and close is a zero-length window, not 24 hours (the editor has no 24h control).
  if (start === end) return { open: false, until: null }
  if (start < end) {
    if (current >= start && current < end) return { open: true, until: today.close }
    return { open: false, until: null }
  }
  if (current >= start) return { open: true, until: today.close }
  return { open: false, until: null }
}

export function isOpenAt(hours: OpeningHours | null | undefined, now: Date = new Date()): boolean {
  if (!hours) return false
  return currentlyOpen(hours, now).open
}

export function formatClock(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const ampm = h >= 12 ? 'pm' : 'am'
  const hour = h % 12 || 12
  return m ? `${hour}:${String(m).padStart(2, '0')}${ampm}` : `${hour}${ampm}`
}

/** Compact status for headers: "Open · until 10pm" / "Closed · opens Tue 11am" */
export function formatHoursStatus(value: unknown, now: Date = new Date()): string | null {
  const hours = parseOpeningHours(value)
  if (!hours || !hasAnyOpenDay(hours)) return null

  const state = currentlyOpen(hours, now)
  if (state.open && state.until) {
    return `Open · until ${formatClock(state.until)}`
  }

  const today = now.getDay() as Weekday
  for (let offset = 0; offset < 7; offset++) {
    const day = ((today + offset) % 7) as Weekday
    const entry = hours[day]
    if (entry.closed) continue
    if (offset === 0) {
      const current = now.getHours() * 60 + now.getMinutes()
      const start = minutesFromMidnight(entry.open)
      if (current < start) return `Closed · opens ${formatClock(entry.open)}`
      continue
    }
    const when = offset === 1 ? 'tomorrow' : WEEKDAY_LABELS[day]
    return `Closed · opens ${when} ${formatClock(entry.open)}`
  }
  return 'Closed'
}

/** Group consecutive days that share the same hours for a readable list. */
export function formatHoursList(value: unknown): { days: string; hours: string }[] {
  const hours = parseOpeningHours(value)
  if (!hours) return []
  const rows: { days: string; hours: string }[] = []
  let runStart: Weekday | null = null
  let runPrev: Weekday | null = null
  let runKey = ''

  const flush = (end: Weekday) => {
    if (runStart == null) return
    const days =
      runStart === end
        ? WEEKDAY_FULL[runStart]
        : `${WEEKDAY_LABELS[runStart]}–${WEEKDAY_LABELS[end]}`
    const entry = hours[runStart]
    rows.push({
      days,
      hours: entry.closed ? 'Closed' : `${formatClock(entry.open)}–${formatClock(entry.close)}`,
    })
  }

  for (const day of WEEKDAY_ORDER) {
    const entry = hours[day]
    const key = entry.closed ? 'closed' : `${entry.open}-${entry.close}`
    if (runStart == null) {
      runStart = day
      runPrev = day
      runKey = key
      continue
    }
    if (key === runKey && runPrev != null && sequential(runPrev, day)) {
      runPrev = day
      continue
    }
    flush(runPrev!)
    runStart = day
    runPrev = day
    runKey = key
  }
  if (runPrev != null) flush(runPrev)
  return rows
}

function sequential(a: Weekday, b: Weekday): boolean {
  const ia = WEEKDAY_ORDER.indexOf(a)
  const ib = WEEKDAY_ORDER.indexOf(b)
  return ib === ia + 1
}

export function copyHoursToDays(hours: OpeningHours, from: Weekday, to: Weekday[]): OpeningHours {
  const next = { ...hours }
  const source = { ...hours[from] }
  for (const day of to) {
    next[day] = { ...source }
  }
  return next
}
