/**
 * Pre-Workout Nudge Generator
 *
 * Generates personalized pre-workout reminders based on:
 * - Upcoming scheduled workouts
 * - Athlete's current readiness (sleep, fatigue, soreness)
 * - Workout type and intensity
 * - Conversation memories
 */

import { prisma } from '@/lib/prisma'
import { generateAIResponse } from '@/lib/ai/ai-service'

// Types for upcoming workouts
interface UpcomingWorkout {
  id: string
  type: 'strength' | 'cardio' | 'hybrid' | 'program'
  name: string
  workoutType?: string
  scheduledFor: Date
  duration?: number
  intensity?: string
  description?: string
}

interface AthleteReadiness {
  sleepHours?: number
  sleepQuality?: number
  fatigue?: number
  soreness?: number
  mood?: number
  readinessScore?: number
}

interface NudgeContext {
  athleteName: string
  workout: UpcomingWorkout
  readiness: AthleteReadiness
  timeUntilWorkout: number // minutes
  recentMemories?: string[]
  locale: AppLocale
}

type AppLocale = 'en' | 'sv'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

function resolveLocale(language: string | null | undefined): AppLocale {
  return language === 'sv' ? 'sv' : 'en'
}

/**
 * Find upcoming workouts for an athlete within a time window
 */
export async function findUpcomingWorkouts(
  clientId: string,
  withinMinutes: number = 180
): Promise<UpcomingWorkout[]> {
  const now = new Date()
  const windowEnd = new Date(now.getTime() + withinMinutes * 60 * 1000)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const workouts: UpcomingWorkout[] = []

  // 1. Check StrengthSessionAssignments
  const strengthAssignments = await prisma.strengthSessionAssignment.findMany({
    where: {
      athleteId: clientId,
      assignedDate: {
        gte: today,
        lt: tomorrow,
      },
      status: { in: ['PENDING', 'SCHEDULED'] },
    },
    include: {
      session: {
        select: {
          name: true,
          description: true,
          estimatedDuration: true,
          phase: true,
        },
      },
    },
  })

  for (const assignment of strengthAssignments) {
    // Estimate workout time - default to morning if no specific time
    const scheduledFor = new Date(assignment.assignedDate)
    scheduledFor.setHours(9, 0, 0, 0) // Default 9 AM

    if (scheduledFor >= now && scheduledFor <= windowEnd) {
      workouts.push({
        id: assignment.id,
        type: 'strength',
        name: assignment.session.name,
        workoutType: 'STRENGTH',
        scheduledFor,
        duration: assignment.session.estimatedDuration ?? undefined,
        intensity: assignment.session.phase ?? undefined,
        description: assignment.session.description ?? undefined,
      })
    }
  }

  // 2. Check CardioSessionAssignments
  const cardioAssignments = await prisma.cardioSessionAssignment.findMany({
    where: {
      athleteId: clientId,
      assignedDate: {
        gte: today,
        lt: tomorrow,
      },
      status: { in: ['PENDING', 'SCHEDULED'] },
    },
    include: {
      session: {
        select: {
          name: true,
          description: true,
          totalDuration: true,
          sport: true,
        },
      },
    },
  })

  for (const assignment of cardioAssignments) {
    const scheduledFor = new Date(assignment.assignedDate)
    scheduledFor.setHours(9, 0, 0, 0)

    if (scheduledFor >= now && scheduledFor <= windowEnd) {
      workouts.push({
        id: assignment.id,
        type: 'cardio',
        name: assignment.session.name,
        workoutType: assignment.session.sport ?? 'CARDIO',
        scheduledFor,
        duration: assignment.session.totalDuration ? Math.floor(assignment.session.totalDuration / 60) : undefined,
        description: assignment.session.description ?? undefined,
      })
    }
  }

  // 3. Check HybridWorkoutAssignments
  const hybridAssignments = await prisma.hybridWorkoutAssignment.findMany({
    where: {
      athleteId: clientId,
      assignedDate: {
        gte: today,
        lt: tomorrow,
      },
      status: { in: ['PENDING', 'SCHEDULED'] },
    },
    include: {
      workout: {
        select: {
          name: true,
          description: true,
          timeCap: true,
          format: true,
        },
      },
    },
  })

  for (const assignment of hybridAssignments) {
    const scheduledFor = new Date(assignment.assignedDate)
    scheduledFor.setHours(9, 0, 0, 0)

    if (scheduledFor >= now && scheduledFor <= windowEnd) {
      workouts.push({
        id: assignment.id,
        type: 'hybrid',
        name: assignment.workout.name,
        workoutType: assignment.workout.format ?? 'HYBRID',
        scheduledFor,
        duration: assignment.workout.timeCap ? Math.floor(assignment.workout.timeCap / 60) : undefined,
        description: assignment.workout.description ?? undefined,
      })
    }
  }

  // 4. Check Program-based workouts (TrainingDay -> Workout)
  const programWorkouts = await prisma.workout.findMany({
    where: {
      day: {
        date: {
          gte: today,
          lt: tomorrow,
        },
        week: {
          program: {
            clientId,
            isActive: true,
          },
        },
      },
      status: { in: ['PLANNED', 'MODIFIED'] },
    },
    include: {
      day: {
        select: { date: true },
      },
    },
  })

  for (const workout of programWorkouts) {
    const scheduledFor = new Date(workout.day.date)
    scheduledFor.setHours(9, 0, 0, 0)

    if (scheduledFor >= now && scheduledFor <= windowEnd) {
      workouts.push({
        id: workout.id,
        type: 'program',
        name: workout.name,
        workoutType: workout.type,
        scheduledFor,
        duration: workout.duration ?? undefined,
        intensity: workout.intensity ?? undefined,
        description: workout.description ?? undefined,
      })
    }
  }

  // Sort by scheduled time
  return workouts.sort((a, b) => a.scheduledFor.getTime() - b.scheduledFor.getTime())
}

