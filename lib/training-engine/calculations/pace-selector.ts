// lib/training-engine/calculations/pace-selector.ts
// Comprehensive Pace Selection System - Unified Orchestration
// Integrates VDOT, Lactate Analysis, and Athlete Classification

import { calculateVDOTFromRace, type VDOTResult, type DanielsTrainingPaces } from './vdot'
import { analyzeLactateProfile, type LactateProfile } from './lactate-profile-analyzer'
import { classifyAthlete, type AthleteClassification } from './athlete-classifier'

/**
 * PRIMARY DATA SOURCES (in priority order)
 */
export interface RacePerformance {
  distance: '5K' | '10K' | 'HALF_MARATHON' | 'MARATHON' | 'CUSTOM'
  timeMinutes: number
  customDistanceKm?: number
  date: Date
  age?: number
  gender?: 'MALE' | 'FEMALE'
}

export interface LactateTestData {
  testStages: Array<{
    sequence: number
    speed: number
    heartRate: number
    lactate: number
  }>
  maxHR: number
  manualLT1Stage?: number
  manualLT2Stage?: number
}

export interface AthleteProfileData {
  age: number
  gender: 'MALE' | 'FEMALE'
  weeklyKm: number
  trainingAge: number
  restingHR?: number
  maxHR?: number
  vo2max?: number
}

/**
 * OUTPUT: COMPLETE PACE SELECTION
 */
export interface PaceSelection {
  // Core paces (km/h and min/km format)
  marathonPace: { kmh: number; pace: string }
  thresholdPace: { kmh: number; pace: string }
  easyPace: { minKmh: number; maxKmh: number; minPace: string; maxPace: string }
  intervalPace: { kmh: number; pace: string }
  repetitionPace: { kmh: number; pace: string }

  // Complete zone systems
  zones: {
    daniels: DanielsZones
    canova: CanovaZones
    norwegian: NorwegianZones
    hrBased: HRZones
  }

  // Source tracking
  primarySource: 'VDOT' | 'LACTATE_RATIO' | 'HR_ESTIMATION' | 'PROFILE_ESTIMATION'
  secondarySource?: 'VDOT' | 'LACTATE_RATIO' | 'HR_ESTIMATION'
  confidence: 'VERY_HIGH' | 'HIGH' | 'MEDIUM' | 'LOW'

  // Classification and metadata
  athleteClassification: AthleteClassification
  vdotResult?: VDOTResult
  lactateProfile?: LactateProfile

  // Validation
  validationResults: ValidationResults
  warnings: string[]
  errors: string[]
}

export interface DanielsZones {
  easy: { minKmh: number; maxKmh: number; minPace: string; maxPace: string; hrMin?: number; hrMax?: number }
  marathon: { kmh: number; pace: string; hr?: number }
  threshold: { kmh: number; pace: string; hr?: number }
  interval: { kmh: number; pace: string; hr?: number }
  repetition: { kmh: number; pace: string; hr?: number }
}

export interface CanovaZones {
  fundamental: { kmh: number; pace: string; percentOfMP: number; hr?: number }
  progressive: { minKmh: number; maxKmh: number; minPace: string; maxPace: string; percentOfMP: string; hr?: number }
  marathon: { kmh: number; pace: string; percentOfMP: number; hr?: number }
  specific: { kmh: number; pace: string; percentOfMP: number; hr?: number }
  threshold: { kmh: number; pace: string; percentOfMP: number; hr?: number }
  fiveK: { kmh: number; pace: string; percentOfMP: number; hr?: number }
  oneK: { kmh: number; pace: string; percentOfMP: number; hr?: number }
}

export interface NorwegianZones {
  green: { minKmh: number; maxKmh: number; minPace: string; maxPace: string; lactate: string; hr?: number }
  threshold: { kmh: number; pace: string; lactate: string; hr?: number }
  red: { minKmh: number; maxKmh: number; minPace: string; maxPace: string; lactate: string; hr?: number }
}

export interface HRZones {
  zone1: { minHR: number; maxHR: number; description: string }
  zone2: { minHR: number; maxHR: number; description: string }
  zone3: { minHR: number; maxHR: number; description: string }
  zone4: { minHR: number; maxHR: number; description: string }
  zone5: { minHR: number; maxHR: number; description: string }
}

