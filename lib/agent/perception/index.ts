/**
 * Perception System - Orchestrator
 *
 * Collects and synthesizes athlete state from multiple sources.
 * Creates a complete perception snapshot for decision making.
 */

import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import type { PerceptionSnapshot, PatternData, PatternSeverity } from '../types'
import { perceiveReadiness, detectLowReadinessPattern } from './readiness'
import { perceiveTrainingLoad, detectLoadSpike } from './training-load'
import { perceiveInjury, getHighestPainLevel } from './injury'
import { perceiveBehavior, checkEngagementWarnings } from './behavior'
import { logDataAccess } from '../gdpr/audit-logger'
import { canCollectPerception } from '../guardrails/consent'

export * from './readiness'
export * from './training-load'
export * from './injury'
export * from './behavior'

/**
 * Create a complete perception snapshot for an athlete
 */
export async function createPerception(
  clientId: string
): Promise<PerceptionSnapshot> {
  // Check consent before collecting data
  const consent = await prisma.agentConsent.findUnique({
    where: { clientId },
  })

  if (!canCollectPerception(consent)) {
    throw new Error('Consent not granted for perception collection')
  }

  // Log data access
  await logDataAccess(clientId, 'perception', 'Creating perception snapshot', [
    'readiness',
    'trainingLoad',
    'injury',
    'behavior',
    'patterns',
  ])

  // Collect all perception data in parallel
  const [readiness, trainingLoad, injury, behavior] = await Promise.all([
    perceiveReadiness(clientId),
    perceiveTrainingLoad(clientId),
    perceiveInjury(clientId),
    perceiveBehavior(clientId),
  ])

  // Detect patterns
  const patterns = await detectPatterns(clientId, readiness, trainingLoad, injury, behavior)

  const perception: PerceptionSnapshot = {
    clientId,
    perceivedAt: new Date(),
    readiness,
    trainingLoad,
    injury,
    behavior,
    patterns,
  }

  return perception
}

/**
 * Store a perception snapshot in the database
 */
export async function storePerception(
  perception: PerceptionSnapshot
): Promise<string> {
  const stored = await prisma.agentPerception.create({
    data: {
      clientId: perception.clientId,
      perceivedAt: perception.perceivedAt,
      readinessScore: perception.readiness.readinessScore,
      fatigueScore: perception.readiness.fatigueScore,
      sleepScore: perception.readiness.sleepScore,
      stressScore: perception.readiness.stressScore,
      acuteLoad: perception.trainingLoad.acuteLoad,
      chronicLoad: perception.trainingLoad.chronicLoad,
      acwr: perception.trainingLoad.acwr,
      acwrZone: perception.trainingLoad.acwrZone,
      hasActiveInjury: perception.injury.hasActiveInjury,
      hasRestrictions: perception.injury.hasRestrictions,
      checkInStreak: perception.behavior.checkInStreak,
      missedWorkouts7d: perception.behavior.missedWorkouts7d,
      detectedPatterns: perception.patterns.patterns as unknown as Prisma.InputJsonValue,
      patternSeverity: perception.patterns.severity,
      contextSnapshot: {
        readiness: perception.readiness,
        trainingLoad: perception.trainingLoad,
        injury: perception.injury,
        behavior: perception.behavior,
      } as unknown as Prisma.InputJsonValue,
    },
  })

  return stored.id
}

/**
 * Get the latest perception for an athlete
 */
export async function getLatestPerception(
  clientId: string
): Promise<PerceptionSnapshot | null> {
  const stored = await prisma.agentPerception.findFirst({
    where: { clientId },
    orderBy: { perceivedAt: 'desc' },
  })

  if (!stored) return null

  // Reconstruct the perception from stored data
  return {
    clientId: stored.clientId,
    perceivedAt: stored.perceivedAt,
    readiness: {
      readinessScore: stored.readinessScore,
      fatigueScore: stored.fatigueScore,
      sleepScore: stored.sleepScore,
      stressScore: stored.stressScore,
      sources: [], // Not stored, would need to recalculate
    },
    trainingLoad: {
      acuteLoad: stored.acuteLoad ?? 0,
      chronicLoad: stored.chronicLoad ?? 1,
      acwr: stored.acwr ?? 0,
      acwrZone: (stored.acwrZone as 'OPTIMAL' | 'CAUTION' | 'DANGER' | 'CRITICAL') ?? 'OPTIMAL',
      loadTrend: 'STABLE', // Not stored, would need to recalculate
    },
    injury: {
      hasActiveInjury: stored.hasActiveInjury,
      hasRestrictions: stored.hasRestrictions,
      activeInjuries: [], // Not fully stored
      restrictions: [], // Not fully stored
    },
    behavior: {
      checkInStreak: stored.checkInStreak,
      bestStreak: 0, // Not stored
      missedWorkouts7d: stored.missedWorkouts7d,
      completionRate30d: 0, // Not stored
      daysSinceLastLog: 0, // Not stored
    },
    patterns: {
      patterns: (stored.detectedPatterns as Array<{
        type: 'OVERTRAINING' | 'UNDERRECOVERY' | 'MONOTONY' | 'STRAIN_SPIKE' | 'DECLINING_PERFORMANCE' | 'IMPROVING_TREND'
        description: string
        severity: PatternSeverity
        confidence: number
        data: Record<string, unknown>
      }>) ?? [],
      severity: (stored.patternSeverity as PatternSeverity) ?? 'NONE',
    },
  }
}

