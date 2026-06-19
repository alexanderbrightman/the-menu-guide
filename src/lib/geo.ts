/** Haversine distance in miles between two coordinates */
export function calculateDistanceMiles(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959
  const dLat = (lat2 - lat1) * (Math.PI / 180)
  const dLon = (lon2 - lon1) * (Math.PI / 180)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export function formatDistanceMiles(distance: number | null): string {
  if (distance === null) return ''
  if (distance < 0.1) return 'Nearby'
  if (distance < 1) return `${Math.round(distance * 5280)} ft`
  return `${distance.toFixed(1)} mi`
}

/** days_of_week: 0=Sun .. 6=Sat */
export function isActiveNow(
  daysOfWeek: number[],
  startTime: string,
  endTime: string,
  now: Date = new Date()
): boolean {
  const day = now.getDay()
  if (!daysOfWeek.includes(day)) return false

  const [startH, startM] = startTime.split(':').map(Number)
  const [endH, endM] = endTime.split(':').map(Number)
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const startMinutes = startH * 60 + (startM || 0)
  const endMinutes = endH * 60 + (endM || 0)

  if (startMinutes <= endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes
  }
  // Overnight window (e.g. 22:00 - 02:00)
  return currentMinutes >= startMinutes || currentMinutes <= endMinutes
}

export function formatScheduleBadge(
  daysOfWeek: number[],
  startTime: string,
  endTime: string
): string {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const sorted = [...daysOfWeek].sort((a, b) => a - b)
  let dayLabel: string
  if (sorted.length === 7) {
    dayLabel = 'Daily'
  } else if (sorted.length === 5 && sorted.every((d, i) => d === i + 1)) {
    dayLabel = 'Mon–Fri'
  } else {
    dayLabel = sorted.map((d) => dayNames[d]).join(', ')
  }
  const fmt = (t: string) => {
    const [h, m] = t.split(':').map(Number)
    const ampm = h >= 12 ? 'pm' : 'am'
    const hour = h % 12 || 12
    return m ? `${hour}:${String(m).padStart(2, '0')}${ampm}` : `${hour}${ampm}`
  }
  return `${dayLabel} ${fmt(startTime)}–${fmt(endTime)}`
}
