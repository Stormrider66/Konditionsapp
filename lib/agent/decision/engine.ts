/**
 * Decision Engine
 *
 * Core logic for making agent decisions based on perception and preferences.
 */

import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import type {
  PerceptionSnapshot,
  ProposedAction,
  DecisionContext,
  AgentPreferencesData,
  UpcomingWorkout,
  RecentDecision,
  AthleteProfile,
} from '../types'
import { checkSafetyRules, isWorkoutBlocked } from './rules/safety'
import { checkRecoveryRules } from './rules/recovery'
import { calculateConfidence } from './confidence'
import { checkGuardrails } from '../guardrails'
import { logDecisionMade } from '../gdpr/audit-logger'

/**
 * Run the decision engine for an athlete
 */
export async function makeDecisions(
  perception: PerceptionSnapshot
): Promise<ProposedAction[]> {
  const clientId = perception.clientId

  // Build decision context
  const context = await buildDecisionContext(perception)

  // Collect all potential actions
  const allActions: ProposedAction[] = []

  // 1. Safety rules (highest priority, non-negotiable)
  const safetyActions = checkSafetyRules(perception, context.athleteProfile.isAICoached)
  allActions.push(...safetyActions)

  // 2. Recovery rules (if safety rules didn't already cover)
  if (!isWorkoutBlocked(perception).blocked) {
    const recoveryActions = checkRecoveryRules(perception)
    allActions.push(...recoveryActions)
  }

  // 3. Motivational nudges (if check-in streak is strong)
  if (
    perception.behavior.checkInStreak >= 7 &&
    context.preferences.proactiveNudgesEnabled
  ) {
    allActions.push({
      actionType: 'MOTIVATIONAL_NUDGE',
      actionData: {
        type: 'NUDGE' as const,
        nudgeType: 'MOTIVATIONAL' as const,
        message: `Amazing! You've checked in ${perception.behavior.checkInStreak} days in a row. Keep up the great consistency!`,
      },
      reasoning: `Athlete has maintained a ${perception.behavior.checkInStreak}-day check-in streak. Positive reinforcement encourages continued engagement.`,
      confidence: 'HIGH',
      confidenceScore: 0.9,
      priority: 'LOW',
    })
  }

  // 4. Calculate confidence and filter/prioritize actions
  const scoredActions = allActions.map((action) => {
    const { score, level } = calculateConfidence(action, perception)
    return {
      ...action,
      confidence: level,
      confidenceScore: score,
    }
  })

  // 5. Apply guardrails and filter invalid actions
  const consent = await prisma.agentConsent.findUnique({
    where: { clientId },
  })
  const preferences = await prisma.agentPreferences.findUnique({
    where: { clientId },
  })

  const validActions = scoredActions.filter((action) => {
    const guardrailResult = checkGuardrails(
      action,
      perception,
      consent,
      preferences,
      context.athleteProfile.isAICoached
    )
    return guardrailResult.canProceed
  })

  // 6. Deduplicate and prioritize
  const prioritizedActions = deduplicateAndPrioritize(validActions)

  return prioritizedActions
}

/**
 * Store decisions in the database
 */
