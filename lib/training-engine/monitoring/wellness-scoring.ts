/**
 * Wellness Scoring System
 *
 * 7-question weighted questionnaire for daily wellness assessment.
 * Quick (<2 min) subjective assessment that correlates well with objective markers.
 *
 * Questionnaire:
 * 1. Sleep Quality (weight: 20%)
 * 2. Sleep Duration (weight: 15%)
 * 3. Fatigue Level (weight: 20%)
 * 4. Muscle Soreness (weight: 15%)
 * 5. Stress Level (weight: 15%)
 * 6. Mood (weight: 10%)
 * 7. Motivation to Train (weight: 5%)
 *
 * References:
 * - Hooper, S. L., & Mackinnon, L. T. (1995). Monitoring overtraining in athletes.
 * - McLean, B. D., et al. (2010). Neuromuscular, endocrine, and perceptual fatigue responses.
 *
 * @module wellness-scoring
 */

export interface WellnessResponses {
  sleepQuality: 1 | 2 | 3 | 4 | 5 // 1 = Very Poor, 5 = Excellent
  sleepDuration: number // hours (actual duration, will be scored)
  fatigueLevel: 1 | 2 | 3 | 4 | 5 // 1 = Extremely Fatigued, 5 = Fresh
  muscleSoreness: 1 | 2 | 3 | 4 | 5 // 1 = Very Sore, 5 = No Soreness
  stressLevel: 1 | 2 | 3 | 4 | 5 // 1 = Very High Stress, 5 = Very Low Stress
  mood: 1 | 2 | 3 | 4 | 5 // 1 = Very Poor, 5 = Very Good
  motivationToTrain: 1 | 2 | 3 | 4 | 5 // 1 = No Motivation, 5 = Very High Motivation
}

export interface WellnessScore {
  totalScore: number // 0-10 scale for composite readiness
  rawScore: number // 0-100 scale
  categoryScores: {
    sleepQuality: number
    sleepDuration: number
    fatigue: number
    soreness: number
    stress: number
    mood: number
    motivation: number
  }
  status: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'VERY_POOR'
  redFlags: string[]
  warnings: string[]
  recommendation: string
}

/**
 * Score sleep duration
 *
 * Optimal: 7-9 hours
 * Each hour below 7 or above 9 reduces score
 *
 * @param hours - Sleep duration in hours
 * @returns Score 0-5
 */
function scoreSleepDuration(hours: number): number {
  if (hours >= 7 && hours <= 9) {
    return 5 // Optimal
  } else if (hours >= 6 && hours < 7) {
    return 4 // Good but slightly short
  } else if (hours >= 9 && hours < 10) {
    return 4 // Good but slightly long
  } else if (hours >= 5 && hours < 6) {
    return 3 // Suboptimal
  } else if (hours >= 10 && hours < 11) {
    return 3 // Potentially compensatory sleep
  } else if (hours >= 4 && hours < 5) {
    return 2 // Poor
  } else if (hours >= 11) {
    return 2 // Excessively long (may indicate illness)
  } else {
    return 1 // Critically insufficient
  }
}

/**
 * Calculate weighted wellness score
 *
 * Weights based on research showing relative importance of factors:
 * - Sleep Quality: 20% (most important)
 * - Fatigue: 20% (direct training impact)
 * - Sleep Duration: 15%
 * - Muscle Soreness: 15%
 * - Stress: 15%
 * - Mood: 10%
 * - Motivation: 5% (least predictive)
 *
 * @param responses - Wellness questionnaire responses
 * @returns Comprehensive wellness score
 */
