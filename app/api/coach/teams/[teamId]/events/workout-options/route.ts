import { NextRequest, NextResponse } from 'next/server'
import { requireCoach } from '@/lib/auth-utils'
import { getRequestedBusinessScope } from '@/lib/auth/current-user'
import { getAccessibleTeam } from '@/lib/coach/team-access'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

interface RouteContext {
  params: Promise<{ teamId: string }>
}

const workoutTypeSchema = z.enum(['STRENGTH', 'CARDIO', 'HYBRID', 'AGILITY'])

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const user = await requireCoach()
    const { teamId } = await context.params
    const scope = getRequestedBusinessScope(req)
    const team = await getAccessibleTeam(user.id, teamId, scope.businessSlug)

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    const { searchParams } = new URL(req.url)
    const parsedType = workoutTypeSchema.safeParse(searchParams.get('type') || 'STRENGTH')
    if (!parsedType.success) {
      return NextResponse.json({ error: 'Invalid workout type' }, { status: 400 })
    }

    const search = searchParams.get('search')?.trim()
    const searchWhere = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { description: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}
    const ownershipWhere = {
      OR: [
        { coachId: user.id },
        { isPublic: true },
      ],
    }

    if (parsedType.data === 'STRENGTH') {
      const workouts = await prisma.strengthSession.findMany({
        where: { AND: [ownershipWhere, searchWhere] },
        select: { id: true, name: true, description: true, estimatedDuration: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
        take: 30,
      })
      return NextResponse.json({ workouts })
    }

    if (parsedType.data === 'CARDIO') {
      const workouts = await prisma.cardioSession.findMany({
        where: { AND: [ownershipWhere, searchWhere] },
        select: { id: true, name: true, description: true, totalDuration: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
        take: 30,
      })
      return NextResponse.json({ workouts })
    }

    if (parsedType.data === 'HYBRID') {
      const workouts = await prisma.hybridWorkout.findMany({
        where: {
          AND: [
            {
              OR: [
                { coachId: user.id },
                { isPublic: true },
                { coachId: null },
              ],
            },
            searchWhere,
          ],
        },
        select: { id: true, name: true, description: true, timeCap: true, updatedAt: true },
        orderBy: [{ isBenchmark: 'desc' }, { updatedAt: 'desc' }],
        take: 30,
      })
      return NextResponse.json({ workouts })
    }

    const workouts = await prisma.agilityWorkout.findMany({
      where: { AND: [ownershipWhere, searchWhere] },
      select: { id: true, name: true, description: true, totalDuration: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
      take: 30,
    })
    return NextResponse.json({ workouts })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error loading team event workout options:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
