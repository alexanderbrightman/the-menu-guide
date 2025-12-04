export const CURRENCIES = [
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'GBP', symbol: '£', name: 'British Pound' },
    { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar' },
    { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
    { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
    { code: 'CNY', symbol: 'CN¥', name: 'Chinese Yuan' },
    { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
    { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
    { code: 'MXN', symbol: 'MX$', name: 'Mexican Peso' },
    { code: 'KRW', symbol: '₩', name: 'South Korean Won' },
    { code: 'RUB', symbol: '₽', name: 'Russian Ruble' },
    { code: 'TRY', symbol: '₺', name: 'Turkish Lira' },
    { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal' },
    { code: 'AED', symbol: 'د.إ', name: 'United Arab Emirates Dirham' },
]

export const DEFAULT_CURRENCY = 'USD'

export function getCurrencySymbol(currencyCode: string = DEFAULT_CURRENCY): string {
    const currency = CURRENCIES.find(c => c.code === currencyCode)
    return currency ? currency.symbol : '$'
}

export function formatPrice(price: number, currencyCode: string = DEFAULT_CURRENCY): string {
    try {
        return new Intl.NumberFormat(undefined, {
            style: 'currency',
            currency: currencyCode,
        }).format(price)
    } catch (error) {
        // Fallback if currency code is invalid
        return `${getCurrencySymbol(currencyCode)}${price.toFixed(2)}`
    }
}
