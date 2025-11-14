// lib/calculations/zones.ts
import { TrainingZone, Threshold, TestType, Client, Gender } from '@/types'

/**
 * Zone Calculation Confidence Levels
 * Indicates source of zone calculation
 */
export type ZoneConfidence = 'HIGH' | 'MEDIUM' | 'LOW'

export interface ZoneCalculationResult {
  zones: TrainingZone[]
  confidence: ZoneConfidence
  method: 'LACTATE_TEST' | 'FIELD_TEST' | 'ESTIMATED'
  warning?: string
}

/**
 * Calculate individualized training zones using three-tier approach
 *
 * Tier 1 (Gold Standard): Lactate test data with LT1/LT2
 * - Uses actual threshold heart rates
 * - Highest accuracy
 * - Confidence: HIGH
 *
 * Tier 2 (Silver Standard): Field test estimations
 * - Estimates LT1/LT2 from field tests (30-min TT, HR drift, etc.)
 * - Good accuracy (±3-5 bpm)
 * - Confidence: MEDIUM
 * - TODO: Implement when Phase 4 (Field Tests) is complete
 *
 * Tier 3 (Bronze Standard): %HRmax fallback
 * - Uses age-based formulas (Tanaka for general, Gulati for women)
 * - Conservative LT1/LT2 estimates
 * - Confidence: LOW
 * - Warning displayed to user
 *
 * @param client - Client demographic data (age, gender, weight)
 * @param maxHR - Maximum heart rate (from test or estimated)
 * @param aerobicThreshold - LT1 threshold (if available from lactate test)
 * @param anaerobicThreshold - LT2 threshold (if available from lactate test)
 * @param testType - Type of test (RUNNING, CYCLING, SKIING)
 * @returns Zone calculation with confidence indicator
 */
export function calculateTrainingZones(
  client: Client,
  maxHR: number | undefined,
  aerobicThreshold: Threshold | undefined | null,
  anaerobicThreshold: Threshold | undefined | null,
  testType: TestType
): ZoneCalculationResult {
  // Tier 1: Lactate test data exists (Gold Standard)
  if (aerobicThreshold && anaerobicThreshold && maxHR) {
    return calculateZonesFromLactateTest(
      maxHR,
      aerobicThreshold,
      anaerobicThreshold,
      testType
    )
  }

  // Tier 2: Field test data (Silver Standard)
  // TODO: Implement when Phase 4 is complete
  // This would use 30-min TT, HR drift, or critical velocity tests
  // to estimate LT1/LT2

  // Tier 3: Fallback to %HRmax estimation (Bronze Standard)
  return calculateZonesFromHRmaxFallback(
    client,
    maxHR,
    testType
  )
}

/**
 * Tier 1: Calculate zones from lactate test thresholds
 *
 * Zone distribution based on LT1 and LT2:
 * - Zone 1: Below LT1 (recovery)
 * - Zone 2: At LT1 ± 5 bpm (aerobic base)
 * - Zone 3: Between LT1 and LT2 (tempo)
 * - Zone 4: At LT2 ± 5 bpm (threshold)
 * - Zone 5: Above LT2 to max (VO2max)
 *
 * This approach ensures zones are individualized and never use
 * generic %HRmax formulas.
 */
