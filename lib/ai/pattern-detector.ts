/**
 * Pattern Detection Service
 *
 * Analyzes trends in athlete check-in data to detect concerning patterns:
 * - Sleep degradation
 * - Fatigue accumulation
 * - Soreness buildup
 * - Stress escalation
 * - Mood/motivation decline
 * - Overtraining risk
 */

import { prisma } from '@/lib/prisma'
import { generateAIResponse } from '@/lib/ai/ai-service'

// Pattern types we can detect
export type PatternType =
  | 'SLEEP_DEGRADATION'
  | 'FATIGUE_ACCUMULATION'
  | 'SORENESS_BUILDUP'
  | 'STRESS_ESCALATION'
  | 'MOOD_DECLINE'
  | 'MOTIVATION_DROP'
  | 'OVERTRAINING_RISK'
  | 'RECOVERY_NEEDED'
  | 'POSITIVE_TREND'

export interface DetectedPattern {
  type: PatternType
  severity: 'LOW' | 'MEDIUM' | 'HIGH'
  metric: string
  trend: number[] // Recent values
  change: number // Percentage or absolute change
  description: string
}

export interface CheckInData {
  date: Date
  sleepQuality: number
  sleepHours: number | null
  soreness: number
  fatigue: number
  stress: number
  mood: number
  motivation: number
  readinessScore: number | null
}

/**
 * Get recent check-in data for analysis
 */
export async function getRecentCheckIns(
  clientId: string,
  days: number = 7
): Promise<CheckInData[]> {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  startDate.setHours(0, 0, 0, 0)

  const checkIns = await prisma.dailyCheckIn.findMany({
    where: {
      clientId,
      date: { gte: startDate },
    },
    orderBy: { date: 'asc' },
    select: {
      date: true,
      sleepQuality: true,
      sleepHours: true,
      soreness: true,
      fatigue: true,
      stress: true,
      mood: true,
      motivation: true,
      readinessScore: true,
    },
  })

  return checkIns
}

/**
 * Calculate linear regression slope for trend detection
 */
function calculateTrend(values: number[]): number {
  if (values.length < 2) return 0

  const n = values.length
  const xMean = (n - 1) / 2
  const yMean = values.reduce((a, b) => a + b, 0) / n

  let numerator = 0
  let denominator = 0

  for (let i = 0; i < n; i++) {
    numerator += (i - xMean) * (values[i] - yMean)
    denominator += (i - xMean) ** 2
  }

  return denominator === 0 ? 0 : numerator / denominator
}

/**
 * Calculate average of values
 */
function average(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((a, b) => a + b, 0) / values.length
}

/**
 * Detect patterns in check-in data
 */
