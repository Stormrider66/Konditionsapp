// lib/branding/resolve-branding.ts
import 'server-only'

import { cache } from 'react'
import { prisma } from '@/lib/prisma'
import { getBrandingFeatures } from './feature-gate'
import { BusinessBranding, DEFAULT_BRANDING, CURATED_FONTS, CuratedFont } from './types'

/**
 * Resolve complete branding for a business.
 * Uses React.cache() for request-level deduplication.
 *
 * Defense in depth: even if DB has values for gated fields,
 * they are returned as defaults unless the feature is enabled.
 */
export const resolveBusinessBranding = cache(
  async (businessSlug: string): Promise<BusinessBranding | null> => {
    const business = await prisma.business.findUnique({
      where: { slug: businessSlug, isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        primaryColor: true,
        secondaryColor: true,
        backgroundColor: true,
        fontFamily: true,
        faviconUrl: true,
        replyToEmail: true,
        replyToEmailVerified: true,
        customDomain: true,
        domainVerified: true,
        customEmailDomain: true,
        customEmailVerified: true,
        emailSenderName: true,
        pageTitle: true,
        hidePlatformBranding: true,
      },
    })

    if (!business) return null

    const features = await getBrandingFeatures(business.id)

    // Validate font is from curated list
    const validFont = business.fontFamily && CURATED_FONTS.includes(business.fontFamily as CuratedFont)
      ? (business.fontFamily as CuratedFont)
      : null

    return {
      businessName: business.name,
      businessSlug: business.slug,

      // Tier 0: always available
      logoUrl: business.logoUrl,
      primaryColor: business.primaryColor || DEFAULT_BRANDING.primaryColor,
      faviconUrl: features.hasCustomBranding ? business.faviconUrl : null,

      // Tier 0: every business can opt in. The resolver only exposes the
      // address once it's been verified — `lib/email/branding.ts` then uses
      // platform support as the fallback. Stops a typo from black-holing
      // replies before the customer has confirmed they own the inbox.
      replyToEmail: business.replyToEmail,
      replyToEmailVerified: business.replyToEmailVerified,

      // Tier 1: CUSTOM_BRANDING gated
      secondaryColor: features.hasCustomBranding ? business.secondaryColor : null,
      backgroundColor: features.hasCustomBranding ? business.backgroundColor : null,
      fontFamily: features.hasCustomBranding ? validFont : null,

      // Tier 2: WHITE_LABEL gated
      customDomain: features.hasWhiteLabel ? business.customDomain : null,
      domainVerified: features.hasWhiteLabel ? business.domainVerified : false,
      customEmailDomain: features.hasWhiteLabel ? business.customEmailDomain : null,
      customEmailVerified: features.hasWhiteLabel ? business.customEmailVerified : false,
      emailSenderName: features.hasWhiteLabel ? business.emailSenderName : null,
      pageTitle: features.hasWhiteLabel ? business.pageTitle : null,
      hidePlatformBranding: features.hasWhiteLabel ? business.hidePlatformBranding : false,

      // Feature flags
      hasCustomBranding: features.hasCustomBranding,
      hasWhiteLabel: features.hasWhiteLabel,
    }
  }
)

/**
 * Resolve branding by business ID (for API routes / non-slug contexts)
 */
export const resolveBusinessBrandingById = cache(
  async (businessId: string): Promise<BusinessBranding | null> => {
    const business = await prisma.business.findUnique({
      where: { id: businessId, isActive: true },
      select: { slug: true },
    })

    if (!business) return null

    return resolveBusinessBranding(business.slug)
  }
)
