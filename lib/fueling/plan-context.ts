import { format } from 'date-fns'
import { sv } from 'date-fns/locale'
import { fuelingSportLabel } from './sport-labels'
import { formatFuelingTargetIntensity, type FuelingTargetIntensity } from './target-intensity'

export interface FuelingPlanContext extends FuelingTargetIntensity {
  name?: string | null
  sport?: string | null
  distanceKm?: number | null
  raceDate?: Date | string | null
}

export interface FuelingPlanContextOptions {
  includeName?: boolean
  includeRaceDate?: boolean
}

export function formatFuelingPlanContext(
  plan: FuelingPlanContext | null | undefined,
  options: FuelingPlanContextOptions = {}
): string | null {
  if (!plan) return null

  const parts = [
    options.includeName ? plan.name : null,
    plan.sport ? fuelingSportLabel(plan.sport) : null,
    plan.distanceKm ? `${plan.distanceKm.toLocaleString('sv-SE', { maximumFractionDigits: 1 })} km` : null,
    formatFuelingTargetIntensity(plan),
    options.includeRaceDate && plan.raceDate ? format(new Date(plan.raceDate), 'd MMM yyyy', { locale: sv }) : null,
  ].filter(Boolean)

  return parts.length > 0 ? parts.join(' · ') : null
}