export async function storeDecisions(
  actions: ProposedAction[],
  perceptionId: string,
  clientId: string
): Promise<string[]> {
  const actionIds: string[] = []

  // Get athlete profile for AI-coached check
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { isAICoached: true, userId: true },
  })
  const isAICoached = client?.isAICoached ?? false
  const coachId = isAICoached ? null : client?.userId

  // Get preferences and consent
  const consent = await prisma.agentConsent.findUnique({
    where: { clientId },
  })
  const preferences = await prisma.agentPreferences.findUnique({
    where: { clientId },
  })

  // Get perception for guardrail check
  const perception = await prisma.agentPerception.findUnique({
    where: { id: perceptionId },
  })

  if (!perception) {
    throw new Error('Perception not found')
  }

  for (const action of actions) {
    // Determine initial status based on guardrails
    const guardrailResult = checkGuardrails(
      action,
      // Reconstruct minimal perception for guardrail check
      {
        clientId,
        perceivedAt: perception.perceivedAt,
        readiness: {
          readinessScore: perception.readinessScore,
          fatigueScore: perception.fatigueScore,
          sleepScore: perception.sleepScore,
          stressScore: perception.stressScore,
          sources: [],
        },
        trainingLoad: {
          acuteLoad: perception.acuteLoad ?? 0,
          chronicLoad: perception.chronicLoad ?? 1,
          acwr: perception.acwr ?? 0,
          acwrZone: (perception.acwrZone ?? 'OPTIMAL') as 'OPTIMAL' | 'CAUTION' | 'DANGER' | 'CRITICAL',
          loadTrend: 'STABLE',
        },
        injury: {
          hasActiveInjury: perception.hasActiveInjury,
          hasRestrictions: perception.hasRestrictions,
          activeInjuries: [],
          restrictions: [],
        },
        behavior: {
          checkInStreak: perception.checkInStreak,
          bestStreak: 0,
          missedWorkouts7d: perception.missedWorkouts7d,
          completionRate30d: 0,
          daysSinceLastLog: 0,
        },
        patterns: {
          patterns: [],
          severity: 'NONE',
        },
      },
      consent,
      preferences,
      isAICoached
    )

    const status = guardrailResult.canAutoApply ? 'AUTO_APPLIED' : 'PROPOSED'

    // Calculate expiry time
    const expiresAt = action.expiresAt ?? new Date(Date.now() + 24 * 60 * 60 * 1000)

    // Create the action
    const stored = await prisma.agentAction.create({
      data: {
        clientId,
        perceptionId,
        actionType: action.actionType,
        actionData: action.actionData as unknown as Prisma.InputJsonValue,
        reasoning: action.reasoning,
        confidence: action.confidence,
        confidenceScore: action.confidenceScore,
        priority: action.priority,
        targetWorkoutId: action.targetWorkoutId,
        targetDate: action.targetDate,
        status,
        decidedAt: status === 'AUTO_APPLIED' ? new Date() : null,
        decidedBy: status === 'AUTO_APPLIED' ? 'SYSTEM' : null,
        expiresAt,
      },
    })

    actionIds.push(stored.id)

    // Log the decision
    await logDecisionMade(
      clientId,
      action.actionType,
      action.reasoning,
      action.confidenceScore,
      stored.id
    )

    // Create oversight item for coach if needed
    if (
      guardrailResult.requiresCoachOversight &&
      coachId &&
      !isAICoached
    ) {
      await prisma.agentOversightItem.create({
        data: {
          coachId,
          clientId,
          actionId: stored.id,
          priority: action.priority,
          category: getOversightCategory(action.actionType),
        },
      })
    }
  }

  return actionIds
}

/**
 * Build the decision context
 */
