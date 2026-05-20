export const FUELING_SPORT_OPTIONS = [
  { value: 'RUNNING', label: 'Löpning', labelEn: 'Running' },
  { value: 'CYCLING', label: 'Cykling', labelEn: 'Cycling' },
  { value: 'SKIING', label: 'Skidor', labelEn: 'Skiing' },
  { value: 'SWIMMING', label: 'Simning', labelEn: 'Swimming' },
  { value: 'TRIATHLON', label: 'Triathlon', labelEn: 'Triathlon' },
  { value: 'HYROX', label: 'HYROX', labelEn: 'HYROX' },
  { value: 'GENERAL_FITNESS', label: 'Fitness', labelEn: 'Fitness' },
  { value: 'FUNCTIONAL_FITNESS', label: 'Funktionell träning', labelEn: 'Functional fitness' },
  { value: 'STRENGTH', label: 'Styrka', labelEn: 'Strength' },
  { value: 'TEAM_FOOTBALL', label: 'Fotboll', labelEn: 'Football' },
  { value: 'TEAM_ICE_HOCKEY', label: 'Ishockey', labelEn: 'Ice hockey' },
  { value: 'TEAM_HANDBALL', label: 'Handboll', labelEn: 'Handball' },
  { value: 'TEAM_FLOORBALL', label: 'Innebandy', labelEn: 'Floorball' },
  { value: 'TEAM_BASKETBALL', label: 'Basket', labelEn: 'Basketball' },
  { value: 'TEAM_VOLLEYBALL', label: 'Volleyboll', labelEn: 'Volleyball' },
  { value: 'TENNIS', label: 'Tennis', labelEn: 'Tennis' },
  { value: 'PADEL', label: 'Padel', labelEn: 'Padel' },
] as const

const FUELING_SPORT_LABELS: Record<string, string> = {
  ...Object.fromEntries(FUELING_SPORT_OPTIONS.map((sport) => [sport.value, sport.label])),
  NUTRITION: 'Nutrition',
}

const FUELING_SPORT_LABELS_EN: Record<string, string> = {
  ...Object.fromEntries(FUELING_SPORT_OPTIONS.map((sport) => [sport.value, sport.labelEn])),
  NUTRITION: 'Nutrition',
}

export function fuelingSportLabel(sport: string, locale: string = 'sv'): string {
  return (locale === 'en' ? FUELING_SPORT_LABELS_EN : FUELING_SPORT_LABELS)[sport] ?? sport
}