/**
 * Get athlete's current readiness from recent check-ins
 */
async function getAthleteReadiness(clientId: string): Promise<AthleteReadiness> {
  const recentCheckIn = await prisma.dailyCheckIn.findFirst({
    where: {
      clientId,
      date: {
        gte: new Date(Date.now() - 48 * 60 * 60 * 1000), // Last 48 hours
      },
    },
    orderBy: { date: 'desc' },
    select: {
      sleepHours: true,
      sleepQuality: true,
      fatigue: true,
      soreness: true,
      mood: true,
    },
  })

  if (!recentCheckIn) {
    return {}
  }

  // Calculate readiness score
  const scores: number[] = []
  if (recentCheckIn.fatigue) scores.push(11 - recentCheckIn.fatigue)
  if (recentCheckIn.soreness) scores.push(11 - recentCheckIn.soreness)
  if (recentCheckIn.mood) scores.push(recentCheckIn.mood)
  if (recentCheckIn.sleepQuality) scores.push(recentCheckIn.sleepQuality)

  const readinessScore = scores.length > 0
    ? scores.reduce((a, b) => a + b, 0) / scores.length
    : undefined

  return {
    sleepHours: recentCheckIn.sleepHours ?? undefined,
    sleepQuality: recentCheckIn.sleepQuality ?? undefined,
    fatigue: recentCheckIn.fatigue ?? undefined,
    soreness: recentCheckIn.soreness ?? undefined,
    mood: recentCheckIn.mood ?? undefined,
    readinessScore,
  }
}

/**
 * Build the prompt for generating a pre-workout nudge
 */
