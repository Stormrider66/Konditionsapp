/**
 * Environmental Adjustment Engine
 *
 * Implements scientifically-validated adjustments for:
 * - Temperature (WBGT method, Ely model)
 * - Altitude (Jack Daniels formula)
 * - Wind resistance (Pugh wind tunnel data)
 * - Combined environmental factors
 */

import { EnvironmentalConditions, EnvironmentalAdjustment } from './types';

/**
 * Calculate comprehensive environmental adjustments
 */
export function calculateEnvironmentalAdjustments(
  conditions: EnvironmentalConditions,
  workoutIntensity: string,
  duration: number // minutes
): EnvironmentalAdjustment {

  // 1. Temperature adjustment using WBGT method
  const tempAdjustment = computeTemperatureAdjustment(
    conditions.temperature,
    conditions.humidity,
    workoutIntensity,
    duration
  );

  // 2. Altitude adjustment using Jack Daniels formula
  const altitudeAdjustment = computeAltitudeAdjustment(
    conditions.altitude,
    workoutIntensity
  );

  // 3. Wind adjustment using Pugh model
  const windAdjustment = computeWindAdjustment(
    conditions.windSpeed,
    conditions.windDirection,
    workoutIntensity
  );

  // 4. Combine adjustments
  const totalPaceAdjustment = tempAdjustment.paceAdjustment +
                             altitudeAdjustment.paceAdjustment +
                             windAdjustment.paceAdjustment;

  const totalHRAdjustment = tempAdjustment.hrAdjustment +
                           altitudeAdjustment.hrAdjustment;

  const totalPerformanceImpact = tempAdjustment.performanceImpact +
                                altitudeAdjustment.performanceImpact +
                                windAdjustment.performanceImpact;

  // Collect warnings and recommendations
  const warnings = [
    ...tempAdjustment.warnings,
    ...altitudeAdjustment.warnings,
    ...windAdjustment.warnings
  ];

  const recommendations = [
    ...tempAdjustment.recommendations,
    ...altitudeAdjustment.recommendations,
    ...windAdjustment.recommendations
  ];

  return {
    paceAdjustment: Math.round(totalPaceAdjustment),
    hrAdjustment: Math.round(totalHRAdjustment),
    performanceImpact: Math.round(totalPerformanceImpact * 10) / 10,
    warnings,
    recommendations
  };
}

/**
 * Temperature adjustment using WBGT (Wet Bulb Globe Temperature)
 * Based on Ely et al. research showing performance decline with heat
 */
function computeTemperatureAdjustment(
  temperature: number,
  humidity: number,
  intensity: string,
  duration: number
): EnvironmentalAdjustment {

  // Calculate WBGT (simplified formula)
  const wbgt = 0.7 * calculateWetBulbTemp(temperature, humidity) + 0.3 * temperature;

  let paceAdjustment = 0;
  let hrAdjustment = 0;
  let performanceImpact = 0;
  const warnings: string[] = [];
  const recommendations: string[] = [];

  // Ely model: Performance declines 6.2% per 10°C WBGT increase above 15°C
  if (wbgt > 15) {
    const wbgtExcess = wbgt - 15;
    performanceImpact = (wbgtExcess / 10) * 6.2; // % slower

    // Convert to pace adjustment (approximate)
    paceAdjustment = (performanceImpact / 100) * 240; // Assumes ~4:00/km base pace

    // Heart rate increases ~1 bpm per 1°C above 20°C
    if (temperature > 20) {
      hrAdjustment = temperature - 20;
    }

    // Duration factor - longer workouts more affected
    if (duration > 60) {
      const durationFactor = 1 + (duration - 60) / 120; // +50% impact for 3-hour session
      paceAdjustment *= durationFactor;
      performanceImpact *= durationFactor;
    }

    // Intensity factor - higher intensities more affected
    const intensityFactors: { [key: string]: number } = {
      'Z1': 0.5, 'Z2': 0.7, 'Z3': 1.0, 'Z4': 1.3, 'Z5': 1.5,
      'EASY': 0.5, 'MODERATE': 1.0, 'HARD': 1.3
    };
    const factor = intensityFactors[intensity] || 1.0;
    paceAdjustment *= factor;
    performanceImpact *= factor;
  }

  // Generate warnings and recommendations
  if (wbgt > 28) {
    warnings.push('EXTREME HEAT: WBGT >28°C - High heat illness risk');
    recommendations.push('Consider postponing workout or moving indoors');
    recommendations.push('Increase hydration frequency significantly');
  } else if (wbgt > 23) {
    warnings.push('HIGH HEAT: WBGT >23°C - Significant performance impact');
    recommendations.push('Reduce pace 10-20 sec/km');
    recommendations.push('Increase hydration frequency');
    recommendations.push('Consider earlier/later timing');
  } else if (wbgt > 18) {
    warnings.push('MODERATE HEAT: WBGT >18°C - Some performance impact');
    recommendations.push('Monitor hydration closely');
    recommendations.push('Be prepared to slow down');
  }

  return {
    paceAdjustment,
    hrAdjustment,
    performanceImpact,
    warnings,
    recommendations
  };
}

