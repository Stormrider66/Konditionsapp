/**
 * One-rep-max unit metadata.
 *
 * `OneRepMaxHistory.unit` defaults to 'KG' for back-compat. Non-KG units
 * let the table track sport-specific PRs (box jump height in cm, broad
 * jump in m, sprint times in seconds, peak power in watts, max-rep
 * counts, sprint speed in km/h) without a parallel data model. The
 * runner's `% of 1RM` weight resolution only fires when the stored
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
  KG: 'Kilograms (1RM lift)',
  CM: 'Centimeters (height, e.g. box jump)',
  M: 'Meters (distance, e.g. broad jump)',
  S: 'Seconds (time, e.g. sprint, plank)',
  W: 'Watts (power, e.g. FTP)',
  COUNT: 'Rep count (e.g. max push-ups)',
  KMH: 'Kilometers per hour (speed)',
}

export const PR_UNIT_DESCRIPTIONS_SV: Record<PrUnit, string> = {
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

export function getPrUnitDescription(unit: string | null | undefined, locale: 'en' | 'sv' = 'en'): string {
  const u = isPrUnit(unit) ? unit : 'KG'
  return locale === 'sv' ? PR_UNIT_DESCRIPTIONS_SV[u] : PR_UNIT_DESCRIPTIONS[u]
}
