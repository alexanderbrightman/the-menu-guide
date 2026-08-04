/**
 * Safe-area / status-bar chrome color manager.
 *
 * iOS Safari paints the status bar and home-indicator regions from
 * `theme-color` + the html/body background. A stack lets each page set
 * its surface color and each modal push a temporary overlay color that
 * restores cleanly on close — the same pattern Apple apps use when
 * presenting sheets over content.
 */

export const CHROME_COLORS = {
  /** Default app gray (landing, getting started). */
  app: '#F5F5F5',
  /**
   * Light overlays no longer push a mid-grey theme-color — that painted
   * solid letterbox bars in iOS Safari. Kept for callers that opt in.
   */
  overlayLight: '#F5F5F5',
  /** Approximate composite of bg-black/20 + blur over a dark menu. */
  overlayDark: '#1f1f1f',
  /** Approximate composite of bg-black/40–50 dialog/sheet dimmers. */
  overlayDim: '#3a3a3a',
} as const

type ChromeEntry = { id: number; color: string }

let nextId = 1
const stack: ChromeEntry[] = [{ id: 0, color: CHROME_COLORS.app }]
let scrollLocks = 0
let previousOverflow: { html: string; body: string } | null = null

function ensureThemeMeta(): HTMLMetaElement | null {
  if (typeof document === 'undefined') return null
  let meta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null
  if (!meta) {
    meta = document.createElement('meta')
    meta.setAttribute('name', 'theme-color')
    document.head.appendChild(meta)
  }
  return meta
}

function applyTop() {
  if (typeof document === 'undefined') return
  const color = stack[stack.length - 1]?.color ?? CHROME_COLORS.app
  const html = document.documentElement
  const body = document.body
  html.style.backgroundColor = color
  body.style.backgroundColor = color
  ensureThemeMeta()?.setAttribute('content', color)
}

/** Push a chrome color. Returns a disposer that removes this entry. */
export function pushChromeColor(color: string): () => void {
  const id = nextId++
  stack.push({ id, color })
  applyTop()
  return () => {
    const index = stack.findIndex((entry) => entry.id === id)
    if (index > 0) {
      stack.splice(index, 1)
      applyTop()
    }
  }
}

/** Replace the base (bottom) page color without disturbing overlay entries. */
export function setBaseChromeColor(color: string) {
  stack[0] = { id: 0, color }
  applyTop()
}

export function getOverlayChromeColor(isDarkBackground = false): string {
  return isDarkBackground ? CHROME_COLORS.overlayDark : CHROME_COLORS.overlayLight
}

/** Reference-counted body scroll lock for stacked overlays. */
export function acquireScrollLock(): () => void {
  if (typeof document === 'undefined') return () => {}
  const body = document.body
  if (scrollLocks === 0) {
    previousOverflow = {
      html: document.documentElement.style.overflow,
      body: body.style.overflow,
    }
    // Lock only body — locking <html> on iOS Safari can shrink fixed
    // overlays to the layout viewport and expose solid theme-color bars
    // in the regions behind the browser chrome.
    body.style.overflow = 'hidden'
  }
  scrollLocks += 1
  return () => {
    scrollLocks = Math.max(0, scrollLocks - 1)
    if (scrollLocks === 0 && previousOverflow) {
      body.style.overflow = previousOverflow.body
      previousOverflow = null
    }
  }
}
