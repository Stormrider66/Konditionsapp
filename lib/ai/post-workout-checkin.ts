/**
 * Post-Workout Check-in Service
 *
 * Generates personalized follow-up prompts after completed workouts
 * to gather feedback on:
 * - How the workout felt
 * - Energy levels
 * - Any pain or discomfort
 * - Recovery needs
 */

import { prisma } from '@/lib/prisma'
import { generateAIResponse } from '@/lib/ai/ai-service'
import { logger } from '@/lib/logger'

export interface CompletedWorkout {
  id: string
  type: 'strength' | 'cardio' | 'hybrid' | 'program'
  name: string
  workoutType?: string
  completedAt: Date
  duration?: number
  athleteId: string
  coachUserId: string
}

export interface PostWorkoutFeedback {
  workoutId: string
  workoutType: string
  overallFeeling: number
  energyLevel: number
  difficulty: number
  painOrDiscomfort?: string
  notes?: string
  recoveryPlan?: string
}

type CompletedWorkoutPhase = 'strength' | 'cardio' | 'hybrid' | 'program'
type CompletedWorkoutScanState =
  | { phase: CompletedWorkoutPhase; cursor: string | null }
  | null

export interface PostWorkoutCheckInProcessOptions {
  batchLimit?: number
  pageSize?: number
  concurrency?: number
  executionBudgetMs?: number
}

type CompletedWorkoutPage = {
  workouts: CompletedWorkout[]
  scanned: number
  nextState: CompletedWorkoutScanState
}

type ProcessWorkoutOutcome = 'created' | 'skipped' | 'error'

const DEFAULT_BATCH_LIMIT = 120
const DEFAULT_PAGE_SIZE = 200
const DEFAULT_CONCURRENCY = 6
const DEFAULT_EXECUTION_BUDGET_MS = 4 * 60 * 1000

function nextPhase(phase: CompletedWorkoutPhase): CompletedWorkoutScanState {
  if (phase === 'strength') return { phase: 'cardio', cursor: null }
  if (phase === 'cardio') return { phase: 'hybrid', cursor: null }
  if (phase === 'hybrid') return { phase: 'program', cursor: null }
  return null
}

async function fetchRecentlyCompletedWorkoutsPage(
  state: Exclude<CompletedWorkoutScanState, null>,
  cutoffTime: Date,
  pageSize: number
): Promise<CompletedWorkoutPage> {
  if (state.phase === 'strength') {
    const assignments = await prisma.strengthSessionAssignment.findMany({
      where: {
        status: 'COMPLETED',
        completedAt: { gte: cutoffTime },
      },
      ...(state.cursor
        ? {
            cursor: { id: state.cursor },
            skip: 1,
          }
        : {}),
      take: pageSize,
      orderBy: { id: 'asc' },
      include: {
        session: { select: { name: true } },
        athlete: { select: { id: true, userId: true } },
      },
    })

    return {
      scanned: assignments.length,
      workouts: assignments.flatMap((assignment) =>
        assignment.completedAt
          ? [
              {
                id: assignment.id,
                type: 'strength' as const,
                name: assignment.session.name,
                workoutType: 'STRENGTH',
                completedAt: assignment.completedAt,
                duration: assignment.duration ?? undefined,
                athleteId: assignment.athleteId,
                coachUserId: assignment.athlete.userId,
              },
            ]
          : []
      ),
      nextState:
        assignments.length < pageSize
          ? nextPhase('strength')
          : { phase: 'strength', cursor: assignments[assignments.length - 1].id },
    }
  }

  if (state.phase === 'cardio') {
    const assignments = await prisma.cardioSessionAssignment.findMany({
      where: {
        status: 'COMPLETED',
        completedAt: { gte: cutoffTime },
      },
      ...(state.cursor
        ? {
            cursor: { id: state.cursor },
            skip: 1,
          }
        : {}),
      take: pageSize,
      orderBy: { id: 'asc' },
      include: {
        session: { select: { name: true, sport: true } },
        athlete: { select: { id: true, userId: true } },
      },
    })

    return {
      scanned: assignments.length,
      workouts: assignments.flatMap((assignment) =>
        assignment.completedAt
          ? [
              {
                id: assignment.id,
                type: 'cardio' as const,
                name: assignment.session.name,
                workoutType: assignment.session.sport ?? 'CARDIO',
                completedAt: assignment.completedAt,
                duration: assignment.actualDuration
                  ? Math.floor(assignment.actualDuration / 60)
                  : undefined,
                athleteId: assignment.athleteId,
                coachUserId: assignment.athlete.userId,
              },
            ]
          : []
      ),
      nextState:
        assignments.length < pageSize
          ? nextPhase('cardio')
          : { phase: 'cardio', cursor: assignments[assignments.length - 1].id },
    }
  }

  if (state.phase === 'hybrid') {
    const assignments = await prisma.hybridWorkoutAssignment.findMany({
      where: {
        status: 'COMPLETED',
        completedAt: { gte: cutoffTime },
      },
      ...(state.cursor
        ? {
            cursor: { id: state.cursor },
            skip: 1,
          }
        : {}),
      take: pageSize,
      orderBy: { id: 'asc' },
      include: {
        workout: { select: { name: true, format: true } },
        athlete: { select: { id: true, userId: true } },
      },
    })

    return {
      scanned: assignments.length,
      workouts: assignments.flatMap((assignment) =>
        assignment.completedAt
          ? [
              {
                id: assignment.id,
                type: 'hybrid' as const,
                name: assignment.workout.name,
                workoutType: assignment.workout.format ?? 'HYBRID',
                completedAt: assignment.completedAt,
                athleteId: assignment.athleteId,
                coachUserId: assignment.athlete.userId,
              },
            ]
          : []
      ),
      nextState:
        assignments.length < pageSize
          ? nextPhase('hybrid')
          : { phase: 'hybrid', cursor: assignments[assignments.length - 1].id },
    }
  }

  const workoutLogs = await prisma.workoutLog.findMany({
    where: {
      completed: true,
      completedAt: { gte: cutoffTime },
    },
    ...(state.cursor
      ? {
          cursor: { id: state.cursor },
          skip: 1,
        }
      : {}),
    take: pageSize,
    orderBy: { id: 'asc' },
    include: {
      workout: { select: { name: true, type: true } },
      athlete: {
        select: {
          athleteAccount: {
            select: {
              client: {
                select: {
                  id: true,
                  userId: true,
                },
              },
            },
          },
        },
      },
    },
  })

  return {
    scanned: workoutLogs.length,
    workouts: workoutLogs.flatMap((log) =>
      log.completedAt && log.athlete.athleteAccount?.client
        ? [
            {
              id: log.id,
              type: 'program' as const,
              name: log.workout.name,
              workoutType: log.workout.type,
              completedAt: log.completedAt,
              duration: log.duration ?? undefined,
              athleteId: log.athlete.athleteAccount.client.id,
              coachUserId: log.athlete.athleteAccount.client.userId,
            },
          ]
        : []
    ),
    nextState:
      workoutLogs.length < pageSize
        ? null
        : { phase: 'program', cursor: workoutLogs[workoutLogs.length - 1].id },
  }
}