export interface ValidationResults {
  sourcesAvailable: {
    vdot: boolean
    lactate: boolean
    hrData: boolean
    profile: boolean
  }
  consistencyChecks: {
    marathonPaceConsistent: boolean
    thresholdPaceConsistent: boolean
    mismatchPercent?: number
  }
  dataQuality: {
    vdotConfidence?: 'VERY_HIGH' | 'HIGH' | 'MEDIUM' | 'LOW'
    lactateConfidence?: 'VERY_HIGH' | 'HIGH' | 'MEDIUM' | 'LOW'
    dmaxRSquared?: number
  }
}

/**
 * MAIN ENTRY POINT: Select optimal training paces
 *
 * Priority hierarchy:
 * 1. ⭐⭐⭐⭐⭐ Recent race performance → VDOT
 * 2. ⭐⭐⭐⭐ Lactate test → Individual ratio method
 * 3. ⭐⭐⭐ HR-based estimation
 * 4. ⭐⭐ Profile estimation
 */
export function selectOptimalPaces(
  profile: AthleteProfileData,
  racePerformances?: RacePerformance[],
  lactateTest?: LactateTestData,
  options?: {
    preferredSource?: 'VDOT' | 'LACTATE_RATIO'
    requireConsistency?: boolean
    maxMismatchPercent?: number
  }
): PaceSelection {
  const warnings: string[] = []
  const errors: string[] = []

  // Calculate VDOT if race data available
  let vdotResult: VDOTResult | undefined
  let vdotConfidence: 'VERY_HIGH' | 'HIGH' | 'MEDIUM' | 'LOW' | undefined

  if (racePerformances && racePerformances.length > 0) {
    // Use most recent race
    const sortedRaces = racePerformances.sort((a, b) => b.date.getTime() - a.date.getTime())
    const mostRecentRace = sortedRaces[0]

    vdotResult = calculateVDOTFromRace(
      mostRecentRace.distance,
      mostRecentRace.timeMinutes,
      mostRecentRace.customDistanceKm,
      mostRecentRace.date,
      mostRecentRace.age || profile.age,
      mostRecentRace.gender || profile.gender
    )
    vdotConfidence = vdotResult.confidence

    // Warning if race is old
    if (vdotResult.ageInDays > 90) {
      warnings.push(`Race data is ${vdotResult.ageInDays} days old. Consider updating with recent performance.`)
    }
  }

  // Analyze lactate profile if test data available
  let lactateProfile: LactateProfile | undefined
  let lactateConfidence: 'VERY_HIGH' | 'HIGH' | 'MEDIUM' | 'LOW' | undefined

  if (lactateTest && lactateTest.testStages.length >= 4) {
    lactateProfile = analyzeLactateProfile(
      lactateTest.testStages,
      lactateTest.maxHR,
      lactateTest.manualLT1Stage,
      lactateTest.manualLT2Stage
    )
    lactateConfidence = lactateProfile.confidence

    // Add warnings from lactate analysis
    warnings.push(...lactateProfile.warnings)
  }

  // Classify athlete
  const athleteClassification = classifyAthlete({
    age: profile.age,
    gender: profile.gender,
    weeklyKm: profile.weeklyKm,
    trainingAge: profile.trainingAge,
    vdotResult,
    lactateProfile,
    restingHR: profile.restingHR,
    maxHR: profile.maxHR || 190,
    vo2max: profile.vo2max
  })

  // TIER SELECTION LOGIC
  let primarySource: 'VDOT' | 'LACTATE_RATIO' | 'HR_ESTIMATION' | 'PROFILE_ESTIMATION'
  let secondarySource: 'VDOT' | 'LACTATE_RATIO' | 'HR_ESTIMATION' | undefined
  let overallConfidence: 'VERY_HIGH' | 'HIGH' | 'MEDIUM' | 'LOW'

  // Determine primary source based on availability and confidence
  if (vdotResult && (vdotConfidence === 'VERY_HIGH' || vdotConfidence === 'HIGH')) {
    primarySource = 'VDOT'
    overallConfidence = vdotConfidence

    if (lactateProfile && lactateConfidence && (lactateConfidence === 'VERY_HIGH' || lactateConfidence === 'HIGH')) {
      secondarySource = 'LACTATE_RATIO'
    }
  } else if (lactateProfile && lactateConfidence) {
    primarySource = 'LACTATE_RATIO'
    overallConfidence = lactateConfidence

    if (vdotResult) {
      secondarySource = 'VDOT'
    }
  } else if (lactateTest && lactateTest.testStages.length > 0) {
    primarySource = 'HR_ESTIMATION'
    overallConfidence = 'MEDIUM'
  } else {
    primarySource = 'PROFILE_ESTIMATION'
    overallConfidence = 'LOW'
    warnings.push('No race or test data available. Using profile estimation only. Accuracy is limited.')
  }

  // Apply user preference if specified
  if (options?.preferredSource) {
    if (options.preferredSource === 'VDOT' && vdotResult) {
      primarySource = 'VDOT'
    } else if (options.preferredSource === 'LACTATE_RATIO' && lactateProfile) {
      primarySource = 'LACTATE_RATIO'
    }
  }

  // CALCULATE CORE PACES from primary source
  let marathonPaceKmh: number
  let thresholdPaceKmh: number
  let easyMinKmh: number
  let easyMaxKmh: number
  let intervalPaceKmh: number
  let repetitionPaceKmh: number

  if (primarySource === 'VDOT' && vdotResult) {
    // Use Daniels training paces
    marathonPaceKmh = vdotResult.trainingPaces.marathon.kmh
    thresholdPaceKmh = vdotResult.trainingPaces.threshold.kmh
    easyMinKmh = vdotResult.trainingPaces.easy.minKmh
    easyMaxKmh = vdotResult.trainingPaces.easy.maxKmh
    intervalPaceKmh = vdotResult.trainingPaces.interval.kmh
    repetitionPaceKmh = vdotResult.trainingPaces.repetition.kmh

  } else if (primarySource === 'LACTATE_RATIO' && lactateProfile) {
    // Use lactate-derived paces
    thresholdPaceKmh = lactateProfile.lt2.speed

    // Calculate marathon pace using compression factor
    const compressionFactor = athleteClassification.compressionFactor
    marathonPaceKmh = thresholdPaceKmh * compressionFactor

    // Easy pace: 65-78% of threshold pace
    easyMinKmh = thresholdPaceKmh * 0.65
    easyMaxKmh = thresholdPaceKmh * 0.78

    // Interval pace: 105-108% of threshold
    intervalPaceKmh = thresholdPaceKmh * 1.07

    // Repetition pace: 115-120% of threshold
    repetitionPaceKmh = thresholdPaceKmh * 1.18

  } else if (primarySource === 'HR_ESTIMATION' && lactateTest) {
    // Estimate from HR data (less accurate)
    const avgSpeed = lactateTest.testStages.reduce((sum, s) => sum + s.speed, 0) / lactateTest.testStages.length

    // Conservative estimates
    thresholdPaceKmh = avgSpeed * 0.88
    marathonPaceKmh = thresholdPaceKmh * 0.85
    easyMinKmh = avgSpeed * 0.60
    easyMaxKmh = avgSpeed * 0.75
    intervalPaceKmh = avgSpeed * 0.95
    repetitionPaceKmh = avgSpeed * 1.05

    warnings.push('Using HR-based estimation. Accuracy is limited without lactate or race data.')

  } else {
    // Profile estimation (least accurate)
    // Estimate VDOT from profile data
    const estimatedVDOT = estimateVDOTFromProfile(profile)
    const tempVDOT = calculateVDOTFromRace('MARATHON', 180, undefined, new Date(), profile.age, profile.gender) // 3:00 marathon baseline

    marathonPaceKmh = tempVDOT.trainingPaces.marathon.kmh
    thresholdPaceKmh = tempVDOT.trainingPaces.threshold.kmh
    easyMinKmh = tempVDOT.trainingPaces.easy.minKmh
    easyMaxKmh = tempVDOT.trainingPaces.easy.maxKmh
    intervalPaceKmh = tempVDOT.trainingPaces.interval.kmh
    repetitionPaceKmh = tempVDOT.trainingPaces.repetition.kmh

    warnings.push('Using profile estimation only. Strongly recommend adding race or test data for accuracy.')
  }

  // VALIDATION: Check consistency between sources
  const validationResults = validateConsistency(
    { marathonPaceKmh, thresholdPaceKmh },
    vdotResult,
    lactateProfile,
    athleteClassification,
    options
  )

  if (!validationResults.consistencyChecks.marathonPaceConsistent) {
    warnings.push(
      `Marathon pace mismatch between sources (${validationResults.consistencyChecks.mismatchPercent?.toFixed(1)}%). Review data quality.`
    )
  }

  // BUILD COMPLETE ZONE SYSTEMS
  const danielsZones = buildDanielsZones(
    { marathonPaceKmh, thresholdPaceKmh, easyMinKmh, easyMaxKmh, intervalPaceKmh, repetitionPaceKmh },
    lactateProfile,
    profile.maxHR
  )

  const canovaZones = buildCanovaZones(
    marathonPaceKmh,
    thresholdPaceKmh,
    athleteClassification.level,
    lactateProfile,
    profile.maxHR
  )

  const norwegianZones = buildNorwegianZones(
    thresholdPaceKmh,
    athleteClassification.level,
    lactateProfile,
    profile.maxHR
  )

  const hrZones = buildHRZones(
    profile.maxHR || (lactateTest?.maxHR) || 190,
    profile.restingHR || 60
  )

  // RETURN COMPLETE RESULT
  return {
    marathonPace: {
      kmh: marathonPaceKmh,
      pace: kmhToPace(marathonPaceKmh)
    },
    thresholdPace: {
      kmh: thresholdPaceKmh,
      pace: kmhToPace(thresholdPaceKmh)
    },
    easyPace: {
      minKmh: easyMinKmh,
      maxKmh: easyMaxKmh,
      minPace: kmhToPace(easyMinKmh),
      maxPace: kmhToPace(easyMaxKmh)
    },
    intervalPace: {
      kmh: intervalPaceKmh,
      pace: kmhToPace(intervalPaceKmh)
    },
    repetitionPace: {
      kmh: repetitionPaceKmh,
      pace: kmhToPace(repetitionPaceKmh)
    },

    zones: {
      daniels: danielsZones,
      canova: canovaZones,
      norwegian: norwegianZones,
      hrBased: hrZones
    },

    primarySource,
    secondarySource,
    confidence: overallConfidence,

    athleteClassification,
    vdotResult,
    lactateProfile,

    validationResults,
    warnings,
    errors
  }
}