/**
 * Check if perception is stale (older than 6 hours)
 */
export async function isPerceptionStale(clientId: string): Promise<boolean> {
  const latest = await prisma.agentPerception.findFirst({
    where: { clientId },
    orderBy: { perceivedAt: 'desc' },
    select: { perceivedAt: true },
  })

  if (!latest) return true

  const staleThreshold = 6 * 60 * 60 * 1000 // 6 hours in ms
  const age = Date.now() - latest.perceivedAt.getTime()

  return age > staleThreshold
}

/**
 * Detect patterns from perception components
 */
async function detectPatterns(
  clientId: string,
  readiness: PerceptionSnapshot['readiness'],
  trainingLoad: PerceptionSnapshot['trainingLoad'],
  injury: PerceptionSnapshot['injury'],
  behavior: PerceptionSnapshot['behavior']
): Promise<PatternData> {
  const patterns: PatternData['patterns'] = []
  let maxSeverity: PatternSeverity = 'NONE'

  // Check for load spike
  const loadSpike = await detectLoadSpike(clientId)
  if (loadSpike.hasSpike) {
    const severity = loadSpike.spikePercent >= 100 ? 'CRITICAL' : loadSpike.spikePercent >= 50 ? 'HIGH' : 'MEDIUM'
    patterns.push({
      type: 'STRAIN_SPIKE',
      description: `Training load spike of ${loadSpike.spikePercent.toFixed(0)}%`,
      severity,
      confidence: 0.9,
      data: { spikePercent: loadSpike.spikePercent },
    })
    maxSeverity = compareSeverity(maxSeverity, severity)
  }

  // Check for low readiness pattern
  const lowReadiness = await detectLowReadinessPattern(clientId)
  if (lowReadiness.hasPattern) {
    const severity = lowReadiness.consecutiveLowDays >= 5 ? 'HIGH' : 'MEDIUM'
    patterns.push({
      type: 'UNDERRECOVERY',
      description: `${lowReadiness.consecutiveLowDays} consecutive days of low readiness`,
      severity,
      confidence: 0.85,
      data: {
        consecutiveDays: lowReadiness.consecutiveLowDays,
        averageReadiness: lowReadiness.averageReadiness7d,
      },
    })
    maxSeverity = compareSeverity(maxSeverity, severity)
  }

  // Check for engagement issues
  const engagement = await checkEngagementWarnings(clientId)
  if (engagement.hasWarning && behavior.missedWorkouts7d >= 3) {
    patterns.push({
      type: 'DECLINING_PERFORMANCE',
      description: 'Declining engagement detected',
      severity: 'MEDIUM',
      confidence: 0.7,
      data: {
        missedWorkouts: behavior.missedWorkouts7d,
        daysSinceLastLog: behavior.daysSinceLastLog,
      },
    })
    maxSeverity = compareSeverity(maxSeverity, 'MEDIUM')
  }

  // Check for potential overtraining (high ACWR + low readiness + injury)
  if (
    trainingLoad.acwrZone === 'DANGER' ||
    trainingLoad.acwrZone === 'CRITICAL'
  ) {
    if (
      (readiness.readinessScore !== null && readiness.readinessScore < 50) ||
      injury.hasActiveInjury
    ) {
      patterns.push({
        type: 'OVERTRAINING',
        description: 'Signs of overtraining: high load with low readiness or injury',
        severity: 'HIGH',
        confidence: 0.8,
        data: {
          acwr: trainingLoad.acwr,
          readinessScore: readiness.readinessScore,
          hasInjury: injury.hasActiveInjury,
        },
      })
      maxSeverity = compareSeverity(maxSeverity, 'HIGH')
    }
  }

  return {
    patterns,
    severity: maxSeverity,
  }
}

/**
 * Compare severity levels and return the higher one
 */
function compareSeverity(a: PatternSeverity, b: PatternSeverity): PatternSeverity {
  const order: PatternSeverity[] = ['NONE', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
  return order.indexOf(a) >= order.indexOf(b) ? a : b
}
