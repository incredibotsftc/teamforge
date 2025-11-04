/**
 * Environment variable validation and type-safe access
 * This file ensures all required environment variables are present at startup
 */

const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
] as const

const optionalEnvVars = [] as const

export function validateEnv() {
  // Only validate in Node.js environment (not in browser)
  if (typeof window !== 'undefined') {
    return
  }

  const missing = requiredEnvVars.filter(
    (name) => !process.env[name]
  )

  if (missing.length > 0) {
    throw new Error(
      `❌ Missing required environment variables:\n  ${missing.join('\n  ')}\n\n` +
      `Please check your .env.local file and ensure these variables are set.`
    )
  }

  // Warn about missing optional vars
  const missingOptional = optionalEnvVars.filter(
    (name) => !process.env[name]
  )

  if (missingOptional.length > 0) {
    console.warn(
      `⚠️  Missing optional environment variables:\n  ${missingOptional.join('\n  ')}\n` +
      `Some features may not work correctly.`
    )
  }
}

/**
 * Type-safe environment variable access
 * Throws error if required var is missing
 */
export const env = {
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  },
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
} as const

// Validate on import (server-side only, but skip during build)
// During build, PHASE_PRODUCTION_BUILD is set by Next.js
const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build'

if (typeof window === 'undefined' && !isBuildPhase) {
  try {
    validateEnv()
  } catch (error) {
    console.error(error)
    // Don't crash the app in development, just warn
    if (process.env.NODE_ENV === 'production') {
      throw error
    }
  }
}
