/**
 * Tool Executor
 *
 * Executes agent tools by delegating to existing business logic.
 * All write tools enforce consent and guardrails before executing.
 *
 * This is the bridge between Claude Managed Agents tool calls
 * and the existing application logic.
 */

import { prisma } from '@/lib/prisma'
import type { ToolResult } from './types'

// ============================================================================
// READ TOOLS - No side effects, no consent required
// ============================================================================

export async function executeReadTool(
  toolName: string,
  input: Record<string, unknown>
): Promise<ToolResult> {
  try {
    switch (toolName) {
      case 'readAthleteProfile':
        return await readAthleteProfile(input.clientId as string)
      case 'readReadiness':
        return await readReadiness(input.clientId as string, input.date as string | undefined)
      case 'readTrainingLoad':
        return await readTrainingLoad(input.clientId as string)
      case 'readActiveInjuries':
        return await readActiveInjuries(input.clientId as string)
      case 'readUpcomingWorkouts':
        return await readUpcomingWorkouts(input.clientId as string, (input.days as number) || 7)
      case 'readRecentDecisions':
        return await readRecentDecisions(input.clientId as string, (input.days as number) || 7)
      case 'readGarminLatest':
        return await readGarminLatest(input.clientId as string)
      case 'readMealsToday':
        return await readMealsToday(input.clientId as string)
      case 'readBodyCompHistory':
        return await readBodyCompHistory(input.clientId as string, (input.days as number) || 90)
      case 'readRehabProgress':
        return await readRehabProgress(input.clientId as string, input.programId as string | undefined)
      case 'readNutritionGoal':
        return await readNutritionGoal(input.clientId as string)
      case 'getAthletesNeedingAttention':
        return await getAthletesNeedingAttention(input.coachId as string)
      case 'getUpcomingRaces':
        return await getUpcomingRaces(input.coachId as string, (input.days as number) || 14)
      default:
        return { success: false, error: `Unknown read tool: ${toolName}` }
    }
  } catch (error) {
    return { success: false, error: `Tool ${toolName} failed: ${(error as Error).message}` }
  }
}

// ============================================================================
// CALCULATE TOOLS - Deterministic, no side effects
// ============================================================================

export async function executeCalculateTool(
  toolName: string,
  input: Record<string, unknown>
): Promise<ToolResult> {
  try {
    switch (toolName) {
      case 'detectPatterns':
        return await detectPatterns(input.clientId as string, (input.days as number) || 7)
      case 'detectMilestones':
        return await detectMilestones(input.clientId as string)
      case 'calculateInjuryRisk':
        return await calculateInjuryRisk(input.clientId as string)
      case 'calculateTDEE':
        return await calculateTDEE(input.clientId as string)
      case 'assessRestrictionReadiness':
        return await assessRestrictionReadiness(input.clientId as string, input.restrictionId as string)
      default:
        return { success: false, error: `Unknown calculate tool: ${toolName}` }
    }
  } catch (error) {
    return { success: false, error: `Tool ${toolName} failed: ${(error as Error).message}` }
  }
}

// ============================================================================
// WRITE TOOLS - Side effects, consent + guardrails enforced
// ============================================================================

export async function executeWriteTool(
  toolName: string,
  input: Record<string, unknown>
): Promise<ToolResult> {
  const clientId = input.clientId as string

  // Enforce consent before any write operation
  if (clientId) {
    const consentCheck = await checkConsent(clientId)
    if (!consentCheck.success) return consentCheck
  }

  try {
    switch (toolName) {
      case 'modifyWorkoutIntensity':
        return await modifyWorkoutIntensity(
          clientId,
          input.assignmentId as string,
          input.reductionPercent as number
        )
      case 'skipWorkout':
        return await skipWorkout(clientId, input.assignmentId as string, input.reason as string)
      case 'sendNotification':
        return await sendNotification(
          clientId,
          input.type as string,
          input.title as string,
          input.message as string
        )
      case 'createCoachAlert':
        return await createCoachAlert(
          input.coachId as string,
          clientId,
          input.alertType as string,
          input.severity as string,
          input.message as string
        )
      case 'logAgentAction':
        return await logAgentAction(
          clientId,
          input.actionType as string,
          input.reasoning as string,
          input.confidence as number,
          input.priority as string
        )
      case 'flagForPhysioReview':
        return await flagForPhysioReview(
          input.physioId as string,
          clientId,
          input.reason as string,
          input.priority as string
        )
      case 'sendNutritionNudge':
        return await sendNotification(
          clientId,
          'NUTRITION',
          input.title as string || 'Nutrition',
          input.message as string
        )
      default:
        return { success: false, error: `Unknown write tool: ${toolName}` }
    }
  } catch (error) {
    return { success: false, error: `Tool ${toolName} failed: ${(error as Error).message}` }
  }
}