function calculateZonesFromLactateTest(
  maxHR: number,
  lt1: Threshold,
  lt2: Threshold,
  testType: TestType
): ZoneCalculationResult {
  const lt1HR = Math.round(lt1.heartRate)
  const lt2HR = Math.round(lt2.heartRate)

  const zones: TrainingZone[] = [
    {
      zone: 1,
      name: 'Mycket lätt',
      intensity: 'Återhämtning',
      hrMin: Math.round(maxHR * 0.5), // ~50% max
      hrMax: Math.max(lt1HR - 10, Math.round(maxHR * 0.6)), // Up to well below LT1
      percentMin: Math.round((Math.round(maxHR * 0.5) / maxHR) * 100),
      percentMax: Math.round((Math.max(lt1HR - 10, Math.round(maxHR * 0.6)) / maxHR) * 100),
      effect: 'Återhämtning, uppvärmning, fettförbränning',
    },
    {
      zone: 2,
      name: 'Lätt',
      intensity: 'Grundkondition (LT1)',
      hrMin: Math.max(lt1HR - 10, Math.round(maxHR * 0.6)) + 1,
      hrMax: lt1HR + 5, // LT1 ± 5 bpm
      percentMin: Math.round((Math.max(lt1HR - 10, Math.round(maxHR * 0.6)) + 1) / maxHR * 100),
      percentMax: Math.round((lt1HR + 5) / maxHR * 100),
      effect: 'Aerob grundträning, hög volym vid denna intensitet',
    },
    {
      zone: 3,
      name: 'Måttlig',
      intensity: 'Tempo',
      hrMin: lt1HR + 6,
      hrMax: lt2HR - 5, // Between LT1 and LT2
      percentMin: Math.round((lt1HR + 6) / maxHR * 100),
      percentMax: Math.round((lt2HR - 5) / maxHR * 100),
      effect: 'Tempo, aerob kapacitet, längre intervaller',
    },
    {
      zone: 4,
      name: 'Hård',
      intensity: 'Tröskel (LT2)',
      hrMin: lt2HR - 4,
      hrMax: lt2HR + 5, // LT2 ± 5 bpm
      percentMin: Math.round((lt2HR - 4) / maxHR * 100),
      percentMax: Math.round((lt2HR + 5) / maxHR * 100),
      effect: 'Anaerob tröskel, laktathantering, tävlingsfart',
    },
    {
      zone: 5,
      name: 'Maximal',
      intensity: 'VO₂max',
      hrMin: lt2HR + 6,
      hrMax: maxHR,
      percentMin: Math.round((lt2HR + 6) / maxHR * 100),
      percentMax: 100,
      effect: 'VO₂max, kortare intervaller, maximal syreupptagning',
    },
  ]

  // Add speed/power ranges based on thresholds
  addIntensityRanges(zones, lt1, lt2, testType)

  return {
    zones,
    confidence: 'HIGH',
    method: 'LACTATE_TEST'
  }
}

/**
 * Tier 3: Fallback zone calculation using %HRmax
 *
 * Used when no lactate test data exists. Uses:
 * - Better HRmax formulas (Tanaka or Gulati, not 220-age)
 * - Conservative LT1/LT2 estimates
 * - Clear warning to user
 *
 * Formula selection:
 * - Women: Gulati formula (206 - 0.88 * age)
 * - Men/Other: Tanaka formula (208 - 0.7 * age)
 *
 * Zone estimation:
 * - LT1 ≈ 75-80% HRmax (conservative)
 * - LT2 ≈ 85-90% HRmax (conservative)
 */
function calculateZonesFromHRmaxFallback(
  client: Client,
  maxHR: number | undefined,
  testType: TestType
): ZoneCalculationResult {
  const age = calculateAge(client.birthDate)

  // Use provided maxHR or estimate from age
  const estimatedMaxHR = maxHR || estimateMaxHR(age, client.gender)

  // Conservative LT1/LT2 estimates
  const estimatedLT1 = Math.round(estimatedMaxHR * 0.77) // ~77% (mid-point of 75-80%)
  const estimatedLT2 = Math.round(estimatedMaxHR * 0.87) // ~87% (mid-point of 85-90%)

  const zones: TrainingZone[] = [
    {
      zone: 1,
      name: 'Mycket lätt',
      intensity: 'Återhämtning',
      percentMin: 50,
      percentMax: 60,
      hrMin: Math.round(estimatedMaxHR * 0.5),
      hrMax: Math.round(estimatedMaxHR * 0.6),
      effect: 'Återhämtning, uppvärmning',
    },
    {
      zone: 2,
      name: 'Lätt',
      intensity: 'Grundkondition',
      percentMin: 60,
      percentMax: 70,
      hrMin: Math.round(estimatedMaxHR * 0.6),
      hrMax: Math.round(estimatedMaxHR * 0.7),
      effect: 'Grundkondition, fettförbränning',
    },
    {
      zone: 3,
      name: 'Måttlig',
      intensity: 'Tempo',
      percentMin: 70,
      percentMax: 80,
      hrMin: Math.round(estimatedMaxHR * 0.7),
      hrMax: Math.round(estimatedMaxHR * 0.8),
      effect: 'Tempo, aerob kapacitet',
    },
    {
      zone: 4,
      name: 'Hård',
      intensity: 'Tröskel',
      percentMin: 80,
      percentMax: 90,
      hrMin: Math.round(estimatedMaxHR * 0.8),
      hrMax: Math.round(estimatedMaxHR * 0.9),
      effect: 'Anaerob tröskel',
    },
    {
      zone: 5,
      name: 'Maximal',
      intensity: 'VO₂max',
      percentMin: 90,
      percentMax: 100,
      hrMin: Math.round(estimatedMaxHR * 0.9),
      hrMax: estimatedMaxHR,
      effect: 'VO₂max, maximal kapacitet',
    },
  ]

  return {
    zones,
    confidence: 'LOW',
    method: 'ESTIMATED',
    warning: maxHR
      ? 'Zoner baserade på % av maxpuls. För bättre noggrannhet, gör ett laktattest eller fälttest.'
      : `Zoner uppskattas från ålder (${age} år) och kön. Maxpuls estimerad till ${estimatedMaxHR} bpm. För bästa noggrannhet, gör ett laktattest.`
  }
}

