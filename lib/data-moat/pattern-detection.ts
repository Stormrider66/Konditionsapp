/**
 * Pattern Detection Algorithm
 *
 * Data Moat Phase 3: Cross-Athlete Intelligence
 * Analyzes anonymized training data across athletes to discover
 * patterns that correlate with success.
 */

import { prisma } from '@/lib/prisma'
import { PatternConfidence } from '@prisma/client'

// Types
export interface DetectedPattern {
  name: string
  description: string
  patternType: 'TRAINING_SEQUENCE' | 'VOLUME_PROGRESSION' | 'INTENSITY_DISTRIBUTION' | 'RECOVERY_PATTERN' | 'PERIODIZATION'
  sport: string
  goalType: string
  conditions: Record<string, unknown>
  expectedOutcome: string
  sampleSize: number
  successRate: number
  confidence: PatternConfidence
  averageImprovement: number
  insight: string
}

export interface PatternMatchResult {
  patternId: string
  patternName: string
  matchScore: number // 0-1
  expectedOutcome: string
  confidence: PatternConfidence
  recommendations: string[]
}

/**
 * Main pattern detection function - discovers patterns from training outcomes.
 */
export async function detectPatterns(options: {
  sport?: string
  minSampleSize?: number
  minSuccessRate?: number
}): Promise<DetectedPattern[]> {
  const { sport, minSampleSize = 10, minSuccessRate = 0.6 } = options

  const patterns: DetectedPattern[] = []

  // 1. Analyze volume progression patterns
  const volumePatterns = await analyzeVolumeProgressionPatterns(sport, minSampleSize, minSuccessRate)
  patterns.push(...volumePatterns)

  // 2. Analyze intensity distribution patterns
  const intensityPatterns = await analyzeIntensityDistributionPatterns(sport, minSampleSize, minSuccessRate)
  patterns.push(...intensityPatterns)

  // 3. Analyze periodization patterns
  const periodizationPatterns = await analyzePeriodizationPatterns(sport, minSampleSize, minSuccessRate)
  patterns.push(...periodizationPatterns)

  // 4. Analyze recovery patterns
  const recoveryPatterns = await analyzeRecoveryPatterns(sport, minSampleSize, minSuccessRate)
  patterns.push(...recoveryPatterns)

  return patterns
}

/**
 * Analyze volume progression patterns from successful training periods.
 */
async function analyzeVolumeProgressionPatterns(
  sport: string | undefined,
  minSampleSize: number,
  minSuccessRate: number
): Promise<DetectedPattern[]> {
  const patterns: DetectedPattern[] = []

  // Get successful outcomes with fingerprints
  const outcomes = await prisma.trainingPeriodOutcome.findMany({
    where: {
      outcomeClass: { in: ['EXCEEDED_GOALS', 'MET_GOALS'] },
      fingerprint: { isNot: null },
      ...(sport ? { athlete: { sportProfile: { is: { primarySport: { equals: sport as import('@prisma/client').SportType } } } } } : {}),
    },
    include: {
      fingerprint: true,
      athlete: {
        include: {
          sportProfile: true,
        },
      },
    },
  })

  if (outcomes.length < minSampleSize) return patterns

  // Group by volume progression type
  const volumeGroups: Record<string, typeof outcomes> = {
    'gradual_increase': [],
    'block_periodization': [],
    'consistent': [],
    'aggressive_increase': [],
  }

  for (const outcome of outcomes) {
    const fp = outcome.fingerprint
    if (!fp) continue

    // Derive progression type from periodizationType and progressionRate
    const progressionType = deriveProgressionType(fp.periodizationType, fp.progressionRate)

    if (progressionType && progressionType in volumeGroups) {
      volumeGroups[progressionType].push(outcome)
    }
  }

  // Analyze each group
  for (const [progressionType, group] of Object.entries(volumeGroups)) {
    if (group.length < minSampleSize) continue

    const totalWithType = await prisma.trainingPeriodOutcome.count({
      where: {
        fingerprint: {
          periodizationType: progressionType === 'block_periodization' ? 'BLOCK' : progressionType.toUpperCase(),
        },
      },
    })

    const successRate = group.length / Math.max(totalWithType, group.length)
    if (successRate < minSuccessRate) continue

    const avgImprovement = calculateAverageImprovement(group)
    const confidence = calculateConfidence(group.length, successRate)
    const sportValue = determineMostCommonSport(group)

    patterns.push({
      name: `${formatProgressionType(progressionType)} Volume Progression`,
      description: `Athletes who follow a ${progressionType.replace('_', ' ')} volume progression pattern`,
      patternType: 'VOLUME_PROGRESSION',
      sport: sportValue,
      goalType: 'ENDURANCE_PERFORMANCE',
      conditions: {
        progressionType,
        minWeeks: 4,
      },
      expectedOutcome: 'Higher probability of meeting or exceeding training goals',
      sampleSize: group.length,
      successRate,
      confidence,
      averageImprovement: avgImprovement,
      insight: generateVolumeInsight(progressionType, successRate, avgImprovement),
    })
  }

  return patterns
}

