// lib/email/branding.ts
// Server-only email branding resolution.

import 'server-only'

import { prisma } from '@/lib/prisma'
import { resolveBusinessBrandingById } from '@/lib/branding/resolve-branding'
import { PLATFORM_NAME } from '@/lib/branding/types'
import {
  DEFAULT_EMAIL_BRANDING,
  PLATFORM_REPLY_TO,
  PLATFORM_SENDING_DOMAIN,
} from './email-branding-types'
import type { EmailBranding } from './email-branding-types'

// Re-export types and utilities for convenience
export { DEFAULT_EMAIL_BRANDING, emailLayout, emailButton } from './email-branding-types'
export type { EmailBranding } from './email-branding-types'

/**
 * Strip RFC 5322 special characters from a free-form display name so it can
 * safely sit inside an `address-list` like `Display <noreply@domain>`. Falls
 * back to null when the name was empty/whitespace/all-special — the caller
 * should then use the business sender name instead.
 */
function sanitizeDisplayName(name: string | null | undefined): string | null {
  if (!name) return null
  // Drop the four characters that would break the From: header parser.
  // `@` is technically allowed inside a quoted display name but most clients
  // render the result confusingly, so strip it too.
  const cleaned = name.replace(/[<>@\r\n]/g, '').trim()
  return cleaned.length > 0 ? cleaned : null
}

export interface ResolveEmailBrandingOptions {
  /**
   * The user actually triggering this send (e.g. the coach who clicked
   * "invite athlete"). When set AND the user's email lives on the
   * business's verified `customEmailDomain`, the From: header switches
   * from the generic `noreply@<domain>` to `<user.name> <user.email>`,
   * and Reply-To: routes back to the user instead of platform support.
   *
   * Leave undefined for system / cron / automated sends — they keep
   * the `noreply@<domain>` mailbox so replies don't surprise nobody-in-particular.
   */
  senderUserId?: string | null
}

/**
 * Resolve email branding for a business.
 * Returns default platform branding if businessId is null or resolution fails.
 * Server-only: uses Prisma to look up business branding.
 */
export async function resolveEmailBranding(
  businessId: string | null | undefined,
  options?: ResolveEmailBrandingOptions,
): Promise<EmailBranding> {
  if (!businessId) return DEFAULT_EMAIL_BRANDING

  try {
    const branding = await resolveBusinessBrandingById(businessId)
    if (!branding) return DEFAULT_EMAIL_BRANDING

    const platformName = branding.hasWhiteLabel && branding.hidePlatformBranding
      ? branding.businessName
      : PLATFORM_NAME

    let senderName = branding.hasWhiteLabel && branding.emailSenderName
      ? branding.emailSenderName
      : PLATFORM_NAME

    // Sending domain switches to the business's verified custom domain only when
    // both WHITE_LABEL is active (gated upstream) and Resend has reported the
    // domain verified. Anything else falls back to the shared trainomics.app.
    const sendingDomain =
      branding.customEmailVerified && branding.customEmailDomain
        ? branding.customEmailDomain
        : PLATFORM_SENDING_DOMAIN

    let fromAddress = `${senderName} <noreply@${sendingDomain}>`
    // Only honor the business's reply-to once it's verified — until the
    // customer clicks the confirmation link we keep routing replies to
    // platform support so a typo can't dead-letter them.
    let replyTo =
      branding.replyToEmail && branding.replyToEmailVerified
        ? branding.replyToEmail
        : PLATFORM_REPLY_TO

    // Per-user sender resolution. Two layered decisions:
    //
    //   1. Reply-To override (always allowed when the user has an email).
    //      Reply-To is just an instruction to the recipient's mail client —
    //      it doesn't need DKIM signing. So even on path A (no verified
    //      sending domain) we route replies straight to the staff member
    //      instead of platform support.
    //
    //   2. From: address override (gated on a verified custom domain).
    //      Putting `staff@thomsons.se` in the From: header without a DKIM
    //      signature for thomsons.se would fail DMARC alignment and land
    //      everywhere as spam — so this only kicks in once Resend confirms
    //      the domain.
    //
    // Path A also gets a more personal display name: "Henrik – Star by
    // Thomson" instead of just "Star by Thomson". Recipient instantly sees
    // both who sent it and the business context, which reduces "is this
    // spam?" friction without compromising deliverability.
    if (options?.senderUserId) {
      const sender = await prisma.user.findUnique({
        where: { id: options.senderUserId },
        select: { email: true, name: true },
      })

      if (sender?.email) {
        // Always: replies go to the staff member directly.
        replyTo = sender.email

        const senderHumanName = sanitizeDisplayName(sender.name)
        const onVerifiedDomain =
          branding.customEmailVerified &&
          branding.customEmailDomain &&
          sender.email.toLowerCase().endsWith(`@${branding.customEmailDomain.toLowerCase()}`)

        if (onVerifiedDomain) {
          // Path B: send as the staff member's own address.
          const display = senderHumanName || senderName
          senderName = display
          fromAddress = `${display} <${sender.email}>`
        } else if (senderHumanName) {
          // Path A: keep the noreply mailbox but make the display name
          // person + business so recipients see who sent it.
          const display = `${senderHumanName} – ${senderName}`
          senderName = display
          fromAddress = `${display} <noreply@${sendingDomain}>`
        }
      }
    }

    return {
      platformName,
      senderName,
      fromAddress,
      sendingDomain,
      replyTo,
      logoUrl: branding.logoUrl,
      primaryColor: branding.primaryColor || DEFAULT_EMAIL_BRANDING.primaryColor,
      gradientStart: branding.primaryColor || DEFAULT_EMAIL_BRANDING.gradientStart,
      gradientEnd: branding.secondaryColor || DEFAULT_EMAIL_BRANDING.gradientEnd,
      footerText: `© ${new Date().getFullYear()} ${platformName}. All rights reserved.`,
      showPoweredBy: branding.hasWhiteLabel && !branding.hidePlatformBranding,
    }
  } catch {
    return DEFAULT_EMAIL_BRANDING
  }
}