async function hasExistingCheckIn(workoutId: string): Promise<boolean> {
  const existing = await prisma.aINotification.findFirst({
    where: {
      notificationType: 'POST_WORKOUT_CHECK',
      triggeredBy: workoutId,
    },
  })
  return !!existing
}

function buildCheckInPrompt(
  athleteName: string,
  workout: CompletedWorkout
): string {
  const timeSinceCompletion = Math.floor(
    (Date.now() - workout.completedAt.getTime()) / (60 * 1000)
  )

  return `Generera en kort, personlig post-workout check-in för atleten ${athleteName}.

GENOMFÖRT TRÄNINGSPASS:
- Pass: ${workout.name}
- Typ: ${workout.workoutType || workout.type}
${workout.duration ? `- Längd: ${workout.duration} minuter` : ''}
- Avslutat för: ${timeSinceCompletion} minuter sedan

INSTRUKTIONER:
1. Skriv en kort gratulation/uppmuntran (1 mening)
2. Ställ 2-3 korta frågor om hur passet kändes
3. Fråga om eventuell smärta eller obehag
4. Ge ett kort återhämtningstips anpassat för träningstypen

SVARA I JSON-FORMAT (ENDAST JSON, inget annat):
{
  "title": "Kort rubrik (max 5 ord)",
  "greeting": "Gratulation/uppmuntran här...",
  "questions": [
    "Fråga 1?",
    "Fråga 2?",
    "Fråga 3?"
  ],
  "recoveryTip": "Återhämtningstips här..."
}

TONALITET: Uppmuntrande, intresserad, stöttande.`
}

export async function generateCheckInPrompt(
  coachUserId: string,
  athleteName: string,
  workout: CompletedWorkout
): Promise<{
  title: string
  greeting: string
  questions: string[]
  recoveryTip: string
} | null> {
  const prompt = buildCheckInPrompt(athleteName, workout)

  try {
    const response = await generateAIResponse(coachUserId, prompt, {
      maxTokens: 400,
      temperature: 0.7,
    })

    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('Failed to parse check-in JSON')
      return null
    }

    return JSON.parse(jsonMatch[0])
  } catch (error) {
    console.error('Error generating check-in prompt:', error)
    return null
  }
}

