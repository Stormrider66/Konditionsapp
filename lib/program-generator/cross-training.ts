/**
 * Cross-Training Equivalencies
 *
 * Convert cross-training activities to running equivalents for:
 * - Deep Water Running (DWR/Aqua Jogging)
 * - Cycling (indoor and outdoor)
 * - Elliptical
 * - Swimming
 * - Rowing
 *
 * Used for:
 * - Injury management (maintaining fitness while recovering)
 * - Active recovery (low-impact alternatives)
 * - Training variety (preventing burnout)
 * - TSS/TRIMP calculations (tracking total training load)
 *
 * Equivalency factors based on:
 * - Cardiovascular demand
 * - Biomechanical similarity to running
 * - Research on cross-training effectiveness
 */

export type CrossTrainingType =
  | 'DWR' // Deep Water Running
  | 'POOL_RUNNING' // Pool running (same as DWR)
  | 'CYCLING_INDOOR'
  | 'CYCLING_OUTDOOR'
  | 'ELLIPTICAL'
  | 'SWIMMING'
  | 'ROWING'
  | 'STAIR_CLIMBER'
  | 'CROSS_COUNTRY_SKIING'
  | 'UPHILL_TREADMILL' // Walking uphill

export interface CrossTrainingSession {
  type: CrossTrainingType
  durationMinutes: number
  intensityHR?: number // Optional heart rate
  intensityPerceivedEffort?: number // 1-10 RPE
  distanceKm?: number // For cycling/swimming
  notes?: string
}

export interface RunningEquivalent {
  equivalentRunningMinutes: number
  equivalentRunningKm: number
  tssEquivalent: number // Training Stress Score equivalent
  conversionFactor: number // Multiplier used
  impactReduction: string // How much impact reduction vs running
  cardiovascularBenefit: string // CV fitness benefit
  musculoskeletalBenefit: string // Running-specific strength benefit
}

/**
 * Get cross-training conversion factor
 *
 * Factors represent "running equivalent minutes"
 * Example: 60 min cycling = 60 * 0.65 = 39 min running equivalent
 */
export function getCrossTrainingFactor(type: CrossTrainingType): number {
  const factors: Record<CrossTrainingType, number> = {
    DWR: 0.85, // Very close to running biomechanics
    POOL_RUNNING: 0.85, // Same as DWR
    CYCLING_INDOOR: 0.65, // Good CV, but different muscle groups
    CYCLING_OUTDOOR: 0.70, // Slightly higher due to variable terrain
    ELLIPTICAL: 0.75, // Good running simulation
    SWIMMING: 0.60, // Excellent CV, very different biomechanics
    ROWING: 0.70, // Great CV and posterior chain
    STAIR_CLIMBER: 0.80, // Similar muscles, high CV demand
    CROSS_COUNTRY_SKIING: 0.75, // Excellent full-body CV
    UPHILL_TREADMILL: 0.90, // Very close to running, reduced impact
  }

  return factors[type]
}

/**
 * Calculate running equivalent for cross-training session
 */
export function calculateRunningEquivalent(
  session: CrossTrainingSession
): RunningEquivalent {
  const conversionFactor = getCrossTrainingFactor(session.type)

  // Base calculation
  const equivalentRunningMinutes = session.durationMinutes * conversionFactor

  // Estimate distance (assuming moderate pace ~6:00/km = 10 km/h)
  const equivalentRunningKm = (equivalentRunningMinutes / 60) * 10

  // TSS equivalent (based on duration and intensity)
  let tssEquivalent = equivalentRunningMinutes * 0.8 // Base TSS

  // Adjust TSS based on perceived effort if available
  if (session.intensityPerceivedEffort) {
    const effortMultiplier = session.intensityPerceivedEffort / 5 // Normalize to 1.0 at RPE 5
    tssEquivalent *= effortMultiplier
  }

  // Get activity-specific benefits
  const benefits = getCrossTrainingBenefits(session.type)

  return {
    equivalentRunningMinutes,
    equivalentRunningKm,
    tssEquivalent: Math.round(tssEquivalent),
    conversionFactor,
    ...benefits,
  }
}

/**
 * Get cross-training benefits and characteristics
 */
