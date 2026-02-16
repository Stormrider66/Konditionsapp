import * as Sentry from '@sentry/nextjs'
import { assertEnv } from '@/lib/env'

// Required for capturing errors from nested React Server Components
export const onRequestError = Sentry.captureRequestError

export async function register() {
  // Validate environment variables on startup
  assertEnv()

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Server-side Sentry initialization
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

      // Only enable Sentry in production
      enabled: process.env.NODE_ENV === 'production',

      // Adjust this value in production, or use tracesSampler for greater control
      tracesSampleRate: 0.1, // 10% of transactions

      // Setting this option to true will print useful information to the console while you're setting up Sentry.
      debug: false,

      // Scrub sensitive data
      beforeSend(event) {
        // Scrub authorization headers
        if (event.request?.headers) {
          const headers = event.request.headers
          const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-supabase-auth']
          sensitiveHeaders.forEach((header) => {
            if (headers[header]) {
              headers[header] = '[REDACTED]'
            }
          })
        }

        return event
      },
    })
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    // Edge runtime Sentry initialization
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

      // Only enable Sentry in production
      enabled: process.env.NODE_ENV === 'production',

      // Adjust this value in production, or use tracesSampler for greater control
      tracesSampleRate: 0.1, // 10% of transactions

      // Setting this option to true will print useful information to the console while you're setting up Sentry.
      debug: false,
    })
  }
}