async function buildDecisionContext(
  perception: PerceptionSnapshot
): Promise<DecisionContext> {
  const clientId = perception.clientId

  // Fetch athlete profile
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: {
      id: true,
      name: true,
      isAICoached: true,
      userId: true,
      sportProfile: {
        select: { primarySport: true },
      },
    },
  })

  // Fetch preferences
  const preferences = await prisma.agentPreferences.findUnique({
    where: { clientId },
  })

  // Fetch upcoming workouts (next 7 days)
  const nextWeek = new Date()
  nextWeek.setDate(nextWeek.getDate() + 7)

  const [strengthAssignments, cardioAssignments] = await Promise.all([
    prisma.strengthSessionAssignment.findMany({
      where: {
        athleteId: clientId,
        assignedDate: { gte: new Date(), lte: nextWeek },
        status: { in: ['PENDING', 'SCHEDULED'] },
      },
      include: { session: true },
      orderBy: { assignedDate: 'asc' },
      take: 10,
    }),
    prisma.cardioSessionAssignment.findMany({
      where: {
        athleteId: clientId,
        assignedDate: { gte: new Date(), lte: nextWeek },
        status: { in: ['PENDING', 'SCHEDULED'] },
      },
      include: { session: true },
      orderBy: { assignedDate: 'asc' },
      take: 10,
    }),
  ])

  const upcomingWorkouts: UpcomingWorkout[] = [
    ...strengthAssignments.map((a) => ({
      id: a.id,
      type: 'STRENGTH',
      scheduledDate: a.assignedDate,
      intensity: 'MODERATE', // Would need to calculate from session
      duration: 60, // Default
      description: a.session.name,
    })),
    ...cardioAssignments.map((a) => ({
      id: a.id,
      type: 'CARDIO',
      scheduledDate: a.assignedDate,
      intensity: 'MODERATE',
      duration: (a.session.totalDuration ?? 3600) / 60,
      description: a.session.name,
    })),
  ].sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime())

  // Fetch recent decisions
  const recentActions = await prisma.agentAction.findMany({
    where: { clientId },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: {
      id: true,
      actionType: true,
      status: true,
      createdAt: true,
    },
  })

  const recentDecisions: RecentDecision[] = recentActions.map((a) => ({
    id: a.id,
    actionType: a.actionType,
    status: a.status,
    createdAt: a.createdAt,
  }))

  // Build athlete profile
  const athleteProfile: AthleteProfile = {
    id: client?.id ?? clientId,
    name: client?.name ?? 'Unknown',
    sport: client?.sportProfile?.primarySport ?? 'GENERAL_FITNESS',
    isAICoached: client?.isAICoached ?? false,
    coachId: client?.isAICoached ? null : client?.userId ?? null,
  }

  // Build preferences data
  const preferencesData: AgentPreferencesData = preferences
    ? {
        autonomyLevel: preferences.autonomyLevel,
        allowWorkoutModification: preferences.allowWorkoutModification,
        allowRestDayInjection: preferences.allowRestDayInjection,
        maxIntensityReduction: preferences.maxIntensityReduction,
        minRestDaysPerWeek: preferences.minRestDaysPerWeek,
        maxConsecutiveHardDays: preferences.maxConsecutiveHardDays,
        dailyBriefingEnabled: preferences.dailyBriefingEnabled,
        proactiveNudgesEnabled: preferences.proactiveNudgesEnabled,
      }
    : {
        autonomyLevel: athleteProfile.isAICoached ? 'SUPERVISED' : 'ADVISORY',
        allowWorkoutModification: athleteProfile.isAICoached,
        allowRestDayInjection: athleteProfile.isAICoached,
        maxIntensityReduction: 20,
        minRestDaysPerWeek: 1,
        maxConsecutiveHardDays: 3,
        dailyBriefingEnabled: true,
        proactiveNudgesEnabled: true,
      }

  return {
    perception,
    preferences: preferencesData,
    upcomingWorkouts,
    recentDecisions,
    athleteProfile,
  }
}

/**
 * Deduplicate and prioritize actions
 */
function deduplicateAndPrioritize(
  actions: ProposedAction[]
): ProposedAction[] {
  // Sort by priority, then confidence
  const priorityOrder = { URGENT: 0, HIGH: 1, NORMAL: 2, LOW: 3 }

  const sorted = [...actions].sort((a, b) => {
    const priorityDiff =
      priorityOrder[a.priority] - priorityOrder[b.priority]
    if (priorityDiff !== 0) return priorityDiff
    return b.confidenceScore - a.confidenceScore
  })

  // Remove duplicates (same action type on same date)
  const seen = new Set<string>()
  const deduplicated: ProposedAction[] = []

  for (const action of sorted) {
    const key = `${action.actionType}-${action.targetDate?.toISOString() ?? 'no-date'}`
    if (!seen.has(key)) {
      seen.add(key)
      deduplicated.push(action)
    }
  }

  // Limit to reasonable number of actions
  return deduplicated.slice(0, 5)
}

/**
 * Get oversight category for an action type
 */
function getOversightCategory(actionType: string): string {
  if (actionType.includes('ESCALATE')) return 'ESCALATION'
  if (actionType.includes('SKIP') || actionType.includes('REST')) return 'SAFETY'
  return 'MODIFICATION'
}