function getCrossTrainingBenefits(type: CrossTrainingType): {
  impactReduction: string
  cardiovascularBenefit: string
  musculoskeletalBenefit: string
} {
  const benefits: Record<
    CrossTrainingType,
    {
      impactReduction: string
      cardiovascularBenefit: string
      musculoskeletalBenefit: string
    }
  > = {
    DWR: {
      impactReduction: '100% - Zero impact',
      cardiovascularBenefit: 'Excellent - Nearly identical to running',
      musculoskeletalBenefit: 'Excellent - Maintains running-specific muscles',
    },
    POOL_RUNNING: {
      impactReduction: '100% - Zero impact',
      cardiovascularBenefit: 'Excellent - Nearly identical to running',
      musculoskeletalBenefit: 'Excellent - Maintains running-specific muscles',
    },
    CYCLING_INDOOR: {
      impactReduction: '100% - Zero impact',
      cardiovascularBenefit: 'Very Good - High aerobic stimulus',
      musculoskeletalBenefit: 'Moderate - Different muscle emphasis (quads)',
    },
    CYCLING_OUTDOOR: {
      impactReduction: '100% - Zero impact',
      cardiovascularBenefit: 'Excellent - Variable terrain adds stimulus',
      musculoskeletalBenefit: 'Good - Outdoor variability helps',
    },
    ELLIPTICAL: {
      impactReduction: '90% - Very low impact',
      cardiovascularBenefit: 'Very Good - Good running simulation',
      musculoskeletalBenefit: 'Good - Similar movement pattern',
    },
    SWIMMING: {
      impactReduction: '100% - Zero impact',
      cardiovascularBenefit: 'Excellent - Full-body aerobic workout',
      musculoskeletalBenefit: 'Low - Very different movement pattern',
    },
    ROWING: {
      impactReduction: '100% - Zero impact',
      cardiovascularBenefit: 'Excellent - High intensity capacity',
      musculoskeletalBenefit: 'Good - Strengthens posterior chain',
    },
    STAIR_CLIMBER: {
      impactReduction: '70% - Low impact',
      cardiovascularBenefit: 'Excellent - High aerobic demand',
      musculoskeletalBenefit: 'Very Good - Similar to uphill running',
    },
    CROSS_COUNTRY_SKIING: {
      impactReduction: '95% - Very low impact',
      cardiovascularBenefit: 'Excellent - Full-body aerobic',
      musculoskeletalBenefit: 'Good - Complementary muscle groups',
    },
    UPHILL_TREADMILL: {
      impactReduction: '50% - Moderate impact reduction',
      cardiovascularBenefit: 'Excellent - Nearly identical to running',
      musculoskeletalBenefit: 'Excellent - Strengthens running muscles',
    },
  }

  return benefits[type]
}

/**
 * Get recommended cross-training activities by injury type
 */
export function getCrossTrainingByInjury(injuryType: string): {
  recommended: CrossTrainingType[]
  avoid: CrossTrainingType[]
  notes: string
} {
  const recommendations: Record<
    string,
    {
      recommended: CrossTrainingType[]
      avoid: CrossTrainingType[]
      notes: string
    }
  > = {
    'stress-fracture': {
      recommended: ['DWR', 'POOL_RUNNING', 'SWIMMING', 'CYCLING_INDOOR'],
      avoid: ['ELLIPTICAL', 'STAIR_CLIMBER', 'UPHILL_TREADMILL'],
      notes: 'Zero impact activities only until healed',
    },
    'plantar-fasciitis': {
      recommended: ['DWR', 'CYCLING_INDOOR', 'SWIMMING'],
      avoid: ['STAIR_CLIMBER', 'UPHILL_TREADMILL'],
      notes: 'Avoid activities with forefoot loading',
    },
    'achilles-tendinopathy': {
      recommended: ['CYCLING_INDOOR', 'SWIMMING', 'ROWING'],
      avoid: ['DWR', 'STAIR_CLIMBER', 'UPHILL_TREADMILL'],
      notes: 'Avoid calf-loading activities',
    },
    'knee-pain': {
      recommended: ['DWR', 'SWIMMING', 'CYCLING_INDOOR'],
      avoid: ['STAIR_CLIMBER', 'UPHILL_TREADMILL'],
      notes: 'Adjust cycling seat height if knee pain persists',
    },
    'it-band-syndrome': {
      recommended: ['DWR', 'SWIMMING', 'ELLIPTICAL'],
      avoid: ['CYCLING_OUTDOOR', 'STAIR_CLIMBER'],
      notes: 'Pool running with good form, avoid hip adduction',
    },
    'hip-flexor-strain': {
      recommended: ['SWIMMING', 'UPHILL_TREADMILL'],
      avoid: ['DWR', 'CYCLING_INDOOR', 'STAIR_CLIMBER'],
      notes: 'Avoid activities with hip flexion',
    },
    'general-fatigue': {
      recommended: ['SWIMMING', 'ELLIPTICAL', 'CYCLING_INDOOR'],
      avoid: [],
      notes: 'Low-impact activities for active recovery',
    },
  }

  return (
    recommendations[injuryType] || {
      recommended: ['DWR', 'CYCLING_INDOOR', 'SWIMMING'],
      avoid: [],
      notes: 'Consult healthcare provider for injury-specific guidance',
    }
  )
}