export async function createPostWorkoutCheckIn(
  workout: CompletedWorkout
): Promise<string | null> {
  if (await hasExistingCheckIn(workout.id)) {
    return null
  }

  const prefs = await prisma.aINotificationPreferences.findUnique({
    where: { clientId: workout.athleteId },
    select: { postWorkoutCheckEnabled: true },
  })

  if (prefs && !prefs.postWorkoutCheckEnabled) {
    return null
  }

  const client = await prisma.client.findUnique({
    where: { id: workout.athleteId },
    select: { name: true },
  })

  if (!client) return null

  const checkInPrompt = await generateCheckInPrompt(
    workout.coachUserId,
    client.name.split(' ')[0],
    workout
  )

  const title = checkInPrompt?.title || `Hur gick ${workout.name}?`
  const message = checkInPrompt?.greeting || `Bra jobbat med ${workout.name}! Hur känns kroppen?`

  const contextData = {
    workoutId: workout.id,
    workoutType: workout.type,
    workoutName: workout.name,
    completedAt: workout.completedAt.toISOString(),
    duration: workout.duration,
    questions: checkInPrompt?.questions || [
      'Hur kändes passet överlag?',
      'Hade du tillräckligt med energi?',
      'Känner du någon smärta eller obehag?',
    ],
    recoveryTip: checkInPrompt?.recoveryTip || 'Kom ihåg att dricka vatten och stretcha!',
  }

  const notification = await prisma.aINotification.create({
    data: {
      clientId: workout.athleteId,
      notificationType: 'POST_WORKOUT_CHECK',
      priority: 'NORMAL',
      title,
      message,
      icon: 'clipboard-check',
      actionUrl: `/athlete/feedback/${workout.id}`,
      actionLabel: 'Ge feedback',
      contextData,
      triggeredBy: workout.id,
      triggerReason: `Completed workout: ${workout.name}`,
      scheduledFor: new Date(),
      expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000),
    },
  })

  return notification.id
}

async function processCompletedWorkout(workout: CompletedWorkout): Promise<ProcessWorkoutOutcome> {
  try {
    const checkInId = await createPostWorkoutCheckIn(workout)
    return checkInId ? 'created' : 'skipped'
  } catch (error) {
    logger.error('Error creating post-workout check-in', { workoutId: workout.id }, error)
    return 'error'
  }
}

export async function processPostWorkoutCheckIns(
  hoursAgo: number = 4,
  options: PostWorkoutCheckInProcessOptions = {}
): Promise<{
  scanned: number
  processed: number
  checkInsCreated: number
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
    checkInsCreated: 0,
    skipped: 0,
    errors: 0,
    exhausted: false,
    timedOut: false,
    hasMore: false,
  }

  const cutoffTime = new Date(Date.now() - hoursAgo * 60 * 60 * 1000)
  const startTime = Date.now()

  try {
    let state: CompletedWorkoutScanState = { phase: 'strength', cursor: null }

    while (state && results.processed < batchLimit) {
      if (Date.now() - startTime >= executionBudgetMs) {
        results.timedOut = true
        break
      }

      const page = await fetchRecentlyCompletedWorkoutsPage(state, cutoffTime, pageSize)
      results.scanned += page.scanned
      state = page.nextState

      if (page.workouts.length === 0) {
        continue
      }

      const remainingCapacity = batchLimit - results.processed
      if (page.workouts.length > remainingCapacity) {
        results.hasMore = true
      }
      const workoutsToProcess = page.workouts.slice(0, remainingCapacity)

      for (let i = 0; i < workoutsToProcess.length; i += concurrency) {
        if (Date.now() - startTime >= executionBudgetMs) {
          results.timedOut = true
          break
        }

        const chunk = workoutsToProcess.slice(i, i + concurrency)
        const outcomes = await Promise.all(chunk.map(processCompletedWorkout))

        for (const outcome of outcomes) {
          results.processed++
          if (outcome === 'created') {
            results.checkInsCreated++
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

      if (state !== null) {
        results.hasMore = true
      }
    }

    results.exhausted = state === null
  } catch (error) {
    logger.error('Error processing post-workout check-ins', {}, error)
  }

  return results
}

export async function savePostWorkoutFeedback(
  notificationId: string,
  feedback: PostWorkoutFeedback
): Promise<boolean> {
  try {
    const notification = await prisma.aINotification.findUnique({
      where: { id: notificationId },
      select: { clientId: true, contextData: true },
    })

    if (!notification) return false

    const existingContext = (notification.contextData as object) || {}
    await prisma.aINotification.update({
      where: { id: notificationId },
      data: {
        actionTakenAt: new Date(),
        contextData: {
          ...existingContext,
          feedback: {
            overallFeeling: feedback.overallFeeling,
            energyLevel: feedback.energyLevel,
            difficulty: feedback.difficulty,
            painOrDiscomfort: feedback.painOrDiscomfort,
            notes: feedback.notes,
            submittedAt: new Date().toISOString(),
          },
        },
      },
    })

    if (feedback.painOrDiscomfort && feedback.painOrDiscomfort.trim().length > 0) {
      logger.info('Athlete reported discomfort', { discomfort: feedback.painOrDiscomfort })
    }

    return true
  } catch (error) {
    console.error('Error saving post-workout feedback:', error)
    return false
  }
}
