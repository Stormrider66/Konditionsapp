export interface FuelingTargetIntensity {
  targetSpeedKmh?: number | null
  targetPowerWatts?: number | null
  targetPaceMinKm?: number | null
}

export function formatFuelingTargetIntensity(target: FuelingTargetIntensity, locale: string = 'sv'): string | null {
  const parts = [
    target.targetSpeedKmh != null ? `${formatNumber(target.targetSpeedKmh, locale)} km/h` : null,
    target.targetPaceMinKm != null ? `${formatPace(target.targetPaceMinKm)} min/km` : null,
    target.targetPowerWatts != null ? `${Math.round(target.targetPowerWatts)} W` : null,
  ].filter(Boolean)

  return parts.length > 0 ? parts.join(' · ') : null
}

function formatNumber(value: number, locale: string): string {
  return value.toLocaleString(locale === 'sv' ? 'sv-SE' : 'en-US', { maximumFractionDigits: 1 })
}

function formatPace(value: number): string {
  const minutes = Math.floor(value)
  const seconds = Math.round((value - minutes) * 60)
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}
