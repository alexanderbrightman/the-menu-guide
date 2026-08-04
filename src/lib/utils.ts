import type { CSSProperties } from 'react'
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

function normalizeHex(hexColor: string): string | null {
  const cleanHex = hexColor.replace('#', '')
  const normalized =
    cleanHex.length === 3
      ? cleanHex
          .split('')
          .map((char) => char + char)
          .join('')
      : cleanHex
  return normalized.length === 6 ? normalized : null
}

function hexToRgb(hexColor: string): { r: number; g: number; b: number } | null {
  const normalized = normalizeHex(hexColor)
  if (!normalized) return null
  return {
    r: parseInt(normalized.substring(0, 2), 16),
    g: parseInt(normalized.substring(2, 4), 16),
    b: parseInt(normalized.substring(4, 6), 16),
  }
}

function relativeLuminance(hexColor: string): number {
  const rgb = hexToRgb(hexColor)
  if (!rgb) return 1
  return (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255
}

/** Mix a hex color toward black. factor 1 = original, 0 = black. */
export function mixHexWithBlack(hexColor: string, factor: number): string {
  const rgb = hexToRgb(hexColor)
  if (!rgb) return '#1f2937'
  const clamped = Math.max(0, Math.min(1, factor))
  const toHex = (n: number) =>
    Math.round(n * clamped)
      .toString(16)
      .padStart(2, '0')
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`
}

/** Mix a hex color toward white. amount 0 = original, 1 = white. */
export function mixHexWithWhite(hexColor: string, amount: number): string {
  const rgb = hexToRgb(hexColor)
  if (!rgb) return '#ffffff'
  const a = Math.max(0, Math.min(1, amount))
  const toHex = (n: number) =>
    Math.round(n * (1 - a) + 255 * a)
      .toString(16)
      .padStart(2, '0')
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`
}

export const getContrastColor = (hexColor: string) => {
  if (!hexColor) return '#1f2937'
  return relativeLuminance(hexColor) > 0.6 ? '#1f2937' : '#ffffff'
}

export const hexToRgba = (hexColor: string, alpha: number) => {
  const rgb = hexToRgb(hexColor)
  if (!rgb) return `rgba(255,255,255,${alpha})`
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`
}

export const ALLERGEN_TAGS = [
  'Gluten',
  'Dairy',
  'Nuts',
  'Shellfish',
  'Eggs',
  'Soy',
  'Fish',
  'Sesame',
  'Allium'
]

export const getAllergenBorderColor = (tagName: string): string => {
  const colorMap: Record<string, string> = {
    // Lifestyle tags (Include logic)
    'dairy-free': '#B5C1D9',
    'gluten-free': '#D48963',
    'nut-free': '#408250',
    'pescatarian': '#F698A7',
    'shellfish-free': '#F6D98E',
    'spicy': '#F04F68',
    'vegan': '#A9CC66',
    'vegetarian': '#3B91A2',

    // Allergen tags (Exclude logic) - Cohesive Palette
    'gluten': '#E9C46A',       // Muted Yellow
    'dairy': '#6BA8AB',        // Soft Blue (darker for white backgrounds)
    'nuts': '#BC6C25',         // Bronze
    'shellfish': '#E76F51',    // Muted Red
    'eggs': '#F4A261',         // Soft Orange
    'soy': '#BDB2FF',          // Soft Purple
    'fish': '#457B9D',         // Deep Blue
    'sesame': '#A5A58D',       // Muted Olive
    'allium': '#9D8189',       // Muted Mauve
  }
  return colorMap[tagName.toLowerCase()] || ''
}

/**
 * Accent-derived label color that stays readable on tinted chip fills.
 * Pale accents (e.g. Gluten yellow) darken on light surfaces; too-dark
 * accents lighten on dark menu themes.
 */
export function getAllergenTextColor(
  tagName: string,
  isDarkBackground = false
): string {
  const accent = getAllergenBorderColor(tagName)
  if (!accent) return isDarkBackground ? 'rgba(255,255,255,0.92)' : '#374151'

  if (isDarkBackground) {
    if (relativeLuminance(accent) >= 0.45) return accent
    let amount = 0.35
    let color = mixHexWithWhite(accent, amount)
    for (let i = 0; i < 5 && relativeLuminance(color) < 0.55; i++) {
      amount = Math.min(0.72, amount + 0.12)
      color = mixHexWithWhite(accent, amount)
    }
    return color
  }

  if (relativeLuminance(accent) <= 0.45) return accent

  let factor = 0.52
  let color = mixHexWithBlack(accent, factor)
  for (let i = 0; i < 5 && relativeLuminance(color) > 0.35; i++) {
    factor *= 0.72
    color = mixHexWithBlack(accent, factor)
  }
  return color
}

export type AllergenTagStyleOptions = {
  isDarkBackground?: boolean
  /** Stronger fill for filter/picker selected state */
  isSelected?: boolean
  /**
   * Solid accent fill (editor pickers). Uses contrasting label color.
   * Prefer for toggle chips where selected must read as “on”.
   */
  solidSelected?: boolean
}

/**
 * High-contrast allergen/lifestyle chip styles for glass islands,
 * public/private menus, and editor pickers.
 */
export function getAllergenTagStyle(
  tagName: string,
  options: AllergenTagStyleOptions = {}
): CSSProperties {
  const {
    isDarkBackground = false,
    isSelected = false,
    solidSelected = false,
  } = options
  const accent = getAllergenBorderColor(tagName)

  if (!accent) {
    if (isDarkBackground) {
      return {
        border: '1px solid rgba(255,255,255,0.35)',
        color: 'rgba(255,255,255,0.92)',
        backgroundColor: isSelected
          ? 'rgba(255,255,255,0.18)'
          : 'rgba(255,255,255,0.08)',
      }
    }
    return {
      border: '1px solid rgba(0,0,0,0.18)',
      color: '#374151',
      backgroundColor: isSelected
        ? 'rgba(17,24,39,0.10)'
        : 'rgba(255,255,255,0.55)',
    }
  }

  if (solidSelected && isSelected) {
    return {
      border: `2px solid ${accent}`,
      color: getContrastColor(accent),
      backgroundColor: accent,
    }
  }

  return {
    border: `${isSelected ? 2 : 1}px solid ${accent}`,
    color: getAllergenTextColor(tagName, isDarkBackground),
    backgroundColor: hexToRgba(
      accent,
      isSelected
        ? isDarkBackground
          ? 0.34
          : 0.28
        : isDarkBackground
          ? 0.16
          : 0.22
    ),
  }
}
