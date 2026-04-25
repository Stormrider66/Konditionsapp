// lib/email/after.ts
// Fire-and-forget wrapper for outbound email.

import 'server-only'

import { after } from 'next/server'
import { logger } from '@/lib/logger'
import type { SendEmailResult } from './index'

/**
 * Run an email send after the HTTP response is committed.
 *
 * Use this for emails the caller does not need to confirm to the user
 * (welcome, referral notifications, internal alerts). The user-facing
 * request returns as soon as the DB write is durable; the Resend round-trip
 * happens in the background via Next.js `after()`.
 *
 * Errors are caught and logged so they do not surface as unhandledRejection.
 * Only callable from a route handler / server action / middleware context.
 */
export function sendEmailAfter(
  task: () => Promise<SendEmailResult>,
  context: { route: string; emailKind?: string }
): void {
  after(async () => {
    try {
      const result = await task()
      if (!result.success) {
        logger.warn('Background email failed', { ...context, error: result.error })
      }
    } catch (error) {
      logger.error('Background email crashed', context, error)
    }
  })
}