/**
 * VALIDATION: Check consistency between data sources
 */
function validateConsistency(
  calculatedPaces: { marathonPaceKmh: number; thresholdPaceKmh: number },
  vdotResult?: VDOTResult,
  lactateProfile?: LactateProfile,
  athleteClassification?: AthleteClassification,
  options?: { requireConsistency?: boolean; maxMismatchPercent?: number }
): ValidationResults {
  const maxMismatch = options?.maxMismatchPercent || 15

  let marathonPaceConsistent = true
  let thresholdPaceConsistent = true
  let mismatchPercent: number | undefined

  // Check if VDOT and lactate-derived paces are consistent
  if (vdotResult && lactateProfile && athleteClassification) {
    const vdotMarathonKmh = vdotResult.trainingPaces.marathon.kmh
    const lactateThresholdKmh = lactateProfile.lt2.speed
    const lactateMarathonKmh = lactateThresholdKmh * athleteClassification.compressionFactor

    // Calculate mismatch
    const mpDiff = Math.abs(vdotMarathonKmh - lactateMarathonKmh)
    mismatchPercent = (mpDiff / vdotMarathonKmh) * 100

    if (mismatchPercent > maxMismatch) {
      marathonPaceConsistent = false
    }

    // Check threshold pace
    const vdotThresholdKmh = vdotResult.trainingPaces.threshold.kmh
    const tpDiff = Math.abs(vdotThresholdKmh - lactateThresholdKmh)
    const tpMismatch = (tpDiff / vdotThresholdKmh) * 100

    if (tpMismatch > maxMismatch) {
      thresholdPaceConsistent = false
    }
  }

  return {
    sourcesAvailable: {
      vdot: !!vdotResult,
      lactate: !!lactateProfile,
      hrData: !!(lactateProfile?.lt2.heartRate),
      profile: !!athleteClassification
    },
    consistencyChecks: {
      marathonPaceConsistent,
      thresholdPaceConsistent,
      mismatchPercent
    },
    dataQuality: {
      vdotConfidence: vdotResult?.confidence,
      lactateConfidence: lactateProfile?.confidence,
      dmaxRSquared: lactateProfile?.rSquared
    }
  }
}