export function detectPatterns(checkIns: CheckInData[]): DetectedPattern[] {
  if (checkIns.length < 3) {
    return [] // Need at least 3 data points for meaningful patterns
  }

  const patterns: DetectedPattern[] = []

  // Extract metric arrays
  const sleepQuality = checkIns.map((c) => c.sleepQuality)
  const sleepHours = checkIns.map((c) => c.sleepHours).filter((h): h is number => h !== null)
  const soreness = checkIns.map((c) => c.soreness)
  const fatigue = checkIns.map((c) => c.fatigue)
  const stress = checkIns.map((c) => c.stress)
  const mood = checkIns.map((c) => c.mood)
  const motivation = checkIns.map((c) => c.motivation)

  // 1. Sleep Degradation - Declining sleep quality
  const sleepTrend = calculateTrend(sleepQuality)
  if (sleepTrend < -0.3) {
    const severity = sleepTrend < -0.6 ? 'HIGH' : sleepTrend < -0.4 ? 'MEDIUM' : 'LOW'
    patterns.push({
      type: 'SLEEP_DEGRADATION',
      severity,
      metric: 'sleepQuality',
      trend: sleepQuality.slice(-5),
      change: sleepTrend,
      description: `Sömnkvalitet har försämrats de senaste ${checkIns.length} dagarna`,
    })
  }

  // 2. Fatigue Accumulation - Rising fatigue
  const fatigueTrend = calculateTrend(fatigue)
  if (fatigueTrend > 0.3) {
    const severity = fatigueTrend > 0.6 ? 'HIGH' : fatigueTrend > 0.4 ? 'MEDIUM' : 'LOW'
    patterns.push({
      type: 'FATIGUE_ACCUMULATION',
      severity,
      metric: 'fatigue',
      trend: fatigue.slice(-5),
      change: fatigueTrend,
      description: `Trötthetsnivån har ökat stadigt de senaste ${checkIns.length} dagarna`,
    })
  }

  // 3. Soreness Buildup - Increasing muscle soreness
  const sorenessTrend = calculateTrend(soreness)
  if (sorenessTrend > 0.3) {
    const severity = sorenessTrend > 0.6 ? 'HIGH' : sorenessTrend > 0.4 ? 'MEDIUM' : 'LOW'
    patterns.push({
      type: 'SORENESS_BUILDUP',
      severity,
      metric: 'soreness',
      trend: soreness.slice(-5),
      change: sorenessTrend,
      description: `Muskelömhet har ackumulerats de senaste ${checkIns.length} dagarna`,
    })
  }

  // 4. Stress Escalation - Rising stress levels
  const stressTrend = calculateTrend(stress)
  if (stressTrend > 0.3) {
    const severity = stressTrend > 0.6 ? 'HIGH' : stressTrend > 0.4 ? 'MEDIUM' : 'LOW'
    patterns.push({
      type: 'STRESS_ESCALATION',
      severity,
      metric: 'stress',
      trend: stress.slice(-5),
      change: stressTrend,
      description: `Stressnivåer har eskalerat de senaste ${checkIns.length} dagarna`,
    })
  }

  // 5. Mood Decline - Dropping mood
  const moodTrend = calculateTrend(mood)
  if (moodTrend < -0.3) {
    const severity = moodTrend < -0.6 ? 'HIGH' : moodTrend < -0.4 ? 'MEDIUM' : 'LOW'
    patterns.push({
      type: 'MOOD_DECLINE',
      severity,
      metric: 'mood',
      trend: mood.slice(-5),
      change: moodTrend,
      description: `Humöret har dalat de senaste ${checkIns.length} dagarna`,
    })
  }

  // 6. Motivation Drop - Declining motivation
  const motivationTrend = calculateTrend(motivation)
  if (motivationTrend < -0.3) {
    const severity = motivationTrend < -0.6 ? 'HIGH' : motivationTrend < -0.4 ? 'MEDIUM' : 'LOW'
    patterns.push({
      type: 'MOTIVATION_DROP',
      severity,
      metric: 'motivation',
      trend: motivation.slice(-5),
      change: motivationTrend,
      description: `Motivationen har minskat de senaste ${checkIns.length} dagarna`,
    })
  }

  // 7. Overtraining Risk - Combination of high fatigue + high soreness + poor sleep
  const recentFatigue = average(fatigue.slice(-3))
  const recentSoreness = average(soreness.slice(-3))
  const recentSleep = average(sleepQuality.slice(-3))

  if (recentFatigue >= 7 && recentSoreness >= 6 && recentSleep <= 5) {
    const severity =
      recentFatigue >= 8 && recentSoreness >= 7 ? 'HIGH' : recentFatigue >= 7 ? 'MEDIUM' : 'LOW'
    patterns.push({
      type: 'OVERTRAINING_RISK',
      severity,
      metric: 'combined',
      trend: fatigue.slice(-3),
      change: recentFatigue,
      description: 'Hög risk för överträning baserat på kombinerad data',
    })
  }

  // 8. Recovery Needed - Multiple consecutive days of poor readiness
  const readinessScores = checkIns
    .map((c) => c.readinessScore)
    .filter((r): r is number => r !== null)

  if (readinessScores.length >= 3) {
    const recentReadiness = readinessScores.slice(-3)
    const allLow = recentReadiness.every((r) => r < 50)

    if (allLow) {
      const avgReadiness = average(recentReadiness)
      const severity = avgReadiness < 30 ? 'HIGH' : avgReadiness < 40 ? 'MEDIUM' : 'LOW'
      patterns.push({
        type: 'RECOVERY_NEEDED',
        severity,
        metric: 'readinessScore',
        trend: recentReadiness,
        change: avgReadiness,
        description: 'Återhämtning rekommenderas - låg beredskap flera dagar i rad',
      })
    }
  }

  // 9. Positive Trend - Things are improving!
  if (
    sleepTrend > 0.3 &&
    fatigueTrend < -0.2 &&
    moodTrend > 0.2 &&
    patterns.filter((p) => p.type !== 'POSITIVE_TREND').length === 0
  ) {
    patterns.push({
      type: 'POSITIVE_TREND',
      severity: 'LOW', // Positive, so "low" concern
      metric: 'overall',
      trend: sleepQuality.slice(-5),
      change: sleepTrend,
      description: 'Positiv trend! Sömn, energi och humör förbättras',
    })
  }

  return patterns
}

