// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs'

// Required for Next.js 15 navigation instrumentation
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Only enable Sentry in production
  enabled: process.env.NODE_ENV === 'production',

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: 0.1, // 10% of transactions

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  replaysOnErrorSampleRate: 1.0, // Capture replay on 100% of errors
  replaysSessionSampleRate: 0.1, // Capture replay on 10% of sessions

  // You can remove this option if you're not planning to use the Sentry Session Replay feature:
  integrations: [
    Sentry.replayIntegration({
      // Additional Replay configuration goes in here
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // Scrub sensitive data from headers
  beforeSend(event) {
    // Scrub authorization headers
    if (event.request?.headers) {
      const headers = event.request.headers
      if (headers['authorization']) {
        headers['authorization'] = '[REDACTED]'
      }
      if (headers['cookie']) {
        headers['cookie'] = '[REDACTED]'
      }
      if (headers['x-api-key']) {
        headers['x-api-key'] = '[REDACTED]'
      }
    }

    // Scrub user email if needed for extra privacy
    if (event.user?.email) {
      // Keep first 2 chars and domain for debugging
      const email = event.user.email
      const [local, domain] = email.split('@')
      if (local && domain) {
        event.user.email = `${local.slice(0, 2)}***@${domain}`
      }
    }

    return event
  },

  // Ignore specific errors
  ignoreErrors: [
    // Browser extensions
    'top.GLOBALS',
    // Network errors
    'Network request failed',
    'Failed to fetch',
    'Load failed',
    // User-caused errors
    'ResizeObserver loop',
  ],
})
