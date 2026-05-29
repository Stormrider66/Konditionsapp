// types/business.ts

import type { EnterpriseContract } from './admin'

// ==================== BUSINESS ORGANIZATION ====================

export type BusinessMemberRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'COACH' | 'PHYSIO'

export interface Business {
  id: string
  name: string
  slug: string
  description?: string | null
  email?: string | null
  phone?: string | null
  website?: string | null
  address?: string | null
  city?: string | null
  postalCode?: string | null
  country?: string | null
  stripeConnectAccountId?: string | null
  stripeConnectStatus?: string | null
  defaultRevenueShare: number
  logoUrl?: string | null
  primaryColor?: string | null
  isActive: boolean
  settings?: unknown
  createdAt: string
  updatedAt: string
  _count?: {
    members: number
    locations: number
    testers?: number
    athleteSubscriptions?: number
    apiKeys?: number
  }
  enterpriseContract?: EnterpriseContract | null
}

export interface BusinessMember {
  id: string
  businessId: string
  userId: string
  role: BusinessMemberRole
  permissions?: Record<string, boolean> | null
  isActive: boolean
  invitedAt: string
  acceptedAt?: string | null
  createdAt: string
  updatedAt: string
  user?: {
    id: string
    name: string | null
    email: string
    role?: string
  }
  business?: Business
}

export interface BusinessApiKey {
  id: string
  businessId: string
  name: string
  keyPrefix: string
  requestsPerMinute: number
  requestsPerDay: number
  scopes: string[]
  isActive: boolean
  lastUsedAt?: string | null
  expiresAt?: string | null
  createdAt: string
  updatedAt: string
}

export interface BusinessLocation {
  id: string
  businessId: string
  name: string
  city?: string | null
  address?: string | null
  postalCode?: string | null
  latitude?: number | null
  longitude?: number | null
  totalTests: number
  lastTestAt?: string | null
  isActive: boolean
  settings?: unknown
  createdAt: string
  updatedAt: string
}
