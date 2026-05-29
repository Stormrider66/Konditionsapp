// types/admin.ts

// ==================== ADMIN SYSTEM ====================

export type AdminRole = 'SUPER_ADMIN' | 'ADMIN' | 'SUPPORT'

export type EnterpriseContractStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'CANCELLED'
  | 'EXPIRED'

export interface EnterpriseContract {
  id: string
  businessId: string
  contractNumber: string
  contractName: string
  contactName: string
  contactEmail: string
  contactPhone?: string | null
  monthlyFee: number
  currency: string
  revenueSharePercent: number
  athleteLimit: number
  coachLimit: number
  billingCycle: string
  paymentTermDays: number
  startDate: string
  endDate?: string | null
  autoRenew: boolean
  noticePeriodDays: number
  status: EnterpriseContractStatus
  customFeatures?: unknown
  createdAt: string
  updatedAt: string
  activatedAt?: string | null
  cancelledAt?: string | null
  business?: {
    id: string
    name: string
    slug: string
  }
}

export interface EnterpriseContractChange {
  id: string
  contractId: string
  changeType: string
  changedById: string
  previousData?: unknown
  newData?: unknown
  notes?: string | null
  createdAt: string
  changedBy?: {
    id: string
    name: string
    email: string
  }
}

export interface PricingTier {
  id: string
  tierType: string
  tierName: string
  displayName: string
  description?: string | null
  features: string[]
  monthlyPriceCents: number
  yearlyPriceCents?: number | null
  currency: string
  stripeProductId?: string | null
  stripePriceIdMonthly?: string | null
  stripePriceIdYearly?: string | null
  maxAthletes: number
  aiChatLimit: number
  isActive: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface PricingOverride {
  id: string
  tierId: string
  businessId: string
  monthlyPriceCents?: number | null
  yearlyPriceCents?: number | null
  maxAthletes?: number | null
  aiChatLimit?: number | null
  validFrom: string
  validUntil?: string | null
  createdAt: string
  updatedAt: string
  tier?: PricingTier
  business?: {
    id: string
    name: string
    slug: string
  }
}

export interface SystemError {
  id: string
  level: string
  message: string
  stack?: string | null
  userId?: string | null
  route?: string | null
  method?: string | null
  statusCode?: number | null
  userAgent?: string | null
  sentryEventId?: string | null
  metadata?: unknown
  isResolved: boolean
  resolvedAt?: string | null
  resolvedById?: string | null
  createdAt: string
  resolvedBy?: {
    id: string
    name: string
    email: string
  } | null
}

export interface SystemMetric {
  id: string
  metricName: string
  value: number
  unit?: string | null
  dimensions?: unknown
  timestamp: string
}
