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

    // Per-user sender override: when a specific user is sending (e.g. a coach
    // inviting an athlete) and that user's email is on the business's verified
    // sending domain, send as them and route replies back to them. Lets every
    // staff member at e.g. Star by Thomson send from their own
    // `name@thomsons.se` address without a per-user setting.
    if (
      options?.senderUserId &&
      branding.customEmailVerified &&
      branding.customEmailDomain
    ) {
      const sender = await prisma.user.findUnique({
        where: { id: options.senderUserId },
        select: { email: true, name: true },
      })

      if (
        sender?.email &&
        sender.email.toLowerCase().endsWith(`@${branding.customEmailDomain.toLowerCase()}`)
      ) {
        const senderDisplay = sender.name?.trim() || senderName
        senderName = senderDisplay
        fromAddress = `${senderDisplay} <${sender.email}>`
        replyTo = sender.email
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
