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

// Types for completed workouts
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
  overallFeeling: number // 1-10
  energyLevel: number // 1-10
  difficulty: number // 1-10 (perceived vs expected)
  painOrDiscomfort?: string
  notes?: string
  recoveryPlan?: string
}

/**
 * Find recently completed workouts that need check-in prompts
 */
export async function findRecentlyCompletedWorkouts(
  hoursAgo: number = 4
): Promise<CompletedWorkout[]> {
  const cutoffTime = new Date(Date.now() - hoursAgo * 60 * 60 * 1000)
  const workouts: CompletedWorkout[] = []

  // 1. Check StrengthSessionAssignments
  const strengthAssignments = await prisma.strengthSessionAssignment.findMany({
    where: {
      status: 'COMPLETED',
      completedAt: { gte: cutoffTime },
    },
    include: {
      session: { select: { name: true } },
      athlete: { select: { id: true, userId: true } },
    },
  })

  for (const assignment of strengthAssignments) {
    if (assignment.completedAt) {
      workouts.push({
        id: assignment.id,
        type: 'strength',
        name: assignment.session.name,
        workoutType: 'STRENGTH',
        completedAt: assignment.completedAt,
        duration: assignment.duration ?? undefined,
        athleteId: assignment.athleteId,
        coachUserId: assignment.athlete.userId,
      })
    }
  }

  // 2. Check CardioSessionAssignments
  const cardioAssignments = await prisma.cardioSessionAssignment.findMany({
    where: {
      status: 'COMPLETED',
      completedAt: { gte: cutoffTime },
    },
    include: {
      session: { select: { name: true, sessionType: true } },
      athlete: { select: { id: true, userId: true } },
    },
  })

  for (const assignment of cardioAssignments) {
    if (assignment.completedAt) {
      workouts.push({
        id: assignment.id,
        type: 'cardio',
        name: assignment.session.name,
        workoutType: assignment.session.sessionType ?? 'CARDIO',
        completedAt: assignment.completedAt,
        duration: assignment.actualDuration ? Math.floor(assignment.actualDuration / 60) : undefined,
        athleteId: assignment.athleteId,
        coachUserId: assignment.athlete.userId,
      })
    }
  }

  // 3. Check HybridWorkoutAssignments
  const hybridAssignments = await prisma.hybridWorkoutAssignment.findMany({
    where: {
      status: 'COMPLETED',
      completedAt: { gte: cutoffTime },
    },
    include: {
      workout: { select: { name: true, workoutType: true } },
      athlete: { select: { id: true, userId: true } },
    },
  })

  for (const assignment of hybridAssignments) {
    if (assignment.completedAt) {
      workouts.push({
        id: assignment.id,
        type: 'hybrid',
        name: assignment.workout.name,
        workoutType: assignment.workout.workoutType ?? 'HYBRID',
        completedAt: assignment.completedAt,
        athleteId: assignment.athleteId,
        coachUserId: assignment.athlete.userId,
      })
    }
  }

  // 4. Check WorkoutLogs (program-based workouts)
  const workoutLogs = await prisma.workoutLog.findMany({
    where: {
      completed: true,
      completedAt: { gte: cutoffTime },
    },
    include: {
      workout: { select: { name: true, type: true } },
      athlete: { select: { id: true } },
    },
  })

  for (const log of workoutLogs) {
    if (log.completedAt) {
      // Get coach userId from the client
      const client = await prisma.client.findFirst({
        where: { athleteAccount: { userId: log.athleteId } },
        select: { userId: true, id: true },
      })

      if (client) {
        workouts.push({
          id: log.id,
          type: 'program',
          name: log.workout.name,
          workoutType: log.workout.type,
          completedAt: log.completedAt,
          duration: log.duration ?? undefined,
          athleteId: client.id,
          coachUserId: client.userId,
        })
      }
    }
  }

  // Sort by completion time (most recent first)
  return workouts.sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime())
}

/**
 * Check if a post-workout check-in already exists for this workout
 */
async function hasExistingCheckIn(workoutId: string): Promise<boolean> {
  const existing = await prisma.aINotification.findFirst({
    where: {
      notificationType: 'POST_WORKOUT_CHECK',
      triggeredBy: workoutId,
    },
  })
  return !!existing
}

/**
 * Build prompt for generating personalized check-in questions
 */
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

/**
 * Generate AI-powered check-in prompt
 */
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

/**
 * Create a post-workout check-in notification
 */
export async function createPostWorkoutCheckIn(
  workout: CompletedWorkout
): Promise<string | null> {
  // Check if we already sent a check-in for this workout
  if (await hasExistingCheckIn(workout.id)) {
    return null
  }

  // Check if post-workout checks are enabled for this athlete
  const prefs = await prisma.aINotificationPreferences.findUnique({
    where: { clientId: workout.athleteId },
    select: { postWorkoutCheckEnabled: true },
  })

  // Default to enabled if no preferences
  if (prefs && !prefs.postWorkoutCheckEnabled) {
    return null
  }

  // Get athlete name
  const client = await prisma.client.findUnique({
    where: { id: workout.athleteId },
    select: { name: true },
  })

  if (!client) return null

  // Generate AI check-in prompt
  const checkInPrompt = await generateCheckInPrompt(
    workout.coachUserId,
    client.name.split(' ')[0],
    workout
  )

  // Build notification content
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

  // Create the notification
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
      expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000), // Expire after 12 hours
    },
  })

  return notification.id
}

/**
 * Process all recently completed workouts and create check-ins
 */
export async function processPostWorkoutCheckIns(
  hoursAgo: number = 4
): Promise<{
  processed: number
  checkInsCreated: number
  skipped: number
  errors: number
}> {
  const results = {
    processed: 0,
    checkInsCreated: 0,
    skipped: 0,
    errors: 0,
  }

  try {
    const completedWorkouts = await findRecentlyCompletedWorkouts(hoursAgo)
    results.processed = completedWorkouts.length

    for (const workout of completedWorkouts) {
      try {
        const checkInId = await createPostWorkoutCheckIn(workout)

        if (checkInId) {
          results.checkInsCreated++
        } else {
          results.skipped++
        }
      } catch (error) {
        results.errors++
        console.error(`Error creating check-in for workout ${workout.id}:`, error)
      }
    }
  } catch (error) {
    console.error('Error processing post-workout check-ins:', error)
  }

  return results
}

/**
 * Save post-workout feedback from athlete
 */
export async function savePostWorkoutFeedback(
  notificationId: string,
  feedback: PostWorkoutFeedback
): Promise<boolean> {
  try {
    // Get the notification
    const notification = await prisma.aINotification.findUnique({
      where: { id: notificationId },
      select: { clientId: true, contextData: true },
    })

    if (!notification) return false

    // Mark notification as action taken
    await prisma.aINotification.update({
      where: { id: notificationId },
      data: {
        actionTakenAt: new Date(),
        contextData: {
          ...(notification.contextData as object),
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

    // If there was pain/discomfort, we might want to flag it for the coach
    if (feedback.painOrDiscomfort && feedback.painOrDiscomfort.trim().length > 0) {
      // Could create a coach notification here
      console.log(`Athlete reported discomfort: ${feedback.painOrDiscomfort}`)
    }

    return true
  } catch (error) {
    console.error('Error saving post-workout feedback:', error)
    return false
  }
}