/**
 * Analyze intensity distribution patterns (polarized, threshold-focused, etc.)
 */
async function analyzeIntensityDistributionPatterns(
  sport: string | undefined,
  minSampleSize: number,
  minSuccessRate: number
): Promise<DetectedPattern[]> {
  const patterns: DetectedPattern[] = []

  const outcomes = await prisma.trainingPeriodOutcome.findMany({
    where: {
      fingerprint: { isNot: null },
      ...(sport ? { athlete: { sportProfile: { is: { primarySport: { equals: sport as import('@prisma/client').SportType } } } } } : {}),
    },
    include: {
      fingerprint: true,
      athlete: {
        include: { sportProfile: true },
      },
    },
  })

  if (outcomes.length < minSampleSize) return patterns

  // Analyze zone distribution patterns
  const distributionGroups: Record<string, { success: typeof outcomes; total: typeof outcomes }> = {
    'polarized_80_20': { success: [], total: [] },
    'pyramidal': { success: [], total: [] },
    'threshold_focused': { success: [], total: [] },
    'high_intensity': { success: [], total: [] },
  }

  for (const outcome of outcomes) {
    const fp = outcome.fingerprint
    if (!fp) continue

    // Build zone distribution from explicit fields
    const zoneDistribution = {
      zone1: fp.zone1Percent,
      zone2: fp.zone2Percent,
      zone3: fp.zone3Percent,
      zone4: fp.zone4Percent,
      zone5: fp.zone5Percent,
    }

    // Classify the distribution pattern
    const distributionType = classifyZoneDistribution(zoneDistribution)
    if (distributionType && distributionType in distributionGroups) {
      distributionGroups[distributionType].total.push(outcome)
      if (outcome.outcomeClass === 'EXCEEDED_GOALS' || outcome.outcomeClass === 'MET_GOALS') {
        distributionGroups[distributionType].success.push(outcome)
      }
    }
  }

  // Create patterns for each distribution type
  for (const [distType, group] of Object.entries(distributionGroups)) {
    if (group.total.length < minSampleSize) continue

    const successRate = group.success.length / group.total.length
    if (successRate < minSuccessRate) continue

    const avgImprovement = calculateAverageImprovement(group.success)
    const confidence = calculateConfidence(group.success.length, successRate)
    const sportValue = determineMostCommonSport(group.total)

    patterns.push({
      name: `${formatDistributionType(distType)} Training Distribution`,
      description: `Athletes using a ${distType.replace(/_/g, ' ')} intensity distribution`,
      patternType: 'INTENSITY_DISTRIBUTION',
      sport: sportValue,
      goalType: 'ENDURANCE_PERFORMANCE',
      conditions: {
        distributionType: distType,
        zoneRanges: getZoneRangesForType(distType),
      },
      expectedOutcome: 'Improved performance outcomes',
      sampleSize: group.success.length,
      successRate,
      confidence,
      averageImprovement: avgImprovement,
      insight: generateIntensityInsight(distType, successRate, sportValue),
    })
  }

  return patterns
}

/**
 * Analyze periodization patterns from successful programs.
 */