function buildNudgePrompt(context: NudgeContext): string {
  const { athleteName, workout, readiness, timeUntilWorkout, recentMemories, locale } = context

  let readinessSection = ''
  if (readiness.readinessScore !== undefined) {
    readinessSection += `\n- ${t(locale, 'Readiness score', 'Readiness-poäng')}: ${readiness.readinessScore.toFixed(1)}/10`
  }
  if (readiness.sleepHours !== undefined) {
    readinessSection += `\n- ${t(locale, 'Sleep', 'Sömn')}: ${readiness.sleepHours} ${t(locale, 'hours', 'timmar')}`
  }
  if (readiness.fatigue !== undefined) {
    readinessSection += `\n- ${t(locale, 'Fatigue', 'Trötthet')}: ${readiness.fatigue}/10`
  }
  if (readiness.soreness !== undefined) {
    readinessSection += `\n- ${t(locale, 'Muscle soreness', 'Muskelömhet')}: ${readiness.soreness}/10`
  }

  let memorySection = ''
  if (recentMemories && recentMemories.length > 0) {
    memorySection = `\n${t(locale, 'IMPORTANT CONTEXT TO CONSIDER', 'VIKTIGT ATT TA HÄNSYN TILL')}:\n${recentMemories.map((m) => `- ${m}`).join('\n')}`
  }

  const hoursUntil = Math.floor(timeUntilWorkout / 60)
  const minutesUntil = timeUntilWorkout % 60
  const timeString = hoursUntil > 0
    ? locale === 'sv'
      ? `${hoursUntil} timme${hoursUntil > 1 ? 'r' : ''} och ${minutesUntil} minuter`
      : `${hoursUntil} hour${hoursUntil === 1 ? '' : 's'} and ${minutesUntil} minutes`
    : `${minutesUntil} ${t(locale, 'minutes', 'minuter')}`

  if (locale === 'sv') {
    return `Generera en kort, motiverande pre-workout påminnelse för atleten ${athleteName}.

KOMMANDE TRÄNING:
- Pass: ${workout.name}
- Typ: ${workout.workoutType || 'Träning'}
- Tid kvar: ${timeString}
${workout.duration ? `- Längd: ~${workout.duration} minuter` : ''}
${workout.intensity ? `- Intensitet: ${workout.intensity}` : ''}
${workout.description ? `- Beskrivning: ${workout.description}` : ''}

ATLETENS STATUS:${readinessSection || '\n- Ingen check-in data tillgänglig'}
${memorySection}

INSTRUKTIONER:
1. Skriv en kort, personlig påminnelse (max 2-3 meningar)
2. Ge 1-2 förberedande tips baserat på träningstyp och atletens status
3. Om readiness är låg (<6), föreslå anpassningar
4. Var uppmuntrande men realistisk

SVARA I JSON-FORMAT (ENDAST JSON, inget annat):
{
  "title": "Kort rubrik här",
  "message": "Personlig påminnelse här...",
  "tips": ["Tips 1", "Tips 2"],
  "suggestedAdjustment": null eller "Förslag på anpassning om readiness är låg"
}

TONALITET: Energisk, stöttande, fokuserad.`
  }

  return `Generate a short, motivating pre-workout reminder for athlete ${athleteName}.

UPCOMING WORKOUT:
- Workout: ${workout.name}
- Type: ${workout.workoutType || 'Training'}
- Time remaining: ${timeString}
${workout.duration ? `- Duration: ~${workout.duration} minutes` : ''}
${workout.intensity ? `- Intensity: ${workout.intensity}` : ''}
${workout.description ? `- Description: ${workout.description}` : ''}

ATHLETE STATUS:${readinessSection || '\n- No check-in data available'}
${memorySection}

INSTRUCTIONS:
1. Write a short, personal reminder (max 2-3 sentences)
2. Give 1-2 preparation tips based on workout type and athlete status
3. If readiness is low (<6), suggest adaptations
4. Be encouraging but realistic

RESPOND IN JSON FORMAT ONLY:
{
  "title": "Short headline here",
  "message": "Personal reminder here...",
  "tips": ["Tip 1", "Tip 2"],
  "suggestedAdjustment": null or "Suggested adaptation if readiness is low"
}

TONE: Energetic, supportive, focused.`
}

/**
 * Generate a pre-workout nudge for a specific workout
 */