/**
 * Altitude adjustment using Jack Daniels formula
 */
function computeAltitudeAdjustment(
  altitude: number,
  intensity: string
): EnvironmentalAdjustment {

  let paceAdjustment = 0;
  let hrAdjustment = 0;
  let performanceImpact = 0;
  const warnings: string[] = [];
  const recommendations: string[] = [];

  if (altitude > 1000) { // Only adjust above 1000m
    // Jack Daniels formula: Performance impact increases with altitude and intensity
    const altitudeKm = altitude / 1000;

    // Base impact: ~2% per 1000m for aerobic activities
    performanceImpact = altitudeKm * 2;

    // Intensity factor - higher intensities more affected
    const intensityFactors: { [key: string]: number } = {
      'Z1': 0.5, 'Z2': 0.7, 'Z3': 1.0, 'Z4': 1.2, 'Z5': 1.5,
      'EASY': 0.5, 'THRESHOLD': 1.2, 'INTERVALS': 1.5
    };
    const factor = intensityFactors[intensity] || 1.0;
    performanceImpact *= factor;

    // Convert to pace adjustment
    paceAdjustment = (performanceImpact / 100) * 240; // Assumes ~4:00/km base

    // Heart rate typically increases 10-15 bpm per 1000m initially
    hrAdjustment = Math.min(altitudeKm * 12, 30); // Cap at 30 bpm
  }

  // Generate altitude-specific guidance
  if (altitude > 2500) {
    warnings.push('HIGH ALTITUDE: >2500m - Significant physiological stress');
    recommendations.push('Allow 7-14 days for acclimatization');
    recommendations.push('Reduce intensity 15-20% for first week');
    recommendations.push('Monitor for altitude sickness symptoms');
  } else if (altitude > 1500) {
    warnings.push('MODERATE ALTITUDE: >1500m - Some adaptation needed');
    recommendations.push('Allow 3-7 days for initial adaptation');
    recommendations.push('Reduce intensity 10% for first few days');
  }

  return {
    paceAdjustment,
    hrAdjustment,
    performanceImpact,
    warnings,
    recommendations
  };
}

/**
 * Wind adjustment using Pugh wind tunnel data
 */
function computeWindAdjustment(
  windSpeed: number,
  windDirection: string,
  intensity: string
): EnvironmentalAdjustment {

  let paceAdjustment = 0;
  let performanceImpact = 0;
  const warnings: string[] = [];
  const recommendations: string[] = [];

  if (windSpeed > 5) { // Only adjust above 5 km/h
    // Pugh model: Wind resistance increases with square of speed difference
    let windFactor = 0;

    switch (windDirection) {
      case 'HEADWIND':
        windFactor = 1.0; // Full impact
        break;
      case 'TAILWIND':
        windFactor = -0.6; // Beneficial but less than headwind penalty
        break;
      case 'CROSSWIND':
        windFactor = 0.3; // Partial impact
        break;
      case 'CALM':
        windFactor = 0;
        break;
    }

    // Impact increases with running speed (intensity)
    const speedFactors: { [key: string]: number } = {
      'Z1': 0.5, 'Z2': 0.7, 'Z3': 1.0, 'Z4': 1.2, 'Z5': 1.4,
      'EASY': 0.5, 'THRESHOLD': 1.2, 'INTERVALS': 1.4
    };
    const speedFactor = speedFactors[intensity] || 1.0;

    // Calculate impact: ~1% per 10 km/h headwind at moderate pace
    performanceImpact = (windSpeed / 10) * 1.0 * windFactor * speedFactor;
    paceAdjustment = (performanceImpact / 100) * 240; // Convert to sec/km
  }

  // Generate wind-specific guidance
  if (windSpeed > 25) {
    warnings.push('STRONG WIND: >25 km/h - Consider indoor alternative');
    recommendations.push('Move workout indoors if possible');
    recommendations.push('Choose sheltered route if outdoors');
  } else if (windSpeed > 15) {
    warnings.push('MODERATE WIND: >15 km/h - Significant impact on pacing');
    recommendations.push('Adjust expectations for pace-based workouts');
    recommendations.push('Use effort/HR instead of pace for intervals');
  }

  return {
    paceAdjustment,
    hrAdjustment: 0, // Wind doesn't directly affect HR
    performanceImpact,
    warnings,
    recommendations
  };
}

