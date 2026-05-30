import { NextRequest, NextResponse } from 'next/server'
import { requireCoach, getRequestedBusinessScope } from '@/lib/auth-utils'
import { getAccessibleTeam } from '@/lib/coach/team-access'
import { prisma } from '@/lib/prisma'

interface RouteContext {
  params: Promise<{ teamId: string }>
}

type AppLocale = 'en' | 'sv'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

function dayBounds(dateParam: string | null) {
  const dayStart = dateParam ? new Date(dateParam) : new Date()
  if (Number.isNaN(dayStart.getTime())) return null
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(dayStart)
  dayEnd.setDate(dayEnd.getDate() + 1)
  return { dayStart, dayEnd }
}

function assignmentPriority(status: string): number {
  if (status === 'COMPLETED') return 3
  if (status === 'SKIPPED') return 4
  return 1
}

export async function GET(request: NextRequest, context: RouteContext) {
  let locale: AppLocale = 'en'

  try {
    const user = await requireCoach()
    locale = user.language === 'sv' ? 'sv' : 'en'
    const { teamId } = await context.params
    const scope = getRequestedBusinessScope(request)
    const bounds = dayBounds(request.nextUrl.searchParams.get('date'))

    if (!bounds) {
      return NextResponse.json(
        { success: false, error: t(locale, 'Invalid date', 'Ogiltigt datum') },
        { status: 400 }
      )
    }

    const team = await getAccessibleTeam(user.id, teamId, scope.businessSlug)
    if (!team) {
      return NextResponse.json(
        { success: false, error: t(locale, 'Team not found', 'Laget hittades inte') },
        { status: 404 }
      )
    }

    const members = await prisma.client.findMany({
      where: {
        teamId,
        ...(scope.businessSlug ? { business: { slug: scope.businessSlug } } : {}),
      },
      select: {
        id: true,
        name: true,
        jerseyNumber: true,
        position: true,
        photoUrl: true,
      },
      orderBy: [
        { jerseyNumber: 'asc' },
        { name: 'asc' },
      ],
    })

    const memberIds = members.map((member) => member.id)
    const assignments = memberIds.length === 0
      ? []
      : await prisma.strengthSessionAssignment.findMany({
          where: {
            athleteId: { in: memberIds },
            assignedDate: { gte: bounds.dayStart, lt: bounds.dayEnd },
          },
          select: {
            id: true,
            athleteId: true,
            assignedDate: true,
            startTime: true,
            endTime: true,
            status: true,
            _count: { select: { setLogs: true } },
            session: {
              select: {
                id: true,
                name: true,
                estimatedDuration: true,
              },
            },
          },
          orderBy: [
            { startTime: 'asc' },
            { createdAt: 'asc' },
          ],
        })

    const assignmentByAthlete = new Map<string, (typeof assignments)[number]>()
    for (const assignment of assignments) {
      const current = assignmentByAthlete.get(assignment.athleteId)
      if (!current) {
        assignmentByAthlete.set(assignment.athleteId, assignment)
        continue
      }
      if (assignmentPriority(assignment.status) < assignmentPriority(current.status)) {
        assignmentByAthlete.set(assignment.athleteId, assignment)
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        team: {
          id: team.id,
          name: team.name,
        },
        date: bounds.dayStart.toISOString(),
        members: members.map((member) => {
          const assignment = assignmentByAthlete.get(member.id)
          return {
            id: member.id,
            name: member.name,
            jerseyNumber: member.jerseyNumber,
            position: member.position,
            photoUrl: member.photoUrl,
            assignment: assignment
              ? {
                  id: assignment.id,
                  status: assignment.status,
                  assignedDate: assignment.assignedDate,
                  startTime: assignment.startTime,
                  endTime: assignment.endTime,
                  loggedSets: assignment._count.setLogs,
                  session: assignment.session,
                }
              : null,
          }
        }),
      },
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { success: false, error: t(locale, 'Unauthorized', 'Obehörig') },
        { status: 401 }
      )
    }
    console.error('Error loading team kiosk:', error)
    return NextResponse.json(
      { success: false, error: t(locale, 'Failed to load kiosk', 'Kunde inte ladda kiosk-läget') },
      { status: 500 }
    )
  }
}