/**
 * Add speed/power/pace ranges to zones based on thresholds
 *
 * Extrapolates from LT1 and LT2 to estimate intensities for all zones.
 * Uses linear scaling which is a simplification but reasonable for planning.
 */
function addIntensityRanges(
  zones: TrainingZone[],
  lt1: Threshold,
  lt2: Threshold,
  testType: TestType
): void {
  if (testType === 'RUNNING' && lt1.unit === 'km/h' && lt2.unit === 'km/h') {
    // Calculate speed ranges based on LT1 and LT2
    zones.forEach((zone) => {
      if (zone.zone <= 2) {
        // Below LT1: scale from LT1
        const factor = zone.percentMax / (lt1.percentOfMax)
        zone.speedMin = Number((lt1.value * (zone.percentMin / lt1.percentOfMax)).toFixed(1))
        zone.speedMax = Number((lt1.value * factor).toFixed(1))
      } else if (zone.zone >= 4) {
        // At or above LT2: scale from LT2
        const factor = zone.percentMax / lt2.percentOfMax
        zone.speedMin = Number((lt2.value * (zone.percentMin / lt2.percentOfMax)).toFixed(1))
        zone.speedMax = Number((lt2.value * factor).toFixed(1))
      } else {
        // Between LT1 and LT2: interpolate
        const lt1Speed = lt1.value
        const lt2Speed = lt2.value
        const range = lt2Speed - lt1Speed
        const zoneRange = zone.hrMax - zone.hrMin
        const zoneStart = zone.hrMin - lt1.heartRate
        const zoneEnd = zone.hrMax - lt1.heartRate
        const totalRange = lt2.heartRate - lt1.heartRate

        zone.speedMin = Number((lt1Speed + (range * zoneStart / totalRange)).toFixed(1))
        zone.speedMax = Number((lt1Speed + (range * zoneEnd / totalRange)).toFixed(1))
      }
    })
  } else if (testType === 'CYCLING' && lt1.unit === 'watt' && lt2.unit === 'watt') {
    // Calculate power ranges based on LT1 and LT2
    zones.forEach((zone) => {
      if (zone.zone <= 2) {
        const factor = zone.percentMax / lt1.percentOfMax
        zone.powerMin = Math.round(lt1.value * (zone.percentMin / lt1.percentOfMax))
        zone.powerMax = Math.round(lt1.value * factor)
      } else if (zone.zone >= 4) {
        const factor = zone.percentMax / lt2.percentOfMax
        zone.powerMin = Math.round(lt2.value * (zone.percentMin / lt2.percentOfMax))
        zone.powerMax = Math.round(lt2.value * factor)
      } else {
        // Interpolate between LT1 and LT2
        const lt1Power = lt1.value
        const lt2Power = lt2.value
        const range = lt2Power - lt1Power
        const zoneStart = zone.hrMin - lt1.heartRate
        const zoneEnd = zone.hrMax - lt1.heartRate
        const totalRange = lt2.heartRate - lt1.heartRate

        zone.powerMin = Math.round(lt1Power + (range * zoneStart / totalRange))
        zone.powerMax = Math.round(lt1Power + (range * zoneEnd / totalRange))
      }
    })
  } else if (testType === 'SKIING' && lt1.unit === 'min/km' && lt2.unit === 'min/km') {
    // For pace, lower numbers = faster
    zones.forEach((zone) => {
      if (zone.zone <= 2) {
        const factor = zone.percentMax / lt1.percentOfMax
        zone.paceMin = Number((lt1.value / factor).toFixed(2))
        zone.paceMax = Number((lt1.value / (zone.percentMin / lt1.percentOfMax)).toFixed(2))
      } else if (zone.zone >= 4) {
        const factor = zone.percentMax / lt2.percentOfMax
        zone.paceMin = Number((lt2.value / factor).toFixed(2))
        zone.paceMax = Number((lt2.value / (zone.percentMin / lt2.percentOfMax)).toFixed(2))
      } else {
        // Interpolate between LT1 and LT2
        const lt1Pace = lt1.value
        const lt2Pace = lt2.value
        const range = lt1Pace - lt2Pace // Note: reversed for pace
        const zoneStart = zone.hrMin - lt1.heartRate
        const zoneEnd = zone.hrMax - lt1.heartRate
        const totalRange = lt2.heartRate - lt1.heartRate

        zone.paceMax = Number((lt1Pace - (range * zoneStart / totalRange)).toFixed(2))
        zone.paceMin = Number((lt1Pace - (range * zoneEnd / totalRange)).toFixed(2))
      }
    })
  }
}

