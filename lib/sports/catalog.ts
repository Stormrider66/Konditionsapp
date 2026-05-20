import type { SportType } from '@/types'

export type SportOption = {
  value: SportType
  labelKey: string
  sv: string
  en: string
}

export const PROGRAM_GENERATION_SPORT_VALUES = [
  'RUNNING',
  'CYCLING',
  'SKIING',
  'SWIMMING',
  'TRIATHLON',
  'HYROX',
  'GENERAL_FITNESS',
  'FUNCTIONAL_FITNESS',
  'STRENGTH',
  'TEAM_FOOTBALL',
  'TEAM_ICE_HOCKEY',
  'TEAM_HANDBALL',
  'TEAM_FLOORBALL',
  'TEAM_BASKETBALL',
  'TEAM_VOLLEYBALL',
  'TENNIS',
  'PADEL',
] as const satisfies readonly Exclude<SportType, 'NUTRITION'>[]

export const SPORT_OPTIONS: SportOption[] = [
  { value: 'RUNNING', labelKey: 'running', sv: 'Löpning', en: 'Running' },
  { value: 'CYCLING', labelKey: 'cycling', sv: 'Cykling', en: 'Cycling' },
  { value: 'SKIING', labelKey: 'skiing', sv: 'Längdskidåkning', en: 'Cross-country skiing' },
  { value: 'SWIMMING', labelKey: 'swimming', sv: 'Simning', en: 'Swimming' },
  { value: 'TRIATHLON', labelKey: 'triathlon', sv: 'Triathlon', en: 'Triathlon' },
  { value: 'HYROX', labelKey: 'hyrox', sv: 'HYROX', en: 'HYROX' },
  { value: 'GENERAL_FITNESS', labelKey: 'generalFitness', sv: 'Allmän träning', en: 'General fitness' },
  { value: 'FUNCTIONAL_FITNESS', labelKey: 'functionalFitness', sv: 'Funktionell fitness', en: 'Functional fitness' },
  { value: 'STRENGTH', labelKey: 'strength', sv: 'Styrketräning', en: 'Strength training' },
  { value: 'TEAM_FOOTBALL', labelKey: 'football', sv: 'Fotboll', en: 'Football' },
  { value: 'TEAM_ICE_HOCKEY', labelKey: 'iceHockey', sv: 'Ishockey', en: 'Ice hockey' },
  { value: 'TEAM_HANDBALL', labelKey: 'handball', sv: 'Handboll', en: 'Handball' },
  { value: 'TEAM_FLOORBALL', labelKey: 'floorball', sv: 'Innebandy', en: 'Floorball' },
  { value: 'TEAM_BASKETBALL', labelKey: 'basketball', sv: 'Basket', en: 'Basketball' },
  { value: 'TEAM_VOLLEYBALL', labelKey: 'volleyball', sv: 'Volleyboll', en: 'Volleyball' },
  { value: 'TENNIS', labelKey: 'tennis', sv: 'Tennis', en: 'Tennis' },
  { value: 'PADEL', labelKey: 'padel', sv: 'Padel', en: 'Padel' },
]

export const TEAM_AND_RACKET_SPORT_OPTIONS = SPORT_OPTIONS.filter((sport) =>
  sport.value.startsWith('TEAM_') || sport.value === 'TENNIS' || sport.value === 'PADEL'
)

export const SPORT_LABEL_KEYS = Object.fromEntries(
  SPORT_OPTIONS.map((sport) => [sport.value, sport.labelKey])
) as Record<SportType, string>

export const SPORT_LABELS_SV = Object.fromEntries(
  SPORT_OPTIONS.map((sport) => [sport.value, sport.sv])
) as Record<SportType, string>

export const SPORT_LABELS_EN = Object.fromEntries(
  SPORT_OPTIONS.map((sport) => [sport.value, sport.en])
) as Record<SportType, string>

export function getSportLabelKey(sport: string | null | undefined): string | undefined {
  return sport ? SPORT_LABEL_KEYS[sport as SportType] : undefined
}

export function getSportLabel(
  sport: string | null | undefined,
  locale: 'sv' | 'en' = 'en'
): string {
  if (!sport) return ''
  const labels = locale === 'en' ? SPORT_LABELS_EN : SPORT_LABELS_SV
  return labels[sport as SportType] || sport
}
