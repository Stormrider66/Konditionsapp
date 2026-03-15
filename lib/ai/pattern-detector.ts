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
import { logger } from '@/lib/logger'

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
  trend: number[]
  change: number
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

export interface PatternDetectionOptions {
  batchLimit?: number
  pageSize?: number
  concurrency?: number
  executionBudgetMs?: number
}

type AthleteCandidate = {
  id: string
  userId: string
}

type PatternDetectionOutcome = 'created' | 'skipped' | 'error'

const DEFAULT_BATCH_LIMIT = 120
const DEFAULT_PAGE_SIZE = 200
const DEFAULT_CONCURRENCY = 6
const DEFAULT_EXECUTION_BUDGET_MS = 4 * 60 * 1000

export async function getRecentCheckIns(
  clientId: string,
  days: number = 7
): Promise<CheckInData[]> {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  startDate.setHours(0, 0, 0, 0)

  return prisma.dailyCheckIn.findMany({
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
}

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

function average(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((a, b) => a + b, 0) / values.length
}

export function detectPatterns(checkIns: CheckInData[]): DetectedPattern[] {
  if (checkIns.length < 3) {
    return []
  }

  const patterns: DetectedPattern[] = []

  const sleepQuality = checkIns.map((c) => c.sleepQuality)
  const soreness = checkIns.map((c) => c.soreness)
  const fatigue = checkIns.map((c) => c.fatigue)
  const stress = checkIns.map((c) => c.stress)
  const mood = checkIns.map((c) => c.mood)
  const motivation = checkIns.map((c) => c.motivation)

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

  if (
    sleepTrend > 0.3 &&
    fatigueTrend < -0.2 &&
    moodTrend > 0.2 &&
    patterns.filter((p) => p.type !== 'POSITIVE_TREND').length === 0
  ) {
    patterns.push({
      type: 'POSITIVE_TREND',
      severity: 'LOW',
      metric: 'overall',
      trend: sleepQuality.slice(-5),
      change: sleepTrend,
      description: 'Positiv trend! Sömn, energi och humör förbättras',
    })
  }

  return patterns
}

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

export async function createPatternAlert(
  clientId: string,
  coachUserId: string,
  patterns: DetectedPattern[]
): Promise<string | null> {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { name: true },
  })

  if (!client) return null

  const recentCheckIns = await getRecentCheckIns(clientId, 7)
  if (recentCheckIns.length < 3) {
    return null
  }

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
    return null
  }

  const highestSeverity = patterns.reduce((max, p) => {
    const severityOrder = { LOW: 1, MEDIUM: 2, HIGH: 3 }
    return severityOrder[p.severity] > severityOrder[max] ? p.severity : max
  }, 'LOW' as 'LOW' | 'MEDIUM' | 'HIGH')

  const analysis = await generatePatternAnalysis(
    coachUserId,
    client.name.split(' ')[0],
    patterns,
    recentCheckIns
  )

  const priority =
    highestSeverity === 'HIGH' ? 'HIGH' : highestSeverity === 'MEDIUM' ? 'NORMAL' : 'LOW'

  const contextData = {
    patterns: patterns.map((p) => ({
      type: p.type,
      severity: p.severity,
      description: p.description,
    })),
    recommendations: analysis?.recommendations || [],
    urgency: analysis?.urgency || 'low',
  }

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
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  })

  return notification.id
}

async function processAthletePatternDetection(
  athlete: AthleteCandidate
): Promise<PatternDetectionOutcome> {
  try {
    const prefs = await prisma.aINotificationPreferences.findUnique({
      where: { clientId: athlete.id },
      select: { patternAlertsEnabled: true },
    })

    if (prefs && !prefs.patternAlertsEnabled) {
      return 'skipped'
    }

    const checkIns = await getRecentCheckIns(athlete.id, 7)
    if (checkIns.length < 3) {
      return 'skipped'
    }

    const patterns = detectPatterns(checkIns)
    const concerningPatterns = patterns.filter((p) => p.type !== 'POSITIVE_TREND')
    if (concerningPatterns.length === 0) {
      return 'skipped'
    }

    const alertId = await createPatternAlert(athlete.id, athlete.userId, concerningPatterns)
    return alertId ? 'created' : 'skipped'
  } catch (error) {
    logger.error('Error analyzing athlete patterns', { athleteId: athlete.id }, error)
    return 'error'
  }
}

export async function analyzeAllAthletes(
  options: PatternDetectionOptions = {}
): Promise<{
  scanned: number
  processed: number
  alertsCreated: number
  skipped: number
  errors: number
  exhausted: boolean
  timedOut: boolean
  hasMore: boolean
}> {
  const batchLimit = options.batchLimit ?? DEFAULT_BATCH_LIMIT
  const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE
  const concurrency = options.concurrency ?? DEFAULT_CONCURRENCY
  const executionBudgetMs = options.executionBudgetMs ?? DEFAULT_EXECUTION_BUDGET_MS

  const results = {
    scanned: 0,
    processed: 0,
    alertsCreated: 0,
    skipped: 0,
    errors: 0,
    exhausted: false,
    timedOut: false,
    hasMore: false,
  }

  const startTime = Date.now()

  try {
    let cursor: string | null = null

    while (results.processed < batchLimit) {
      if (Date.now() - startTime >= executionBudgetMs) {
        results.timedOut = true
        break
      }

      const athletes: AthleteCandidate[] = await prisma.client.findMany({
        where: {
          athleteAccount: { isNot: null },
        },
        ...(cursor
          ? {
              cursor: { id: cursor },
              skip: 1,
            }
          : {}),
        take: pageSize,
        orderBy: { id: 'asc' },
        select: {
          id: true,
          userId: true,
        },
      })

      if (athletes.length === 0) {
        results.exhausted = true
        break
      }

      results.scanned += athletes.length
      cursor = athletes[athletes.length - 1].id

      const remainingCapacity = batchLimit - results.processed
      if (athletes.length > remainingCapacity) {
        results.hasMore = true
      }
      const athletesToProcess = athletes.slice(0, remainingCapacity)

      for (let i = 0; i < athletesToProcess.length; i += concurrency) {
        if (Date.now() - startTime >= executionBudgetMs) {
          results.timedOut = true
          break
        }

        const chunk = athletesToProcess.slice(i, i + concurrency)
        const outcomes = await Promise.all(chunk.map(processAthletePatternDetection))

        for (const outcome of outcomes) {
          results.processed++
          if (outcome === 'created') {
            results.alertsCreated++
          } else if (outcome === 'skipped') {
            results.skipped++
          } else {
            results.errors++
          }
        }

        if (results.processed >= batchLimit) {
          break
        }
      }

      if (results.timedOut) {
        break
      }

      if (athletes.length < pageSize) {
        results.exhausted = true
        break
      }

      results.hasMore = true
    }

    return results
  } catch (error) {
    logger.error('Pattern detection failed', {}, error)
    return results
  }
}
