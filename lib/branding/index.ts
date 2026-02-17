// lib/branding/index.ts
// Barrel export for branding utilities

export { resolveBusinessBranding, resolveBusinessBrandingById } from './resolve-branding'
export { hasBusinessFeature, hasCustomBranding, hasWhiteLabel, getBrandingFeatures } from './feature-gate'
export { PLATFORM_NAME, CURATED_FONTS, DEFAULT_BRANDING, getDisplayName } from './types'
export type { BusinessBranding, CuratedFont } from './types'
