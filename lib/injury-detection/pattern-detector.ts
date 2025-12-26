/**
 * Pain Pattern Detection
 *
 * Detects recurring pain patterns in daily check-ins to catch
 * potential injuries early, even when individual pain levels are low.
 *
 * Key Rules:
 * - Same body part reported 3+ times in 7 days → Escalate to coach
 * - Increasing pain trend → Escalate even earlier
 * - Recurring illness symptoms → Flag for follow-up
 */

import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

// ============================================
// TYPES
// ============================================

export interface PainReport {
  date: Date
  painLevel: number
  bodyPart: string | null
  injuryType: string | null
  isIllness: boolean
  illnessType: string | null
  keywordBodyPart: string | null
}

export interface PatternDetectionResult {
  patternDetected: boolean
  patterns: DetectedPattern[]
  shouldEscalate: boolean
  escalationReasons: string[]
  recommendation: 'COACH_REVIEW' | 'MONITOR' | 'NO_ACTION'
}

export interface DetectedPattern {
  type: 'RECURRING_BODY_PART' | 'INCREASING_PAIN' | 'RECURRING_ILLNESS' | 'PAIN_SPREAD'
  bodyPart?: string
  occurrences: number
  timeframeDays: number
  averagePainLevel: number
  trend: 'INCREASING' | 'STABLE' | 'DECREASING'
  severity: 'HIGH' | 'MODERATE' | 'LOW'
  description: string
  descriptionSv: string
}

// ============================================
// CONSTANTS
// ============================================

const LOOKBACK_DAYS = 7
const MIN_OCCURRENCES_FOR_PATTERN = 3
const PAIN_THRESHOLD_FOR_CONCERN = 3 // Pain >= 3 is flagged for pattern analysis

// ============================================
// MAIN FUNCTION
// ============================================

/**
 * Detect recurring pain patterns in recent check-ins
 *
 * @param clientId - The client/athlete ID
 * @param currentReport - Current check-in data (optional, for real-time analysis)
 */
export async function detectPainPatterns(
  clientId: string,
  currentReport?: Partial<PainReport>
): Promise<PatternDetectionResult> {
  try {
    // Calculate date range
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - LOOKBACK_DAYS)

    // Fetch recent daily metrics
    const recentMetrics = await prisma.dailyMetrics.findMany({
      where: {
        clientId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { date: 'asc' },
      select: {
        date: true,
        injuryPain: true,
        injuryBodyPart: true,
        injurySpecificType: true,
        isIllness: true,
        illnessType: true,
        keywordBodyPart: true,
      },
    })

    // Convert to PainReport format, filtering out entries without pain data
    const painReports: PainReport[] = recentMetrics
      .filter((m) => m.injuryPain !== null)
      .map((m) => ({
        date: m.date,
        painLevel: m.injuryPain!,
        bodyPart: m.injuryBodyPart,
        injuryType: m.injurySpecificType,
        isIllness: m.isIllness || false,
        illnessType: m.illnessType,
        keywordBodyPart: m.keywordBodyPart,
      }))

    // Add current report if provided
    if (currentReport) {
      painReports.push({
        date: new Date(),
        painLevel: currentReport.painLevel || 0,
        bodyPart: currentReport.bodyPart || null,
        injuryType: currentReport.injuryType || null,
        isIllness: currentReport.isIllness || false,
        illnessType: currentReport.illnessType || null,
        keywordBodyPart: currentReport.keywordBodyPart || null,
      })
    }

    // Analyze patterns
    const patterns: DetectedPattern[] = []

    // 1. Check for recurring body part pain
    const bodyPartPatterns = analyzeBodyPartPatterns(painReports)
    patterns.push(...bodyPartPatterns)

    // 2. Check for increasing pain trend
    const trendPatterns = analyzePainTrend(painReports)
    patterns.push(...trendPatterns)

    // 3. Check for recurring illness
    const illnessPatterns = analyzeIllnessPatterns(painReports)
    patterns.push(...illnessPatterns)

    // Determine escalation
    const shouldEscalate = patterns.some((p) => p.severity === 'HIGH' || p.occurrences >= MIN_OCCURRENCES_FOR_PATTERN)
    const escalationReasons = patterns
      .filter((p) => p.severity === 'HIGH' || p.occurrences >= MIN_OCCURRENCES_FOR_PATTERN)
      .map((p) => p.descriptionSv)

    let recommendation: PatternDetectionResult['recommendation'] = 'NO_ACTION'
    if (shouldEscalate) {
      recommendation = 'COACH_REVIEW'
    } else if (patterns.length > 0) {
      recommendation = 'MONITOR'
    }

    return {
      patternDetected: patterns.length > 0,
      patterns,
      shouldEscalate,
      escalationReasons,
      recommendation,
    }
  } catch (error) {
    logger.error('Error detecting pain patterns', { clientId }, error)
    return {
      patternDetected: false,
      patterns: [],
      shouldEscalate: false,
      escalationReasons: [],
      recommendation: 'NO_ACTION',
    }
  }
}

