// lib/contexts/BusinessBrandingContext.tsx
'use client'

import { createContext, useContext } from 'react'
import type { BusinessBranding } from '@/lib/branding/types'
import { DEFAULT_BRANDING, PLATFORM_NAME } from '@/lib/branding/types'

const BusinessBrandingContext = createContext<BusinessBranding | null>(null)

interface BusinessBrandingProviderProps {
  children: React.ReactNode
  branding: BusinessBranding
}

export function BusinessBrandingProvider({
  children,
  branding,
}: BusinessBrandingProviderProps) {
  return (
    <BusinessBrandingContext.Provider value={branding}>
      {children}
    </BusinessBrandingContext.Provider>
  )
}

/**
 * Hook to access business branding. Returns null if not in a business context.
 */
export function useBusinessBrandingOptional(): BusinessBranding | null {
  return useContext(BusinessBrandingContext)
}

/**
 * Hook to access business branding. Throws if not in a business context.
 */
export function useBusinessBranding(): BusinessBranding {
  const branding = useContext(BusinessBrandingContext)
  if (!branding) {
    throw new Error('useBusinessBranding must be used within a BusinessBrandingProvider')
  }
  return branding
}

/**
 * Get the platform display name from branding context (or default)
 */
export function usePlatformName(): string {
  const branding = useContext(BusinessBrandingContext)
  if (branding?.hasWhiteLabel && branding.hidePlatformBranding) {
    return branding.businessName
  }
  return PLATFORM_NAME
}
