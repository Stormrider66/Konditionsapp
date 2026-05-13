import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { canAccessClient, getCurrentUser } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

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
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (user.role !== 'COACH' && user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Only coaches can send workout feedback' }, { status: 403 })
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid workout feedback request' }, { status: 400 })
  }

  const { clientId, kind, assignmentId } = parsed.data
  const assignment = await getAssignmentSummary(kind, assignmentId)

  if (!assignment) {
    return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
  }

  if (assignment.athleteId !== clientId) {
    return NextResponse.json({ error: 'Assignment does not belong to this athlete' }, { status: 403 })
  }

  const hasAccess = await canAccessClient(user.id, clientId)
  if (!hasAccess) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (assignment.status !== 'COMPLETED' && !assignment.completedAt) {
    return NextResponse.json({ error: 'Workout is not completed yet' }, { status: 400 })
  }

  const message = parsed.data.message || `Bra jobbat med ${assignment.workoutName}!`
  const coachName = user.name || 'Din coach'
  const title = `${coachName}: Bra jobbat`

  const [notification, messageRecord] = await prisma.$transaction([
    prisma.aINotification.create({
      data: {
        clientId,
        notificationType: 'COACH_WORKOUT_PRAISE',
        priority: 'NORMAL',
        title,
        message,
        icon: 'thumbs-up',
        actionLabel: 'Visa pass',
        contextData: {
          kind,
          assignmentId,
          workoutName: assignment.workoutName,
          athleteName: assignment.athleteName,
          coachId: user.id,
          coachName,
        },
        triggeredBy: 'coach',
        triggerReason: 'Coach praised a completed workout',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    }),
    prisma.message.create({
      data: {
        senderId: user.id,
        receiverId: assignment.athleteUserId,
        subject: `Bra jobbat: ${assignment.workoutName}`,
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
