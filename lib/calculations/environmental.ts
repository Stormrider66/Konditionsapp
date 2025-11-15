/**
 * Environmental Adjustments for Running Performance
 *
 * Accounts for environmental factors that affect running performance:
 * 1. Temperature and humidity (heat stress)
 * 2. Altitude (reduced oxygen availability)
 * 3. Wind resistance
 * 4. Combined environmental impact
 *
 * References:
 * - Ely, M. R., et al. (2007). Impact of weather on marathon-running performance. Medicine & Science in Sports & Exercise, 39(3), 487-493.
 * - Peronnet, F., et al. (1991). Marathon running in simulated high altitude. European Journal of Applied Physiology, 63(6), 403-411.
 * - Pugh, L. G. (1971). The influence of wind resistance in running and walking. The Journal of Physiology, 213(2), 255-276.
 */

export interface EnvironmentalConditions {
  temperature?: number // Celsius
  humidity?: number // Percentage (0-100)
  altitude?: number // Meters above sea level
  windSpeed?: number // km/h (negative = headwind, positive = tailwind)
  dewPoint?: number // Celsius (can be calculated from temp + humidity)
}

export interface EnvironmentalImpact {
  temperatureEffect: number // Percentage slowdown (positive = slower)
  altitudeEffect: number // Percentage slowdown
  windEffect: number // Percentage slowdown/speedup
  totalEffect: number // Combined percentage effect
  adjustedPace: number // Adjusted pace in seconds per km
  adjustedTime: number // Adjusted race time in seconds
  severity: 'IDEAL' | 'GOOD' | 'MODERATE' | 'CHALLENGING' | 'SEVERE'
  warnings: string[]
}

/**
 * Optimal temperature for running performance
 * Research suggests 10-12°C is ideal for marathon performance
 */
const OPTIMAL_TEMP = 11

/**
 * Calculate dew point from temperature and humidity
 *
 * Uses Magnus formula approximation
 *
 * @param temp - Temperature in Celsius
 * @param humidity - Relative humidity as percentage (0-100)
 * @returns Dew point in Celsius
 */
export function calculateDewPoint(temp: number, humidity: number): number {
  const a = 17.27
  const b = 237.7
  const alpha = ((a * temp) / (b + temp)) + Math.log(humidity / 100)
  return (b * alpha) / (a - alpha)
}

/**
 * Calculate heat stress index (WBGT approximation)
 *
 * Wet Bulb Globe Temperature (WBGT) is the gold standard for heat stress.
 * This is a simplified approximation using temperature and humidity.
 *
 * @param temp - Temperature in Celsius
 * @param humidity - Relative humidity as percentage
 * @returns Approximated WBGT
 */
export function calculateHeatIndex(temp: number, humidity: number): number {
  // Simplified heat index calculation
  const dewPoint = calculateDewPoint(temp, humidity)

  // WBGT ≈ 0.7 * wet bulb + 0.3 * dry bulb
  // Wet bulb is approximated by dew point + correction factor
  const wetBulbApprox = dewPoint + (temp - dewPoint) * 0.3

  return 0.7 * wetBulbApprox + 0.3 * temp
}

/**
 * Calculate temperature effect on running performance
 *
 * Based on research by Ely et al. (2007) showing that marathon times
 * increase by ~1-2% for every 5°C above optimal temperature.
 *
 * Formula accounts for both heat and cold, with humidity amplifying heat effects.
 *
 * @param temp - Temperature in Celsius
 * @param humidity - Relative humidity (0-100), default 50%
 * @returns Percentage slowdown (positive = slower, negative = faster)
 */
export function calculateTemperatureEffect(
  temp: number,
  humidity: number = 50
): number {
  // Calculate effective temperature accounting for humidity
  const heatIndex = calculateHeatIndex(temp, humidity)

  // Temperature deviation from optimal
  const tempDeviation = temp - OPTIMAL_TEMP

  if (tempDeviation <= 0) {
    // Cold temperatures have smaller effect than heat
    // ~0.5% slowdown per 5°C below optimal (down to freezing)
    const coldEffect = Math.max(tempDeviation / 5, -4) * 0.5
    return Math.max(coldEffect, -2) // Cap at 2% improvement in cold
  } else {
    // Heat effects increase exponentially, especially with humidity
    // Base effect: 1% per 5°C above optimal
    // Humidity multiplier: increases effect when heat index > temperature
    const baseEffect = (tempDeviation / 5) * 1.0
    const humidityMultiplier = heatIndex > temp ? 1 + (heatIndex - temp) / 10 : 1

    const heatEffect = baseEffect * humidityMultiplier

    return Math.min(heatEffect, 20) // Cap at 20% slowdown in extreme heat
  }
}

/**
 * Calculate altitude effect on running performance
 *
 * Based on research showing:
 * - ~1% slowdown per 300m above 1000m for races < 10 minutes
 * - ~2% slowdown per 300m above 1000m for races > 20 minutes
 * - Minimal effect below 1000m elevation
 *
 * Effect varies with race duration due to oxygen debt accumulation.
 *
 * @param altitude - Altitude in meters above sea level
 * @param raceDurationMinutes - Expected race duration in minutes
 * @returns Percentage slowdown (positive = slower)
 */