/**
 * Weekly cross-training volume recommendations
 */
export function getCrossTrainingVolumeRecommendations(
  weeklyRunningMinutes: number,
  injuryStatus: 'healthy' | 'minor' | 'moderate' | 'severe'
): {
  maxCrossTrainingMinutes: number
  minRunningMinutes: number
  maxCrossTrainingPercentage: number
  guidance: string
} {
  // Healthy athletes: max 20% cross-training
  // Injured athletes: up to 100% cross-training

  const recommendations = {
    healthy: {
      maxPercentage: 0.2, // 20% max
      minRunning: weeklyRunningMinutes * 0.8,
      guidance: 'Cross-training for variety and recovery, maintain running volume',
    },
    minor: {
      maxPercentage: 0.4, // 40% max
      minRunning: weeklyRunningMinutes * 0.6,
      guidance: 'Increase cross-training to reduce impact while maintaining fitness',
    },
    moderate: {
      maxPercentage: 0.7, // 70% max
      minRunning: weeklyRunningMinutes * 0.3,
      guidance: 'Primarily cross-training with limited running to manage injury',
    },
    severe: {
      maxPercentage: 1.0, // 100% cross-training
      minRunning: 0,
      guidance: 'Complete substitution with zero-impact cross-training until healed',
    },
  }

  const rec = recommendations[injuryStatus]

  return {
    maxCrossTrainingMinutes: Math.round(weeklyRunningMinutes * rec.maxPercentage),
    minRunningMinutes: Math.round(rec.minRunning),
    maxCrossTrainingPercentage: rec.maxPercentage * 100,
    guidance: rec.guidance,
  }
}

/**
 * Create cross-training workout prescription
 */
export function createCrossTrainingWorkout(
  type: CrossTrainingType,
  runningWorkoutMinutes: number,
  runningIntensity: 'easy' | 'moderate' | 'hard'
): {
  durationMinutes: number
  intensityGuidance: string
  hrZoneEquivalent: string
  notes: string
} {
  const conversionFactor = getCrossTrainingFactor(type)

  // Convert running minutes to cross-training minutes (inverse of conversion)
  const durationMinutes = Math.round(runningWorkoutMinutes / conversionFactor)

  // Intensity guidance by type
  const intensityMap = {
    easy: {
      hr: '60-75% max HR',
      guidance: 'Conversational pace, relaxed effort',
    },
    moderate: {
      hr: '75-85% max HR',
      guidance: 'Comfortably hard, sustained effort',
    },
    hard: {
      hr: '85-95% max HR',
      guidance: 'High effort, challenging to maintain',
    },
  }

  const intensity = intensityMap[runningIntensity]

  let notes = ''
  if (type === 'DWR' || type === 'POOL_RUNNING') {
    notes = 'Maintain running form in deep water. Use aqua jogger belt for support.'
  } else if (type === 'CYCLING_INDOOR' || type === 'CYCLING_OUTDOOR') {
    notes = 'Match HR zones. Higher cadence (90+ rpm) better mimics running.'
  } else if (type === 'ELLIPTICAL') {
    notes = 'Use zero or minimal incline. Match running cadence (~180 steps/min).'
  } else if (type === 'SWIMMING') {
    notes = 'Freestyle or mixed strokes. Focus on sustained aerobic effort.'
  }

  return {
    durationMinutes,
    intensityGuidance: intensity.guidance,
    hrZoneEquivalent: intensity.hr,
    notes,
  }
}
