/**
 * Feedback Aggregator
 *
 * Data Moat Phase 4: AI Learning Loop
 * Automatically extracts lessons from coach decisions and prediction errors.
 */

import { prisma } from '@/lib/prisma'
import { FeedbackCategory, DecisionReason, OutcomeAssessment } from '@prisma/client'

export interface ExtractedLesson {
  feedbackCategory: FeedbackCategory
  coachDecisionId?: string
  predictionId?: string
  lessonTitle: string
  lessonDescription: string
  lessonCategory: string
  lessonConfidence: number
  evidenceCount: number
  evidenceData?: Record<string, unknown>
  affectedPrompts: string[]
}

interface ExtractionOptions {
  lookbackDays: number
  minEvidenceCount: number
}

/**
 * Extract lessons from coach decisions that overrode AI suggestions.
 */
export async function extractLessonsFromDecisions(
  options: ExtractionOptions
): Promise<ExtractedLesson[]> {
  const { lookbackDays, minEvidenceCount } = options
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - lookbackDays)

  // Get validated decisions with outcomes
  const decisions = await prisma.coachDecision.findMany({
    where: {
      createdAt: { gte: cutoffDate },
      validated: true,
      outcomeAssessment: { not: null },
    },
    include: {
      athlete: {
        select: {
          id: true,
          birthDate: true,
          sportProfile: { select: { primarySport: true } },
          athleteProfile: { select: { category: true } },
        },
      },
    },
  })

  if (decisions.length < minEvidenceCount) {
    return []
  }

  const lessons: ExtractedLesson[] = []

  // Group decisions by reason category
  const byReason = groupBy(decisions, (d) => d.reasonCategory)

  for (const [reason, reasonDecisions] of Object.entries(byReason)) {
    if (reasonDecisions.length < minEvidenceCount) continue

    // Calculate success rate when coach overrode AI for this reason
    const successfulOverrides = reasonDecisions.filter(
      (d) => d.outcomeAssessment === 'BETTER_THAN_AI' || d.outcomeAssessment === 'SAME_AS_AI'
    )
    const successRate = successfulOverrides.length / reasonDecisions.length

    // Only create lesson if clear pattern (either coach usually right or AI usually right)
    if (successRate >= 0.7) {
      const lesson = createDecisionLesson(reason as DecisionReason, reasonDecisions, successRate, 'coach_right')
      if (lesson) lessons.push(lesson)
    } else if (successRate <= 0.3) {
      const lesson = createDecisionLesson(reason as DecisionReason, reasonDecisions, 1 - successRate, 'ai_right')
      if (lesson) lessons.push(lesson)
    }
  }

  // Analyze by athlete characteristics
  const ageGroupLessons = await analyzeDecisionsByAgeGroup(decisions, minEvidenceCount)
  lessons.push(...ageGroupLessons)

  // Analyze by sport
  const sportLessons = await analyzeDecisionsBySport(decisions, minEvidenceCount)
  lessons.push(...sportLessons)

  return lessons
}

/**
 * Extract lessons from prediction errors.
 */