export function calculateAltitudeEffect(
  altitude: number,
  raceDurationMinutes: number = 30
): number {
  // No significant effect below 1000m
  if (altitude < 1000) {
    return 0
  }

  const altitudeAbove1000 = altitude - 1000

  // Effect increases with race duration
  // Short races: ~1% per 300m
  // Long races: ~2% per 300m
  const durationFactor = Math.min(raceDurationMinutes / 60, 2) // Caps at 2 hours

  const effectPer300m = 1.0 + (durationFactor * 0.5)
  const altitudeEffect = (altitudeAbove1000 / 300) * effectPer300m

  return Math.min(altitudeEffect, 25) // Cap at 25% for extreme altitude
}

/**
 * Calculate wind resistance effect on running pace
 *
 * Based on research by Pugh (1971) and subsequent studies.
 * Wind resistance increases quadratically with speed, and linearly with wind speed.
 *
 * For a runner at ~4:00/km pace (~15 km/h):
 * - 10 km/h headwind adds ~2-3% to energy cost
 * - 10 km/h tailwind reduces ~1-2% energy cost (asymmetric due to running mechanics)
 *
 * @param windSpeed - Wind speed in km/h (positive = tailwind, negative = headwind)
 * @param runningSpeed - Running speed in km/h
 * @param raceDurationMinutes - Race duration (wind effects average out over time)
 * @returns Percentage effect on pace (positive = slower, negative = faster)
 */
export function calculateWindEffect(
  windSpeed: number,
  runningSpeed: number = 12,
  raceDurationMinutes: number = 30
): number {
  // No wind = no effect
  if (Math.abs(windSpeed) < 1) {
    return 0
  }

  // Effective wind speed (relative to runner)
  const isHeadwind = windSpeed < 0
  const absWindSpeed = Math.abs(windSpeed)

  // Wind resistance increases with relative velocity
  const relativeVelocity = isHeadwind ?
    runningSpeed + absWindSpeed :
    Math.max(runningSpeed - absWindSpeed, 0)

  // Power required to overcome wind resistance
  // P = 0.5 * air_density * Cd * A * v^3
  // For running: approximately 2-3% per 10 km/h wind at marathon pace

  const windEffectPer10kmh = 2.5
  const baseEffect = (absWindSpeed / 10) * windEffectPer10kmh

  // Headwind is worse than tailwind is helpful (asymmetric)
  const asymmetryFactor = isHeadwind ? 1.0 : 0.6

  // Effect diminishes slightly for longer races (averaging across course)
  const durationFactor = Math.max(1 - (raceDurationMinutes / 180), 0.7)

  let effect = baseEffect * asymmetryFactor * durationFactor

  // Apply direction
  effect = isHeadwind ? effect : -effect

  return Math.max(Math.min(effect, 15), -8) // Cap at ±15% / -8%
}

/**
 * Calculate combined environmental impact on running performance
 *
 * @param conditions - Environmental conditions
 * @param basePace - Base pace in seconds per km (at sea level, optimal conditions)
 * @param distanceKm - Race distance in kilometers
 * @returns Complete environmental impact analysis
 */
export function calculateEnvironmentalImpact(
  conditions: EnvironmentalConditions,
  basePace: number,
  distanceKm: number
): EnvironmentalImpact {
  const warnings: string[] = []

  // Calculate race duration for altitude/wind calculations
  const baseTimeSeconds = basePace * distanceKm
  const raceDurationMinutes = baseTimeSeconds / 60

  // Temperature effect
  const temperatureEffect = conditions.temperature !== undefined && conditions.humidity !== undefined
    ? calculateTemperatureEffect(conditions.temperature, conditions.humidity)
    : 0

  if (temperatureEffect > 5) {
    warnings.push(`High heat stress: ${conditions.temperature}°C with ${conditions.humidity}% humidity. Consider slower pace and increased hydration.`)
  } else if (temperatureEffect > 2) {
    warnings.push(`Moderate heat impact. Adjust expectations and hydration strategy.`)
  }

  // Altitude effect
  const altitudeEffect = conditions.altitude !== undefined
    ? calculateAltitudeEffect(conditions.altitude, raceDurationMinutes)
    : 0

  if (altitudeEffect > 5) {
    warnings.push(`Significant altitude effect: ${conditions.altitude}m elevation. Allow time for acclimatization.`)
  } else if (altitudeEffect > 2) {
    warnings.push(`Moderate altitude impact. Expect slightly reduced performance.`)
  }

  // Wind effect
  const runningSpeed = 3600 / basePace // km/h
  const windEffect = conditions.windSpeed !== undefined
    ? calculateWindEffect(conditions.windSpeed, runningSpeed, raceDurationMinutes)
    : 0

  if (windEffect > 3) {
    warnings.push(`Strong headwind: ${Math.abs(conditions.windSpeed || 0)} km/h. Significant resistance expected.`)
  } else if (windEffect < -2) {
    warnings.push(`Strong tailwind: ${conditions.windSpeed} km/h. Favorable conditions.`)
  }

  // Total effect (additive, not multiplicative)
  // Research suggests environmental factors combine roughly additively for moderate effects
  const totalEffect = temperatureEffect + altitudeEffect + windEffect

  // Adjust pace
  const adjustmentFactor = 1 + (totalEffect / 100)
  const adjustedPace = basePace * adjustmentFactor
  const adjustedTime = adjustedPace * distanceKm

  // Determine severity
  let severity: EnvironmentalImpact['severity']
  if (totalEffect < 1 && totalEffect > -1) {
    severity = 'IDEAL'
  } else if (totalEffect < 3 && totalEffect > -2) {
    severity = 'GOOD'
  } else if (totalEffect < 6) {
    severity = 'MODERATE'
  } else if (totalEffect < 10) {
    severity = 'CHALLENGING'
  } else {
    severity = 'SEVERE'
  }

  return {
    temperatureEffect: Math.round(temperatureEffect * 100) / 100,
    altitudeEffect: Math.round(altitudeEffect * 100) / 100,
    windEffect: Math.round(windEffect * 100) / 100,
    totalEffect: Math.round(totalEffect * 100) / 100,
    adjustedPace: Math.round(adjustedPace * 10) / 10,
    adjustedTime: Math.round(adjustedTime),
    severity,
    warnings
  }
}

