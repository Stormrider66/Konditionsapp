import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

type AlertSeverity = 'MEDIUM' | 'HIGH'

interface AthleteFeedbackInput {
  overallFeeling: number
  energyLevel: number
  difficulty: number
  painOrDiscomfort?: string | null
  notes?: string | null
}

interface CoachAlertClient {
  id: string
  name: string
  userId: string
}

interface CreatePostWorkoutPainCoachAlertInput {
  athleteUserId: string
  client: CoachAlertClient
  notificationId: string
  notificationContextData: Prisma.JsonValue | null
  feedback: AthleteFeedbackInput
  now?: Date
}

interface CreatePostWorkoutPainCoachAlertResult {
  created: boolean
  alertId?: string
  skippedReason?: 'NO_PAIN' | 'SELF_COACHED' | 'DUPLICATE'
  severity?: AlertSeverity
}

const HIGH_RISK_PAIN_PATTERN =
  /\b(sharp|shooting|swelling|swollen|numb|tingling|limp|cannot|unable|acute|worse|severe|skarp|hugg|svullnad|svullen|domning|haltar|akut|varre|svar)\b|can't|kan inte/i

function asJsonRecord(value: Prisma.JsonValue | null | undefined): Record<string, Prisma.JsonValue> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return value as Record<string, Prisma.JsonValue>
}

function asString(value: Prisma.JsonValue | undefined): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined
}

export function getPostWorkoutPainAlertSeverity(feedback: AthleteFeedbackInput): AlertSeverity {
  const pain = feedback.painOrDiscomfort?.trim() ?? ''

  if (
    feedback.overallFeeling <= 3 ||
    feedback.energyLevel <= 3 ||
    feedback.difficulty >= 8 ||
    HIGH_RISK_PAIN_PATTERN.test(pain)
  ) {
    return 'HIGH'
  }

  return 'MEDIUM'
}

export async function createPostWorkoutPainCoachAlert({
  athleteUserId,
  client,
  notificationId,
  notificationContextData,
  feedback,
  now = new Date(),
}: CreatePostWorkoutPainCoachAlertInput): Promise<CreatePostWorkoutPainCoachAlertResult> {
  const pain = feedback.painOrDiscomfort?.trim()
  if (!pain) {
    return { created: false, skippedReason: 'NO_PAIN' }
  }

  if (client.userId === athleteUserId) {
    return { created: false, skippedReason: 'SELF_COACHED' }
  }

  const existing = await prisma.coachAlert.findFirst({
    where: {
      coachId: client.userId,
      clientId: client.id,
      alertType: 'PAIN_MENTION',
      sourceId: notificationId,
      status: { in: ['ACTIVE', 'ACTIONED'] },
    },
    select: { id: true, severity: true },
  })

  if (existing) {
    return {
      created: false,
      alertId: existing.id,
      skippedReason: 'DUPLICATE',
      severity: existing.severity === 'HIGH' ? 'HIGH' : 'MEDIUM',
    }
  }

  const context = asJsonRecord(notificationContextData)
  const workoutName = asString(context.workoutName)
  const workoutId = asString(context.workoutId)
  const workoutType = asString(context.workoutType)
  const completedAt = asString(context.completedAt)
  const severity = getPostWorkoutPainAlertSeverity(feedback)
  const workoutSuffix = workoutName ? ` after ${workoutName}` : ''

  const alert = await prisma.coachAlert.create({
    data: {
      coachId: client.userId,
      clientId: client.id,
      alertType: 'PAIN_MENTION',
      severity,
      title: `${client.name}: Post-workout pain`,
      message: `${client.name} reported pain/discomfort${workoutSuffix}: "${pain}". Overall ${feedback.overallFeeling}/10, energy ${feedback.energyLevel}/10, difficulty ${feedback.difficulty}/10.`,
      contextData: {
        source: 'POST_WORKOUT_FEEDBACK',
        notificationId,
        workoutId: workoutId ?? null,
        workoutName: workoutName ?? null,
        workoutType: workoutType ?? null,
        completedAt: completedAt ?? null,
        feedback: {
          overallFeeling: feedback.overallFeeling,
          energyLevel: feedback.energyLevel,
          difficulty: feedback.difficulty,
          painOrDiscomfort: pain,
          notes: feedback.notes?.trim() || null,
          submittedAt: now.toISOString(),
        },
      },
      sourceId: notificationId,
      expiresAt: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
    },
    select: { id: true },
  })

  return { created: true, alertId: alert.id, severity }
}
