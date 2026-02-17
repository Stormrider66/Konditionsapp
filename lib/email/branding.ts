// lib/email/branding.ts
// Server-only email branding resolution.

import 'server-only'

import { resolveBusinessBrandingById } from '@/lib/branding/resolve-branding'
import { PLATFORM_NAME } from '@/lib/branding/types'
import { DEFAULT_EMAIL_BRANDING } from './email-branding-types'
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

    return {
      platformName,
      senderName,
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