/**
 * BUILD DANIELS ZONES with optional HR overlay
 */
function buildDanielsZones(
  paces: {
    marathonPaceKmh: number
    thresholdPaceKmh: number
    easyMinKmh: number
    easyMaxKmh: number
    intervalPaceKmh: number
    repetitionPaceKmh: number
  },
  lactateProfile?: LactateProfile,
  maxHR?: number
): DanielsZones {
  return {
    easy: {
      minKmh: paces.easyMinKmh,
      maxKmh: paces.easyMaxKmh,
      minPace: kmhToPace(paces.easyMinKmh),
      maxPace: kmhToPace(paces.easyMaxKmh),
      hrMin: maxHR ? Math.round(maxHR * 0.65) : undefined,
      hrMax: maxHR ? Math.round(maxHR * 0.78) : undefined
    },
    marathon: {
      kmh: paces.marathonPaceKmh,
      pace: kmhToPace(paces.marathonPaceKmh),
      hr: maxHR ? Math.round(maxHR * 0.84) : undefined
    },
    threshold: {
      kmh: paces.thresholdPaceKmh,
      pace: kmhToPace(paces.thresholdPaceKmh),
      hr: lactateProfile?.lt2.heartRate || (maxHR ? Math.round(maxHR * 0.88) : undefined)
    },
    interval: {
      kmh: paces.intervalPaceKmh,
      pace: kmhToPace(paces.intervalPaceKmh),
      hr: maxHR ? Math.round(maxHR * 0.98) : undefined
    },
    repetition: {
      kmh: paces.repetitionPaceKmh,
      pace: kmhToPace(paces.repetitionPaceKmh),
      hr: maxHR ? Math.round(maxHR * 0.98) : undefined
    }
  }
}

