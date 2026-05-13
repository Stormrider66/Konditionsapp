import { z } from 'zod'

export const athleteCheckoutSchema = z.object({
  tier: z.enum(['STANDARD', 'PRO', 'ELITE']),
  cycle: z.enum(['MONTHLY', 'YEARLY']).optional(),
  billingCycle: z.enum(['MONTHLY', 'YEARLY']).optional(),
  businessId: z.string().uuid().optional(),
})

export type NormalizedAthleteCheckoutRequest = {
  tier: 'STANDARD' | 'PRO' | 'ELITE'
  cycle: 'MONTHLY' | 'YEARLY'
  businessId?: string
}

export function normalizeAthleteCheckoutRequest(input: unknown): NormalizedAthleteCheckoutRequest {
  const parsed = athleteCheckoutSchema.parse(input)
  return {
    tier: parsed.tier,
    cycle: parsed.cycle ?? parsed.billingCycle ?? 'MONTHLY',
    businessId: parsed.businessId,
  }
}
