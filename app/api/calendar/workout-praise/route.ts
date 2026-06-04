import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { canAccessClient, getCurrentUser } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

const requestSchema = z.object({
  clientId: z.string().uuid(),
  kind: z.enum(['cardio', 'strength', 'hybrid', 'agility']),
  assignmentId: z.string().uuid(),
  message: z.string().trim().min(1).max(500).optional(),
})

type AssignmentSummary = {
  athleteId: string
  athleteUserId: string
  athleteName: string
  workoutName: string
  status: string
  completedAt: Date | null
}

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

async function getAssignmentSummary(
  kind: z.infer<typeof requestSchema>['kind'],
  assignmentId: string
): Promise<AssignmentSummary | null> {
  if (kind === 'cardio') {
    const assignment = await prisma.cardioSessionAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        athlete: { select: { id: true, userId: true, name: true } },
        session: { select: { name: true } },
      },
    })
    if (!assignment) return null
    return {
      athleteId: assignment.athleteId,
      athleteUserId: assignment.athlete.userId,
      athleteName: assignment.athlete.name,
      workoutName: assignment.session.name,
      status: assignment.status,
      completedAt: assignment.completedAt,
    }
  }

  if (kind === 'strength') {
    const assignment = await prisma.strengthSessionAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        athlete: { select: { id: true, userId: true, name: true } },
        session: { select: { name: true } },
      },
    })
    if (!assignment) return null
    return {
      athleteId: assignment.athleteId,
      athleteUserId: assignment.athlete.userId,
      athleteName: assignment.athlete.name,
      workoutName: assignment.session.name,
      status: assignment.status,
      completedAt: assignment.completedAt,
    }
  }

  if (kind === 'hybrid') {
    const assignment = await prisma.hybridWorkoutAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        athlete: { select: { id: true, userId: true, name: true } },
        workout: { select: { name: true } },
      },
    })
    if (!assignment) return null
    return {
      athleteId: assignment.athleteId,
      athleteUserId: assignment.athlete.userId,
      athleteName: assignment.athlete.name,
      workoutName: assignment.workout.name,
      status: assignment.status,
      completedAt: assignment.completedAt,
    }
  }

  const assignment = await prisma.agilityWorkoutAssignment.findUnique({
    where: { id: assignmentId },
    include: {
      athlete: { select: { id: true, userId: true, name: true } },
      workout: { select: { name: true } },
    },
  })
  if (!assignment) return null
  return {
    athleteId: assignment.athleteId,
    athleteUserId: assignment.athlete.userId,
    athleteName: assignment.athlete.name,
    workoutName: assignment.workout.name,
    status: assignment.status,
    completedAt: assignment.completedAt,
  }
}

export async function POST(request: NextRequest) {
  let locale: AppLocale = resolveRequestLocale(request)
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
  }
  locale = resolveRequestLocale(request, user.language)

  if (user.role !== 'COACH' && user.role !== 'ADMIN') {
    return NextResponse.json({ error: t(locale, 'Only coaches can send workout feedback', 'Endast coacher kan skicka träningsfeedback') }, { status: 403 })
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: t(locale, 'Invalid workout feedback request', 'Ogiltig begäran om träningsfeedback') }, { status: 400 })
  }

  const { clientId, kind, assignmentId } = parsed.data
  const assignment = await getAssignmentSummary(kind, assignmentId)

  if (!assignment) {
    return NextResponse.json({ error: t(locale, 'Assignment not found', 'Tilldelningen hittades inte') }, { status: 404 })
  }

  if (assignment.athleteId !== clientId) {
    return NextResponse.json({ error: t(locale, 'Assignment does not belong to this athlete', 'Tilldelningen tillhör inte denna atlet') }, { status: 403 })
  }

  const hasAccess = await canAccessClient(user.id, clientId)
  if (!hasAccess) {
    return NextResponse.json({ error: t(locale, 'Forbidden', 'Åtkomst nekad') }, { status: 403 })
  }

  if (assignment.status !== 'COMPLETED' && !assignment.completedAt) {
    return NextResponse.json({ error: t(locale, 'Workout is not completed yet', 'Passet är inte slutfört ännu') }, { status: 400 })
  }

  const message = parsed.data.message || t(locale, `Great work on ${assignment.workoutName}!`, `Bra jobbat med ${assignment.workoutName}!`)
  const coachName = user.name || t(locale, 'Your coach', 'Din coach')
  const title = `${coachName}: ${t(locale, 'Great work', 'Bra jobbat')}`

  const [notification, messageRecord] = await prisma.$transaction([
    prisma.aINotification.create({
      data: {
        clientId,
        notificationType: 'COACH_WORKOUT_PRAISE',
        priority: 'NORMAL',
        title,
        message,
        icon: 'thumbs-up',
        actionLabel: t(locale, 'View workout', 'Visa pass'),
        contextData: {
          kind,
          assignmentId,
          workoutName: assignment.workoutName,
          athleteName: assignment.athleteName,
          coachId: user.id,
          coachName,
        },
        triggeredBy: 'coach',
        triggerReason: t(locale, 'Coach praised a completed workout', 'Coach berömde ett slutfört pass'),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    }),
    prisma.message.create({
      data: {
        senderId: user.id,
        receiverId: assignment.athleteUserId,
        subject: t(locale, `Great work: ${assignment.workoutName}`, `Bra jobbat: ${assignment.workoutName}`),
        content: message,
      },
    }),
  ])

  return NextResponse.json({
    success: true,
    notificationId: notification.id,
    messageId: messageRecord.id,
  })
}