/**
 * BUILD CANOVA ZONES (7 zones based on marathon pace)
 */
function buildCanovaZones(
  marathonPaceKmh: number,
  thresholdPaceKmh: number,
  level: 'ELITE' | 'ADVANCED' | 'INTERMEDIATE' | 'RECREATIONAL',
  lactateProfile?: LactateProfile,
  maxHR?: number
): CanovaZones {
  // Fundamental: MP - 10-15% (slower)
  const fundamentalKmh = marathonPaceKmh * 0.88

  // Progressive: MP - 5% to MP + 2%
  const progressiveMinKmh = marathonPaceKmh * 0.95
  const progressiveMaxKmh = marathonPaceKmh * 1.02

  // Specific: MP + 3-5%
  const specificKmh = marathonPaceKmh * 1.04

  // 5K pace: MP + 8-12% (depending on level)
  const fiveKMultiplier = level === 'ELITE' ? 1.08 : level === 'ADVANCED' ? 1.10 : 1.12
  const fiveKKmh = marathonPaceKmh * fiveKMultiplier

  // 1K pace: MP + 15-20%
  const oneKMultiplier = level === 'ELITE' ? 1.15 : level === 'ADVANCED' ? 1.17 : 1.20
  const oneKKmh = marathonPaceKmh * oneKMultiplier

  return {
    fundamental: {
      kmh: fundamentalKmh,
      pace: kmhToPace(fundamentalKmh),
      percentOfMP: 88,
      hr: maxHR ? Math.round(maxHR * 0.75) : undefined
    },
    progressive: {
      minKmh: progressiveMinKmh,
      maxKmh: progressiveMaxKmh,
      minPace: kmhToPace(progressiveMinKmh),
      maxPace: kmhToPace(progressiveMaxKmh),
      percentOfMP: '95-102',
      hr: maxHR ? Math.round(maxHR * 0.82) : undefined
    },
    marathon: {
      kmh: marathonPaceKmh,
      pace: kmhToPace(marathonPaceKmh),
      percentOfMP: 100,
      hr: maxHR ? Math.round(maxHR * 0.84) : undefined
    },
    specific: {
      kmh: specificKmh,
      pace: kmhToPace(specificKmh),
      percentOfMP: 104,
      hr: maxHR ? Math.round(maxHR * 0.87) : undefined
    },
    threshold: {
      kmh: thresholdPaceKmh,
      pace: kmhToPace(thresholdPaceKmh),
      percentOfMP: Math.round((thresholdPaceKmh / marathonPaceKmh) * 100),
      hr: lactateProfile?.lt2.heartRate || (maxHR ? Math.round(maxHR * 0.88) : undefined)
    },
    fiveK: {
      kmh: fiveKKmh,
      pace: kmhToPace(fiveKKmh),
      percentOfMP: Math.round(fiveKMultiplier * 100),
      hr: maxHR ? Math.round(maxHR * 0.94) : undefined
    },
    oneK: {
      kmh: oneKKmh,
      pace: kmhToPace(oneKKmh),
      percentOfMP: Math.round(oneKMultiplier * 100),
      hr: maxHR ? Math.round(maxHR * 0.98) : undefined
    }
  }
}

/**
 * BUILD NORWEGIAN ZONES (3 zones: Green, Threshold, Red)
 */