export async function generatePreWorkoutNudge(
  clientId: string,
  coachUserId: string,
  workout: UpcomingWorkout
): Promise<{
  title: string
  message: string
  tips: string[]
  suggestedAdjustment?: string
} | null> {
  // Get client info
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: {
      name: true,
      user: { select: { language: true } },
      athleteAccount: {
        select: {
          user: {
            select: { language: true },
          },
        },
      },
      conversationMemories: {
        where: {
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        orderBy: { importance: 'desc' },
        take: 3,
        select: { content: true },
      },
    },
  })

  if (!client) return null
  const locale = resolveLocale(client.athleteAccount?.user?.language ?? client.user?.language)

  // Get readiness
  const readiness = await getAthleteReadiness(clientId)

  // Calculate time until workout
  const timeUntilWorkout = Math.round(
    (workout.scheduledFor.getTime() - Date.now()) / (60 * 1000)
  )

  // Build context
  const context: NudgeContext = {
    athleteName: client.name.split(' ')[0],
    workout,
    readiness,
    timeUntilWorkout,
    recentMemories: client.conversationMemories.map((m) => m.content),
    locale,
  }

  // Build prompt
  const prompt = buildNudgePrompt(context)

  try {
    // Generate with AI
    const response = await generateAIResponse(coachUserId, prompt, {
      maxTokens: 500,
      temperature: 0.7,
      clientId,
      category: 'athlete_preworkout_nudge',
    })

    // Parse JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('Failed to parse nudge JSON from response')
      return null
    }

    const parsed = JSON.parse(jsonMatch[0])
    return {
      title: parsed.title,
      message: parsed.message,
      tips: parsed.tips || [],
      suggestedAdjustment: parsed.suggestedAdjustment || undefined,
    }
  } catch (error) {
    console.error('Error generating pre-workout nudge:', error)
    return null
  }
}

/**
 * Create and save a pre-workout nudge notification
 */
export async function createPreWorkoutNudge(
  clientId: string,
  coachUserId: string,
  workout: UpcomingWorkout
): Promise<string | null> {
  // Check if we already sent a nudge for this workout today
  const existingNudge = await prisma.aINotification.findFirst({
    where: {
      clientId,
      notificationType: 'PRE_WORKOUT',
      triggeredBy: workout.id,
      createdAt: {
        gte: new Date(new Date().setHours(0, 0, 0, 0)),
      },
    },
  })

  if (existingNudge) {
    return null // Already sent
  }

  const locale = await getClientLocale(clientId)

  // Generate the nudge content
  const nudgeContent = await generatePreWorkoutNudge(clientId, coachUserId, workout)

  if (!nudgeContent) {
    return null
  }

  // Build context data
  const contextData = {
    workoutId: workout.id,
    workoutType: workout.type,
    workoutName: workout.name,
    scheduledFor: workout.scheduledFor.toISOString(),
    tips: nudgeContent.tips,
    suggestedAdjustment: nudgeContent.suggestedAdjustment,
  }

  // Create the notification
  const notification = await prisma.aINotification.create({
    data: {
      clientId,
      notificationType: 'PRE_WORKOUT',
      priority: 'NORMAL',
      title: nudgeContent.title,
      message: nudgeContent.message,
      icon: 'dumbbell',
      actionUrl: `/athlete/workouts/${workout.id}`,
      actionLabel: t(locale, 'View workout', 'Visa träning'),
      contextData,
      triggeredBy: workout.id,
      triggerReason: `Upcoming ${workout.type} workout: ${workout.name}`,
      scheduledFor: new Date(),
      expiresAt: workout.scheduledFor, // Expire when workout starts
    },
  })

  return notification.id
}

async function getClientLocale(clientId: string): Promise<AppLocale> {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: {
      user: { select: { language: true } },
      athleteAccount: {
        select: {
          user: {
            select: { language: true },
          },
        },
      },
    },
  })

  return resolveLocale(client?.athleteAccount?.user?.language ?? client?.user?.language)
}

/**
 * Get active (unread, not expired) notifications for an athlete
 */
export async function getActiveNotifications(clientId: string) {
  return prisma.aINotification.findMany({
    where: {
      clientId,
      dismissedAt: null,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    },
    orderBy: [
      { priority: 'desc' },
      { createdAt: 'desc' },
    ],
  })
}

/**
 * Mark a notification as read
 */
export async function markNotificationAsRead(notificationId: string) {
  return prisma.aINotification.update({
    where: { id: notificationId },
    data: { readAt: new Date() },
  })
}

/**
 * Dismiss a notification
 */
export async function dismissNotification(notificationId: string) {
  return prisma.aINotification.update({
    where: { id: notificationId },
    data: { dismissedAt: new Date() },
  })
}

/**
 * Mark action taken on a notification
 */
export async function markNotificationActionTaken(notificationId: string) {
  return prisma.aINotification.update({
    where: { id: notificationId },
    data: { actionTakenAt: new Date() },
  })
}
