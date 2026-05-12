import type { BusinessType } from '@prisma/client'

export const PUBLIC_JOINABLE_BUSINESS_TYPES: BusinessType[] = ['GYM']

export function isPublicJoinableBusinessType(type: BusinessType | string): boolean {
  return PUBLIC_JOINABLE_BUSINESS_TYPES.includes(type as BusinessType)
}