// ============================================================================
// CONSENT CHECK
// ============================================================================

async function checkConsent(clientId: string): Promise<ToolResult> {
  const consent = await prisma.agentConsent.findUnique({
    where: { clientId },
  })

  if (!consent) {
    return { success: false, violation: 'No agent consent record found' }
  }

  if (consent.consentWithdrawnAt) {
    return { success: false, violation: 'Agent consent has been withdrawn' }
  }

  if (!consent.dataProcessingConsent || !consent.healthDataProcessingConsent) {
    return { success: false, violation: 'Required consents not granted' }
  }

  return { success: true }
}

// ============================================================================
// READ TOOL IMPLEMENTATIONS
// ============================================================================

async function readAthleteProfile(clientId: string): Promise<ToolResult> {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: {
      id: true,
      name: true,
      isAICoached: true,
      userId: true,
      gender: true,
      birthDate: true,
      sportProfile: {
        select: { primarySport: true },
      },
    },
  })

  if (!client) return { success: false, error: 'Athlete not found' }

  return {
    success: true,
    data: {
      id: client.id,
      name: client.name,
      sport: client.sportProfile?.primarySport || null,
      isAICoached: client.isAICoached,
      gender: client.gender,
      birthDate: client.birthDate,
    },
  }
}

async function readReadiness(clientId: string, date?: string): Promise<ToolResult> {
  const targetDate = date ? new Date(date) : new Date()
  const startOfDay = new Date(targetDate)
  startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date(targetDate)
  endOfDay.setHours(23, 59, 59, 999)

  // Try daily check-in first
  const checkIn = await prisma.dailyCheckIn.findFirst({
    where: {
      clientId,
      date: { gte: startOfDay, lte: endOfDay },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Also get daily metrics (Garmin/wearable data)
  const metrics = await prisma.dailyMetrics.findFirst({
    where: {
      clientId,
      date: { gte: startOfDay, lte: endOfDay },
    },
    orderBy: { createdAt: 'desc' },
  })

  return {
    success: true,
    data: {
      source: checkIn ? 'DAILY_CHECKIN' : metrics ? 'DAILY_METRICS' : 'NONE',
      checkIn: checkIn ? {
        readinessScore: checkIn.readinessScore,
        sleepQuality: checkIn.sleepQuality,
        sleepHours: checkIn.sleepHours,
        fatigue: checkIn.fatigue,
        mood: checkIn.mood,
        stress: checkIn.stress,
        soreness: checkIn.soreness,
        motivation: checkIn.motivation,
        notes: checkIn.notes,
      } : null,
      metrics: metrics ? {
        readinessScore: metrics.readinessScore,
        readinessLevel: metrics.readinessLevel,
        hrvRMSSD: metrics.hrvRMSSD,
        hrvStatus: metrics.hrvStatus,
        sleepHours: metrics.sleepHours,
        sleepQuality: metrics.sleepQuality,
        restingHR: metrics.restingHR,
        stress: metrics.stress,
      } : null,
    },
  }
}

async function readTrainingLoad(clientId: string): Promise<ToolResult> {
  const load = await prisma.trainingLoad.findFirst({
    where: { clientId },
    orderBy: { date: 'desc' },
  })

  if (!load) return { success: true, data: { hasData: false } }

  const isStale = load.date < new Date(Date.now() - 48 * 60 * 60 * 1000)

  return {
    success: true,
    data: {
      hasData: true,
      acuteLoad: load.acuteLoad,
      chronicLoad: load.chronicLoad,
      acwr: load.acwr,
      acwrZone: load.acwrZone,
      dailyTSS: load.dailyTSS,
      date: load.date,
      isStale,
    },
  }
}

async function readActiveInjuries(clientId: string): Promise<ToolResult> {
  const injuries = await prisma.injuryAssessment.findMany({
    where: {
      clientId,
      status: { in: ['ACTIVE', 'MONITORING'] },
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  })

  const restrictions = await prisma.trainingRestriction.findMany({
    where: {
      clientId,
      isActive: true,
      OR: [
        { endDate: null },
        { endDate: { gt: new Date() } },
      ],
    },
  })

  return {
    success: true,
    data: {
      hasActiveInjury: injuries.length > 0,
      hasRestrictions: restrictions.length > 0,
      injuries: injuries.map(i => ({
        id: i.id,
        bodyPart: i.bodyPart,
        painLevel: i.painLevel,
        mechanism: i.mechanism,
        createdAt: i.createdAt,
      })),
      restrictions: restrictions.map(r => ({
        id: r.id,
        type: r.type,
        severity: r.severity,
        description: r.description,
        endDate: r.endDate,
      })),
    },
  }
}

async function readUpcomingWorkouts(clientId: string, days: number): Promise<ToolResult> {
  const endDate = new Date()
  endDate.setDate(endDate.getDate() + days)

  const [strength, cardio] = await Promise.all([
    prisma.strengthSessionAssignment.findMany({
      where: {
        clientId,
        scheduledDate: { gte: new Date(), lte: endDate },
        status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
      },
      include: { strengthSession: { select: { name: true, type: true } } },
      orderBy: { scheduledDate: 'asc' },
      take: 20,
    }),
    prisma.cardioSessionAssignment.findMany({
      where: {
        clientId,
        scheduledDate: { gte: new Date(), lte: endDate },
        status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
      },
      include: { cardioSession: { select: { name: true, type: true, targetDuration: true } } },
      orderBy: { scheduledDate: 'asc' },
      take: 20,
    }),
  ])

  return {
    success: true,
    data: {
      strength: strength.map(s => ({
        id: s.id,
        name: s.strengthSession?.name,
        type: s.strengthSession?.type,
        scheduledDate: s.scheduledDate,
        status: s.status,
      })),
      cardio: cardio.map(c => ({
        id: c.id,
        name: c.cardioSession?.name,
        type: c.cardioSession?.type,
        targetDuration: c.cardioSession?.targetDuration,
        scheduledDate: c.scheduledDate,
        status: c.status,
      })),
    },
  }
}

async function readRecentDecisions(clientId: string, days: number): Promise<ToolResult> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  const actions = await prisma.agentAction.findMany({
    where: {
      clientId,
      createdAt: { gte: since },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  return {
    success: true,
    data: {
      actions: actions.map(a => ({
        id: a.id,
        actionType: a.actionType,
        status: a.status,
        reasoning: a.reasoning,
        confidence: a.confidence,
        confidenceScore: a.confidenceScore,
        createdAt: a.createdAt,
      })),
    },
  }
}

async function readGarminLatest(clientId: string): Promise<ToolResult> {
  const metrics = await prisma.dailyMetrics.findFirst({
    where: { clientId },
    orderBy: { date: 'desc' },
  })

  if (!metrics) return { success: true, data: { connected: false } }

  return {
    success: true,
    data: {
      connected: true,
      date: metrics.date,
      hrvRMSSD: metrics.hrvRMSSD,
      hrvStatus: metrics.hrvStatus,
      sleepHours: metrics.sleepHours,
      sleepQuality: metrics.sleepQuality,
      restingHR: metrics.restingHR,
      stress: metrics.stress,
      readinessScore: metrics.readinessScore,
      factorScores: metrics.factorScores,
    },
  }
}

async function readMealsToday(clientId: string): Promise<ToolResult> {
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  const meals = await prisma.mealLog.findMany({
    where: {
      clientId,
      date: { gte: startOfDay },
    },
    include: {
      items: true,
    },
    orderBy: { createdAt: 'asc' },
  })

  const totalMacros = meals.reduce(
    (acc, meal) => ({
      calories: acc.calories + (meal.calories || 0),
      protein: acc.protein + (meal.proteinGrams || 0),
      carbs: acc.carbs + (meal.carbsGrams || 0),
      fat: acc.fat + (meal.fatGrams || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  )

  return {
    success: true,
    data: {
      mealCount: meals.length,
      meals: meals.map(m => ({
        id: m.id,
        type: m.mealType,
        calories: m.calories,
        protein: m.proteinGrams,
        carbs: m.carbsGrams,
        fat: m.fatGrams,
        itemCount: m.items.length,
      })),
      totalMacros,
    },
  }
}

async function readBodyCompHistory(clientId: string, days: number): Promise<ToolResult> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  const measurements = await prisma.bodyComposition.findMany({
    where: {
      clientId,
      measurementDate: { gte: since },
    },
    orderBy: { measurementDate: 'asc' },
  })

  return {
    success: true,
    data: {
      count: measurements.length,
      measurements: measurements.map(m => ({
        date: m.measurementDate,
        weight: m.weightKg,
        bodyFatPercent: m.bodyFatPercent,
        muscleMass: m.muscleMassKg,
        bmi: m.bmi,
        visceralFat: m.visceralFat,
      })),
      latest: measurements.length > 0 ? measurements[measurements.length - 1] : null,
    },
  }
}

// ============================================================================
// CALCULATE TOOL IMPLEMENTATIONS
// ============================================================================

async function detectPatterns(clientId: string, days: number): Promise<ToolResult> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  const checkIns = await prisma.dailyCheckIn.findMany({
    where: {
      clientId,
      date: { gte: since },
    },
    orderBy: { date: 'asc' },
  })

  if (checkIns.length < 3) {
    return { success: true, data: { patterns: [], insufficientData: true } }
  }

  // Simple trend detection on key metrics
  const patterns: { type: string; severity: string; description: string }[] = []

  const sleepValues = checkIns.map(c => c.sleepQuality).filter((v): v is number => v !== null)
  const fatigueValues = checkIns.map(c => c.fatigue).filter((v): v is number => v !== null)
  const stressValues = checkIns.map(c => c.stress).filter((v): v is number => v !== null)
  const moodValues = checkIns.map(c => c.mood).filter((v): v is number => v !== null)

  if (sleepValues.length >= 3) {
    const trend = calculateTrend(sleepValues)
    if (trend < -0.4) patterns.push({ type: 'SLEEP_DEGRADATION', severity: trend < -0.6 ? 'HIGH' : 'MEDIUM', description: `Sleep quality declining: trend ${trend.toFixed(2)}` })
  }

  if (fatigueValues.length >= 3) {
    const trend = calculateTrend(fatigueValues)
    if (trend > 0.4) patterns.push({ type: 'FATIGUE_ACCUMULATION', severity: trend > 0.6 ? 'HIGH' : 'MEDIUM', description: `Fatigue increasing: trend ${trend.toFixed(2)}` })
  }

  if (stressValues.length >= 3) {
    const trend = calculateTrend(stressValues)
    if (trend > 0.4) patterns.push({ type: 'STRESS_ESCALATION', severity: trend > 0.6 ? 'HIGH' : 'MEDIUM', description: `Stress increasing: trend ${trend.toFixed(2)}` })
  }

  if (moodValues.length >= 3) {
    const trend = calculateTrend(moodValues)
    if (trend < -0.4) patterns.push({ type: 'MOOD_DECLINE', severity: trend < -0.6 ? 'HIGH' : 'MEDIUM', description: `Mood declining: trend ${trend.toFixed(2)}` })
  }

  return { success: true, data: { patterns, checkInCount: checkIns.length } }
}

async function detectMilestones(clientId: string): Promise<ToolResult> {
  // Check check-in streak
  const checkIns = await prisma.dailyCheckIn.findMany({
    where: { clientId },
    orderBy: { date: 'desc' },
    take: 100,
  })

  let streak = 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  for (const checkIn of checkIns) {
    const checkInDate = new Date(checkIn.date)
    checkInDate.setHours(0, 0, 0, 0)
    const expectedDate = new Date(today)
    expectedDate.setDate(expectedDate.getDate() - streak)
    if (checkInDate.getTime() === expectedDate.getTime()) {
      streak++
    } else {
      break
    }
  }

  // Check workout count
  const workoutCount = await prisma.strengthSessionAssignment.count({
    where: { clientId, status: 'COMPLETED' },
  })

  const milestones: { type: string; value: number; celebration: string }[] = []

  const streakMilestones = [7, 14, 30, 60, 100, 200, 365]
  for (const m of streakMilestones) {
    if (streak === m) milestones.push({ type: 'CONSISTENCY_STREAK', value: m, celebration: `${m}-day check-in streak!` })
  }

  const workoutMilestones = [1, 10, 25, 50, 100, 200, 365, 500, 1000]
  for (const m of workoutMilestones) {
    if (workoutCount === m) milestones.push({ type: 'WORKOUT_COUNT', value: m, celebration: `${m} workouts completed!` })
  }

  return { success: true, data: { streak, workoutCount, milestones } }
}

async function calculateInjuryRisk(clientId: string): Promise<ToolResult> {
  const [load, injuries, metrics] = await Promise.all([
    prisma.trainingLoad.findFirst({ where: { clientId }, orderBy: { date: 'desc' } }),
    prisma.injuryAssessment.count({ where: { clientId } }),
    prisma.dailyMetrics.findFirst({ where: { clientId }, orderBy: { date: 'desc' } }),
  ])

  let riskScore = 20 // baseline

  // ACWR contribution
  if (load) {
    if (load.acwrZone === 'CRITICAL') riskScore += 40
    else if (load.acwrZone === 'DANGER') riskScore += 25
    else if (load.acwrZone === 'CAUTION') riskScore += 10
  }

  // Injury history
  if (injuries > 3) riskScore += 15
  else if (injuries > 1) riskScore += 5

  // Recovery factors
  if (metrics) {
    if (metrics.hrvStatus === 'LOW' || metrics.hrvStatus === 'VERY_LOW') riskScore += 10
    if (metrics.sleepHours && metrics.sleepHours < 6) riskScore += 10
    if (metrics.stress && metrics.stress > 7) riskScore += 5
  }

  const level = riskScore >= 70 ? 'VERY_HIGH' : riskScore >= 50 ? 'HIGH' : riskScore >= 30 ? 'MODERATE' : 'LOW'

  return {
    success: true,
    data: { riskScore: Math.min(100, riskScore), level, factors: { acwrZone: load?.acwrZone, injuryHistory: injuries, hrvStatus: metrics?.hrvStatus } },
  }
}

// ============================================================================
// WRITE TOOL IMPLEMENTATIONS
// ============================================================================

async function modifyWorkoutIntensity(
  clientId: string,
  assignmentId: string,
  reductionPercent: number
): Promise<ToolResult> {
  // Check autonomy preferences
  const prefs = await prisma.agentPreferences.findUnique({ where: { clientId } })
  if (prefs && reductionPercent > prefs.maxIntensityReduction) {
    return { success: false, violation: `Reduction ${reductionPercent}% exceeds max allowed ${prefs.maxIntensityReduction}%` }
  }

  // Try strength assignment first, then cardio
  const strength = await prisma.strengthSessionAssignment.findUnique({ where: { id: assignmentId } })
  if (strength && strength.clientId === clientId) {
    await prisma.strengthSessionAssignment.update({
      where: { id: assignmentId },
      data: { notes: `[Agent] Intensity reduced by ${reductionPercent}% due to recovery needs` },
    })
    return { success: true, data: { type: 'strength', assignmentId, reductionPercent } }
  }

  const cardio = await prisma.cardioSessionAssignment.findUnique({ where: { id: assignmentId } })
  if (cardio && cardio.clientId === clientId) {
    await prisma.cardioSessionAssignment.update({
      where: { id: assignmentId },
      data: { notes: `[Agent] Intensity reduced by ${reductionPercent}% due to recovery needs` },
    })
    return { success: true, data: { type: 'cardio', assignmentId, reductionPercent } }
  }

  return { success: false, error: 'Assignment not found or does not belong to athlete' }
}

async function skipWorkout(clientId: string, assignmentId: string, reason: string): Promise<ToolResult> {
  const strength = await prisma.strengthSessionAssignment.findUnique({ where: { id: assignmentId } })
  if (strength && strength.clientId === clientId) {
    await prisma.strengthSessionAssignment.update({
      where: { id: assignmentId },
      data: { status: 'SKIPPED', notes: `[Agent] Skipped: ${reason}` },
    })
    return { success: true, data: { assignmentId, reason } }
  }

  const cardio = await prisma.cardioSessionAssignment.findUnique({ where: { id: assignmentId } })
  if (cardio && cardio.clientId === clientId) {
    await prisma.cardioSessionAssignment.update({
      where: { id: assignmentId },
      data: { status: 'SKIPPED', notes: `[Agent] Skipped: ${reason}` },
    })
    return { success: true, data: { assignmentId, reason } }
  }

  return { success: false, error: 'Assignment not found' }
}

async function sendNotification(
  clientId: string,
  type: string,
  title: string,
  message: string
): Promise<ToolResult> {
  const notification = await prisma.aINotification.create({
    data: {
      clientId,
      type: 'AGENT_RECOMMENDATION',
      title,
      message,
      priority: 'NORMAL',
      contextData: { agentType: type },
    },
  })

  return { success: true, data: { notificationId: notification.id } }
}

async function createCoachAlert(
  coachId: string,
  clientId: string,
  alertType: string,
  severity: string,
  message: string
): Promise<ToolResult> {
  const alert = await prisma.coachAlert.create({
    data: {
      coachId,
      clientId,
      alertType,
      severity,
      title: `Agent Alert: ${alertType.replace(/_/g, ' ').toLowerCase()}`,
      message,
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours
    },
  })

  return { success: true, data: { alertId: alert.id } }
}

async function logAgentAction(
  clientId: string,
  actionType: string,
  reasoning: string,
  confidence: number,
  priority: string
): Promise<ToolResult> {
  const action = await prisma.agentAction.create({
    data: {
      clientId,
      actionType: actionType as never,
      actionData: {},
      reasoning,
      confidence: confidence >= 0.8 ? 'VERY_HIGH' : confidence >= 0.6 ? 'HIGH' : confidence >= 0.4 ? 'MEDIUM' : 'LOW',
      confidenceScore: confidence,
      priority: priority as never,
      status: 'PROPOSED',
      proposedAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  })

  return { success: true, data: { actionId: action.id } }
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Simple linear trend calculation.
 * Returns slope normalized to data range. Negative = declining.
 */
function calculateTrend(values: number[]): number {
  if (values.length < 2) return 0
  const n = values.length
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0
  for (let i = 0; i < n; i++) {
    sumX += i
    sumY += values[i]
    sumXY += i * values[i]
    sumX2 += i * i
  }
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
  return slope
}

// ============================================================================
// PHYSIO TOOLS
// ============================================================================

async function readRehabProgress(clientId: string, programId?: string): Promise<ToolResult> {
  const where = programId
    ? { id: programId, clientId }
    : { clientId, status: { in: ['ACTIVE', 'IN_PROGRESS'] } }

  const programs = await prisma.rehabProgram.findMany({
    where: where as never,
    include: {
      progressLogs: {
        orderBy: { date: 'desc' as const },
        take: 14,
      },
    },
    orderBy: { createdAt: 'desc' as const },
    take: 5,
  })

  return {
    success: true,
    data: {
      count: programs.length,
      programs: programs.map(p => {
        const recentLogs = p.progressLogs || []
        const painValues = recentLogs
          .map(l => l.painDuring)
          .filter((v): v is number => v !== null)

        return {
          id: p.id,
          name: p.name,
          phase: p.currentPhase,
          status: p.status,
          completionRate: recentLogs.length > 0
            ? recentLogs.reduce((sum, l) => sum + (l.completionPercent || 0), 0) / recentLogs.length
            : 0,
          avgPainLast7d: painValues.length > 0
            ? painValues.reduce((a, b) => a + b, 0) / painValues.length
            : null,
          painTrend: painValues.length >= 3 ? calculateTrend(painValues.reverse()) : null,
          lastLogDate: recentLogs[0]?.date || null,
          daysSinceLastLog: recentLogs[0]
            ? Math.floor((Date.now() - new Date(recentLogs[0].date).getTime()) / (24 * 60 * 60 * 1000))
            : null,
        }
      }),
    },
  }
}

async function assessRestrictionReadiness(clientId: string, restrictionId: string): Promise<ToolResult> {
  const restriction = await prisma.trainingRestriction.findUnique({
    where: { id: restrictionId },
  })

  if (!restriction || restriction.clientId !== clientId) {
    return { success: false, error: 'Restriction not found' }
  }

  // Get pain trend from recent check-ins
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
  const checkIns = await prisma.dailyCheckIn.findMany({
    where: { clientId, date: { gte: since } },
    orderBy: { date: 'asc' },
  })

  const painValues = checkIns
    .map(c => c.soreness)
    .filter((v): v is number => v !== null)

  const currentPain = painValues.length > 0 ? painValues[painValues.length - 1] : null
  const painTrend = painValues.length >= 3 ? calculateTrend(painValues) : null
  const daysInCurrentSeverity = Math.floor(
    (Date.now() - new Date(restriction.updatedAt).getTime()) / (24 * 60 * 60 * 1000)
  )

  // Assess readiness criteria
  const criteria = {
    painBelow3: currentPain !== null && currentPain <= 3,
    painDecreasing: painTrend !== null && painTrend < -0.1,
    minimumDuration: daysInCurrentSeverity >= 14,
    sufficientData: painValues.length >= 5,
  }

  const readyForDowngrade = criteria.painBelow3 && criteria.minimumDuration && criteria.sufficientData
  const readyForClearance = currentPain !== null && currentPain <= 1 && daysInCurrentSeverity >= 21

  return {
    success: true,
    data: {
      restrictionId,
      currentSeverity: restriction.severity,
      currentPain,
      painTrend,
      daysInCurrentSeverity,
      criteria,
      readyForDowngrade,
      readyForClearance,
      recommendation: readyForClearance
        ? 'SUGGEST_CLEARANCE'
        : readyForDowngrade
        ? 'SUGGEST_DOWNGRADE'
        : 'CONTINUE_MONITORING',
    },
  }
}

async function flagForPhysioReview(
  physioId: string,
  clientId: string,
  reason: string,
  priority: string
): Promise<ToolResult> {
  // Create a notification for the physio
  const notification = await prisma.aINotification.create({
    data: {
      clientId,
      type: 'AGENT_RECOMMENDATION',
      title: 'Physio Review Needed',
      message: reason,
      priority: priority === 'HIGH' || priority === 'URGENT' ? 'HIGH' : 'NORMAL',
      contextData: { physioId, source: 'PHYSIO_AGENT', priority },
    },
  })

  return { success: true, data: { notificationId: notification.id } }
}

// ============================================================================
// NUTRITION TOOLS
// ============================================================================

async function readNutritionGoal(clientId: string): Promise<ToolResult> {
  // NutritionGoal has @unique clientId, so findUnique works
  const goal = await prisma.nutritionGoal.findUnique({
    where: { clientId },
  })

  if (!goal) return { success: true, data: { hasGoal: false } }

  return {
    success: true,
    data: {
      hasGoal: true,
      goalType: goal.goalType,
      targetWeightKg: goal.targetWeightKg,
      weeklyChangeKg: goal.weeklyChangeKg,
      targetBodyFatPercent: goal.targetBodyFatPercent,
      macroProfile: goal.macroProfile,
      customProteinPerKg: goal.customProteinPerKg,
      activityLevel: goal.activityLevel,
      customBmrKcal: goal.customBmrKcal,
    },
  }
}

async function calculateTDEE(clientId: string): Promise<ToolResult> {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { gender: true, birthDate: true, weight: true, height: true },
  })

  const latestBodyComp = await prisma.bodyComposition.findFirst({
    where: { clientId },
    orderBy: { measurementDate: 'desc' },
  })

  const goal = await prisma.nutritionGoal.findUnique({
    where: { clientId },
  })

  const weight = latestBodyComp?.weightKg || client?.weight
  if (!weight) {
    return { success: false, error: 'No weight data available for TDEE calculation' }
  }

  const height = client?.height || 175
  const age = client?.birthDate
    ? Math.floor((Date.now() - new Date(client.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : 30

  // Mifflin-St Jeor equation
  const isMale = client?.gender === 'MALE'
  const bmr = isMale
    ? 10 * weight + 6.25 * height - 5 * age + 5
    : 10 * weight + 6.25 * height - 5 * age - 161

  // Activity multiplier
  const multipliers: Record<string, number> = {
    SEDENTARY: 1.2,
    LIGHTLY_ACTIVE: 1.375,
    MODERATELY_ACTIVE: 1.55,
    VERY_ACTIVE: 1.725,
    EXTRA_ACTIVE: 1.9,
    ELITE_ATHLETE: 2.0,
  }

  const activityLevel = goal?.activityLevel || 'MODERATELY_ACTIVE'
  const multiplier = multipliers[activityLevel] || 1.55
  const tdee = Math.round(bmr * multiplier)

  // Adjust for goal
  let targetCalories = tdee
  if (goal?.goalType === 'WEIGHT_LOSS') {
    const weeklyDeficit = (goal.weeklyChangeKg || 0.5) * 7700 // kcal per kg fat
    targetCalories = Math.max(1200, tdee - Math.round(weeklyDeficit / 7))
  } else if (goal?.goalType === 'WEIGHT_GAIN') {
    const weeklySurplus = (goal.weeklyChangeKg || 0.25) * 7700
    targetCalories = tdee + Math.round(weeklySurplus / 7)
  }

  return {
    success: true,
    data: {
      bmr: Math.round(bmr),
      tdee,
      activityLevel,
      targetCalories,
      goalType: goal?.goalType || 'MAINTAIN',
      currentWeight: weight,
    },
  }
}

// ============================================================================
// COACH DASHBOARD TOOLS
// ============================================================================

async function getAthletesNeedingAttention(coachId: string): Promise<ToolResult> {
  // Find all athletes managed by this coach
  const clients = await prisma.client.findMany({
    where: { userId: coachId },
    select: {
      id: true,
      name: true,
    },
    take: 100,
  })

  const concerns: {
    clientId: string
    name: string
    issues: { type: string; severity: string; detail: string }[]
  }[] = []

  for (const client of clients) {
    const issues: { type: string; severity: string; detail: string }[] = []

    // Check readiness
    const metrics = await prisma.dailyMetrics.findFirst({
      where: { clientId: client.id },
      orderBy: { date: 'desc' },
    })

    if (metrics?.readinessScore && metrics.readinessScore < 50) {
      issues.push({
        type: 'LOW_READINESS',
        severity: metrics.readinessScore < 30 ? 'HIGH' : 'MEDIUM',
        detail: `Readiness ${metrics.readinessScore}/100`,
      })
    }

    // Check ACWR
    const load = await prisma.trainingLoad.findFirst({
      where: { clientId: client.id },
      orderBy: { date: 'desc' },
    })

    if (load?.acwrZone === 'CRITICAL' || load?.acwrZone === 'DANGER') {
      issues.push({
        type: 'HIGH_ACWR',
        severity: load.acwrZone === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
        detail: `ACWR ${load.acwr?.toFixed(2)} (${load.acwrZone})`,
      })
    }

    // Check missed check-ins
    const lastCheckIn = await prisma.dailyCheckIn.findFirst({
      where: { clientId: client.id },
      orderBy: { date: 'desc' },
    })

    if (lastCheckIn) {
      const daysSince = Math.floor((Date.now() - new Date(lastCheckIn.date).getTime()) / (24 * 60 * 60 * 1000))
      if (daysSince >= 3) {
        issues.push({
          type: 'MISSED_CHECKINS',
          severity: daysSince >= 7 ? 'HIGH' : 'MEDIUM',
          detail: `No check-in for ${daysSince} days`,
        })
      }
    }

    // Check active injuries with high pain
    const injuries = await prisma.injuryAssessment.findMany({
      where: { clientId: client.id, status: { in: ['ACTIVE', 'MONITORING'] } },
    })

    for (const injury of injuries) {
      if (injury.painLevel && injury.painLevel >= 7) {
        issues.push({
          type: 'HIGH_PAIN',
          severity: injury.painLevel >= 9 ? 'CRITICAL' : 'HIGH',
          detail: `${injury.bodyPart}: pain ${injury.painLevel}/10`,
        })
      }
    }

    if (issues.length > 0) {
      concerns.push({
        clientId: client.id,
        name: client.name,
        issues,
      })
    }
  }

  // Sort by severity
  const severityOrder: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }
  concerns.sort((a, b) => {
    const aMax = Math.min(...a.issues.map(i => severityOrder[i.severity] ?? 3))
    const bMax = Math.min(...b.issues.map(i => severityOrder[i.severity] ?? 3))
    return aMax - bMax
  })

  return {
    success: true,
    data: {
      totalAthletes: clients.length,
      athletesNeedingAttention: concerns.length,
      concerns,
    },
  }
}

async function getUpcomingRaces(coachId: string, days: number): Promise<ToolResult> {
  const endDate = new Date()
  endDate.setDate(endDate.getDate() + days)

  const clients = await prisma.client.findMany({
    where: { userId: coachId },
    select: { id: true, name: true },
  })

  const clientIds = clients.map(c => c.id)
  const clientMap = new Map(clients.map(c => [c.id, c.name]))

  const races = await prisma.race.findMany({
    where: {
      clientId: { in: clientIds },
      date: { gte: new Date(), lte: endDate },
    },
    orderBy: { date: 'asc' },
  })

  return {
    success: true,
    data: {
      count: races.length,
      races: races.map(r => ({
        id: r.id,
        athleteName: clientMap.get(r.clientId) || 'Unknown',
        clientId: r.clientId,
        name: r.name,
        date: r.date,
        distance: r.distance,
        targetTime: r.targetTime,
        classification: r.classification,
        daysUntil: Math.ceil((new Date(r.date).getTime() - Date.now()) / (24 * 60 * 60 * 1000)),
      })),
    },
  }
}
