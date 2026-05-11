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
    plan.distanceKm ? formatFuelingDistance(plan.distanceKm) : null,
    formatFuelingTargetIntensity(plan),
    options.includeRaceDate && plan.raceDate ? format(new Date(plan.raceDate), 'd MMM yyyy', { locale: sv }) : null,
  ].filter(Boolean)

  return parts.length > 0 ? parts.join(' · ') : null
}

function formatFuelingDistance(distanceKm: number): string {
  if (Math.abs(distanceKm - 42.195) < 0.1) return 'Marathon'
  if (Math.abs(distanceKm - 21.0975) < 0.1) return 'Halvmarathon'
  return `${distanceKm.toLocaleString('sv-SE', { maximumFractionDigits: 1 })} km`
}
