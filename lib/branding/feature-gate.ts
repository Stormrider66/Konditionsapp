// lib/branding/feature-gate.ts
import 'server-only'

import { prisma } from '@/lib/prisma'
import { FeatureFlag } from '@prisma/client'
import { cache } from 'react'

/**
 * Check if a business has a specific feature flag enabled.
 * Uses React.cache() for request-level deduplication.
 */
export const hasBusinessFeature = cache(
  async (businessId: string, feature: FeatureFlag): Promise<boolean> => {
    const bf = await prisma.businessFeature.findUnique({
      where: {
        businessId_feature: { businessId, feature },
      },
      select: { isEnabled: true, expiresAt: true },
    })

    if (!bf || !bf.isEnabled) return false

    // Check expiration
    if (bf.expiresAt && bf.expiresAt < new Date()) return false

    return true
  }
)

/**
 * Check if a business has CUSTOM_BRANDING enabled
 */
export async function hasCustomBranding(businessId: string): Promise<boolean> {
  return hasBusinessFeature(businessId, FeatureFlag.CUSTOM_BRANDING)
}

/**
 * Check if a business has WHITE_LABEL enabled
 */
export async function hasWhiteLabel(businessId: string): Promise<boolean> {
  return hasBusinessFeature(businessId, FeatureFlag.WHITE_LABEL)
}

/**
 * Get both branding feature flags for a business
 */
export async function getBrandingFeatures(businessId: string): Promise<{
  hasCustomBranding: boolean
  hasWhiteLabel: boolean
}> {
  const [custom, whiteLabel] = await Promise.all([
    hasCustomBranding(businessId),
    hasWhiteLabel(businessId),
  ])
  return { hasCustomBranding: custom, hasWhiteLabel: whiteLabel }
}