async function analyzePeriodizationPatterns(
  sport: string | undefined,
  minSampleSize: number,
  minSuccessRate: number
): Promise<DetectedPattern[]> {
  const patterns: DetectedPattern[] = []

  const outcomes = await prisma.trainingPeriodOutcome.findMany({
    where: {
      periodType: { not: null },
      ...(sport ? { athlete: { sportProfile: { is: { primarySport: { equals: sport as import('@prisma/client').SportType } } } } } : {}),
    },
    include: {
      athlete: {
        include: { sportProfile: true },
      },
    },
  })

  if (outcomes.length < minSampleSize) return patterns

  // Group by period type
  const periodGroups: Record<string, { success: typeof outcomes; total: typeof outcomes }> = {}

  for (const outcome of outcomes) {
    const periodType = outcome.periodType || 'UNKNOWN'
    if (!periodGroups[periodType]) {
      periodGroups[periodType] = { success: [], total: [] }
    }
    periodGroups[periodType].total.push(outcome)
    if (outcome.outcomeClass === 'EXCEEDED_GOALS' || outcome.outcomeClass === 'MET_GOALS') {
      periodGroups[periodType].success.push(outcome)
    }
  }

  for (const [periodType, group] of Object.entries(periodGroups)) {
    if (group.total.length < minSampleSize || periodType === 'UNKNOWN') continue

    const successRate = group.success.length / group.total.length
    if (successRate < minSuccessRate) continue

    const avgImprovement = calculateAverageImprovement(group.success)
    const confidence = calculateConfidence(group.success.length, successRate)
    const sportValue = determineMostCommonSport(group.total)

    patterns.push({
      name: `${formatPeriodType(periodType)} Period Success`,
      description: `${periodType} training periods with high success rates`,
      patternType: 'PERIODIZATION',
      sport: sportValue,
      goalType: 'ENDURANCE_PERFORMANCE',
      conditions: {
        periodType,
        typicalDuration: calculateAverageDuration(group.success),
      },
      expectedOutcome: `${Math.round(successRate * 100)}% chance of meeting goals`,
      sampleSize: group.success.length,
      successRate,
      confidence,
      averageImprovement: avgImprovement,
      insight: generatePeriodizationInsight(periodType, successRate, avgImprovement),
    })
  }

  return patterns
}

/**
 * Analyze recovery patterns and their impact on outcomes.
 */
async function analyzeRecoveryPatterns(
  sport: string | undefined,
  minSampleSize: number,
  minSuccessRate: number
): Promise<DetectedPattern[]> {
  const patterns: DetectedPattern[] = []

  const outcomes = await prisma.trainingPeriodOutcome.findMany({
    where: {
      fingerprint: {
        restDaysPerWeek: { gte: 0 },
      },
      ...(sport ? { athlete: { sportProfile: { is: { primarySport: { equals: sport as import('@prisma/client').SportType } } } } } : {}),
    },
    include: {
      fingerprint: true,
      athlete: {
        include: { sportProfile: true },
      },
    },
  })

  if (outcomes.length < minSampleSize) return patterns

  // Analyze rest day patterns
  const restDayGroups: Record<string, { success: typeof outcomes; total: typeof outcomes }> = {
    'optimal_rest': { success: [], total: [] }, // 1-2 rest days per week
    'minimal_rest': { success: [], total: [] }, // 0-1 rest days
    'high_rest': { success: [], total: [] }, // 3+ rest days
  }

  for (const outcome of outcomes) {
    const restDays = outcome.fingerprint?.restDaysPerWeek

    if (restDays === undefined || restDays === null) continue

    let group: string
    if (restDays >= 1 && restDays <= 2) group = 'optimal_rest'
    else if (restDays < 1) group = 'minimal_rest'
    else group = 'high_rest'

    restDayGroups[group].total.push(outcome)
    if (outcome.outcomeClass === 'EXCEEDED_GOALS' || outcome.outcomeClass === 'MET_GOALS') {
      restDayGroups[group].success.push(outcome)
    }
  }

  for (const [restType, group] of Object.entries(restDayGroups)) {
    if (group.total.length < minSampleSize) continue

    const successRate = group.success.length / group.total.length
    if (successRate < minSuccessRate) continue

    const avgImprovement = calculateAverageImprovement(group.success)
    const confidence = calculateConfidence(group.success.length, successRate)
    const sportValue = determineMostCommonSport(group.total)

    patterns.push({
      name: `${formatRestType(restType)} Recovery Pattern`,
      description: `Athletes with ${restType.replace('_', ' ')} approach to recovery`,
      patternType: 'RECOVERY_PATTERN',
      sport: sportValue,
      goalType: 'GENERAL_FITNESS',
      conditions: {
        restType,
        restDaysPerWeek: getRestDayRange(restType),
      },
      expectedOutcome: restType === 'optimal_rest' ? 'Best balance of training stimulus and recovery' : 'Variable outcomes',
      sampleSize: group.success.length,
      successRate,
      confidence,
      averageImprovement: avgImprovement,
      insight: generateRecoveryInsight(restType, successRate),
    })
  }

  return patterns
}

/**
 * Match an athlete's current training to detected patterns.
 */