/**
 * Build AI prompt for pattern analysis
 */
function buildPatternAnalysisPrompt(
  athleteName: string,
  patterns: DetectedPattern[],
  recentCheckIns: CheckInData[]
): string {
  const patternDescriptions = patterns
    .map((p) => `- ${p.description} (${p.severity} allvarlighetsgrad)`)
    .join('\n')

  const recentData = recentCheckIns.slice(-5).map((c) => ({
    date: c.date.toISOString().split('T')[0],
    sleep: c.sleepQuality,
    fatigue: c.fatigue,
    soreness: c.soreness,
    mood: c.mood,
  }))

  return `Analysera följande mönster för atleten ${athleteName} och ge personliga rekommendationer.

DETEKTERADE MÖNSTER:
${patternDescriptions}

SENASTE DATA (5 dagar):
${JSON.stringify(recentData, null, 2)}

INSTRUKTIONER:
1. Ge en kort sammanfattning av läget (1-2 meningar)
2. Förklara det viktigaste mönstret enkelt
3. Ge 2-3 konkreta åtgärder atleten kan ta
4. Var stöttande men tydlig om risker

SVARA I JSON-FORMAT (ENDAST JSON, inget annat):
{
  "title": "Kort rubrik (max 6 ord)",
  "summary": "Sammanfattning av läget...",
  "mainInsight": "Huvudinsikt om mönstret...",
  "recommendations": ["Åtgärd 1", "Åtgärd 2", "Åtgärd 3"],
  "urgency": "low" | "medium" | "high"
}

TONALITET: Omsorgsfull, professionell, handlingsorienterad.`
}

/**
 * Generate AI-powered pattern analysis and recommendations
 */
export async function generatePatternAnalysis(
  coachUserId: string,
  athleteName: string,
  patterns: DetectedPattern[],
  recentCheckIns: CheckInData[]
): Promise<{
  title: string
  summary: string
  mainInsight: string
  recommendations: string[]
  urgency: 'low' | 'medium' | 'high'
} | null> {
  const prompt = buildPatternAnalysisPrompt(athleteName, patterns, recentCheckIns)

  try {
    const response = await generateAIResponse(coachUserId, prompt, {
      maxTokens: 500,
      temperature: 0.7,
    })

    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('Failed to parse pattern analysis JSON')
      return null
    }

    return JSON.parse(jsonMatch[0])
  } catch (error) {
    console.error('Error generating pattern analysis:', error)
    return null
  }
}

/**
 * Create a pattern alert notification
 */
