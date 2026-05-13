export type AthletePlanTier = 'FREE' | 'STANDARD' | 'PRO' | 'ELITE'

export const ATHLETE_PLAN_ORDER: AthletePlanTier[] = ['FREE', 'STANDARD', 'PRO', 'ELITE']

export const ATHLETE_PLAN_PRICING: Record<
  Exclude<AthletePlanTier, 'ELITE'>,
  { monthlySek: number; yearlySek: number }
> = {
  FREE: { monthlySek: 0, yearlySek: 0 },
  STANDARD: { monthlySek: 199, yearlySek: 1990 },
  PRO: { monthlySek: 399, yearlySek: 3990 },
}

export const ATHLETE_LEGACY_AI_CHAT_LIMITS: Record<AthletePlanTier, number> = {
  FREE: 10,
  STANDARD: 50,
  PRO: 500,
  ELITE: -1,
}

export const ATHLETE_AI_ALLOWANCE_SEK: Record<AthletePlanTier, number> = {
  FREE: 3,
  STANDARD: 30,
  PRO: 75,
  ELITE: 150,
}

export const ATHLETE_PLAN_COPY: Record<
  AthletePlanTier,
  {
    nameSv: string
    descriptionSv: string
    featuresSv: string[]
  }
> = {
  FREE: {
    nameSv: 'Gratis',
    descriptionSv: 'Grundläggande funktioner',
    featuresSv: ['Visa testrapporter', 'Grundläggande profil', 'Träningshistorik'],
  },
  STANDARD: {
    nameSv: 'Standard',
    descriptionSv: 'För aktiva atleter',
    featuresSv: [
      'Allt i Gratis',
      'Daglig incheckning',
      'Träningsloggning',
      'AI-krediter för daglig användning',
      'Strava/Garmin-synk',
    ],
  },
  PRO: {
    nameSv: 'Pro',
    descriptionSv: 'Maximal träningsoptimering',
    featuresSv: [
      'Allt i Standard',
      'Större AI-kreditpott',
      'Videoanalys',
      'AI-agent för träningsstöd',
      'Full integration',
      'Programjusteringar med AI',
    ],
  },
  ELITE: {
    nameSv: 'Elite',
    descriptionSv: 'Personlig coach/PT med custom pricing',
    featuresSv: [
      'Allt i Pro',
      'Personlig coach/PT',
      'Custom AI-krediter',
      'Individuell uppföljning',
    ],
  },
}

export function getAthletePlanPrice(tier: Exclude<AthletePlanTier, 'ELITE'>, yearly = false): number {
  const price = ATHLETE_PLAN_PRICING[tier]
  return yearly ? price.yearlySek : price.monthlySek
}