/**
 * Calculate wet bulb temperature (simplified formula)
 */
function calculateWetBulbTemp(temperature: number, humidity: number): number {
  // Simplified Stull formula for wet bulb temperature
  return temperature * Math.atan(0.151977 * Math.sqrt(humidity + 8.313659)) +
         Math.atan(temperature + humidity) -
         Math.atan(humidity - 1.676331) +
         0.00391838 * Math.pow(humidity, 1.5) * Math.atan(0.023101 * humidity) - 4.686035;
}

export function calculateWBGT(input: {
  temperatureC: number
  humidityPercent: number
  dewPointC: number
}): number {
  const wetBulb = 0.567 * input.temperatureC + 0.393 * input.dewPointC + 3.94
  const globeComponent = 0.25 * input.temperatureC
  const wbgt = 0.7 * wetBulb + 0.2 * input.temperatureC + 0.1 * (input.dewPointC + globeComponent)
  return parseFloat(wbgt.toFixed(1))
}

export function calculatePaceAdjustment(params: {
  wbgt: number
  heatAcclimated: boolean
}): { paceSlowdownPercent: number; guidance: string } {
  if (params.wbgt <= 18) {
    return { paceSlowdownPercent: 0, guidance: 'Conditions safe for planned pacing' }
  }

  const baseSlowdown = Math.max(0, (params.wbgt - 18) * 1.5)
  const acclimationFactor = params.heatAcclimated ? 0.5 : 1
  const paceSlowdownPercent = parseFloat((baseSlowdown * acclimationFactor).toFixed(1))

  let guidance = 'Reduce pace and increase cooling strategies'
  if (params.wbgt >= 28) {
    guidance = 'Consider canceling or rescheduling due to extreme heat'
  } else if (params.wbgt >= 23) {
    guidance = 'Significant heat stress - slow down and shorten session'
  }

  return { paceSlowdownPercent, guidance }
}

export function calculateAltitudeAdjustment(params: {
  altitudeMeters: number
  acclimatizationDays: number
  workoutIntensity: string
}): number {
  if (params.altitudeMeters <= 1000) {
    return 0
  }

  const altitudeKm = params.altitudeMeters / 1000
  const baseImpact = altitudeKm * 3 // ~3% per 1000m
  const intensityFactors: Record<string, number> = {
    EASY: 0.7,
    MODERATE: 1.0,
    THRESHOLD: 1.2,
    INTERVAL: 1.4,
    VO2MAX: 1.5
  }
  const intensityFactor = intensityFactors[params.workoutIntensity] || 1.0
  const acclimationFactor = Math.max(0.4, 1 - params.acclimatizationDays / 28)

  const adjustment = baseImpact * intensityFactor * acclimationFactor
  return parseFloat(adjustment.toFixed(1))
}

export function calculateWindResistance(params: {
  windSpeedMps: number
  windDirection: number
  runnerDirection: number
  runnerSpeedMps: number
}): number {
  if (params.windSpeedMps === 0 || params.runnerSpeedMps === 0) {
    return 0
  }

  const angleRadians = ((params.windDirection - params.runnerDirection) * Math.PI) / 180
  const relativeWind = params.windSpeedMps * Math.cos(angleRadians)
  const dragRatio = relativeWind / params.runnerSpeedMps
  const resistance = dragRatio * 10 // convert to % impact

  return parseFloat(resistance.toFixed(1))
}
