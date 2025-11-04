/**
 * Error Monitoring Utility
 *
 * Simple error logging with optional Sentry integration.
 * To enable Sentry:
 * 1. Install: npm install @sentry/nextjs
 * 2. Run: npx @sentry/wizard@latest -i nextjs
 * 3. Set SENTRY_DSN in your environment variables
 * 4. Uncomment Sentry imports and initialization below
 */

// import * as Sentry from '@sentry/nextjs'

interface ErrorContext {
  user?: {
    id?: string
    email?: string
  }
  extra?: Record<string, unknown>
  tags?: Record<string, string>
}

class ErrorMonitoring {
  private isInitialized = false
  private useSentry = false

  constructor() {
    // Check if Sentry is configured
    if (typeof window !== 'undefined') {
      this.useSentry = !!process.env.NEXT_PUBLIC_SENTRY_DSN
    } else {
      this.useSentry = !!process.env.SENTRY_DSN
    }

    // Initialize Sentry if available (uncomment when Sentry is installed)
    // if (this.useSentry && typeof Sentry !== 'undefined') {
    //   this.isInitialized = true
    // }
  }

  /**
   * Log an error with optional context
   */
  captureError(error: Error | string, context?: ErrorContext): void {
    const errorMessage = typeof error === 'string' ? error : error.message
    const errorStack = typeof error === 'string' ? undefined : error.stack

    // Log to console (always)
    console.error('[Error]', errorMessage, {
      stack: errorStack,
      context,
      timestamp: new Date().toISOString(),
    })

    // Send to Sentry if initialized (uncomment when Sentry is installed)
    // if (this.isInitialized && this.useSentry) {
    //   if (context?.user) {
    //     Sentry.setUser(context.user)
    //   }
    //   if (context?.tags) {
    //     Sentry.setTags(context.tags)
    //   }
    //   if (typeof error === 'string') {
    //     Sentry.captureMessage(error, {
    //       level: 'error',
    //       extra: context?.extra,
    //     })
    //   } else {
    //     Sentry.captureException(error, {
    //       extra: context?.extra,
    //     })
    //   }
    // }
  }

  /**
   * Log a warning message
   */
  captureWarning(message: string, context?: ErrorContext): void {
    console.warn('[Warning]', message, {
      context,
      timestamp: new Date().toISOString(),
    })

    // Send to Sentry if initialized (uncomment when Sentry is installed)
    // if (this.isInitialized && this.useSentry) {
    //   if (context?.user) {
    //     Sentry.setUser(context.user)
    //   }
    //   if (context?.tags) {
    //     Sentry.setTags(context.tags)
    //   }
    //   Sentry.captureMessage(message, {
    //     level: 'warning',
    //     extra: context?.extra,
    //   })
    // }
  }

  /**
   * Log an informational message
   */
  captureInfo(message: string, context?: ErrorContext): void {
    console.info('[Info]', message, {
      context,
      timestamp: new Date().toISOString(),
    })

    // Send to Sentry if initialized (uncomment when Sentry is installed)
    // if (this.isInitialized && this.useSentry) {
    //   if (context?.user) {
    //     Sentry.setUser(context.user)
    //   }
    //   if (context?.tags) {
    //     Sentry.setTags(context.tags)
    //   }
    //   Sentry.captureMessage(message, {
    //     level: 'info',
    //     extra: context?.extra,
    //   })
    // }
  }

  /**
   * Set user context for error tracking
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  setUser(_user: { id?: string; email?: string } | null): void {
    // Set user in Sentry if initialized (uncomment when Sentry is installed)
    // if (this.isInitialized && this.useSentry) {
    //   if (user) {
    //     Sentry.setUser(user)
    //   } else {
    //     Sentry.setUser(null)
    //   }
    // }
  }
}

// Export singleton instance
export const errorMonitoring = new ErrorMonitoring()

// Convenience functions
export const captureError = (error: Error | string, context?: ErrorContext) =>
  errorMonitoring.captureError(error, context)

export const captureWarning = (message: string, context?: ErrorContext) =>
  errorMonitoring.captureWarning(message, context)

export const captureInfo = (message: string, context?: ErrorContext) =>
  errorMonitoring.captureInfo(message, context)

export const setUser = (user: { id?: string; email?: string } | null) =>
  errorMonitoring.setUser(user)