export async function matchAthleteToPatterns(
  athleteId: string,
  options: {
    sport?: string
    includePartialMatches?: boolean
  } = {}
): Promise<PatternMatchResult[]> {
  const { sport, includePartialMatches = true } = options

  // Get athlete's recent training fingerprint
  const recentOutcome = await prisma.trainingPeriodOutcome.findFirst({
    where: {
      athleteId,
      fingerprint: { isNot: null },
    },
    orderBy: { endDate: 'desc' },
    include: { fingerprint: true },
  })

  if (!recentOutcome?.fingerprint) {
    return []
  }

  // Get relevant patterns
  const patterns = await prisma.performancePattern.findMany({
    where: {
      confidenceLevel: { in: ['HIGH', 'VERY_HIGH', ...(includePartialMatches ? ['MODERATE'] : [])] as import('@prisma/client').PatternConfidence[] },
      isActive: true,
      ...(sport ? { applicableSports: { has: sport } } : {}),
    },
    orderBy: { outcomeCorrelation: 'desc' },
  })

  const matches: PatternMatchResult[] = []

  for (const pattern of patterns) {
    const matchScore = calculatePatternMatchScore(recentOutcome.fingerprint, pattern)

    if (matchScore >= 0.5 || (includePartialMatches && matchScore >= 0.3)) {
      matches.push({
        patternId: pattern.id,
        patternName: pattern.patternName,
        matchScore,
        expectedOutcome: pattern.outcomeDescription || 'Improved outcomes',
        confidence: pattern.confidenceLevel,
        recommendations: generatePatternRecommendations(pattern, matchScore),
      })
    }
  }

  // Save matches for analytics
  for (const match of matches) {
    await prisma.athletePatternMatch.create({
      data: {
        athleteId,
        patternId: match.patternId,
        matchScore: match.matchScore,
        matchedCriteria: {},
        recommendation: match.recommendations.join('\n'),
      },
    }).catch(() => {
      // Non-critical, continue on error
    })
  }

  return matches.sort((a, b) => b.matchScore - a.matchScore)
}

/**
 * Save detected patterns to database.
 */
export async function saveDetectedPatterns(patterns: DetectedPattern[]): Promise<number> {
  let savedCount = 0

  for (const pattern of patterns) {
    try {
      // Check if pattern exists by name
      const existing = await prisma.performancePattern.findFirst({
        where: { patternName: pattern.name },
      })

      if (existing) {
        // Update existing pattern
        await prisma.performancePattern.update({
          where: { id: existing.id },
          data: {
            patternDescription: pattern.description,
            criteria: pattern.conditions as import('@prisma/client').Prisma.InputJsonValue,
            outcomeDescription: pattern.expectedOutcome,
            sampleSize: pattern.sampleSize,
            outcomeCorrelation: pattern.successRate,
            confidenceLevel: pattern.confidence,
            effectSize: pattern.averageImprovement / 100, // Convert percentage to effect size
            lastValidated: new Date(),
            validationCount: { increment: 1 },
          },
        })
      } else {
        // Create new pattern
        await prisma.performancePattern.create({
          data: {
            patternName: pattern.name,
            patternDescription: pattern.description,
            criteria: pattern.conditions as import('@prisma/client').Prisma.InputJsonValue,
            outcomeType: pattern.patternType,
            outcomeCorrelation: pattern.successRate,
            outcomeDescription: pattern.expectedOutcome,
            sampleSize: pattern.sampleSize,
            confidenceLevel: pattern.confidence,
            effectSize: pattern.averageImprovement / 100,
            applicableSports: [pattern.sport],
            applicableExperience: [],
          },
        })
      }
      savedCount++
    } catch (error) {
      console.error(`Failed to save pattern ${pattern.name}:`, error)
    }
  }

  return savedCount
}

// Helper functions

function calculateAverageImprovement(outcomes: { compliance?: number | null }[]): number {
  // Use compliance as a proxy for improvement (0-1 scale, convert to percentage)
  const complianceValues = outcomes
    .filter((o) => typeof o.compliance === 'number')
    .map((o) => o.compliance! * 100)

  if (complianceValues.length === 0) return 0
  return complianceValues.reduce((a, b) => a + b, 0) / complianceValues.length
}

function calculateConfidence(sampleSize: number, successRate: number): PatternConfidence {
  const score = (sampleSize / 100) * 0.5 + successRate * 0.5

  if (sampleSize >= 100 && successRate >= 0.8) return 'VERY_HIGH'
  if (sampleSize >= 50 && successRate >= 0.7) return 'HIGH'
  if (sampleSize >= 20 && successRate >= 0.6) return 'MODERATE'
  return 'PRELIMINARY'
}

