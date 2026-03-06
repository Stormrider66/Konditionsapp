'use client'

import { createContext, useContext, useMemo, type ReactNode } from 'react'

interface BusinessAdminContextValue {
  businessId: string
}

const BusinessAdminContext = createContext<BusinessAdminContextValue | null>(null)

export function BusinessAdminProvider({
  businessId,
  children,
}: {
  businessId: string
  children: ReactNode
}) {
  const value = useMemo(() => ({ businessId }), [businessId])

  return (
    <BusinessAdminContext.Provider value={value}>
      {children}
    </BusinessAdminContext.Provider>
  )
}

export function useBusinessAdminContext(): BusinessAdminContextValue {
  const context = useContext(BusinessAdminContext)

  if (!context) {
    throw new Error('useBusinessAdminContext must be used inside BusinessAdminProvider')
  }

  return context
}

export function useBusinessAdminHeaders(): HeadersInit {
  const { businessId } = useBusinessAdminContext()

  return useMemo(
    () => ({
      'x-business-id': businessId,
    }),
    [businessId]
  )
}
