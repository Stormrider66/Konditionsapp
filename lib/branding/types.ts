// lib/branding/types.ts

export const CURATED_FONTS = [
  'Inter',
  'DM Sans',
  'Roboto',
  'Poppins',
  'Lato',
  'Nunito',
] as const

export type CuratedFont = (typeof CURATED_FONTS)[number]

export interface BusinessBranding {
  // Identity
  businessName: string
  businessSlug: string

  // Tier 0: Basic (all businesses)
  logoUrl: string | null
  primaryColor: string
  faviconUrl: string | null

  // Tier 1: CUSTOM_BRANDING
  secondaryColor: string | null
  backgroundColor: string | null
  fontFamily: CuratedFont | null

  // Tier 2: WHITE_LABEL
  customDomain: string | null
  domainVerified: boolean
  emailSenderName: string | null
  pageTitle: string | null
  hidePlatformBranding: boolean

  // Feature flags
  hasCustomBranding: boolean
  hasWhiteLabel: boolean
}

export const DEFAULT_BRANDING: Omit<BusinessBranding, 'businessName' | 'businessSlug'> = {
  logoUrl: null,
  primaryColor: '#3b82f6',
  faviconUrl: null,
  secondaryColor: null,
  backgroundColor: null,
  fontFamily: null,
  customDomain: null,
  domainVerified: false,
  emailSenderName: null,
  pageTitle: null,
  hidePlatformBranding: false,
  hasCustomBranding: false,
  hasWhiteLabel: false,
}

/** Platform name used when white-label is not active */
export const PLATFORM_NAME = 'Trainomics'

/** Get display name: business name if white-label, otherwise platform name */
export function getDisplayName(branding: BusinessBranding): string {
  if (branding.hasWhiteLabel && branding.hidePlatformBranding) {
    return branding.businessName
  }
  return PLATFORM_NAME
}