function deriveProgressionType(periodizationType: string | null, progressionRate: number | null): string | null {
  // Map periodization type to progression type
  if (periodizationType === 'BLOCK') return 'block_periodization'
  if (periodizationType === 'LINEAR') {
    // Use progression rate to determine if gradual or aggressive
    if (progressionRate !== null) {
      if (progressionRate <= 5) return 'gradual_increase'
      if (progressionRate >= 10) return 'aggressive_increase'
    }
    return 'gradual_increase'
  }
  if (periodizationType === 'POLARIZED' || periodizationType === 'PYRAMIDAL') {
    return 'consistent'
  }
  return null
}

function determineMostCommonSport(
  outcomes: { athlete: { sportProfile: { primarySport: string } | null } }[]
): string {
  const sportCounts: Record<string, number> = {}

  for (const outcome of outcomes) {
    const sport = outcome.athlete.sportProfile?.primarySport || 'GENERAL'
    sportCounts[sport] = (sportCounts[sport] || 0) + 1
  }

  let maxSport = 'GENERAL'
  let maxCount = 0
  for (const [sport, count] of Object.entries(sportCounts)) {
    if (count > maxCount) {
      maxSport = sport
      maxCount = count
    }
  }

  return maxSport
}

function classifyZoneDistribution(distribution: Record<string, number>): string | null {
  const z1 = distribution['zone1'] || distribution['Z1'] || 0
  const z2 = distribution['zone2'] || distribution['Z2'] || 0
  const z3 = distribution['zone3'] || distribution['Z3'] || 0
  const z4 = distribution['zone4'] || distribution['Z4'] || 0
  const z5 = distribution['zone5'] || distribution['Z5'] || 0

  const lowIntensity = z1 + z2
  const threshold = z3
  const highIntensity = z4 + z5

  if (lowIntensity >= 75 && highIntensity >= 10 && threshold <= 10) {
    return 'polarized_80_20'
  }
  if (lowIntensity >= 60 && threshold >= 20 && highIntensity <= 10) {
    return 'pyramidal'
  }
  if (threshold >= 30) {
    return 'threshold_focused'
  }
  if (highIntensity >= 30) {
    return 'high_intensity'
  }

  return null
}

function calculateAverageDuration(outcomes: { startDate: Date; endDate: Date }[]): number {
  if (outcomes.length === 0) return 0

  const durations = outcomes.map((o) => {
    const diff = o.endDate.getTime() - o.startDate.getTime()
    return diff / (1000 * 60 * 60 * 24 * 7) // Weeks
  })

  return durations.reduce((a, b) => a + b, 0) / durations.length
}

function calculatePatternMatchScore(
  fingerprint: {
    zone1Percent: number
    zone2Percent: number
    zone3Percent: number
    zone4Percent: number
    zone5Percent: number
    periodizationType: string | null
    progressionRate: number | null
    restDaysPerWeek: number
  },
  pattern: { criteria: unknown; outcomeType: string }
): number {
  const criteria = pattern.criteria as Record<string, unknown>
  let matchPoints = 0
  let totalPoints = 0

  // Check zone distribution match
  if (pattern.outcomeType === 'INTENSITY_DISTRIBUTION') {
    totalPoints += 2
    const zoneDistribution = {
      zone1: fingerprint.zone1Percent,
      zone2: fingerprint.zone2Percent,
      zone3: fingerprint.zone3Percent,
      zone4: fingerprint.zone4Percent,
      zone5: fingerprint.zone5Percent,
    }
    const athleteType = classifyZoneDistribution(zoneDistribution)
    if (athleteType === criteria.distributionType) {
      matchPoints += 2
    } else if (athleteType) {
      matchPoints += 0.5 // Partial match
    }
  }

  // Check volume progression match
  if (pattern.outcomeType === 'VOLUME_PROGRESSION') {
    totalPoints += 2
    const progressionType = deriveProgressionType(fingerprint.periodizationType, fingerprint.progressionRate)
    if (progressionType === criteria.progressionType) {
      matchPoints += 2
    }
  }

  // Check recovery pattern match
  if (pattern.outcomeType === 'RECOVERY_PATTERN') {
    totalPoints += 1
    const restRange = criteria.restDaysPerWeek as { min: number; max: number } | undefined
    if (restRange) {
      if (fingerprint.restDaysPerWeek >= restRange.min && fingerprint.restDaysPerWeek <= restRange.max) {
        matchPoints += 1
      }
    }
  }

  return totalPoints > 0 ? matchPoints / totalPoints : 0
}

