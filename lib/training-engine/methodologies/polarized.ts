/**
 * Polarized Training Methodology (80/20 Rule)
 *
 * Based on Dr. Stephen Seiler's research on elite endurance athletes.
 *
 * Key Principles:
 * - 80% of training time at low intensity (below LT1)
 * - 20% at high intensity (above LT2)
 * - Minimal time in "moderate" zone between LT1-LT2
 *
 * Zone Distribution (3-zone model):
 * - Zone 1 (< LT1): 80%
 * - Zone 2 (LT1-LT2): 5%
 * - Zone 3 (> LT2): 15%
 *
 * References:
 * - Seiler, S., & Kjerland, G. Ø. (2006). Quantifying training intensity distribution.
 * - Stöggl, T., & Sperlich, B. (2014). Polarized training has greater impact.
 *
 * @module methodologies/polarized
 */

import type { MethodologyConfig, WeeklyStructure, ZoneDistribution3 } from './types'

/**
 * Get Polarized methodology configuration
 *
 * Suitable for: All athlete levels, all distances
 * Prerequisites: None (safest default option)
 *
 * @param weeklySessionCount - Number of sessions per week (4-10)
 * @returns Complete Polarized methodology configuration
 */
export function getPolarizedConfig(weeklySessionCount: number = 6): MethodologyConfig {
  // Validate session count
  const sessions = Math.max(4, Math.min(10, weeklySessionCount))

  // Calculate quality sessions (15-20% of total should be high intensity)
  // For 6 sessions/week: 1-2 quality sessions
  const qualitySessions = sessions <= 5 ? 1 : sessions <= 7 ? 2 : 3
  const easyRuns = sessions - qualitySessions - 1 // -1 for long run
  const restDays = 7 - sessions

  const weeklyStructure: WeeklyStructure = {
    totalSessions: sessions,
    easyRuns: Math.max(0, easyRuns),
    qualitySessions,
    longRun: true,
    restDays,
  }

  const zoneDistribution3: ZoneDistribution3 = {
    zone1Percent: 80, // Easy aerobic
    zone2Percent: 5,  // Minimal tempo work
    zone3Percent: 15, // High-intensity intervals
  }

  return {
    type: 'POLARIZED',
    name: 'Polarized Training (80/20)',
    description: 'Evidence-based approach with 80% easy, 20% hard training. Suitable for all levels.',
    zoneDistribution3,
    weeklyStructure,
    minWeeklySessions: 4,
    maxWeeklySessions: 10,
    requiresLactateTest: false, // Works with HR-based zones too
    targetDistances: ['5K', '10K', 'HALF_MARATHON', 'MARATHON', 'ULTRAMARATHON', 'GENERAL_FITNESS'],
    minAthleteLevel: 'BEGINNER',
    deloadFrequencyWeeks: 3, // 3:1 hard:easy pattern
    volumeReductionPercent: 25, // 25% reduction on deload weeks
    strengths: [
      'Proven effective across all athlete levels',
      'Minimizes injury risk with high volume of easy running',
      'Clear intensity prescription (easy or hard, no grey zone)',
      'Sustainable long-term',
      'Does not require lactate testing',
      'Promotes better recovery between quality sessions',
    ],
    limitations: [
      'May feel "too easy" for athletes used to moderate-intensity training',
      'Requires discipline to keep easy runs truly easy',
      'Limited tempo/threshold work (some athletes prefer more)',
      'Quality sessions must be high quality (no junk miles in Zone 2)',
    ],
  }
}

/**
 * Calculate weekly volume distribution for Polarized training
 *
 * @param totalWeeklyMinutes - Total training time for the week
 * @returns Time allocation by zone
 */
export function calculatePolarizedVolume(totalWeeklyMinutes: number): {
  zone1Minutes: number
  zone2Minutes: number
  zone3Minutes: number
} {
  return {
    zone1Minutes: Math.round(totalWeeklyMinutes * 0.80),
    zone2Minutes: Math.round(totalWeeklyMinutes * 0.05),
    zone3Minutes: Math.round(totalWeeklyMinutes * 0.15),
  }
}

/**
 * Validate if an athlete's training distribution follows Polarized principles
 *
 * @param actualDistribution - Actual training distribution from logs
 * @returns Validation result with feedback
 */