export async function createPatternAlert(
  clientId: string,
  coachUserId: string,
  patterns: DetectedPattern[]
): Promise<string | null> {
  // Get client name
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { name: true },
  })

  if (!client) return null

  // Get recent check-ins for context
  const recentCheckIns = await getRecentCheckIns(clientId, 7)

  if (recentCheckIns.length < 3) {
    return null // Not enough data
  }

  // Check if we already sent a pattern alert today
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const existingAlert = await prisma.aINotification.findFirst({
    where: {
      clientId,
      notificationType: 'PATTERN_ALERT',
      createdAt: { gte: today },
    },
  })

  if (existingAlert) {
    return null // Already sent today
  }

  // Determine highest severity
  const highestSeverity = patterns.reduce((max, p) => {
    const severityOrder = { LOW: 1, MEDIUM: 2, HIGH: 3 }
    return severityOrder[p.severity] > severityOrder[max] ? p.severity : max
  }, 'LOW' as 'LOW' | 'MEDIUM' | 'HIGH')

  // Generate AI analysis
  const analysis = await generatePatternAnalysis(
    coachUserId,
    client.name.split(' ')[0],
    patterns,
    recentCheckIns
  )

  // Build notification data
  const priority = highestSeverity === 'HIGH' ? 'HIGH' : highestSeverity === 'MEDIUM' ? 'NORMAL' : 'LOW'

  const contextData = {
    patterns: patterns.map((p) => ({
      type: p.type,
      severity: p.severity,
      description: p.description,
    })),
    recommendations: analysis?.recommendations || [],
    urgency: analysis?.urgency || 'low',
  }

  // Create the notification
  const notification = await prisma.aINotification.create({
    data: {
      clientId,
      notificationType: 'PATTERN_ALERT',
      priority,
      title: analysis?.title || `Mönster upptäckt i din data`,
      message: analysis?.summary || patterns[0].description,
      icon: highestSeverity === 'HIGH' ? 'alert-triangle' : 'trending-down',
      actionUrl: '/athlete/check-in',
      actionLabel: 'Se detaljer',
      contextData,
      triggeredBy: patterns.map((p) => p.type).join(','),
      triggerReason: `Detected ${patterns.length} pattern(s): ${patterns.map((p) => p.type).join(', ')}`,
      scheduledFor: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Expire after 24 hours
    },
  })

  return notification.id
}

/**
 * Analyze all athletes and create pattern alerts
 */
export async function analyzeAllAthletes(): Promise<{
  processed: number
  alertsCreated: number
  errors: number
}> {
  const results = {
    processed: 0,
    alertsCreated: 0,
    errors: 0,
  }

  // Get all athletes with pattern alerts enabled (or default enabled)
  const athletes = await prisma.client.findMany({
    where: {
      athleteAccount: { isNot: null },
    },
    select: {
      id: true,
      userId: true,
    },
  })

  for (const athlete of athletes) {
    results.processed++

    try {
      // Check if pattern alerts are enabled for this athlete
      const prefs = await prisma.aINotificationPreferences.findUnique({
        where: { clientId: athlete.id },
        select: { patternAlertsEnabled: true },
      })

      // Default to enabled if no preferences
      if (prefs && !prefs.patternAlertsEnabled) {
        continue
      }

      // Get recent check-ins
      const checkIns = await getRecentCheckIns(athlete.id, 7)

      if (checkIns.length < 3) {
        continue // Not enough data
      }

      // Detect patterns
      const patterns = detectPatterns(checkIns)

      // Filter to concerning patterns only (exclude positive trends for alerts)
      const concerningPatterns = patterns.filter((p) => p.type !== 'POSITIVE_TREND')

      if (concerningPatterns.length === 0) {
        continue // No concerning patterns
      }

      // Create alert
      const alertId = await createPatternAlert(athlete.id, athlete.userId, concerningPatterns)

      if (alertId) {
        results.alertsCreated++
      }
    } catch (error) {
      results.errors++
      console.error(`Error analyzing athlete ${athlete.id}:`, error)
    }
  }

  return results
}
