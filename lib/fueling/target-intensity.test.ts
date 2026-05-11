import { describe, expect, it } from 'vitest'
import { formatFuelingTargetIntensity } from './target-intensity'

describe('formatFuelingTargetIntensity', () => {
  it('formats speed, pace and power labels', () => {
    expect(formatFuelingTargetIntensity({ targetSpeedKmh: 12.4 })).toBe('12,4 km/h')
    expect(formatFuelingTargetIntensity({ targetPaceMinKm: 4.5 })).toBe('4:30 min/km')
    expect(formatFuelingTargetIntensity({ targetPowerWatts: 248.6 })).toBe('249 W')
  })

  it('returns null without target intensity', () => {
    expect(formatFuelingTargetIntensity({})).toBeNull()
  })
})
