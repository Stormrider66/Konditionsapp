import { format } from 'date-fns'
import { enUS, sv } from 'date-fns/locale'
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
  locale?: string
}

export function formatFuelingPlanContext(
  plan: FuelingPlanContext | null | undefined,
  options: FuelingPlanContextOptions = {}
): string | null {
  if (!plan) return null
  const locale = options.locale === 'sv' ? 'sv' : 'en'

  const parts = [
    options.includeName ? plan.name : null,
    plan.sport ? fuelingSportLabel(plan.sport, locale) : null,
    plan.distanceKm ? formatFuelingDistance(plan.distanceKm, locale) : null,
    formatFuelingTargetIntensity(plan, locale),
    options.includeRaceDate && plan.raceDate
      ? format(new Date(plan.raceDate), 'd MMM yyyy', { locale: locale === 'en' ? enUS : sv })
      : null,
  ].filter(Boolean)

  return parts.length > 0 ? parts.join(' · ') : null
}

function formatFuelingDistance(distanceKm: number, locale: string): string {
  if (Math.abs(distanceKm - 42.195) < 0.1) return 'Marathon'
  if (Math.abs(distanceKm - 21.0975) < 0.1) return locale === 'en' ? 'Half marathon' : 'Halvmarathon'
  return `${distanceKm.toLocaleString(locale === 'en' ? 'en-US' : 'sv-SE', { maximumFractionDigits: 1 })} km`
}
