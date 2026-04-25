/**
 * One-rep-max unit metadata.
 *
 * `OneRepMaxHistory.unit` defaults to 'KG' for back-compat. Non-KG units
 * let the table track sport-specific PRs (box jump height in cm, broad
 * jump in m, sprint times in seconds, peak power in watts, max-rep
 * counts, sprint speed in km/h) without a parallel data model. The
 * runner's `% av 1RM` weight resolution only fires when the stored
 * unit is KG.
 */

export const PR_UNITS = ['KG', 'CM', 'M', 'S', 'W', 'COUNT', 'KMH'] as const

export type PrUnit = typeof PR_UNITS[number]

export const PR_UNIT_LABELS: Record<PrUnit, string> = {
  KG: 'kg',
  CM: 'cm',
  M: 'm',
  S: 's',
  W: 'W',
  COUNT: 'reps',
  KMH: 'km/h',
}

export const PR_UNIT_DESCRIPTIONS: Record<PrUnit, string> = {
  KG: 'Kilogram (1RM-lyft)',
  CM: 'Centimeter (höjd, t.ex. box jump)',
  M: 'Meter (avstånd, t.ex. längdhopp)',
  S: 'Sekunder (tid, t.ex. sprint, plank)',
  W: 'Watt (effekt, t.ex. FTP)',
  COUNT: 'Antal reps (t.ex. max push-ups)',
  KMH: 'Kilometer/timme (hastighet)',
}

export function isPrUnit(value: unknown): value is PrUnit {
  return typeof value === 'string' && (PR_UNITS as readonly string[]).includes(value)
}

export function formatPrValue(value: number, unit: string | null | undefined): string {
  const u = isPrUnit(unit) ? unit : 'KG'
  return `${value} ${PR_UNIT_LABELS[u]}`
}
