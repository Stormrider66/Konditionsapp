export interface RaceFuelingProductPlanItem {
  label: string
  count: number
  carbsPerItemG: number
  totalCarbsG: number
}

export interface RaceFuelingProductPlan {
  version: 1
  targetCarbsG: number | null
  totalCarbsG: number
  differenceG: number | null
  marginLabel: string
  items: RaceFuelingProductPlanItem[]
  updatedAt?: string
}

export interface RaceFuelingProductTimingPoint {
  minute: number
  label: string
  products: string[]
  carbsG: number
}

export type FuelingProductLocale = 'en' | 'sv'

export function normalizeRaceFuelingProductPlan(value: unknown): RaceFuelingProductPlan | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  if (record.version !== 1) return null

  const targetCarbsG = toNullableNumber(record.targetCarbsG)
  const totalCarbsG = toNumber(record.totalCarbsG)
  const differenceG = toNullableNumber(record.differenceG)
  const marginLabel = typeof record.marginLabel === 'string' ? record.marginLabel : ''
  const items = Array.isArray(record.items)
    ? record.items.map(normalizeProductPlanItem).filter((item): item is RaceFuelingProductPlanItem => item !== null)
    : []

  if (totalCarbsG == null) return null

  return {
    version: 1,
    targetCarbsG,
    totalCarbsG,
    differenceG,
    marginLabel,
    items,
    updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : undefined,
  }
}

export function summarizeRaceFuelingProductPlan(
  plan: RaceFuelingProductPlan,
  locale: FuelingProductLocale = 'en'
): string | null {
  return summarizeRaceFuelingProductItems(plan.items, locale)
}

export function retargetRaceFuelingProductPlan(
  plan: RaceFuelingProductPlan,
  targetCarbsG: number | null,
  locale: FuelingProductLocale = 'en'
): RaceFuelingProductPlan {
  const differenceG = targetCarbsG != null ? plan.totalCarbsG - targetCarbsG : null

  return {
    ...plan,
    targetCarbsG,
    differenceG,
    marginLabel: getProductPlanMarginLabel(differenceG, locale),
    updatedAt: new Date().toISOString(),
  }
}

export function normalizeRaceFuelingProductItems(value: unknown): RaceFuelingProductPlanItem[] {
  if (!Array.isArray(value)) return []
  return value.map(normalizeProductPlanItem).filter((item): item is RaceFuelingProductPlanItem => item !== null)
}

export function summarizeRaceFuelingProductItems(
  items: RaceFuelingProductPlanItem[],
  locale: FuelingProductLocale = 'en'
): string | null {
  const connector = locale === 'sv' ? 'à' : 'at'
  const summary = items
    .filter((item) => item.count > 0 && item.carbsPerItemG > 0)
    .map((item) => `${item.count} ${formatProductLabel(item.label, item.count, locale)} ${connector} ${item.carbsPerItemG} g`)
    .join(', ')

  return summary || null
}

export function buildRaceFuelingProductItems(
  items: Array<{ label: string; count: number; carbsPerItemG: number }>
): RaceFuelingProductPlanItem[] {
  return items
    .map((item) => ({
      label: item.label,
      count: item.count,
      carbsPerItemG: item.carbsPerItemG,
      totalCarbsG: item.count * item.carbsPerItemG,
    }))
    .filter((item) => item.count > 0 && item.carbsPerItemG > 0)
}

export function buildRaceFuelingProductTiming(
  plan: RaceFuelingProductPlan | null,
  durationMinutes: number | null | undefined
): RaceFuelingProductTimingPoint[] {
  if (!plan || !durationMinutes || durationMinutes <= 20) return []

  const units = expandProductUnits(plan)
  if (units.length === 0) return []

  const slots = buildTimingSlots(durationMinutes)
  if (slots.length === 0) return []

  const timing = new Map<number, RaceFuelingProductTimingPoint>()
  units.forEach((unit, index) => {
    const slotIndex = units.length === 1
      ? 0
      : Math.round((index * (slots.length - 1)) / (units.length - 1))
    const minute = slots[Math.min(slotIndex, slots.length - 1)]
    const point = timing.get(minute) ?? {
      minute,
      label: `${minute} min`,
      products: [],
      carbsG: 0,
    }

    point.products.push(unit.label)
    point.carbsG += unit.carbsG
    timing.set(minute, point)
  })

  return Array.from(timing.values()).sort((a, b) => a.minute - b.minute)
}

function expandProductUnits(plan: RaceFuelingProductPlan): Array<{ label: string; carbsG: number }> {
  return plan.items.flatMap((item) => {
    const count = Math.max(0, Math.floor(item.count))
    return Array.from({ length: count }, () => ({
      label: `${item.label} (${item.carbsPerItemG} g)`,
      carbsG: item.carbsPerItemG,
    }))
  })
}

function buildTimingSlots(durationMinutes: number): number[] {
  const slots: number[] = []
  for (let minute = 20; minute < durationMinutes; minute += 20) {
    slots.push(minute)
  }
  return slots.slice(0, 18)
}

function getProductPlanMarginLabel(differenceG: number | null, locale: FuelingProductLocale = 'en'): string {
  if (differenceG == null) return '-'
  if (differenceG >= 20) return locale === 'sv' ? 'God' : 'Good'
  if (differenceG >= 0) return 'Tight'
  return locale === 'sv' ? 'Saknas' : 'Missing'
}

function formatProductLabel(label: string, count: number, locale: FuelingProductLocale): string {
  const normalized = label.trim().toLowerCase()
  if (locale === 'sv') return normalized

  if (normalized === 'flaskor sportdryck') {
    return count === 1 ? 'sports drink bottle' : 'sports drink bottles'
  }

  if (normalized === 'sportdryck') return 'sports drink'

  return normalized
}

function normalizeProductPlanItem(value: unknown): RaceFuelingProductPlanItem | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  const label = typeof record.label === 'string' ? record.label : null
  const count = toNumber(record.count)
  const carbsPerItemG = toNumber(record.carbsPerItemG)
  const totalCarbsG = toNumber(record.totalCarbsG)

  if (!label || count == null || carbsPerItemG == null || totalCarbsG == null) return null

  return {
    label,
    count,
    carbsPerItemG,
    totalCarbsG,
  }
}

function toNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function toNullableNumber(value: unknown): number | null {
  return value == null ? null : toNumber(value)
}
