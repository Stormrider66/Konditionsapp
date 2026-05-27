import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getRequestedBusinessScope, requireCoach } from '@/lib/auth-utils'
import { getAccessibleTeam } from '@/lib/coach/team-access'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

interface RouteContext {
  params: Promise<{ teamId: string }>
}

const sendTeamMessageSchema = z.object({
  content: z.string().min(1).max(1000),
  target: z.enum(['ALL', 'LOW_READINESS', 'MISSED_WORKOUTS', 'INJURED', 'SELECTED']).default('ALL'),
  clientIds: z.array(z.string().uuid()).optional(),
})

type AppLocale = 'en' | 'sv'

function resolveLocale(language: string | null | undefined): AppLocale {
  return language === 'sv' ? 'sv' : 'en'
}

function teamMessageSubject(teamName: string, locale: AppLocale): string {
  return locale === 'sv' ? `Lagmeddelande: ${teamName}` : `Team message: ${teamName}`
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireCoach()
    const scope = getRequestedBusinessScope(request)
    const { teamId } = await context.params

    const team = await getAccessibleTeam(user.id, teamId, scope.businessSlug)
    if (!team) {
      return NextResponse.json({ success: false, error: 'Team not found' }, { status: 404 })
    }

    const parsed = sendTeamMessageSchema.safeParse(await request.json().catch(() => ({})))
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const members = await prisma.client.findMany({
      where: { teamId },
      select: {
        id: true,
        name: true,
        athleteAccount: {
          select: {
            userId: true,
            user: { select: { language: true } },
          },
        },
        dailyMetrics: {
          where: { date: { gte: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000) } },
          select: { readinessScore: true, date: true },
          orderBy: { date: 'desc' },
          take: 1,
        },
        injuryAssessments: {
          where: {
            status: { in: ['ACTIVE', 'MONITORING'] },
            resolved: false,
          },
          select: { id: true },
          take: 1,
        },
        strengthSessionAssignments: {
          where: {
            assignedDate: { lt: today },
            status: { in: ['PENDING', 'SCHEDULED', 'MODIFIED'] },
          },
          select: { id: true },
          take: 1,
        },
        cardioSessionAssignments: {
          where: {
            assignedDate: { lt: today },
            status: { in: ['PENDING', 'SCHEDULED', 'MODIFIED'] },
          },
          select: { id: true },
          take: 1,
        },
        hybridWorkoutAssignments: {
          where: {
            assignedDate: { lt: today },
            status: { in: ['PENDING', 'SCHEDULED', 'MODIFIED'] },
          },
          select: { id: true },
          take: 1,
        },
      },
    })

    const selectedClientIds = new Set(parsed.data.clientIds ?? [])
    const recipients = members.filter(member => {
      if (!member.athleteAccount?.userId) return false

      switch (parsed.data.target) {
        case 'LOW_READINESS':
          return (member.dailyMetrics[0]?.readinessScore ?? 100) < 40
        case 'MISSED_WORKOUTS':
          return (
            member.strengthSessionAssignments.length > 0 ||
            member.cardioSessionAssignments.length > 0 ||
            member.hybridWorkoutAssignments.length > 0
          )
        case 'INJURED':
          return member.injuryAssessments.length > 0
        case 'SELECTED':
          return selectedClientIds.has(member.id)
        case 'ALL':
        default:
          return true
      }
    })

    const receiverIds = Array.from(new Set(recipients.map(member => member.athleteAccount!.userId)))
    if (receiverIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No athlete accounts matched this target' },
        { status: 400 }
      )
    }

    await prisma.message.createMany({
      data: recipients.map((member) => {
        const receiverId = member.athleteAccount!.userId
        return {
          senderId: user.id,
          receiverId,
          content: parsed.data.content,
          subject: teamMessageSubject(team.name, resolveLocale(member.athleteAccount?.user?.language)),
        }
      }),
    })

    return NextResponse.json({
      success: true,
      sent: receiverIds.length,
      teamName: team.name,
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    logger.error('Failed to send team message', {}, error)
    return NextResponse.json({ success: false, error: 'Failed to send team message' }, { status: 500 })
  }
}