export function validatePolarizedDistribution(actualDistribution: ZoneDistribution3): {
  compliant: boolean
  issues: string[]
  recommendations: string[]
} {
  const issues: string[] = []
  const recommendations: string[] = []

  // Check Zone 1 (should be 75-85%)
  if (actualDistribution.zone1Percent < 75) {
    issues.push(`Zone 1 too low: ${actualDistribution.zone1Percent}% (target 80%)`)
    recommendations.push('Increase easy running volume - keep more sessions truly easy')
  } else if (actualDistribution.zone1Percent > 85) {
    issues.push(`Zone 1 too high: ${actualDistribution.zone1Percent}% (target 80%)`)
    recommendations.push('Add more high-intensity work - quality sessions should be challenging')
  }

  // Check Zone 2 (should be minimal, <10%)
  if (actualDistribution.zone2Percent > 10) {
    issues.push(`Too much Zone 2: ${actualDistribution.zone2Percent}% (target <5%)`)
    recommendations.push('Reduce moderate-intensity work - polarized training avoids the "grey zone"')
    recommendations.push('Make easy runs easier and hard sessions harder')
  }

  // Check Zone 3 (should be 15-20%)
  if (actualDistribution.zone3Percent < 10) {
    issues.push(`Zone 3 too low: ${actualDistribution.zone3Percent}% (target 15%)`)
    recommendations.push('Increase high-intensity volume - add more interval work')
  } else if (actualDistribution.zone3Percent > 25) {
    issues.push(`Zone 3 too high: ${actualDistribution.zone3Percent}% (target 15%)`)
    recommendations.push('Reduce high-intensity volume - risk of overtraining')
    recommendations.push('Ensure adequate easy running for recovery')
  }

  const compliant = issues.length === 0

  if (compliant) {
    recommendations.push('Training distribution follows Polarized principles well!')
  }

  return {
    compliant,
    issues,
    recommendations,
  }
}

/**
 * Generate weekly session structure for Polarized training
 *
 * @param weeklySessionCount - Number of sessions per week
 * @param phase - Training phase
 * @returns Array of session types
 */
export function generatePolarizedWeek(
  weeklySessionCount: number,
  phase: 'BASE' | 'BUILD' | 'PEAK' | 'TAPER'
): string[] {
  const sessions: string[] = []
  const config = getPolarizedConfig(weeklySessionCount)

  // Add quality sessions
  for (let i = 0; i < config.weeklyStructure.qualitySessions; i++) {
    if (phase === 'BASE') {
      sessions.push('THRESHOLD_INTERVALS')
    } else if (phase === 'BUILD') {
      sessions.push(i === 0 ? 'VO2MAX_INTERVALS' : 'THRESHOLD_INTERVALS')
    } else if (phase === 'PEAK') {
      sessions.push(i === 0 ? 'RACE_PACE_INTERVALS' : 'VO2MAX_INTERVALS')
    } else {
      // TAPER
      sessions.push('SHORT_INTERVALS')
    }
  }

  // Add long run
  sessions.push('LONG_RUN')

  // Fill remaining with easy runs
  const remainingSessions = weeklySessionCount - sessions.length
  for (let i = 0; i < remainingSessions; i++) {
    sessions.push('EASY_RUN')
  }

  return sessions
}

/**
 * Get Polarized training intensity guidelines
 *
 * @returns Intensity descriptions for each zone
 */
export function getPolarizedIntensityGuidelines(): {
  zone1: string
  zone2: string
  zone3: string
} {
  return {
    zone1: 'Conversational pace - should be able to speak in full sentences. Heart rate below LT1. RPE 2-4/10. This is "truly easy" running.',
    zone2: 'Comfortably hard - can speak in short phrases. Heart rate between LT1 and LT2. RPE 5-6/10. MINIMIZE time here in Polarized training.',
    zone3: 'Hard to very hard - limited speech. Heart rate above LT2. RPE 7-9/10. Intervals, tempo runs, race pace. These sessions should feel challenging.',
  }
}

// ============================================================================
// POLARIZED ADVANCED PROTOCOLS - Based on Seiler Research
// ============================================================================

/**
 * Polarized Training Phases
 * Determines whether to use strict 80/20 or transition to specific
 */
export type PolarizedPhase =
  | 'BASE'      // Strict 80/20, avoid Zone 2, build aerobic foundation
  | 'SPECIFIC'  // Shift to race-specific Zone 2 work (Canova integration)

/**
 * Seiler Interval Types - The research-proven protocols
 */