function buildNorwegianZones(
  thresholdPaceKmh: number,
  level: 'ELITE' | 'ADVANCED' | 'INTERMEDIATE' | 'RECREATIONAL',
  lactateProfile?: LactateProfile,
  maxHR?: number
): NorwegianZones {
  // Green zone: <2.0 mmol/L (or <80% of LT2 pace for elites)
  const greenMaxKmh = level === 'ELITE' ? thresholdPaceKmh * 0.80 : thresholdPaceKmh * 0.85
  const greenMinKmh = greenMaxKmh * 0.75

  // Threshold zone: 2.0-3.0 mmol/L (or 95-105% of LT2 pace)
  const thresholdPace = thresholdPaceKmh

  // Red zone: >3.0 mmol/L (or >105% of LT2 pace)
  const redMinKmh = thresholdPaceKmh * 1.05
  const redMaxKmh = thresholdPaceKmh * 1.20

  return {
    green: {
      minKmh: greenMinKmh,
      maxKmh: greenMaxKmh,
      minPace: kmhToPace(greenMinKmh),
      maxPace: kmhToPace(greenMaxKmh),
      lactate: '<2.0 mmol/L',
      hr: maxHR ? Math.round(maxHR * 0.75) : undefined
    },
    threshold: {
      kmh: thresholdPace,
      pace: kmhToPace(thresholdPace),
      lactate: lactateProfile ? `${lactateProfile.lt2.lactate.toFixed(1)} mmol/L` : '2.0-3.0 mmol/L',
      hr: lactateProfile?.lt2.heartRate || (maxHR ? Math.round(maxHR * 0.88) : undefined)
    },
    red: {
      minKmh: redMinKmh,
      maxKmh: redMaxKmh,
      minPace: kmhToPace(redMinKmh),
      maxPace: kmhToPace(redMaxKmh),
      lactate: '>3.0 mmol/L',
      hr: maxHR ? Math.round(maxHR * 0.95) : undefined
    }
  }
}

/**
 * BUILD HR ZONES (5-zone system)
 */
function buildHRZones(maxHR: number, restingHR: number): HRZones {
  // Using % of max HR method (simpler than Karvonen)
  return {
    zone1: {
      minHR: Math.round(maxHR * 0.50),
      maxHR: Math.round(maxHR * 0.60),
      description: 'Very Easy / Recovery'
    },
    zone2: {
      minHR: Math.round(maxHR * 0.60),
      maxHR: Math.round(maxHR * 0.70),
      description: 'Easy / Aerobic Base'
    },
    zone3: {
      minHR: Math.round(maxHR * 0.70),
      maxHR: Math.round(maxHR * 0.80),
      description: 'Moderate / Tempo'
    },
    zone4: {
      minHR: Math.round(maxHR * 0.80),
      maxHR: Math.round(maxHR * 0.90),
      description: 'Hard / Threshold'
    },
    zone5: {
      minHR: Math.round(maxHR * 0.90),
      maxHR: maxHR,
      description: 'Maximum / VO2max'
    }
  }
}

/**
 * HELPER: Estimate VDOT from profile when no data available
 */
function estimateVDOTFromProfile(profile: AthleteProfileData): number {
  // Very rough estimation based on training volume and age
  let baseVDOT = 40 // Average recreational runner

  // Adjust for volume
  if (profile.weeklyKm > 80) baseVDOT += 15
  else if (profile.weeklyKm > 60) baseVDOT += 10
  else if (profile.weeklyKm > 40) baseVDOT += 5

  // Adjust for training age
  if (profile.trainingAge > 5) baseVDOT += 5
  else if (profile.trainingAge > 2) baseVDOT += 2

  // Adjust for age
  if (profile.age > 50) baseVDOT -= 5
  else if (profile.age > 40) baseVDOT -= 2

  return baseVDOT
}

/**
 * HELPER: Convert km/h to min/km pace string
 */
function kmhToPace(kmh: number): string {
  const minPerKm = 60 / kmh
  const minutes = Math.floor(minPerKm)
  const seconds = Math.round((minPerKm - minutes) * 60)
  return `${minutes}:${String(seconds).padStart(2, '0')}/km`
}

/**
 * HELPER: Convert pace string to km/h
 */
export function paceToKmh(pace: string): number {
  // Parse "4:30/km" format
  const match = pace.match(/(\d+):(\d+)/)
  if (!match) return 0

  const minutes = parseInt(match[1])
  const seconds = parseInt(match[2])
  const minPerKm = minutes + seconds / 60

  return 60 / minPerKm
}
