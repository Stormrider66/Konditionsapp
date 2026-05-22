import { NextRequest, NextResponse } from 'next/server'
import { requireCoach } from '@/lib/auth-utils'
import { getRequestedBusinessScope } from '@/lib/auth/current-user'
import { getAccessibleTeamWhere } from '@/lib/coach/team-access'
import { getStaffRolePreview } from '@/lib/permissions/role-preview-server'
import { prisma } from '@/lib/prisma'
import type { TeamEventType } from '@/lib/team-calendar/event-types'
import { getTeamCalendarPermissionProfile } from '@/lib/team-calendar/permissions'
import { z } from 'zod'

const workoutTypeSchema = z.enum(['STRENGTH', 'CARDIO', 'HYBRID', 'AGILITY'])

const eventTypeForWorkoutType: Record<z.infer<typeof workoutTypeSchema>, TeamEventType> = {
  STRENGTH: 'STRENGTH',
  CARDIO: 'CARDIO',
  HYBRID: 'HYBRID',
  AGILITY: 'AGILITY',
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireCoach()
    const scope = getRequestedBusinessScope(req)
    const { searchParams } = new URL(req.url)
    const parsedType = workoutTypeSchema.safeParse(searchParams.get('workoutType') || 'STRENGTH')

    if (!parsedType.success) {
      return NextResponse.json({ error: 'Invalid workout type' }, { status: 400 })
    }

    const eventType = eventTypeForWorkoutType[parsedType.data]
    const teamWhere = await getAccessibleTeamWhere(user.id, scope.businessSlug)
    const previewRole = await getStaffRolePreview(user.id)

    const teams = await prisma.team.findMany({
      where: teamWhere,
      select: {
        id: true,
        name: true,
        sportType: true,
      },
      orderBy: { name: 'asc' },
    })

    const options = await Promise.all(
      teams.map(async (team) => {
        const permissions = await getTeamCalendarPermissionProfile(user.id, team.id, scope.businessSlug, {
          roleOverride: previewRole,
        })
        if (!permissions?.creatableTypes.includes(eventType)) return null
        return {
          id: team.id,
          name: team.name,
          sportType: team.sportType,
          roleLabel: permissions.roleLabel,
        }
      })
    )

    return NextResponse.json({
      teams: options.filter(Boolean),
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error loading team calendar planning options:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