export type SeilerIntervalType =
  | '4x8'       // The classic: 4 × 8 min at 90-92% HRmax
  | '4x6'       // Progression: 4 × 6 min
  | '4x7'       // Progression: 4 × 7 min
  | '5x8'       // Advanced: 5 × 8 min
  | '30_15'     // Rønnestad: 3 × (13 × 30s/15s)
  | 'HILL_REPEATS' // 8-10 × 30-60s hills

/**
 * Seiler Interval Session Structure
 * These are the proven VO2max-building protocols from Seiler's research
 */
export interface SeilerIntervalSession {
  type: SeilerIntervalType
  reps: number
  workDuration: number // minutes or seconds
  restDuration: number // minutes or seconds
  restType: 'ACTIVE_JOG' | 'FULL_RECOVERY'
  intensity: string // HR or pace description
  totalWorkTime: number // minutes
  description: string
}

/**
 * Get Seiler interval session details
 * @param type - The interval type
 * @returns Complete session structure
 */
export function getSeilerInterval(type: SeilerIntervalType): SeilerIntervalSession {
  switch (type) {
    case '4x6':
      return {
        type: '4x6',
        reps: 4,
        workDuration: 6,
        restDuration: 2,
        restType: 'ACTIVE_JOG',
        intensity: '90-92% HRmax or 105-108% of Threshold Pace',
        totalWorkTime: 24,
        description: 'Seiler Progression: 4 × 6 min "isoeffort" intervals with 2 min active recovery'
      }

    case '4x7':
      return {
        type: '4x7',
        reps: 4,
        workDuration: 7,
        restDuration: 2,
        restType: 'ACTIVE_JOG',
        intensity: '90-92% HRmax or 105-108% of Threshold Pace',
        totalWorkTime: 28,
        description: 'Seiler Progression: 4 × 7 min "isoeffort" intervals with 2 min active recovery'
      }

    case '4x8':
      // THE CLASSIC - Most research-proven
      return {
        type: '4x8',
        reps: 4,
        workDuration: 8,
        restDuration: 2,
        restType: 'ACTIVE_JOG',
        intensity: '90-92% HRmax or 105-108% of Threshold Pace',
        totalWorkTime: 32,
        description: 'Seiler Classic: 4 × 8 min "isoeffort" intervals - highest sustainable intensity for full duration'
      }

    case '5x8':
      // Advanced overload
      return {
        type: '5x8',
        reps: 5,
        workDuration: 8,
        restDuration: 2,
        restType: 'ACTIVE_JOG',
        intensity: '90-92% HRmax or 105-108% of Threshold Pace',
        totalWorkTime: 40,
        description: 'Seiler Advanced: 5 × 8 min intervals - overload for advanced athletes'
      }

    case '30_15':
      // Rønnestad micro-intervals
      return {
        type: '30_15',
        reps: 39, // 3 sets × 13 reps
        workDuration: 30, // seconds
        restDuration: 15, // seconds
        restType: 'ACTIVE_JOG',
        intensity: '110-120% vVO2max for ON segments, 50% for OFF',
        totalWorkTime: 19.5,
        description: 'Rønnestad: 3 × (13 × 30s ON / 15s OFF) with 3 min rest between sets'
      }

    case 'HILL_REPEATS':
      return {
        type: 'HILL_REPEATS',
        reps: 8,
        workDuration: 0.75, // 45 seconds avg
        restDuration: 3, // Jog down + full recovery
        restType: 'FULL_RECOVERY',
        intensity: '95% effort uphill',
        totalWorkTime: 6,
        description: 'Hill Repeats: 8-10 × 30-60s max effort uphill with full recovery (jog down)'
      }
  }
}

/**
 * Select appropriate Seiler interval based on phase and week
 * Progression: 4×6 → 4×7 → 4×8 → 5×8
 * @param weekInPhase - Week number within phase (1-based)
 * @param phase - Current training phase
 * @returns Interval type
 */
export function selectSeilerInterval(
  weekInPhase: number,
  phase: 'BASE' | 'BUILD' | 'PEAK' | 'TAPER'
): SeilerIntervalType {
  if (phase === 'TAPER') {
    return '4x6' // Reduced volume, maintain intensity
  }

  if (phase === 'BASE') {
    // Build up gradually
    if (weekInPhase <= 2) return '4x6'
    if (weekInPhase <= 4) return '4x7'
    return '4x8'
  }

  if (phase === 'BUILD') {
    // Mix of classic and advanced
    if (weekInPhase % 3 === 0) return '30_15' // Every 3rd week, micro-intervals
    if (weekInPhase <= 3) return '4x8'
    return '5x8' // Advanced volume
  }

  // PEAK phase
  if (weekInPhase % 2 === 0) return 'HILL_REPEATS'
  return '4x8'
}