export async function extractLessonsFromPredictions(
  options: ExtractionOptions
): Promise<ExtractedLesson[]> {
  const { lookbackDays, minEvidenceCount } = options
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - lookbackDays)

  // Get validated predictions
  const predictions = await prisma.aIPrediction.findMany({
    where: {
      createdAt: { gte: cutoffDate },
      validated: true,
      validation: { isNot: null },
    },
    include: {
      validation: true,
      athlete: {
        select: {
          id: true,
          birthDate: true,
          sportProfile: { select: { primarySport: true } },
          athleteProfile: { select: { category: true } },
        },
      },
    },
  })

  if (predictions.length < minEvidenceCount) {
    return []
  }

  const lessons: ExtractedLesson[] = []

  // Group by prediction type
  const byType = groupBy(predictions, (p) => p.predictionType)

  for (const [type, typePredictions] of Object.entries(byType)) {
    if (typePredictions.length < minEvidenceCount) continue

    // Analyze error patterns
    const errorAnalysis = analyzeErrorPatterns(typePredictions)

    if (errorAnalysis.systematicBias) {
      lessons.push({
        feedbackCategory: 'PREDICTION_ERROR',
        predictionId: typePredictions[0].id,
        lessonTitle: `Systematic ${errorAnalysis.biasDirection} bias in ${type} predictions`,
        lessonDescription: `${type} predictions show a consistent ${errorAnalysis.biasDirection} bias of ${errorAnalysis.avgError.toFixed(2)}%. This suggests the model needs calibration.`,
        lessonCategory: 'prediction_calibration',
        lessonConfidence: Math.min(1, typePredictions.length / 50) * 0.8,
        evidenceCount: typePredictions.length,
        evidenceData: {
          predictionType: type,
          avgError: errorAnalysis.avgError,
          biasDirection: errorAnalysis.biasDirection,
          sampleSize: typePredictions.length,
        },
        affectedPrompts: [`${type.toLowerCase()}_prediction`],
      })
    }

    // Check for specific conditions that lead to errors
    const conditionLessons = analyzeErrorConditions(typePredictions, minEvidenceCount)
    lessons.push(...conditionLessons)
  }

  return lessons
}

function createDecisionLesson(
  reason: DecisionReason,
  decisions: { id: string; outcomeAssessment: OutcomeAssessment | null }[],
  successRate: number,
  winner: 'coach_right' | 'ai_right'
): ExtractedLesson | null {
  const reasonDescriptions: Record<DecisionReason, { title: string; category: string; prompt: string }> = {
    ATHLETE_FEEDBACK: {
      title: 'Athlete feedback-based modifications',
      category: 'athlete_communication',
      prompt: 'workout_generation',
    },
    FATIGUE_OBSERVED: {
      title: 'Fatigue-based workout modifications',
      category: 'fatigue_management',
      prompt: 'workout_generation',
    },
    HRV_LOW: {
      title: 'HRV-based recovery modifications',
      category: 'recovery',
      prompt: 'readiness_assessment',
    },
    SLEEP_POOR: {
      title: 'Sleep-based intensity reductions',
      category: 'recovery',
      prompt: 'readiness_assessment',
    },
    INJURY_CONCERN: {
      title: 'Injury prevention modifications',
      category: 'injury_prevention',
      prompt: 'injury_risk_assessment',
    },
    SCHEDULE_CONFLICT: {
      title: 'Schedule-based workout adjustments',
      category: 'scheduling',
      prompt: 'workout_generation',
    },
    PROGRESSION_ADJUSTMENT: {
      title: 'Progression rate modifications',
      category: 'periodization',
      prompt: 'workout_generation',
    },
    WEATHER_CONDITIONS: {
      title: 'Weather-based workout changes',
      category: 'environmental',
      prompt: 'workout_generation',
    },
    EQUIPMENT_UNAVAILABLE: {
      title: 'Equipment availability adjustments',
      category: 'logistics',
      prompt: 'workout_generation',
    },
    COACH_INTUITION: {
      title: 'Coach intuition-based changes',
      category: 'experience',
      prompt: 'workout_generation',
    },
    ATHLETE_PREFERENCE: {
      title: 'Athlete preference modifications',
      category: 'athlete_communication',
      prompt: 'workout_generation',
    },
    TECHNIQUE_FOCUS: {
      title: 'Technique-focused adjustments',
      category: 'skill_development',
      prompt: 'workout_generation',
    },
    MENTAL_FRESHNESS: {
      title: 'Mental freshness-based changes',
      category: 'recovery',
      prompt: 'readiness_assessment',
    },
    TRAVEL_FATIGUE: {
      title: 'Travel fatigue adjustments',
      category: 'recovery',
      prompt: 'readiness_assessment',
    },
    ILLNESS_RECOVERY: {
      title: 'Illness recovery modifications',
      category: 'recovery',
      prompt: 'readiness_assessment',
    },
    COMPETITION_PROXIMITY: {
      title: 'Competition proximity adjustments',
      category: 'periodization',
      prompt: 'workout_generation',
    },
    OTHER: {
      title: 'Other modifications',
      category: 'other',
      prompt: 'workout_generation',
    },
  }

  const info = reasonDescriptions[reason]
  if (!info) return null

  const description = winner === 'coach_right'
    ? `When coaches override AI suggestions due to "${reason}", they are correct ${(successRate * 100).toFixed(0)}% of the time. The AI should better account for this factor.`
    : `When coaches override AI suggestions due to "${reason}", the AI suggestion was better ${(successRate * 100).toFixed(0)}% of the time. Coaches may be overreacting to this factor.`

  return {
    feedbackCategory: 'DECISION_OVERRIDE',
    coachDecisionId: decisions[0].id,
    lessonTitle: `${winner === 'coach_right' ? 'Trust coach on' : 'AI better at'}: ${info.title}`,
    lessonDescription: description,
    lessonCategory: info.category,
    lessonConfidence: Math.min(1, decisions.length / 30) * successRate,
    evidenceCount: decisions.length,
    evidenceData: {
      reason,
      successRate,
      winner,
      sampleSize: decisions.length,
    },
    affectedPrompts: [info.prompt],
  }
}

