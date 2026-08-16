export const DEFAULT_MENU_FONT = 'Plus Jakarta Sans'
export const DEFAULT_MENU_BACKGROUND_COLOR = '#F5F5F5'

// Light/Dark mode background colors
export const LIGHT_MODE_BACKGROUND = '#F5F5F5' // Warm off-white
export const DARK_MODE_BACKGROUND = '#1A1A1A'  // Rich dark grey

export const FONT_OPTIONS = [
    { label: 'Plus Jakarta Sans', value: 'Plus Jakarta Sans' },
    { label: 'Fjalla One', value: 'Fjalla One' },
    { label: 'Georgia', value: 'Georgia' },
    { label: 'Times New Roman', value: 'Times New Roman' },
    { label: 'Arial', value: 'Arial' },
    { label: 'Courier New', value: 'Courier New' },
    // Google Fonts
    { label: 'Inter', value: 'Inter' },
    { label: 'Roboto', value: 'Roboto' },
    { label: 'Open Sans', value: 'Open Sans' },
    { label: 'Lato', value: 'Lato' },
    { label: 'Montserrat', value: 'Montserrat' },
    { label: 'Oswald', value: 'Oswald' },
    { label: 'Raleway', value: 'Raleway' },
    { label: 'Merriweather', value: 'Merriweather' },
    { label: 'Playfair Display', value: 'Playfair Display' },
    { label: 'Lora', value: 'Lora' },
    { label: 'Nunito', value: 'Nunito' },
    { label: 'Poppins', value: 'Poppins' },
    { label: 'Ubuntu', value: 'Ubuntu' },
    { label: 'Dancing Script', value: 'Dancing Script' },
    { label: 'Pacifico', value: 'Pacifico' },
    { label: 'Abril Fatface', value: 'Abril Fatface' },
    { label: 'Bebas Neue', value: 'Bebas Neue' },
    { label: 'Lobster', value: 'Lobster' },
    { label: 'Comfortaa', value: 'Comfortaa' },
]

export const FONT_FAMILY_MAP: Record<string, string> = {
    'Plus Jakarta Sans': 'var(--font-plus-jakarta-sans, "Plus Jakarta Sans"), sans-serif',
    'Fjalla One': 'var(--font-fjalla-one, "Fjalla One"), sans-serif',
    'Georgia': 'Georgia, serif',
    'Times New Roman': '"Times New Roman", serif',
    'Arial': 'Arial, sans-serif',
    'Courier New': '"Courier New", monospace',
    // CSS variables are set on the dashboard via next/font. Public menus
    // load one Google family by stylesheet, so each entry falls back to
    // the real family name when the variable is missing.
    'Inter': 'var(--font-inter, Inter), sans-serif',
    'Roboto': 'var(--font-roboto, Roboto), sans-serif',
    'Open Sans': 'var(--font-open-sans, "Open Sans"), sans-serif',
    'Lato': 'var(--font-lato, Lato), sans-serif',
    'Montserrat': 'var(--font-montserrat, Montserrat), sans-serif',
    'Oswald': 'var(--font-oswald, Oswald), sans-serif',
    'Raleway': 'var(--font-raleway, Raleway), sans-serif',
    'Merriweather': 'var(--font-merriweather, Merriweather), serif',
    'Playfair Display': 'var(--font-playfair-display, "Playfair Display"), serif',
    'Lora': 'var(--font-lora, Lora), serif',
    'Nunito': 'var(--font-nunito, Nunito), sans-serif',
    'Poppins': 'var(--font-poppins, Poppins), sans-serif',
    'Ubuntu': 'var(--font-ubuntu, Ubuntu), sans-serif',
    'Dancing Script': 'var(--font-dancing-script, "Dancing Script"), cursive',
    'Pacifico': 'var(--font-pacifico, Pacifico), cursive',
    'Abril Fatface': 'var(--font-abril-fatface, "Abril Fatface"), display',
    'Bebas Neue': 'var(--font-bebas-neue, "Bebas Neue"), sans-serif',
    'Lobster': 'var(--font-lobster, Lobster), display',
    'Comfortaa': 'var(--font-comfortaa, Comfortaa), cursive',
}

/** Families already shipped on every page via the root layout. */
const ROOT_LAYOUT_FONTS = new Set(['Plus Jakarta Sans', 'Fjalla One', 'Raleway'])

/**
 * Google Fonts CSS2 specs for restaurant-chosen families that are NOT
 * in the root layout. System fonts and root fonts return null.
 */
const GOOGLE_MENU_FONT_SPEC: Record<string, string> = {
    Inter: 'Inter:wght@400;500;700',
    Roboto: 'Roboto:wght@400;500;700',
    'Open Sans': 'Open+Sans:wght@400;600;700',
    Lato: 'Lato:wght@400;700',
    Montserrat: 'Montserrat:wght@400;600;700',
    Oswald: 'Oswald:wght@400;500;600',
    Merriweather: 'Merriweather:wght@400;700',
    'Playfair Display': 'Playfair+Display:wght@400;700',
    Lora: 'Lora:wght@400;700',
    Nunito: 'Nunito:wght@400;600;700',
    Poppins: 'Poppins:wght@400;600',
    Ubuntu: 'Ubuntu:wght@400;500;700',
    'Dancing Script': 'Dancing+Script:wght@400;600',
    Pacifico: 'Pacifico',
    'Abril Fatface': 'Abril+Fatface',
    'Bebas Neue': 'Bebas+Neue',
    Lobster: 'Lobster',
    Comfortaa: 'Comfortaa:wght@400;600',
}

export function getGoogleMenuFontHref(fontName: string | null | undefined): string | null {
    if (!fontName || ROOT_LAYOUT_FONTS.has(fontName)) return null
    const spec = GOOGLE_MENU_FONT_SPEC[fontName]
    if (!spec) return null
    return `https://fonts.googleapis.com/css2?family=${spec}&display=swap`
}