/**
 * Long Slow Distance (LSD) Session Structure
 * The foundation of polarized training - strict Zone 1
 */
export interface LSDSession {
  duration: number // minutes
  maxHeartRate: number // % of max HR (should be <75%)
  paceGuideline: string
  driftMonitoring: boolean // Should monitor HR drift
  description: string
}

/**
 * Generate Long Slow Distance session
 * @param phase - Training phase
 * @param weekInPhase - Week within phase for progression
 * @returns LSD session structure
 */
export function getLSDSession(
  phase: PolarizedPhase,
  weekInPhase: number
): LSDSession {
  // Progressive duration build
  const baseDuration = phase === 'BASE' ? 90 : 105
  const duration = Math.min(baseDuration + (weekInPhase * 5), 150) // Cap at 2.5 hours

  return {
    duration,
    maxHeartRate: 75, // Below LT1
    paceGuideline: 'Conversational pace - should be able to speak in full paragraphs',
    driftMonitoring: duration > 60, // Monitor drift on runs >60 min
    description: `Long Slow Distance: ${duration} min at strict Zone 1 (<75% HRmax)`
  }
}

/**
 * Calculate if HR drift indicates aerobic deficiency
 * @param firstHalfAvgHR - Average HR from first half of run
 * @param secondHalfAvgHR - Average HR from second half of run
 * @returns Drift analysis
 */
export function calculateHRDrift(
  firstHalfAvgHR: number,
  secondHalfAvgHR: number
): {
  driftPercent: number
  aerobicDeficiency: boolean
  recommendation: string
} {
  const driftPercent = ((secondHalfAvgHR - firstHalfAvgHR) / firstHalfAvgHR) * 100

  const aerobicDeficiency = driftPercent > 5.0

  const recommendation = aerobicDeficiency
    ? `HR drift of ${driftPercent.toFixed(1)}% indicates poor aerobic conditioning. Increase Zone 1 volume and reduce intensity of easy runs.`
    : `HR drift of ${driftPercent.toFixed(1)}% is acceptable. Aerobic base is solid.`

  return {
    driftPercent,
    aerobicDeficiency,
    recommendation
  }
}

/**
 * Zone 2 Creep Detection
 * Identifies when easy runs are too fast (grey zone)
 */
export interface Zone2CreepAnalysis {
  zone1Percent: number
  zone2Percent: number // Should be minimal on easy days
  zone3Percent: number
  creepDetected: boolean
  severity: 'NONE' | 'MILD' | 'MODERATE' | 'SEVERE'
  recommendation: string
}

/**
 * Analyze an "easy" run for Zone 2 creep
 * @param timeInZone1 - Minutes in Zone 1
 * @param timeInZone2 - Minutes in Zone 2 (grey zone)
 * @param timeInZone3 - Minutes in Zone 3
 * @returns Creep analysis
 */
export function detectZone2Creep(
  timeInZone1: number,
  timeInZone2: number,
  timeInZone3: number
): Zone2CreepAnalysis {
  const total = timeInZone1 + timeInZone2 + timeInZone3
  const zone1Percent = (timeInZone1 / total) * 100
  const zone2Percent = (timeInZone2 / total) * 100
  const zone3Percent = (timeInZone3 / total) * 100

  // On an "easy" day, Zone 2 should be <10%, ideally <5%
  let severity: 'NONE' | 'MILD' | 'MODERATE' | 'SEVERE' = 'NONE'
  let creepDetected = false

  if (zone2Percent > 25) {
    severity = 'SEVERE'
    creepDetected = true
  } else if (zone2Percent > 15) {
    severity = 'MODERATE'
    creepDetected = true
  } else if (zone2Percent > 10) {
    severity = 'MILD'
    creepDetected = true
  }

  const recommendation = creepDetected
    ? `Zone 2 creep detected (${zone2Percent.toFixed(1)}% in grey zone). Slow down on easy days! Target <5% Zone 2 time.`
    : `Easy run executed well - ${zone1Percent.toFixed(1)}% in Zone 1.`

  return {
    zone1Percent,
    zone2Percent,
    zone3Percent,
    creepDetected,
    severity,
    recommendation
  }
}

