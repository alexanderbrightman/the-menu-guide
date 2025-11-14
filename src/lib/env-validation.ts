/**
 * Environment variable validation
 * Validates required environment variables at startup
 */

interface EnvConfig {
  NEXT_PUBLIC_SUPABASE_URL: string
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string
  SUPABASE_SERVICE_ROLE_KEY?: string
  STRIPE_SECRET_KEY?: string
  STRIPE_WEBHOOK_SECRET?: string
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?: string
}

/**
 * Validate required environment variables
 * @throws Error if required variables are missing or invalid
 */
export function validateEnv(): EnvConfig {
  const errors: string[] = []
  const config: Partial<EnvConfig> = {}

  // Required variables
  const requiredVars = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  }

  // Check required variables
  for (const [key, value] of Object.entries(requiredVars)) {
    if (!value || value.includes('your_') || value.includes('your-')) {
      errors.push(`Missing or invalid required environment variable: ${key}`)
    } else {
      config[key as keyof EnvConfig] = value
    }
  }

  // Optional variables (for features that may not be enabled)
  const optionalVars = {
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  }

  for (const [key, value] of Object.entries(optionalVars)) {
    if (value && !value.includes('your_') && !value.includes('your-')) {
      config[key as keyof EnvConfig] = value
    }
  }

  // Validate Supabase URL format
  if (config.NEXT_PUBLIC_SUPABASE_URL && !config.NEXT_PUBLIC_SUPABASE_URL.startsWith('https://')) {
    errors.push('NEXT_PUBLIC_SUPABASE_URL must start with https://')
  }

  if (errors.length > 0) {
    throw new Error(`Environment validation failed:\n${errors.join('\n')}`)
  }

  return config as EnvConfig
}

/**
 * Check if Stripe is configured
 */
export function isStripeConfigured(): boolean {
  return !!(
    process.env.STRIPE_SECRET_KEY &&
    process.env.STRIPE_WEBHOOK_SECRET &&
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY &&
    !process.env.STRIPE_SECRET_KEY.includes('your_') &&
    !process.env.STRIPE_WEBHOOK_SECRET.includes('your_') &&
    !process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.includes('your_')
  )
}

/**
 * Check if Supabase is configured
 */
export function isSupabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your_') &&
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.includes('your_')
  )
}

