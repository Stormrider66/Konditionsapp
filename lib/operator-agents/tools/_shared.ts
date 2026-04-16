import { logger } from '@/lib/logger'

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

/**
 * Send an email to the founder with consistent error handling.
 * Used by all agents that deliver reports/alerts to the founder.
 *
 * Uses dynamic import because the email module depends on Resend which
 * may not be configured in all environments. If the import fails or
 * FOUNDER_EMAIL is not set, we log a warning but don't throw — the
 * caller can decide what to do based on the `sent` flag.
 */
export async function sendFounderEmail(
  subject: string,
  content: string
): Promise<{ sent: boolean; to?: string; reason?: string }> {
  const founderEmail = process.env.FOUNDER_EMAIL
  if (!founderEmail) {
    logger.warn('[operator-agents] FOUNDER_EMAIL not configured — email skipped', { subject })
    return { sent: false, reason: 'FOUNDER_EMAIL not configured' }
  }

  let sendEmail: ((args: { to: string; subject: string; html: string }) => Promise<unknown>) | null = null
  try {
    const mod = await import('@/lib/email')
    sendEmail = mod.sendEmail
  } catch (error) {
    logger.error('[operator-agents] Failed to load email module', { subject }, error)
    return { sent: false, reason: 'Email module not available' }
  }

  if (!sendEmail) {
    return { sent: false, reason: 'sendEmail not exported' }
  }

  try {
    await sendEmail({
      to: founderEmail,
      subject,
      html: `<div style="font-family:sans-serif;white-space:pre-wrap;line-height:1.5">${escapeHtml(content)}</div>`,
    })
    return { sent: true, to: founderEmail }
  } catch (error) {
    logger.error('[operator-agents] Failed to send founder email', { subject }, error)
    return { sent: false, reason: String(error) }
  }
}

/**
 * Minimal HTML escape for email content.
 * Agents control the content, but we still escape to avoid injection.
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
