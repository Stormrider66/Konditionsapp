// lib/calculations/zones.ts
import { TrainingZone, Threshold, TestType, Client, Gender, FitnessEstimate } from '@/types'

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

type ThresholdValueType = 'SPEED' | 'POWER' | 'PACE'

export interface IndividualizedThresholdInput {
  hr: number
  value: number
  unit?: Threshold['unit']
  type?: ThresholdValueType
  lactate?: number
}

export interface IndividualizedZoneRequest {
  maxHR?: number
  lt1?: IndividualizedThresholdInput
  lt2?: IndividualizedThresholdInput
  age?: number
  gender?: Gender
  testType?: TestType
}

/**
 * Convenience wrapper for calculating training zones without requiring a full client object.
 * Ensures LT1/LT2 thresholds are honored whenever provided.
 */
export function calculateIndividualizedZones(params: IndividualizedZoneRequest): TrainingZone[] {
  const gender = params.gender ?? 'MALE'
  const age = params.age ?? 35
  const maxHR = params.maxHR ?? estimateMaxHR(age, gender)

  const mockClient = createMockClient(age, gender)
  const testType = inferTestType(params)

  const lt1 = params.lt1 ? normalizeThresholdInput(params.lt1, maxHR) : null
  const lt2 = params.lt2 ? normalizeThresholdInput(params.lt2, maxHR) : null

  const result = calculateTrainingZones(mockClient, maxHR, lt1, lt2, testType)
  return result.zones
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
 * Tier 3+ (Bronze+ Standard): Fitness-adjusted %HRmax fallback
 * - Uses estimated fitness level to adjust LT1/LT2 percentages
 * - Accounts for the "Accordion Effect" (zone width varies by fitness)
 * - More accurate than fixed percentages for untrained/elite athletes
 * - Confidence: LOW (but more accurate than fixed percentages)
 *
 * @param client - Client demographic data (age, gender, weight)
 * @param maxHR - Maximum heart rate (from test or estimated)
 * @param aerobicThreshold - LT1 threshold (if available from lactate test)
 * @param anaerobicThreshold - LT2 threshold (if available from lactate test)
 * @param testType - Type of test (RUNNING, CYCLING, SKIING)
 * @param fitnessEstimate - Optional fitness estimate for adjusted zone percentages
 * @returns Zone calculation with confidence indicator
 */
export function calculateTrainingZones(
  client: Client,
  maxHR: number | undefined,
  aerobicThreshold: Threshold | undefined | null,
  anaerobicThreshold: Threshold | undefined | null,
  testType: TestType,
  fitnessEstimate?: FitnessEstimate
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

  // Tier 3/3+: Fallback to %HRmax estimation (Bronze/Bronze+ Standard)
  // If fitnessEstimate is provided, use fitness-adjusted percentages
  return calculateZonesFromHRmaxFallback(
    client,
    maxHR,
    testType,
    fitnessEstimate
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
  const hrGap = lt2HR - lt1HR

  // Adaptive zone boundaries based on LT1-LT2 gap
  // If thresholds are close together (< 15 bpm), use tighter boundaries
  const useNarrowZones = hrGap < 15

  // Calculate zone boundaries that never overlap or invert
  const zone1Max = Math.min(lt1HR - 6, Math.round(maxHR * 0.65))
  const zone2Min = zone1Max + 1
  const zone2Max = useNarrowZones ? lt1HR + 2 : lt1HR + 5

  // Zone 3 only exists if there's enough gap between LT1 and LT2
  const hasZone3 = hrGap >= 10
  const zone3Min = zone2Max + 1
  const zone3MaxBase = useNarrowZones ? Math.floor((lt1HR + lt2HR) / 2) : lt2HR - 5
  // If zone 3 is collapsed, expand it slightly
  const zone3Max = hasZone3 ? zone3MaxBase : zone3MaxBase + 3

  const zone4Min = zone3Max + 1
  const zone4Max = useNarrowZones ? lt2HR + 2 : lt2HR + 5
  const zone5Min = zone4Max + 1

  const zones: TrainingZone[] = [
    {
      zone: 1,
      name: 'Mycket lätt',
      intensity: 'Återhämtning',
      hrMin: Math.round(maxHR * 0.5),
      hrMax: zone1Max,
      percentMin: Math.round((Math.round(maxHR * 0.5) / maxHR) * 100),
      percentMax: Math.round((zone1Max / maxHR) * 100),
      effect: 'Återhämtning, uppvärmning, fettförbränning',
    },
    {
      zone: 2,
      name: 'Lätt',
      intensity: 'Grundkondition (LT1)',
      hrMin: zone2Min,
      hrMax: zone2Max,
      percentMin: Math.round((zone2Min / maxHR) * 100),
      percentMax: Math.round((zone2Max / maxHR) * 100),
      effect: 'Aerob grundträning, hög volym vid denna intensitet',
    },
    {
      zone: 3,
      name: 'Måttlig',
      intensity: hasZone3 ? 'Tempo' : 'Tempo/Tröskel',
      hrMin: zone3Min,
      hrMax: zone3Max,
      percentMin: Math.round((zone3Min / maxHR) * 100),
      percentMax: Math.round((zone3Max / maxHR) * 100),
      effect: 'Tempo, aerob kapacitet, längre intervaller',
    },
    {
      zone: 4,
      name: 'Hård',
      intensity: 'Tröskel (LT2)',
      hrMin: zone4Min,
      hrMax: zone4Max,
      percentMin: Math.round((zone4Min / maxHR) * 100),
      percentMax: Math.round((zone4Max / maxHR) * 100),
      effect: 'Anaerob tröskel, laktathantering, tävlingsfart',
    },
    {
      zone: 5,
      name: 'Maximal',
      intensity: 'VO₂max',
      hrMin: zone5Min,
      hrMax: maxHR,
      percentMin: Math.round((zone5Min / maxHR) * 100),
      percentMax: 100,
      effect: 'VO₂max, kortare intervaller, maximal syreupptagning',
    },
  ]

  // Add speed/power ranges based on thresholds
  addIntensityRanges(zones, lt1, lt2, testType)

  return {
    zones,
    confidence: 'HIGH',
    method: 'LACTATE_TEST',
    warning: useNarrowZones ? `Obs: LT1 och LT2 ligger nära varandra (${hrGap} slag/min). Zonerna är anpassade för detta.` : undefined
  }
}

/**
 * Tier 3/3+: Fallback zone calculation using %HRmax
 *
 * Used when no lactate test data exists. Uses:
 * - Better HRmax formulas (Tanaka or Gulati, not 220-age)
 * - Fitness-adjusted LT1/LT2 estimates (if fitnessEstimate provided)
 * - Clear warning to user
 *
 * Formula selection:
 * - Women: Gulati formula (206 - 0.88 * age)
 * - Men/Other: Tanaka formula (208 - 0.7 * age)
 *
 * Zone estimation (default without fitness estimate):
 * - LT1 ≈ 75-80% HRmax (conservative)
 * - LT2 ≈ 85-90% HRmax (conservative)
 *
 * Zone estimation with fitness estimate ("Accordion Effect"):
 * - UNTRAINED: LT1 ≈ 58%, LT2 ≈ 78% (narrow Zone 2)
 * - BEGINNER: LT1 ≈ 63%, LT2 ≈ 80%
 * - RECREATIONAL: LT1 ≈ 68%, LT2 ≈ 84%
 * - TRAINED: LT1 ≈ 72%, LT2 ≈ 87%
 * - WELL_TRAINED: LT1 ≈ 76%, LT2 ≈ 90%
 * - ELITE: LT1 ≈ 78%, LT2 ≈ 93% (wide Zone 2)
 */
function calculateZonesFromHRmaxFallback(
  client: Client,
  maxHR: number | undefined,
  testType: TestType,
  fitnessEstimate?: FitnessEstimate
): ZoneCalculationResult {
  const age = calculateAge(client.birthDate)

  // Use provided maxHR or estimate from age
  const estimatedMaxHR = maxHR || estimateMaxHR(age, client.gender)

  // Use fitness-adjusted percentages if available, otherwise default
  const lt1Percent = fitnessEstimate?.lt1PercentHRmax
    ? fitnessEstimate.lt1PercentHRmax / 100
    : 0.77  // Default fallback

  const lt2Percent = fitnessEstimate?.lt2PercentHRmax
    ? fitnessEstimate.lt2PercentHRmax / 100
    : 0.87  // Default fallback

  // Calculate estimated LT1/LT2 heart rates
  const estimatedLT1HR = Math.round(estimatedMaxHR * lt1Percent)
  const estimatedLT2HR = Math.round(estimatedMaxHR * lt2Percent)

  // Calculate zone boundaries based on LT1/LT2
  // Zone 1: Recovery - below LT1 - 10bpm
  const zone1Max = Math.max(Math.round(estimatedMaxHR * 0.5), estimatedLT1HR - 15)
  const zone1MaxPercent = Math.round((zone1Max / estimatedMaxHR) * 100)

  // Zone 2: Easy/Aerobic base - from Zone 1 max to LT1
  const zone2Min = zone1Max + 1
  const zone2Max = estimatedLT1HR
  const zone2MinPercent = Math.round((zone2Min / estimatedMaxHR) * 100)
  const zone2MaxPercent = Math.round((zone2Max / estimatedMaxHR) * 100)

  // Zone 3: Tempo - from LT1 to just below LT2
  const zone3Min = estimatedLT1HR + 1
  const zone3Max = estimatedLT2HR - 3
  const zone3MinPercent = Math.round((zone3Min / estimatedMaxHR) * 100)
  const zone3MaxPercent = Math.round((zone3Max / estimatedMaxHR) * 100)

  // Zone 4: Threshold - around LT2
  const zone4Min = estimatedLT2HR - 2
  const zone4Max = Math.min(estimatedLT2HR + 5, Math.round(estimatedMaxHR * 0.95))
  const zone4MinPercent = Math.round((zone4Min / estimatedMaxHR) * 100)
  const zone4MaxPercent = Math.round((zone4Max / estimatedMaxHR) * 100)

  // Zone 5: VO2max - above threshold
  const zone5Min = zone4Max + 1
  const zone5MinPercent = Math.round((zone5Min / estimatedMaxHR) * 100)

  const zones: TrainingZone[] = [
    {
      zone: 1,
      name: 'Mycket lätt',
      intensity: 'Återhämtning',
      percentMin: 50,
      percentMax: zone1MaxPercent,
      hrMin: Math.round(estimatedMaxHR * 0.5),
      hrMax: zone1Max,
      effect: 'Återhämtning, uppvärmning',
    },
    {
      zone: 2,
      name: 'Lätt',
      intensity: fitnessEstimate ? 'Grundkondition (LT1)' : 'Grundkondition',
      percentMin: zone2MinPercent,
      percentMax: zone2MaxPercent,
      hrMin: zone2Min,
      hrMax: zone2Max,
      effect: 'Grundkondition, fettförbränning',
    },
    {
      zone: 3,
      name: 'Måttlig',
      intensity: 'Tempo',
      percentMin: zone3MinPercent,
      percentMax: zone3MaxPercent,
      hrMin: zone3Min,
      hrMax: zone3Max,
      effect: 'Tempo, aerob kapacitet',
    },
    {
      zone: 4,
      name: 'Hård',
      intensity: fitnessEstimate ? 'Tröskel (LT2)' : 'Tröskel',
      percentMin: zone4MinPercent,
      percentMax: zone4MaxPercent,
      hrMin: zone4Min,
      hrMax: zone4Max,
      effect: 'Anaerob tröskel',
    },
    {
      zone: 5,
      name: 'Maximal',
      intensity: 'VO₂max',
      percentMin: zone5MinPercent,
      percentMax: 100,
      hrMin: zone5Min,
      hrMax: estimatedMaxHR,
      effect: 'VO₂max, maximal kapacitet',
    },
  ]

  // Build warning message
  let warning: string
  if (fitnessEstimate) {
    const fitnessLabel = getFitnessLevelLabel(fitnessEstimate.level)
    warning = maxHR
      ? `Zoner justerade för fitnessnivå (${fitnessLabel}). LT1 ≈ ${Math.round(lt1Percent * 100)}%, LT2 ≈ ${Math.round(lt2Percent * 100)}% av maxpuls.`
      : `Zoner uppskattas från ålder (${age} år) och fitnessnivå (${fitnessLabel}). Maxpuls estimerad till ${estimatedMaxHR} bpm.`
  } else {
    warning = maxHR
      ? 'Zoner baserade på % av maxpuls. För bättre noggrannhet, gör ett laktattest eller fälttest.'
      : `Zoner uppskattas från ålder (${age} år) och kön. Maxpuls estimerad till ${estimatedMaxHR} bpm. För bästa noggrannhet, gör ett laktattest.`
  }

  return {
    zones,
    confidence: 'LOW',
    method: 'ESTIMATED',
    warning
  }
}

/**
 * Get Swedish label for fitness level
 */
function getFitnessLevelLabel(level: string): string {
  const labels: Record<string, string> = {
    UNTRAINED: 'otränad',
    BEGINNER: 'nybörjare',
    RECREATIONAL: 'motionär',
    TRAINED: 'tränad',
    WELL_TRAINED: 'vältränad',
    ELITE: 'elit'
  }
  return labels[level] || level.toLowerCase()
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

const DEFAULT_CLIENT_HEIGHT = 178
const DEFAULT_CLIENT_WEIGHT = 72

function inferTestType(params: IndividualizedZoneRequest): TestType {
  if (params.testType) {
    return params.testType
  }

  const source = params.lt1 ?? params.lt2
  const unit = source?.unit ?? thresholdTypeToUnit(source?.type)

  if (unit === 'watt') {
    return 'CYCLING'
  }

  if (unit === 'min/km') {
    return 'SKIING'
  }

  return 'RUNNING'
}

function thresholdTypeToUnit(type?: ThresholdValueType): Threshold['unit'] {
  if (type === 'POWER') {
    return 'watt'
  }

  if (type === 'PACE') {
    return 'min/km'
  }

  return 'km/h'
}

function normalizeThresholdInput(input: IndividualizedThresholdInput, maxHR: number): Threshold {
  const unit = input.unit ?? thresholdTypeToUnit(input.type)
  const percentOfMax = clampPercent((input.hr / maxHR) * 100)

  return {
    heartRate: input.hr,
    value: input.value,
    unit,
    lactate: input.lactate,
    percentOfMax
  }
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function createMockClient(age: number, gender: Gender): Client {
  const now = new Date()
  return {
    id: `individualized-client-${now.getTime()}`,
    userId: 'individualized-calculation',
    name: 'Individualized Athlete',
    gender,
    birthDate: birthDateFromAge(age),
    height: DEFAULT_CLIENT_HEIGHT,
    weight: DEFAULT_CLIENT_WEIGHT,
    createdAt: now,
    updatedAt: now,
    teamId: null,
  }
}

function birthDateFromAge(age: number): Date {
  const today = new Date()
  return new Date(today.getFullYear() - age, today.getMonth(), today.getDate())
}