function analyzeErrorPatterns(predictions: {
  validation: { percentageError: number; withinConfidenceInterval: boolean } | null
}[]): {
  systematicBias: boolean
  biasDirection: 'positive' | 'negative'
  avgError: number
} {
  const errors = predictions
    .filter((p) => p.validation)
    .map((p) => p.validation!.percentageError)

  if (errors.length === 0) {
    return { systematicBias: false, biasDirection: 'positive', avgError: 0 }
  }

  const avgError = errors.reduce((a, b) => a + b, 0) / errors.length
  const positiveErrors = errors.filter((e) => e > 0).length
  const biasDirection = positiveErrors > errors.length / 2 ? 'positive' : 'negative'

  // Check if errors consistently go one direction (systematic bias)
  const biasRatio = Math.max(positiveErrors, errors.length - positiveErrors) / errors.length
  const systematicBias = biasRatio >= 0.7 && Math.abs(avgError) > 3

  return { systematicBias, biasDirection, avgError }
}

function analyzeErrorConditions(
  predictions: {
    id: string
    validation: { percentageError: number; environmentalFactors: unknown } | null
    athlete: {
      birthDate: Date | null
      sportProfile: { primarySport: string } | null
      athleteProfile: { category: string } | null
    }
  }[],
  minEvidenceCount: number
): ExtractedLesson[] {
  const lessons: ExtractedLesson[] = []

  // Group by athlete age
  const byAge = groupBy(predictions, (p) => {
    if (!p.athlete.birthDate) return 'unknown'
    const age = Math.floor(
      (Date.now() - p.athlete.birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
    )
    if (age < 30) return 'under30'
    if (age < 40) return '30-40'
    if (age < 50) return '40-50'
    return 'over50'
  })

  for (const [ageGroup, agePredictions] of Object.entries(byAge)) {
    if (ageGroup === 'unknown' || agePredictions.length < minEvidenceCount) continue

    const errors = agePredictions
      .filter((p) => p.validation)
      .map((p) => Math.abs(p.validation!.percentageError))
    const avgError = errors.reduce((a, b) => a + b, 0) / errors.length

    // If this age group has significantly higher errors
    if (avgError > 10) {
      lessons.push({
        feedbackCategory: 'PREDICTION_ERROR',
        predictionId: agePredictions[0].id,
        lessonTitle: `Higher prediction error for ${ageGroup} age group`,
        lessonDescription: `Predictions for athletes in the ${ageGroup} age group have ${avgError.toFixed(1)}% average error, suggesting age-specific calibration needed.`,
        lessonCategory: 'age_calibration',
        lessonConfidence: Math.min(1, agePredictions.length / 20) * 0.7,
        evidenceCount: agePredictions.length,
        evidenceData: {
          ageGroup,
          avgError,
          sampleSize: agePredictions.length,
        },
        affectedPrompts: ['race_time_prediction', 'threshold_prediction'],
      })
    }
  }

  return lessons
}

async function analyzeDecisionsByAgeGroup(
  decisions: {
    id: string
    reasonCategory: DecisionReason
    outcomeAssessment: OutcomeAssessment | null
    athlete: { birthDate: Date | null }
  }[],
  minEvidenceCount: number
): Promise<ExtractedLesson[]> {
  const lessons: ExtractedLesson[] = []

  const byAge = groupBy(decisions, (d) => {
    if (!d.athlete.birthDate) return 'unknown'
    const age = Math.floor(
      (Date.now() - d.athlete.birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
    )
    if (age < 30) return 'under30'
    if (age < 40) return '30-40'
    if (age < 50) return '40-50'
    return 'over50'
  })

  for (const [ageGroup, ageDecisions] of Object.entries(byAge)) {
    if (ageGroup === 'unknown' || ageDecisions.length < minEvidenceCount) continue

    const coachCorrect = ageDecisions.filter(
      (d) => d.outcomeAssessment === 'BETTER_THAN_AI' || d.outcomeAssessment === 'SAME_AS_AI'
    ).length
    const successRate = coachCorrect / ageDecisions.length

    if (successRate >= 0.75) {
      lessons.push({
        feedbackCategory: 'DECISION_OVERRIDE',
        coachDecisionId: ageDecisions[0].id,
        lessonTitle: `Trust coach modifications for ${ageGroup} athletes`,
        lessonDescription: `For athletes aged ${ageGroup}, coach modifications to AI suggestions were correct ${(successRate * 100).toFixed(0)}% of the time. Consider age-specific AI adjustments.`,
        lessonCategory: 'age_specific',
        lessonConfidence: Math.min(1, ageDecisions.length / 20) * successRate,
        evidenceCount: ageDecisions.length,
        evidenceData: {
          ageGroup,
          successRate,
          sampleSize: ageDecisions.length,
        },
        affectedPrompts: ['workout_generation', 'recovery_recommendation'],
      })
    }
  }

  return lessons
}

async function analyzeDecisionsBySport(
  decisions: {
    id: string
    reasonCategory: DecisionReason
    outcomeAssessment: OutcomeAssessment | null
    athlete: { sportProfile: { primarySport: string } | null }
  }[],
  minEvidenceCount: number
): Promise<ExtractedLesson[]> {
  const lessons: ExtractedLesson[] = []

  const bySport = groupBy(decisions, (d) => d.athlete.sportProfile?.primarySport || 'unknown')

  for (const [sport, sportDecisions] of Object.entries(bySport)) {
    if (sport === 'unknown' || sportDecisions.length < minEvidenceCount) continue

    const coachCorrect = sportDecisions.filter(
      (d) => d.outcomeAssessment === 'BETTER_THAN_AI' || d.outcomeAssessment === 'SAME_AS_AI'
    ).length
    const successRate = coachCorrect / sportDecisions.length

    if (successRate >= 0.75) {
      lessons.push({
        feedbackCategory: 'DECISION_OVERRIDE',
        coachDecisionId: sportDecisions[0].id,
        lessonTitle: `Sport-specific calibration needed for ${sport}`,
        lessonDescription: `For ${sport} athletes, coach modifications were correct ${(successRate * 100).toFixed(0)}% of the time, suggesting the AI needs better sport-specific knowledge.`,
        lessonCategory: 'sport_specific',
        lessonConfidence: Math.min(1, sportDecisions.length / 20) * successRate,
        evidenceCount: sportDecisions.length,
        evidenceData: {
          sport,
          successRate,
          sampleSize: sportDecisions.length,
        },
        affectedPrompts: ['workout_generation', `${sport.toLowerCase()}_specific`],
      })
    }
  }

  return lessons
}

// Utility function
function groupBy<T, K extends string>(array: T[], keyFn: (item: T) => K): Record<K, T[]> {
  return array.reduce(
    (result, item) => {
      const key = keyFn(item)
      if (!result[key]) {
        result[key] = []
      }
      result[key].push(item)
      return result
    },
    {} as Record<K, T[]>
  )
}
