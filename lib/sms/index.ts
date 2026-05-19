/**
 * SMS Service
 *
 * Sends SMS via Twilio. Respects a kill switch (SMS_PAUSED) similar
 * to the email kill switch. Falls back gracefully if not configured.
 *
 * Environment variables:
 *   TWILIO_ACCOUNT_SID   - Twilio account SID
 *   TWILIO_AUTH_TOKEN     - Twilio auth token
 *   TWILIO_PHONE_NUMBER   - Twilio sender phone number (E.164 format)
 *   SMS_PAUSED            - Set to "true" to suppress all SMS
 */

import { logger } from '@/lib/logger'

interface SendSMSOptions {
  to: string // E.164 format, e.g. "+46701234567"
  body: string
}

interface SendSMSResult {
  success: boolean
  sid?: string
  error?: string
}

/**
 * Check if SMS is configured and active.
 */
export function isSMSConfigured(): boolean {
  return !!(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_PHONE_NUMBER &&
    process.env.SMS_PAUSED !== 'true'
  )
}

/**
 * Send a single SMS message.
 */
export async function sendSMS(options: SendSMSOptions): Promise<SendSMSResult> {
  const { to, body } = options

  // Kill switch
  if (process.env.SMS_PAUSED === 'true') {
    logger.info('SMS paused, skipping', { to: to.slice(-4) })
    return { success: false, error: 'SMS_PAUSED' }
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const fromNumber = process.env.TWILIO_PHONE_NUMBER

  if (!accountSid || !authToken || !fromNumber) {
    logger.warn('Twilio not configured, skipping SMS')
    return { success: false, error: 'NOT_CONFIGURED' }
  }

  try {
    // Use Twilio REST API directly (no SDK dependency needed)
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64')

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: to,
        From: fromNumber,
        Body: body,
      }),
    })

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}))
      const errorMsg = errData.message || `HTTP ${response.status}`
      logger.error('Twilio SMS failed', { to: to.slice(-4), error: errorMsg })
      return { success: false, error: errorMsg }
    }

    const result = await response.json()
    logger.info('SMS sent', { to: to.slice(-4), sid: result.sid })
    return { success: true, sid: result.sid }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    logger.error('SMS send error', { to: to.slice(-4), error: msg })
    return { success: false, error: msg }
  }
}

/**
 * Normalize a Swedish phone number to E.164 format.
 * "0701234567" → "+46701234567"
 * "+46701234567" → "+46701234567" (already valid)
 * "070-123 45 67" → "+46701234567"
 */
export function normalizePhoneNumber(phone: string): string | null {
  // Strip whitespace, dashes, parentheses
  const cleaned = phone.replace(/[\s\-()]/g, '')

  if (!cleaned) return null

  // Already E.164
  if (cleaned.startsWith('+')) return cleaned

  // Swedish format: 07xxxxxxxx → +467xxxxxxxx
  if (cleaned.startsWith('0') && cleaned.length >= 10) {
    return `+46${cleaned.slice(1)}`
  }

  // Just digits, assume Swedish
  if (/^\d{9,10}$/.test(cleaned)) {
    return `+46${cleaned}`
  }

  return null
}

/**
 * Send SMS to multiple recipients (batch).
 * Returns count of successfully sent messages.
 */
export async function sendBulkSMS(
  recipients: { phone: string; body: string }[]
): Promise<{ sent: number; failed: number }> {
  let sent = 0
  let failed = 0

  for (const recipient of recipients) {
    const normalized = normalizePhoneNumber(recipient.phone)
    if (!normalized) {
      failed++
      continue
    }

    const result = await sendSMS({ to: normalized, body: recipient.body })
    if (result.success) {
      sent++
    } else {
      failed++
    }

    // Small delay to stay within Twilio rate limits
    if (recipients.length > 1) {
      await new Promise((r) => setTimeout(r, 100))
    }
  }

  return { sent, failed }
}
