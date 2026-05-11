export const FUELING_SPORT_OPTIONS = [
  { value: 'RUNNING', label: 'Löpning' },
  { value: 'CYCLING', label: 'Cykling' },
  { value: 'SKIING', label: 'Skidor' },
  { value: 'SWIMMING', label: 'Simning' },
  { value: 'TRIATHLON', label: 'Triathlon' },
  { value: 'HYROX', label: 'HYROX' },
  { value: 'GENERAL_FITNESS', label: 'Fitness' },
  { value: 'FUNCTIONAL_FITNESS', label: 'Funktionell träning' },
  { value: 'STRENGTH', label: 'Styrka' },
  { value: 'TEAM_FOOTBALL', label: 'Fotboll' },
  { value: 'TEAM_ICE_HOCKEY', label: 'Ishockey' },
  { value: 'TEAM_HANDBALL', label: 'Handboll' },
  { value: 'TEAM_FLOORBALL', label: 'Innebandy' },
  { value: 'TEAM_BASKETBALL', label: 'Basket' },
  { value: 'TEAM_VOLLEYBALL', label: 'Volleyboll' },
  { value: 'TENNIS', label: 'Tennis' },
  { value: 'PADEL', label: 'Padel' },
] as const

const FUELING_SPORT_LABELS: Record<string, string> = {
  ...Object.fromEntries(FUELING_SPORT_OPTIONS.map((sport) => [sport.value, sport.label])),
  NUTRITION: 'Nutrition',
}

export function fuelingSportLabel(sport: string): string {
  return FUELING_SPORT_LABELS[sport] ?? sport
}