/**
 * Calculate session-based 80/20 distribution
 * NOTE: The 80/20 rule applies to SESSION COUNT, not time
 * @param totalSessions - Number of sessions per week
 * @returns Recommended easy and hard session counts
 */
export function calculateSessionDistribution(totalSessions: number): {
  easySessions: number
  hardSessions: number
  distribution: string
  warning?: string
} {
  if (totalSessions < 4) {
    // Low frequency - use hybrid approach
    return {
      easySessions: 2,
      hardSessions: 1,
      distribution: '67/33 (Low frequency exception)',
      warning: 'With <4 sessions/week, strict 80/20 may provide insufficient stimulus. Consider hybrid approach.'
    }
  }

  // Standard 80/20 by session count
  const hardSessions = Math.ceil(totalSessions * 0.20)
  const easySessions = totalSessions - hardSessions

  return {
    easySessions,
    hardSessions,
    distribution: `${easySessions}/${hardSessions} sessions (${Math.round(easySessions/totalSessions * 100)}/${Math.round(hardSessions/totalSessions * 100)})`
  }
}

/**
 * Generate Polarized week structure with proper Seiler protocols
 * @param weeklySessionCount - Sessions per week
 * @param phase - Training phase (BASE = strict polarized, SPECIFIC = race-specific)
 * @param weekInPhase - Week number for progression
 * @returns Complete week structure
 */
export function generatePolarizedWeekAdvanced(
  weeklySessionCount: number,
  phase: PolarizedPhase,
  weekInPhase: number
): Array<{
  dayNumber: number
  type: 'EASY' | 'LSD' | 'SEILER_INTERVALS' | 'RECOVERY' | 'SPECIFIC_TEMPO'
  session: SeilerIntervalSession | LSDSession | any
}> {
  const sessionDist = calculateSessionDistribution(weeklySessionCount)
  const schedule: Array<any> = []

  // === SUNDAY: Long Slow Distance (LSD) ===
  const lsd = getLSDSession(phase, weekInPhase)
  schedule.push({
    dayNumber: 7,
    type: 'LSD',
    session: lsd
  })

  // === TUESDAY/THURSDAY: Quality Sessions (Hard) ===
  const qualityDays = [2, 4].slice(0, sessionDist.hardSessions)

  for (let i = 0; i < qualityDays.length; i++) {
    const dayNum = qualityDays[i]

    if (phase === 'BASE') {
      // Strict polarized: Seiler intervals (Zone 3)
      const intervalType = selectSeilerInterval(weekInPhase, 'BASE')
      const interval = getSeilerInterval(intervalType)
      schedule.push({
        dayNumber: dayNum,
        type: 'SEILER_INTERVALS',
        session: interval
      })
    } else {
      // SPECIFIC phase: Mix Seiler + race-specific Zone 2 (Canova)
      if (i === 0) {
        // First quality: Still use Seiler intervals
        const interval = getSeilerInterval('4x8')
        schedule.push({
          dayNumber: dayNum,
          type: 'SEILER_INTERVALS',
          session: interval
        })
      } else {
        // Second quality: Race-specific tempo (Zone 2)
        schedule.push({
          dayNumber: dayNum,
          type: 'SPECIFIC_TEMPO',
          session: {
            duration: 30 + (weekInPhase * 2),
            intensity: 'Race pace or threshold',
            description: 'Specific tempo at race pace (Zone 2) - Canova integration'
          }
        })
      }
    }
  }

  // === MONDAY/WEDNESDAY/FRIDAY: Easy Runs ===
  const easyDays = [1, 3, 5]
  const remainingEasy = sessionDist.easySessions - 1 // -1 for LSD

  for (let i = 0; i < Math.min(remainingEasy, easyDays.length); i++) {
    schedule.push({
      dayNumber: easyDays[i],
      type: 'EASY',
      session: {
        duration: 40,
        intensity: 'Zone 1 (<75% HRmax)',
        description: 'Easy recovery run - conversational pace'
      }
    })
  }

  // === RECOVERY DAY after quality ===
  // Add explicit recovery runs after hard days
  if (sessionDist.hardSessions > 0) {
    schedule.push({
      dayNumber: 3, // Wednesday after Tuesday quality
      type: 'RECOVERY',
      session: {
        duration: 30,
        intensity: '60-70% HRmax - very slow',
        description: 'Regeneration: Very slow to flush metabolites'
      }
    })
  }

  return schedule
}