export function calculateWellnessScore(
  responses: WellnessResponses
): WellnessScore {
  const redFlags: string[] = []
  const warnings: string[] = []

  // Score sleep duration
  const sleepDurationScore = scoreSleepDuration(responses.sleepDuration)

  // Calculate category scores (convert 1-5 scale to 0-100)
  const categoryScores = {
    sleepQuality: ((responses.sleepQuality - 1) / 4) * 100,
    sleepDuration: ((sleepDurationScore - 1) / 4) * 100,
    fatigue: ((responses.fatigueLevel - 1) / 4) * 100,
    soreness: ((responses.muscleSoreness - 1) / 4) * 100,
    stress: ((responses.stressLevel - 1) / 4) * 100,
    mood: ((responses.mood - 1) / 4) * 100,
    motivation: ((responses.motivationToTrain - 1) / 4) * 100,
  }

  // Calculate weighted total (0-100 scale)
  const rawScore =
    categoryScores.sleepQuality * 0.2 +
    categoryScores.sleepDuration * 0.15 +
    categoryScores.fatigue * 0.2 +
    categoryScores.soreness * 0.15 +
    categoryScores.stress * 0.15 +
    categoryScores.mood * 0.1 +
    categoryScores.motivation * 0.05

  // Convert to 0-10 scale for composite readiness
  const totalScore = rawScore / 10

  // Determine status
  let status: WellnessScore['status']
  if (rawScore >= 80) {
    status = 'EXCELLENT'
  } else if (rawScore >= 65) {
    status = 'GOOD'
  } else if (rawScore >= 50) {
    status = 'FAIR'
  } else if (rawScore >= 35) {
    status = 'POOR'
  } else {
    status = 'VERY_POOR'
  }

  // Detect red flags (any response of 1)
  if (responses.sleepQuality === 1) {
    redFlags.push('Sleep quality very poor - major recovery impediment')
  }

  if (responses.sleepDuration < 5) {
    redFlags.push('Critically insufficient sleep (<5 hours) - mandatory rest or easy day')
  }

  if (responses.fatigueLevel === 1) {
    redFlags.push('Extreme fatigue - rest day strongly recommended')
  }

  if (responses.muscleSoreness === 1) {
    redFlags.push('Severe muscle soreness - high injury risk if training hard')
  }

  if (responses.stressLevel === 1) {
    redFlags.push('Very high stress - training will add to allostatic load')
  }

  // Detect warnings (any response of 2)
  if (responses.sleepQuality === 2) {
    warnings.push('Poor sleep quality - monitor closely')
  }

  if (responses.sleepDuration < 6) {
    warnings.push('Insufficient sleep (<6 hours) - reduce training intensity')
  }

  if (responses.fatigueLevel === 2) {
    warnings.push('High fatigue - consider easier day')
  }

  if (responses.muscleSoreness === 2) {
    warnings.push('High muscle soreness - avoid high-impact work')
  }

  if (responses.stressLevel === 2) {
    warnings.push('High stress level - training may be counterproductive')
  }

  if (responses.mood === 1 || responses.mood === 2) {
    warnings.push('Poor mood - may indicate overtraining or life stress')
  }

  // Generate recommendation
  const recommendation = generateWellnessRecommendation(
    status,
    redFlags.length,
    responses
  )

  return {
    totalScore: Math.round(totalScore * 10) / 10,
    rawScore: Math.round(rawScore * 10) / 10,
    categoryScores: {
      sleepQuality: Math.round(categoryScores.sleepQuality),
      sleepDuration: Math.round(categoryScores.sleepDuration),
      fatigue: Math.round(categoryScores.fatigue),
      soreness: Math.round(categoryScores.soreness),
      stress: Math.round(categoryScores.stress),
      mood: Math.round(categoryScores.mood),
      motivation: Math.round(categoryScores.motivation),
    },
    status,
    redFlags,
    warnings,
    recommendation,
  }
}

/**
 * Generate wellness-based training recommendation
 *
 * @param status - Overall wellness status
 * @param redFlagCount - Number of red flags
 * @param responses - Original responses for context
 * @returns Training recommendation string
 */
function generateWellnessRecommendation(
  status: WellnessScore['status'],
  redFlagCount: number,
  responses: WellnessResponses
): string {
  // Critical overrides
  if (redFlagCount >= 2) {
    return 'Multiple red flags - mandatory rest day. Address sleep, stress, and recovery.'
  }

  if (redFlagCount === 1) {
    if (responses.sleepDuration < 5 || responses.fatigueLevel === 1) {
      return 'Critical wellness issue - rest day or very easy active recovery only'
    }
    return 'Major wellness concern - significantly reduce training intensity or take rest day'
  }

  // Status-based recommendations
  if (status === 'EXCELLENT') {
    return 'Excellent wellness - ready for planned training'
  }

  if (status === 'GOOD') {
    if (responses.muscleSoreness <= 2) {
      return 'Good wellness overall, but muscle soreness elevated - consider easier day or different modality'
    }
    return 'Good wellness - proceed with training, monitor recovery'
  }

  if (status === 'FAIR') {
    return 'Suboptimal wellness - reduce workout intensity 15-20% or switch to easy aerobic'
  }

  if (status === 'POOR') {
    return 'Poor wellness - easy day recommended, skip all high-intensity work'
  }

  if (status === 'VERY_POOR') {
    return 'Very poor wellness - rest day or very easy active recovery only'
  }

  return 'Monitor wellness trends and adjust training accordingly'
}

