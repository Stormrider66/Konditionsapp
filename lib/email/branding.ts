// lib/email/branding.ts
// Server-only email branding resolution.

import 'server-only'

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
 * Resolve email branding for a business.
 * Returns default platform branding if businessId is null or resolution fails.
 * Server-only: uses Prisma to look up business branding.
 */
export async function resolveEmailBranding(
  businessId: string | null | undefined
): Promise<EmailBranding> {
  if (!businessId) return DEFAULT_EMAIL_BRANDING

  try {
    const branding = await resolveBusinessBrandingById(businessId)
    if (!branding) return DEFAULT_EMAIL_BRANDING

    const platformName = branding.hasWhiteLabel && branding.hidePlatformBranding
      ? branding.businessName
      : PLATFORM_NAME

    const senderName = branding.hasWhiteLabel && branding.emailSenderName
      ? branding.emailSenderName
      : PLATFORM_NAME

    // Sending domain switches to the business's verified custom domain only when
    // both WHITE_LABEL is active (gated upstream) and Resend has reported the
    // domain verified. Anything else falls back to the shared trainomics.app.
    const sendingDomain =
      branding.customEmailVerified && branding.customEmailDomain
        ? branding.customEmailDomain
        : PLATFORM_SENDING_DOMAIN

    return {
      platformName,
      senderName,
      fromAddress: `${senderName} <noreply@${sendingDomain}>`,
      sendingDomain,
      // Only honor the business's reply-to once it's verified — until the
      // customer clicks the confirmation link we keep routing replies to
      // platform support so a typo can't dead-letter them.
      replyTo:
        branding.replyToEmail && branding.replyToEmailVerified
          ? branding.replyToEmail
          : PLATFORM_REPLY_TO,
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
