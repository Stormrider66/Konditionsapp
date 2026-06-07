/**
 * Program Importer — Save Exercise Alias
 *
 * POST /api/programs/save-exercise-alias
 *
 * Records a confirmed "this name means that exercise" mapping so that the
 * resolver short-circuits the same name on future imports.
 *
 * Scope: coach-owned. Athletes saving from the self-only import flow write
 * the alias under their coach's id, so all athletes sharing a coach benefit
 * from each other's picks.
 *
 * Body: { alias: string, exerciseId: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, handleApiError } from '@/lib/api/utils'
import { canAccessCoachPlatform } from '@/lib/user-capabilities'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { rateLimitJsonResponse } from '@/lib/api/rate-limit'
import { prisma } from '@/lib/prisma'

const BUSINESS_EXERCISE_ROLES = [
  'OWNER',
  'ADMIN',
  'COACH',
  'PHYSICAL_TRAINER',
  'ASSISTANT_COACH',
  'PHYSIO',
]

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()

    const limited = await rateLimitJsonResponse(
      'programs:save-exercise-alias',
      user.id,
      { limit: 60, windowSeconds: 60 }
    )
    if (limited) return limited

    const body = (await request.json().catch(() => ({}))) as {
      alias?: string
      exerciseId?: string
    }
    const alias = (body?.alias ?? '').trim()
    const exerciseId = (body?.exerciseId ?? '').trim()

    if (!alias || alias.length > 200) {
      return NextResponse.json(
        { error: 'alias must be a non-empty string under 200 chars' },
        { status: 400 }
      )
    }
    if (!exerciseId) {
      return NextResponse.json({ error: 'exerciseId required' }, { status: 400 })
    }

    // Resolve aliasOwnerId — the coach whose alias pool this save contributes to.
    let aliasOwnerId: string | null = null
    const hasCoachAccess =
      user.role === 'ADMIN' ||
      user.role === 'COACH' ||
      (await canAccessCoachPlatform(user.id))

    if (hasCoachAccess) {
      aliasOwnerId = user.id
    } else if (user.role === 'ATHLETE') {
      const resolved = await resolveAthleteClientId()
      if (resolved) {
        const client = await prisma.client.findUnique({
          where: { id: resolved.clientId },
          select: { userId: true },
        })
        aliasOwnerId = client?.userId ?? null
      }
    }
    if (!aliasOwnerId) {
      return NextResponse.json({ error: 'No owning coach context' }, { status: 400 })
    }

    const businessIds = await getActiveBusinessIdsForUser(aliasOwnerId)

    // Verify the Exercise is visible to this coach. This
    // prevents a drive-by alias save pointing at a stranger's custom exercise.
    const exercise = await prisma.exercise.findFirst({
      where: {
        id: exerciseId,
        OR: [
          { isPublic: true },
          { coachId: aliasOwnerId },
          ...businessExerciseAccessClauses(businessIds),
        ],
      },
      select: { id: true },
    })
    if (!exercise) {
      return NextResponse.json(
        { error: 'Exercise not accessible to this user' },
        { status: 404 }
      )
    }

    // Case-insensitive existence check. We store the alias in its original
    // casing (matches the coach's mental model) but treat it case-insensitively
    // for dedup / lookup.
    const existing = await prisma.exerciseNameAlias.findFirst({
      where: {
        coachId: aliasOwnerId,
        alias: { equals: alias, mode: 'insensitive' },
      },
      select: { id: true },
    })

    if (existing) {
      await prisma.exerciseNameAlias.update({
        where: { id: existing.id },
        data: { exerciseId, createdBy: user.id, alias },
      })
      return NextResponse.json({ success: true, updated: true })
    }

    await prisma.exerciseNameAlias.create({
      data: { coachId: aliasOwnerId, alias, exerciseId, createdBy: user.id },
    })
    return NextResponse.json({ success: true, created: true })
  } catch (error) {
    return handleApiError(error)
  }
}

async function getActiveBusinessIdsForUser(userId: string): Promise<string[]> {
  const memberships = await prisma.businessMember.findMany({
    where: {
      userId,
      isActive: true,
      role: { in: BUSINESS_EXERCISE_ROLES },
      business: { isActive: true },
    },
    select: { businessId: true },
  })
  return memberships.map((membership) => membership.businessId)
}

function businessExerciseAccessClauses(businessIds: string[]) {
  if (businessIds.length === 0) return []
  return [
    { businessId: { in: businessIds } },
    { businessShares: { some: { businessId: { in: businessIds } } } },
  ]
}