/**
 * Estimate maximum heart rate from age and gender
 *
 * Uses scientifically validated formulas:
 * - Women: Gulati formula (more accurate than 220-age)
 * - Men: Tanaka formula (more accurate than 220-age)
 *
 * References:
 * - Tanaka, H., et al. (2001). Age-predicted maximal heart rate revisited. JACC, 37(1), 153-156.
 * - Gulati, M., et al. (2010). Heart rate response to exercise stress testing in women. Circulation, 122(2), 130-137.
 *
 * Note: Individual variation is ±10-12 bpm. Field test recommended.
 */
export function estimateMaxHR(age: number, gender: Gender): number {
  if (gender === 'FEMALE') {
    // Gulati formula for women
    return Math.round(206 - (0.88 * age))
  } else {
    // Tanaka formula for men (also used as general formula)
    return Math.round(208 - (0.7 * age))
  }
}

/**
 * Calculate age from birth date
 */
function calculateAge(birthDate: Date): number {
  const today = new Date()
  const birth = new Date(birthDate)
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }

  return age
}

/**
 * Legacy function for backward compatibility
 *
 * @deprecated Use calculateTrainingZones() instead for tier-based approach
 */
export function calculateTrainingZonesLegacy(
  maxHR: number,
  threshold: Threshold,
  testType: TestType
): TrainingZone[] {
  console.warn('calculateTrainingZonesLegacy is deprecated. Use calculateTrainingZones() instead.')

  const zones: TrainingZone[] = [
    {
      zone: 1,
      name: 'Mycket lätt',
      intensity: 'Återhämtning',
      percentMin: 50,
      percentMax: 60,
      hrMin: Math.round(maxHR * 0.5),
      hrMax: Math.round(maxHR * 0.6),
      effect: 'Återhämtning, uppvärmning',
    },
    {
      zone: 2,
      name: 'Lätt',
      intensity: 'Grundkondition',
      percentMin: 60,
      percentMax: 70,
      hrMin: Math.round(maxHR * 0.6),
      hrMax: Math.round(maxHR * 0.7),
      effect: 'Grundkondition, fettförbränning',
    },
    {
      zone: 3,
      name: 'Måttlig',
      intensity: 'Aerob kapacitet',
      percentMin: 70,
      percentMax: 80,
      hrMin: Math.round(maxHR * 0.7),
      hrMax: Math.round(maxHR * 0.8),
      effect: 'Aerob kapacitet',
    },
    {
      zone: 4,
      name: 'Hård',
      intensity: 'Anaerob tröskel',
      percentMin: 80,
      percentMax: 90,
      hrMin: Math.round(maxHR * 0.8),
      hrMax: Math.round(maxHR * 0.9),
      effect: 'Anaerob tröskel',
    },
    {
      zone: 5,
      name: 'Maximal',
      intensity: 'VO₂max',
      percentMin: 90,
      percentMax: 100,
      hrMin: Math.round(maxHR * 0.9),
      hrMax: maxHR,
      effect: 'VO₂max, maximal kapacitet',
    },
  ]

  // Add speed/power ranges
  if (testType === 'RUNNING' && threshold.unit === 'km/h') {
    zones.forEach((zone) => {
      const factor = zone.percentMin / threshold.percentOfMax
      zone.speedMin = Number((threshold.value * factor).toFixed(1))
      zone.speedMax = Number((threshold.value * (zone.percentMax / threshold.percentOfMax)).toFixed(1))
    })
  } else if (testType === 'CYCLING' && threshold.unit === 'watt') {
    zones.forEach((zone) => {
      const factor = zone.percentMin / threshold.percentOfMax
      zone.powerMin = Math.round(threshold.value * factor)
      zone.powerMax = Math.round(threshold.value * (zone.percentMax / threshold.percentOfMax))
    })
  }

  return zones
}
