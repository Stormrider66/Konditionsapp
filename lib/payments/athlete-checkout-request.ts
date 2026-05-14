import { z } from 'zod'

export const athleteCheckoutSchema = z.object({
  tier: z.enum(['STANDARD', 'PRO', 'ELITE']),
  cycle: z.enum(['MONTHLY', 'YEARLY']).optional(),
  billingCycle: z.enum(['MONTHLY', 'YEARLY']).optional(),
  businessId: z.string().uuid().optional(),
  returnPath: z.string()
    .max(200)
    .refine((value) => value.startsWith('/') && !value.startsWith('//'), 'returnPath must be a relative path')
    .optional(),
})

export type NormalizedAthleteCheckoutRequest = {
  tier: 'STANDARD' | 'PRO' | 'ELITE'
  cycle: 'MONTHLY' | 'YEARLY'
  businessId?: string
  returnPath: string
}

export function normalizeAthleteCheckoutRequest(input: unknown): NormalizedAthleteCheckoutRequest {
  const parsed = athleteCheckoutSchema.parse(input)
  return {
    tier: parsed.tier,
    cycle: parsed.cycle ?? parsed.billingCycle ?? 'MONTHLY',
    businessId: parsed.businessId,
    returnPath: parsed.returnPath ?? '/athlete/subscription',
  }
}
