import { logger } from '@/lib/logger'
import type { Test } from '@/types'
import type { AthleteLevelFromVLT2, ExperienceLevel, MethodologyPaces } from './types'
import {
  classifyAthleteByVLT2,
  experienceLevelToAthleteLevel,
  experienceLevelToEstimatedVLT2,
  extractLT2FromTest,
  extractRunningEconomy,
  extractVLT2FromTest,
  extractVO2maxFromTest,
  calculateRacePacesFromVLT2,
  calculateVVO2max,
  vo2maxToVdot,
} from './physiology'
import { calculateVdotFromRace, estimateTrainingPaces, formatPaceMinKm } from './training-paces'
import {
  calculateVDOT as calculateVDOTDaniels,
  getTrainingPaces as getTrainingPacesDaniels,
} from '@/lib/training-engine/calculations/vdot'

export function calculateMethodologyPaces(
  methodology: string,
  test?: Test,
  experienceLevel?: ExperienceLevel | 'beginner',
  currentWeeklyVolume?: number,
  recentRaceDistance?: string,
  recentRaceTime?: string,
  goalMarathonPaceKmh?: number
): MethodologyPaces {
  logger.debug('[calculateMethodologyPaces] vLT2-PRIMARY PACE CALCULATION starting')

  // =========================================================================
  // PRIORITY 1: vLT2 from D-max - THE PRIMARY ANCHOR
  // =========================================================================
  const { vLT2Kmh, lt2Lactate, lt2HR, hasLactateTest } = extractVLT2FromTest(test)

  // =========================================================================
  // PRIORITY 2: vVO2max from VO2max + Running Economy - For interval pacing
  // =========================================================================
  const { vo2max, hasLabTest } = extractVO2maxFromTest(test)
  const { economyCr, hasEconomy } = extractRunningEconomy(test)

  let vVO2maxKmh: number | null = null
  if (vo2max && economyCr) {
    vVO2maxKmh = calculateVVO2max(vo2max, economyCr)
  }

  // =========================================================================
  // PRIORITY 3: Race time VDOT - For validation/cross-check
  // =========================================================================
  let vdot: number | null = null
  if (recentRaceDistance && recentRaceTime && recentRaceDistance !== 'NONE') {
    vdot = calculateVdotFromRace(recentRaceDistance, recentRaceTime)
    if (vdot) {
      logger.debug('[calculateMethodologyPaces] Race VDOT calculated', { vdot: vdot.toFixed(1), purpose: 'validation' })
    }
  }

  // =========================================================================
  // DETERMINE PRIMARY DATA SOURCE AND vLT2
  // =========================================================================
  let primaryVLT2Kmh: number
  let athleteLevel: AthleteLevelFromVLT2
  let dataSource: 'VLT2_DMAX' | 'VVO2MAX' | 'RACE_TIME' | 'ESTIMATION'

  if (hasLactateTest && vLT2Kmh) {
    // PRIORITY 1: Use D-max vLT2 as primary anchor
    primaryVLT2Kmh = vLT2Kmh
    dataSource = 'VLT2_DMAX'
    logger.debug('[calculateMethodologyPaces] PRIMARY ANCHOR: vLT2 from D-max', {
      primaryVLT2Kmh: primaryVLT2Kmh.toFixed(2),
      paceMinKm: formatPaceMinKm(primaryVLT2Kmh),
      note: 'This already integrates running economy'
    })
  } else if (vVO2maxKmh && vo2max) {
    // PRIORITY 2: Estimate vLT2 from vVO2max
    // vLT2 ≈ 85-90% of vVO2max for trained runners
    const estimatedVLT2Percent = experienceLevel === 'advanced' ? 0.90 :
                                  experienceLevel === 'intermediate' ? 0.87 : 0.85
    primaryVLT2Kmh = vVO2maxKmh * estimatedVLT2Percent
    dataSource = 'VVO2MAX'
    logger.debug('[calculateMethodologyPaces] SECONDARY: vLT2 estimated from vVO2max', {
      primaryVLT2Kmh: primaryVLT2Kmh.toFixed(2),
      vVO2maxKmh: vVO2maxKmh.toFixed(2),
      estimatedVLT2Percent: (estimatedVLT2Percent * 100).toFixed(0)
    })
  } else if (vdot) {
    // PRIORITY 3: Use race VDOT to estimate vLT2
    const danielsPaces = getTrainingPacesDaniels(vdot)
    primaryVLT2Kmh = danielsPaces.threshold.kmh
    dataSource = 'RACE_TIME'
    logger.debug('[calculateMethodologyPaces] TERTIARY: vLT2 from race VDOT', { primaryVLT2Kmh: primaryVLT2Kmh.toFixed(2) })
  } else {
    // PRIORITY 4: Estimate from experience level
    const estimatedPaces = estimateTrainingPaces(
      experienceLevel || 'intermediate',
      currentWeeklyVolume,
      recentRaceDistance,
      recentRaceTime
    )
    primaryVLT2Kmh = estimatedPaces.thresholdPaceKmh
    dataSource = 'ESTIMATION'
    logger.debug('[calculateMethodologyPaces] FALLBACK: vLT2 from experience estimation', {
      primaryVLT2Kmh: primaryVLT2Kmh.toFixed(2),
      warning: 'No lactate test data - recommend testing for accurate paces'
    })
  }

  // Classify athlete by vLT2 speed
  athleteLevel = classifyAthleteByVLT2(primaryVLT2Kmh)

  // Calculate race pace predictions from vLT2
  const racePaces = calculateRacePacesFromVLT2(primaryVLT2Kmh, athleteLevel)

  // Calculate easy pace (70-75% of vLT2)
  const easyPaceKmh = primaryVLT2Kmh * 0.72

  // Calculate interval pace from vVO2max if available, otherwise estimate
  let intervalPaceKmh: number
  let repetitionPaceKmh: number

  if (vVO2maxKmh) {
    // Use actual vVO2max for interval pacing
    intervalPaceKmh = vVO2maxKmh * 0.98  // ~98-100% of vVO2max
    repetitionPaceKmh = vVO2maxKmh * 1.05  // ~105% of vVO2max
    logger.debug('[calculateMethodologyPaces] Interval paces from vVO2max', {
      vVO2maxKmh: vVO2maxKmh.toFixed(2),
      intervalPaceKmh: intervalPaceKmh.toFixed(2),
      intervalPaceMinKm: formatPaceMinKm(intervalPaceKmh),
      repetitionPaceKmh: repetitionPaceKmh.toFixed(2),
      repetitionPaceMinKm: formatPaceMinKm(repetitionPaceKmh)
    })
  } else {
    // Estimate from vLT2 (vVO2max ≈ vLT2 / 0.87 for intermediate)
    const estimatedVVO2max = primaryVLT2Kmh / 0.87
    intervalPaceKmh = estimatedVVO2max * 0.98
    repetitionPaceKmh = estimatedVVO2max * 1.05
    logger.debug('[calculateMethodologyPaces] Interval paces estimated (no vVO2max data)', {
      intervalPaceKmh: intervalPaceKmh.toFixed(2),
      intervalPaceMinKm: formatPaceMinKm(intervalPaceKmh),
      repetitionPaceKmh: repetitionPaceKmh.toFixed(2),
      repetitionPaceMinKm: formatPaceMinKm(repetitionPaceKmh)
    })
  }

  const normalizedMethodology = methodology?.toUpperCase() || 'POLARIZED'

  // =========================================================================
  // NORWEGIAN METHODOLOGY - Sub-threshold pacing from vLT2
  // =========================================================================
  if (normalizedMethodology === 'NORWEGIAN_SINGLE' || normalizedMethodology === 'NORWEGIAN_DOUBLES') {
    // Norwegian sub-threshold: Train 0.3-0.5 mmol/L BELOW LT2 (not AT it)
    // This typically translates to 3-5% slower than LT2 pace
    const subThresholdPaceKmh = primaryVLT2Kmh * 0.97

    // Norwegian Doubles AM/PM differentiation
    const norwegianAmPaceKmh = primaryVLT2Kmh * 0.94  // ~6% slower (2-3 mmol/L)
    const norwegianPmPaceKmh = primaryVLT2Kmh * 0.97  // ~3% slower (3-4 mmol/L)

    logger.debug(`[${normalizedMethodology}] Training paces from vLT2`, {
      methodology: normalizedMethodology,
      primaryVLT2Kmh: primaryVLT2Kmh.toFixed(1),
      dataSource,
      paces: {
        vLT2: { pace: formatPaceMinKm(primaryVLT2Kmh), source: dataSource === 'VLT2_DMAX' ? 'D-max' : dataSource },
        subThreshold: { pace: formatPaceMinKm(subThresholdPaceKmh), percentVLT2: 97 },
        ...(normalizedMethodology === 'NORWEGIAN_DOUBLES' && {
          amSession: { pace: formatPaceMinKm(norwegianAmPaceKmh), percentVLT2: 94 },
          pmSession: { pace: formatPaceMinKm(norwegianPmPaceKmh), percentVLT2: 97 }
        }),
        easy: { pace: formatPaceMinKm(easyPaceKmh), percentVLT2: 72 }
      }
    })

    return {
      methodology: 'NORWEGIAN',
      vLT2Kmh: primaryVLT2Kmh,
      athleteLevel,
      marathonPaceKmh: racePaces.vMarathonKmh,
      easyPaceKmh,
      thresholdPaceKmh: primaryVLT2Kmh,
      subThresholdPaceKmh,
      norwegianAmPaceKmh,
      norwegianPmPaceKmh,
      intervalPaceKmh,
      repetitionPaceKmh,
      vVO2maxKmh: vVO2maxKmh || undefined,
      predicted5kPaceKmh: racePaces.v5kKmh,
      predicted10kPaceKmh: racePaces.v10kKmh,
      predictedHalfMarathonPaceKmh: racePaces.vHalfMarathonKmh,
      predictedMarathonPaceKmh: racePaces.vMarathonKmh,
      vdot,
      vo2max,
      runningEconomy: economyCr,
      lt2SpeedKmh: primaryVLT2Kmh,
      hasLabTestData: hasLabTest && hasEconomy,
      hasLactateTestData: hasLactateTest,
      dataSource,
    }
  }

  // =========================================================================
  // CANOVA METHODOLOGY - Marathon Pace-based zones (from vLT2-predicted MP)
  // =========================================================================
  if (normalizedMethodology === 'CANOVA') {
    // Use vLT2-predicted marathon pace OR goal pace
    const mpKmh = goalMarathonPaceKmh || racePaces.vMarathonKmh

    // Canova zones as % of Marathon Pace
    const canovaRegenerationKmh = mpKmh * 0.65
    const canovaFundamentalKmh = mpKmh * 0.80
    const canovaGeneralEnduranceKmh = mpKmh * 0.875  // Active recovery!
    const canovaSpecialEnduranceKmh = mpKmh * 0.925
    const canovaSpecificKmh = mpKmh
    const canovaSpecialSpeedKmh = mpKmh * 1.075

    logger.debug('[CANOVA] Training paces from vLT2', {
      primaryVLT2Kmh: primaryVLT2Kmh.toFixed(1),
      mpKmh: mpKmh.toFixed(1),
      paces: {
        marathonPace: { pace: formatPaceMinKm(mpKmh), percentMP: 100 },
        regeneration: { pace: formatPaceMinKm(canovaRegenerationKmh), percentMP: 65 },
        fundamental: { pace: formatPaceMinKm(canovaFundamentalKmh), percentMP: 80 },
        generalEndurance: { pace: formatPaceMinKm(canovaGeneralEnduranceKmh), percentMP: 87.5, note: 'active recovery' },
        specialEndurance: { pace: formatPaceMinKm(canovaSpecialEnduranceKmh), percentMP: 92.5 },
        specific: { pace: formatPaceMinKm(canovaSpecificKmh), percentMP: 100 },
        specialSpeed: { pace: formatPaceMinKm(canovaSpecialSpeedKmh), percentMP: 107.5 }
      }
    })

    return {
      methodology: 'CANOVA',
      vLT2Kmh: primaryVLT2Kmh,
      athleteLevel,
      marathonPaceKmh: mpKmh,
      easyPaceKmh: canovaRegenerationKmh,
      thresholdPaceKmh: primaryVLT2Kmh,
      canovaRegenerationKmh,
      canovaFundamentalKmh,
      canovaGeneralEnduranceKmh,
      canovaSpecialEnduranceKmh,
      canovaSpecificKmh,
      canovaSpecialSpeedKmh,
      intervalPaceKmh,
      repetitionPaceKmh,
      vVO2maxKmh: vVO2maxKmh || undefined,
      predicted5kPaceKmh: racePaces.v5kKmh,
      predicted10kPaceKmh: racePaces.v10kKmh,
      predictedHalfMarathonPaceKmh: racePaces.vHalfMarathonKmh,
      predictedMarathonPaceKmh: racePaces.vMarathonKmh,
      vdot,
      vo2max,
      runningEconomy: economyCr,
      lt2SpeedKmh: primaryVLT2Kmh,
      hasLabTestData: hasLabTest && hasEconomy,
      hasLactateTestData: hasLactateTest,
      dataSource,
    }
  }

  // =========================================================================
  // DANIELS/POLARIZED/PYRAMIDAL - vLT2-based pacing (default)
  // =========================================================================
  logger.debug(`[${normalizedMethodology}] Training paces from vLT2`, {
    methodology: normalizedMethodology,
    primaryVLT2Kmh: primaryVLT2Kmh.toFixed(1),
    dataSource,
    paces: {
      vLT2: { pace: formatPaceMinKm(primaryVLT2Kmh), source: dataSource === 'VLT2_DMAX' ? 'D-max' : dataSource },
      easy: { pace: formatPaceMinKm(easyPaceKmh), percentVLT2: 72 },
      marathon: { pace: formatPaceMinKm(racePaces.vMarathonKmh), source: 'vLT2 coefficients' },
      threshold: { pace: formatPaceMinKm(primaryVLT2Kmh), note: '= vLT2' },
      interval: { pace: formatPaceMinKm(intervalPaceKmh) },
      repetition: { pace: formatPaceMinKm(repetitionPaceKmh) }
    }
  })

  return {
    methodology: 'DANIELS',
    vLT2Kmh: primaryVLT2Kmh,
    athleteLevel,
    marathonPaceKmh: racePaces.vMarathonKmh,
    easyPaceKmh,
    thresholdPaceKmh: primaryVLT2Kmh,
    intervalPaceKmh,
    repetitionPaceKmh,
    vVO2maxKmh: vVO2maxKmh || undefined,
    predicted5kPaceKmh: racePaces.v5kKmh,
    predicted10kPaceKmh: racePaces.v10kKmh,
    predictedHalfMarathonPaceKmh: racePaces.vHalfMarathonKmh,
    predictedMarathonPaceKmh: racePaces.vMarathonKmh,
    vdot,
    vo2max,
    runningEconomy: economyCr,
    lt2SpeedKmh: primaryVLT2Kmh,
    hasLabTestData: hasLabTest && hasEconomy,
    hasLactateTestData: hasLactateTest,
    dataSource,
  }
}