/**
 * Adjust race goal time for environmental conditions
 *
 * Convenience function to adjust a goal time based on race day conditions.
 *
 * @param goalTimeSeconds - Target time in ideal conditions
 * @param distanceKm - Race distance
 * @param conditions - Race day environmental conditions
 * @returns Adjusted goal time accounting for conditions
 */
export function adjustGoalTimeForConditions(
  goalTimeSeconds: number,
  distanceKm: number,
  conditions: EnvironmentalConditions
): {
  adjustedTime: number
  adjustedPace: number
  impact: EnvironmentalImpact
} {
  const basePace = goalTimeSeconds / distanceKm
  const impact = calculateEnvironmentalImpact(conditions, basePace, distanceKm)

  return {
    adjustedTime: impact.adjustedTime,
    adjustedPace: impact.adjustedPace,
    impact
  }
}

/**
 * Calculate equivalent sea-level performance
 *
 * Useful for comparing performances at different altitudes.
 * Converts an altitude performance to equivalent sea-level time.
 *
 * @param timeSeconds - Actual time at altitude
 * @param distanceKm - Race distance
 * @param altitude - Altitude in meters
 * @returns Equivalent sea-level time
 */
export function convertToSeaLevelEquivalent(
  timeSeconds: number,
  distanceKm: number,
  altitude: number
): number {
  const raceDurationMinutes = timeSeconds / 60
  const altitudeEffect = calculateAltitudeEffect(altitude, raceDurationMinutes)

  // Remove altitude penalty to get sea-level equivalent
  const seaLevelTime = timeSeconds / (1 + altitudeEffect / 100)

  return Math.round(seaLevelTime)
}

/**
 * Recommend pacing strategy adjustments for conditions
 *
 * @param conditions - Environmental conditions
 * @param distanceKm - Race distance
 * @returns Pacing recommendations
 */
export function getPacingRecommendations(
  conditions: EnvironmentalConditions,
  distanceKm: number
): {
  strategy: 'CONSERVATIVE' | 'NORMAL' | 'AGGRESSIVE'
  recommendations: string[]
} {
  const basePace = 240 // Dummy pace for analysis
  const impact = calculateEnvironmentalImpact(conditions, basePace, distanceKm)

  const recommendations: string[] = []
  let strategy: 'CONSERVATIVE' | 'NORMAL' | 'AGGRESSIVE' = 'NORMAL'

  if (impact.severity === 'SEVERE' || impact.severity === 'CHALLENGING') {
    strategy = 'CONSERVATIVE'
    recommendations.push('Start conservatively - environmental factors will accumulate')
    recommendations.push('Focus on even effort rather than even pace')
    recommendations.push('Increase hydration frequency')

    if (impact.temperatureEffect > 5) {
      recommendations.push('Pour water over head at aid stations to cool down')
      recommendations.push('Seek shade when possible')
    }

    if (impact.altitudeEffect > 3) {
      recommendations.push('Expect higher perceived effort for same pace')
      recommendations.push('Monitor breathing more carefully than usual')
    }
  } else if (impact.severity === 'IDEAL' || (impact.totalEffect < -1)) {
    strategy = 'AGGRESSIVE'
    recommendations.push('Excellent conditions - consider aggressive pacing')

    if (impact.windEffect < -2) {
      recommendations.push('Take advantage of tailwind while it lasts')
    }

    if (impact.temperatureEffect < -1) {
      recommendations.push('Cool temperatures favor sustained effort')
    }
  } else {
    strategy = 'NORMAL'
    recommendations.push('Good conditions - execute planned pacing strategy')
  }

  return {
    strategy,
    recommendations
  }
}
