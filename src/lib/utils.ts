import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const getContrastColor = (hexColor: string) => {
  if (!hexColor) return '#1f2937'
  const cleanHex = hexColor.replace('#', '')
  const normalizedHex =
    cleanHex.length === 3
      ? cleanHex
        .split('')
        .map((char) => char + char)
        .join('')
      : cleanHex

  if (normalizedHex.length !== 6) return '#1f2937'

  const r = parseInt(normalizedHex.substring(0, 2), 16)
  const g = parseInt(normalizedHex.substring(2, 4), 16)
  const b = parseInt(normalizedHex.substring(4, 6), 16)

  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.6 ? '#1f2937' : '#ffffff'
}

export const hexToRgba = (hexColor: string, alpha: number) => {
  const cleanHex = hexColor.replace('#', '')
  const normalized =
    cleanHex.length === 3
      ? cleanHex
        .split('')
        .map((char) => char + char)
        .join('')
      : cleanHex

  if (normalized.length !== 6) return `rgba(255,255,255,${alpha})`

  const r = parseInt(normalized.substring(0, 2), 16)
  const g = parseInt(normalized.substring(2, 4), 16)
  const b = parseInt(normalized.substring(4, 6), 16)

  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export const ALLERGEN_TAGS = [
  'Peanuts',
  'Tree Nuts',
  'Dairy',
  'Gluten',
  'Shellfish',
  'Eggs',
  'Soy',
  'Fish',
  'Sesame',
  'Nuts'
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
    'peanuts': '#D4A373',      // Warm Sand
    'tree nuts': '#BC6C25',    // Earthy Brown
    'nuts': '#BC6C25',         // Earthy Brown
    'dairy': '#A8DADC',        // Soft Blue
    'gluten': '#E9C46A',       // Muted Yellow
    'shellfish': '#E76F51',    // Muted Red
    'eggs': '#F4A261',         // Soft Orange
    'soy': '#BDB2FF',          // Soft Purple
    'fish': '#457B9D',         // Deep Blue
    'sesame': '#A5A58D',       // Muted Olive
  }
  return colorMap[tagName.toLowerCase()] || ''
}