// ============================================
// PATTERN ANALYSIS FUNCTIONS
// ============================================

/**
 * Analyze recurring pain in the same body part
 */
function analyzeBodyPartPatterns(reports: PainReport[]): DetectedPattern[] {
  const patterns: DetectedPattern[] = []

  // Group by body part (including keyword-detected body parts)
  const bodyPartGroups: Record<string, PainReport[]> = {}

  for (const report of reports) {
    if (report.painLevel < PAIN_THRESHOLD_FOR_CONCERN) continue
    if (report.isIllness) continue // Illness tracked separately

    // Use explicit body part or keyword-detected body part
    const bodyPart = report.bodyPart || report.keywordBodyPart
    if (!bodyPart) continue

    if (!bodyPartGroups[bodyPart]) {
      bodyPartGroups[bodyPart] = []
    }
    bodyPartGroups[bodyPart].push(report)
  }

  // Check each body part group
  for (const [bodyPart, groupReports] of Object.entries(bodyPartGroups)) {
    if (groupReports.length >= MIN_OCCURRENCES_FOR_PATTERN) {
      const avgPain = groupReports.reduce((sum, r) => sum + r.painLevel, 0) / groupReports.length
      const trend = calculateTrend(groupReports.map((r) => r.painLevel))

      let severity: DetectedPattern['severity'] = 'MODERATE'
      if (groupReports.length >= 5 || avgPain >= 5 || trend === 'INCREASING') {
        severity = 'HIGH'
      } else if (groupReports.length === MIN_OCCURRENCES_FOR_PATTERN && avgPain < 4) {
        severity = 'LOW'
      }

      const bodyPartLabel = getBodyPartLabel(bodyPart)

      patterns.push({
        type: 'RECURRING_BODY_PART',
        bodyPart,
        occurrences: groupReports.length,
        timeframeDays: LOOKBACK_DAYS,
        averagePainLevel: Math.round(avgPain * 10) / 10,
        trend,
        severity,
        description: `${bodyPartLabel} pain reported ${groupReports.length} times in ${LOOKBACK_DAYS} days (avg ${avgPain.toFixed(1)}/10)`,
        descriptionSv: `Smärta i ${bodyPartLabel.toLowerCase()} rapporterad ${groupReports.length} gånger på ${LOOKBACK_DAYS} dagar (snitt ${avgPain.toFixed(1)}/10)`,
      })
    }
  }

  return patterns
}

/**
 * Analyze overall pain trend across all reports
 */
function analyzePainTrend(reports: PainReport[]): DetectedPattern[] {
  const patterns: DetectedPattern[] = []

  // Filter to reports with pain >= threshold
  const painReports = reports.filter((r) => r.painLevel >= PAIN_THRESHOLD_FOR_CONCERN && !r.isIllness)

  if (painReports.length < 3) return patterns

  const painLevels = painReports.map((r) => r.painLevel)
  const trend = calculateTrend(painLevels)

  // Only flag increasing trends
  if (trend === 'INCREASING') {
    const avgPain = painLevels.reduce((sum, p) => sum + p, 0) / painLevels.length
    const lastPain = painLevels[painLevels.length - 1]
    const firstPain = painLevels[0]

    // Check if pain has increased by at least 2 points
    if (lastPain - firstPain >= 2) {
      patterns.push({
        type: 'INCREASING_PAIN',
        occurrences: painReports.length,
        timeframeDays: LOOKBACK_DAYS,
        averagePainLevel: Math.round(avgPain * 10) / 10,
        trend: 'INCREASING',
        severity: lastPain >= 5 ? 'HIGH' : 'MODERATE',
        description: `Pain increasing over ${LOOKBACK_DAYS} days (${firstPain}/10 → ${lastPain}/10)`,
        descriptionSv: `Ökande smärta över ${LOOKBACK_DAYS} dagar (${firstPain}/10 → ${lastPain}/10)`,
      })
    }
  }

  return patterns
}