function generatePatternRecommendations(
  pattern: { outcomeType: string; criteria: unknown; patternName: string },
  matchScore: number
): string[] {
  const recommendations: string[] = []

  if (matchScore >= 0.8) {
    recommendations.push(`You're closely following the "${pattern.patternName}" pattern - keep it up!`)
  } else if (matchScore >= 0.5) {
    recommendations.push(`Consider aligning more closely with the "${pattern.patternName}" pattern for better results.`)
  }

  const conditions = pattern.criteria as Record<string, unknown>

  if (pattern.outcomeType === 'INTENSITY_DISTRIBUTION') {
    if (conditions.distributionType === 'polarized_80_20') {
      recommendations.push('Aim for 80% low intensity, 20% high intensity training.')
    }
  }

  if (pattern.outcomeType === 'RECOVERY_PATTERN') {
    if (conditions.restType === 'optimal_rest') {
      recommendations.push('Maintain 1-2 complete rest days per week.')
    }
  }

  return recommendations
}

// Formatting helpers
function formatProgressionType(type: string): string {
  const map: Record<string, string> = {
    'gradual_increase': 'Gradual',
    'block_periodization': 'Block',
    'consistent': 'Consistent',
    'aggressive_increase': 'Aggressive',
  }
  return map[type] || type
}

function formatDistributionType(type: string): string {
  const map: Record<string, string> = {
    'polarized_80_20': 'Polarized (80/20)',
    'pyramidal': 'Pyramidal',
    'threshold_focused': 'Threshold-Focused',
    'high_intensity': 'High-Intensity',
  }
  return map[type] || type
}

function formatPeriodType(type: string): string {
  return type.charAt(0) + type.slice(1).toLowerCase().replace(/_/g, ' ')
}

function formatRestType(type: string): string {
  const map: Record<string, string> = {
    'optimal_rest': 'Optimal',
    'minimal_rest': 'Minimal',
    'high_rest': 'High-Frequency',
  }
  return map[type] || type
}

function getZoneRangesForType(type: string): Record<string, { min: number; max: number }> {
  const ranges: Record<string, Record<string, { min: number; max: number }>> = {
    'polarized_80_20': {
      lowIntensity: { min: 75, max: 85 },
      highIntensity: { min: 10, max: 20 },
    },
    'pyramidal': {
      lowIntensity: { min: 60, max: 75 },
      threshold: { min: 20, max: 30 },
    },
    'threshold_focused': {
      threshold: { min: 30, max: 50 },
    },
    'high_intensity': {
      highIntensity: { min: 30, max: 50 },
    },
  }
  return ranges[type] || {}
}

function getRestDayRange(type: string): { min: number; max: number } {
  const ranges: Record<string, { min: number; max: number }> = {
    'optimal_rest': { min: 1, max: 2 },
    'minimal_rest': { min: 0, max: 1 },
    'high_rest': { min: 3, max: 7 },
  }
  return ranges[type] || { min: 0, max: 7 }
}

// Insight generators
function generateVolumeInsight(progressionType: string, successRate: number, avgImprovement: number): string {
  return `Athletes using ${progressionType.replace('_', ' ')} volume progression have a ${Math.round(successRate * 100)}% success rate with average ${avgImprovement > 0 ? '+' : ''}${avgImprovement.toFixed(1)}% improvement.`
}

function generateIntensityInsight(distType: string, successRate: number, sport: string): string {
  return `${formatDistributionType(distType)} training shows ${Math.round(successRate * 100)}% success rate for ${sport.toLowerCase()} athletes.`
}

function generatePeriodizationInsight(periodType: string, successRate: number, avgImprovement: number): string {
  return `${formatPeriodType(periodType)} periods achieve goals ${Math.round(successRate * 100)}% of the time with ${avgImprovement.toFixed(1)}% average improvement.`
}

function generateRecoveryInsight(restType: string, successRate: number): string {
  const descriptions: Record<string, string> = {
    'optimal_rest': 'Balanced recovery (1-2 rest days/week) correlates with highest success rates.',
    'minimal_rest': 'Minimal rest approach shows mixed results - monitor for overtraining signs.',
    'high_rest': 'Higher rest frequency may limit training adaptations.',
  }
  return `${descriptions[restType] || ''} Success rate: ${Math.round(successRate * 100)}%.`
}