/**
 * Compare wellness scores to detect trends
 *
 * @param current - Today's wellness score
 * @param recentScores - Last 7 days of wellness scores
 * @returns Trend analysis
 */
export function analyzeWellnessTrend(
  current: WellnessScore,
  recentScores: WellnessScore[]
): {
  trend: 'IMPROVING' | 'STABLE' | 'DECLINING'
  rollingAverage: number
  consecutiveDeclines: number
} {
  if (recentScores.length < 3) {
    return {
      trend: 'STABLE',
      rollingAverage: current.totalScore,
      consecutiveDeclines: 0,
    }
  }

  // Calculate 7-day rolling average
  const all = [...recentScores, current].slice(-7)
  const rollingAverage =
    all.reduce((sum, score) => sum + score.totalScore, 0) / all.length

  // Detect consecutive declines
  let consecutiveDeclines = 0
  for (let i = all.length - 1; i > 0; i--) {
    if (all[i].totalScore < all[i - 1].totalScore) {
      consecutiveDeclines++
    } else {
      break
    }
  }

  // Determine trend
  let trend: 'IMPROVING' | 'STABLE' | 'DECLINING'
  if (rollingAverage > 7.5) {
    trend = 'IMPROVING'
  } else if (rollingAverage < 6.5 || consecutiveDeclines >= 3) {
    trend = 'DECLINING'
  } else {
    trend = 'STABLE'
  }

  return {
    trend,
    rollingAverage: Math.round(rollingAverage * 10) / 10,
    consecutiveDeclines,
  }
}

/**
 * Identify the most impactful wellness issue
 *
 * Helps coaches focus on the primary recovery limiter
 *
 * @param score - Wellness score
 * @returns Primary issue and recommendation
 */
export function identifyPrimaryWellnessIssue(score: WellnessScore): {
  issue: string
  category: keyof WellnessScore['categoryScores']
  recommendation: string
} | null {
  const { categoryScores } = score

  // Find lowest scoring category
  const categories = Object.entries(categoryScores) as [
    keyof typeof categoryScores,
    number
  ][]
  const sorted = categories.sort((a, b) => a[1] - b[1])

  const [lowestCategory, lowestScore] = sorted[0]

  // Only flag if score is significantly low (<50%)
  if (lowestScore >= 50) {
    return null
  }

  const recommendations: Record<keyof typeof categoryScores, string> = {
    sleepQuality: 'Focus on sleep hygiene: dark room, cool temperature, consistent bedtime, no screens 1hr before bed',
    sleepDuration: 'Prioritize sleep duration: aim for 7-9 hours, adjust schedule if needed',
    fatigue: 'Address fatigue: ensure adequate rest between hard sessions, consider reducing training volume',
    soreness: 'Manage muscle soreness: foam rolling, easy active recovery, ensure adequate protein intake',
    stress: 'Reduce stress: consider meditation, time management, reducing non-training stressors',
    mood: 'Improve mood: social connection, outdoor activity, consider mental health support if persistent',
    motivation: 'Restore motivation: vary training, set new goals, take mental break if needed',
  }

  const issueNames: Record<keyof typeof categoryScores, string> = {
    sleepQuality: 'Sleep Quality',
    sleepDuration: 'Sleep Duration',
    fatigue: 'Fatigue Level',
    soreness: 'Muscle Soreness',
    stress: 'Stress Level',
    mood: 'Mood',
    motivation: 'Motivation',
  }

  return {
    issue: issueNames[lowestCategory],
    category: lowestCategory,
    recommendation: recommendations[lowestCategory],
  }
}