/**
 * Analyze recurring illness patterns
 */
function analyzeIllnessPatterns(reports: PainReport[]): DetectedPattern[] {
  const patterns: DetectedPattern[] = []

  const illnessReports = reports.filter((r) => r.isIllness)

  if (illnessReports.length >= 2) {
    // Two or more illness reports in a week is concerning
    const illnessTypes = illnessReports
      .map((r) => r.illnessType)
      .filter((t): t is string => t !== null)

    patterns.push({
      type: 'RECURRING_ILLNESS',
      occurrences: illnessReports.length,
      timeframeDays: LOOKBACK_DAYS,
      averagePainLevel: 0,
      trend: 'STABLE',
      severity: illnessReports.length >= 3 ? 'HIGH' : 'MODERATE',
      description: `Illness reported ${illnessReports.length} times in ${LOOKBACK_DAYS} days`,
      descriptionSv: `Sjukdom rapporterad ${illnessReports.length} gånger på ${LOOKBACK_DAYS} dagar`,
    })
  }

  return patterns
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Calculate trend direction from a series of values
 */
function calculateTrend(values: number[]): DetectedPattern['trend'] {
  if (values.length < 2) return 'STABLE'

  // Simple linear regression slope
  const n = values.length
  const xSum = (n * (n - 1)) / 2 // Sum of 0,1,2,...,n-1
  const ySum = values.reduce((sum, v) => sum + v, 0)
  const xySum = values.reduce((sum, v, i) => sum + i * v, 0)
  const xxSum = (n * (n - 1) * (2 * n - 1)) / 6 // Sum of i^2

  const slope = (n * xySum - xSum * ySum) / (n * xxSum - xSum * xSum)

  if (slope > 0.3) return 'INCREASING'
  if (slope < -0.3) return 'DECREASING'
  return 'STABLE'
}

/**
 * Get human-readable body part label
 */
function getBodyPartLabel(bodyPart: string): string {
  const labels: Record<string, string> = {
    FOOT: 'Fot',
    ANKLE: 'Fotled',
    SHIN: 'Underben',
    CALF: 'Vad',
    KNEE: 'Knä',
    THIGH: 'Lår',
    HAMSTRING: 'Bakre lår',
    QUAD: 'Främre lår',
    HIP: 'Höft',
    GROIN: 'Ljumske',
    LOWER_BACK: 'Nedre rygg',
    UPPER_BACK: 'Övre rygg',
    SHOULDER: 'Axel',
    NECK: 'Nacke',
    ARM: 'Arm',
    WRIST: 'Handled',
    OTHER: 'Övrigt',
  }

  return labels[bodyPart] || bodyPart
}

// ============================================
// COACH NOTIFICATION HELPER
// ============================================

/**
 * Format pattern detection result for coach notification
 */
export function formatPatternNotification(result: PatternDetectionResult): {
  title: string
  message: string
  urgency: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
} {
  if (!result.shouldEscalate) {
    return {
      title: 'Inga oroande mönster',
      message: 'Inga mönster som kräver åtgärd just nu.',
      urgency: 'LOW',
    }
  }

  const highSeverityPatterns = result.patterns.filter((p) => p.severity === 'HIGH')
  const urgency: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' =
    highSeverityPatterns.length > 0 ? 'HIGH' : 'MEDIUM'

  const patternSummaries = result.patterns.map((p) => `• ${p.descriptionSv}`).join('\n')

  return {
    title: 'Återkommande smärtmönster upptäckt',
    message: `Följande mönster har identifierats:\n${patternSummaries}\n\nRekommendation: Uppföljning med idrottaren.`,
    urgency,
  }
}
