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

export function summarizeRaceFuelingProductPlan(plan: RaceFuelingProductPlan): string | null {
  const summary = plan.items
    .filter((item) => item.count > 0 && item.carbsPerItemG > 0)
    .map((item) => `${item.count} ${item.label.toLowerCase()} à ${item.carbsPerItemG} g`)
    .join(', ')

  return summary || null
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
