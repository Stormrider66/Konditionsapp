import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, handleApiError } from '@/lib/api/utils'
import { getRequestedBusinessScope, resolveAthleteClientId } from '@/lib/auth-utils'
import { Prisma, WorkoutType, BiomechanicalPillar, ProgressionLevel, PlyometricIntensity } from '@prisma/client'
import { logger } from '@/lib/logger'
import { canAccessCoachPlatform } from '@/lib/user-capabilities'

const BUSINESS_EXERCISE_ROLES = [
  'OWNER',
  'ADMIN',
  'COACH',
  'PHYSICAL_TRAINER',
  'ASSISTANT_COACH',
  'PHYSIO',
]

type ExerciseVisibility = 'PRIVATE' | 'BUSINESS'

// Allowed sort fields to prevent injection
const ALLOWED_SORT_FIELDS = [
  'name',
  'nameSv',
  'nameEn',
  'category',
  'biomechanicalPillar',
  'progressionLevel',
  'difficulty',
  'muscleGroup',
  'createdAt',
  'updatedAt',
] as const

type AllowedSortField = typeof ALLOWED_SORT_FIELDS[number]

function isValidSortField(field: string): field is AllowedSortField {
  return ALLOWED_SORT_FIELDS.includes(field as AllowedSortField)
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

  return (memberships ?? []).map((membership) => membership.businessId)
}

async function resolveRequestedExerciseBusinessId(userId: string, request: NextRequest): Promise<string | null> {
  const scope = getRequestedBusinessScope(request)
  if (!scope.businessId && !scope.businessSlug) return null

  const membership = await prisma.businessMember.findFirst({
    where: {
      userId,
      isActive: true,
      role: { in: BUSINESS_EXERCISE_ROLES },
      ...(scope.businessId ? { businessId: scope.businessId } : {}),
      business: {
        isActive: true,
        ...(scope.businessSlug ? { slug: scope.businessSlug } : {}),
      },
    },
    select: { businessId: true },
  })

  return membership?.businessId ?? null
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const hasCoachAccess = user.role === 'ADMIN' || user.role === 'COACH' || await canAccessCoachPlatform(user.id)
    const { searchParams } = new URL(request.url)

    // Pagination with limits
    // Keep a hard cap to prevent accidental heavy queries/DoS.
    const limit = Math.min(500, Math.max(1, parseInt(searchParams.get('limit') || '50')))
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0'))

    // Validate sortBy to prevent injection
    const requestedSortBy = searchParams.get('sortBy') || 'name'
    const sortBy: AllowedSortField = isValidSortField(requestedSortBy) ? requestedSortBy : 'name'
    const sortOrder = searchParams.get('sortOrder') === 'desc' ? 'desc' : 'asc'

    // Filters
    const search = searchParams.get('search')
    const category = searchParams.get('category')
    const pillar = searchParams.get('pillar')
    const level = searchParams.get('level')
    const difficulty = searchParams.get('difficulty')
    const equipment = searchParams.get('equipment')
    const intensity = searchParams.get('intensity')
    const isPublic = searchParams.get('isPublic')
    // NOTE: We intentionally do not allow arbitrary coachId/userId filtering here.
    // The endpoint always scopes results to what the current user can access.

    const accessWhere: Prisma.ExerciseWhereInput = {}

    if (user.role === 'ADMIN') {
      // no additional restrictions
    } else if (hasCoachAccess) {
      const businessIds = await getActiveBusinessIdsForUser(user.id)
      accessWhere.OR = [
        { isPublic: true },
        { coachId: user.id },
        ...(businessIds.length > 0 ? [{ businessId: { in: businessIds } }] : []),
      ]
    } else if (user.role === 'ATHLETE') {
      const resolved = await resolveAthleteClientId()
      let coachId: string | undefined
      let businessId: string | null | undefined
      if (resolved) {
        const client = await prisma.client.findUnique({
          where: { id: resolved.clientId },
          select: { userId: true, businessId: true },
        })
        coachId = client?.userId
        businessId = client?.businessId
      }
      accessWhere.OR = [
        { isPublic: true },
        ...(coachId ? [{ coachId }] : []),
        ...(businessId ? [{ businessId }] : []),
      ]
    } else {
      accessWhere.OR = [{ isPublic: true }]
    }

    const filtersWhere: Prisma.ExerciseWhereInput = {}

    if (category && category !== 'ALL') {
      // Validate category is a valid enum value
      if (Object.values(WorkoutType).includes(category as WorkoutType)) {
        filtersWhere.category = category as WorkoutType
      }
    }

    if (pillar && pillar !== 'ALL') {
      // Validate pillar is a valid enum value
      if (Object.values(BiomechanicalPillar).includes(pillar as BiomechanicalPillar)) {
        filtersWhere.biomechanicalPillar = pillar as BiomechanicalPillar
      }
    }

    if (level && level !== 'ALL') {
      // Validate level is a valid enum value
      if (Object.values(ProgressionLevel).includes(level as ProgressionLevel)) {
        filtersWhere.progressionLevel = level as ProgressionLevel
      }
    }

    if (difficulty && difficulty !== 'ALL') {
      filtersWhere.difficulty = difficulty
    }

    if (equipment) {
      const equipmentList = equipment.split(',').map((e) => e.trim())
      filtersWhere.equipment = { in: equipmentList }
    }

    if (intensity && intensity !== 'ALL') {
      // Validate intensity is a valid enum value
      if (Object.values(PlyometricIntensity).includes(intensity as PlyometricIntensity)) {
        filtersWhere.plyometricIntensity = intensity as PlyometricIntensity
      }
    }

    if (isPublic !== null && isPublic !== undefined) {
      filtersWhere.isPublic = isPublic === 'true'
    }

    if (search) {
      filtersWhere.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { nameSv: { contains: search, mode: 'insensitive' } },
        { nameEn: { contains: search, mode: 'insensitive' } },
        { muscleGroup: { contains: search, mode: 'insensitive' } },
      ]
    }

    // Resolve a specific set of exercises by id (e.g. to rehydrate names for
    // already-selected exercise blocks in the physio restriction form).
    const idsParam = searchParams.get('ids')
    if (idsParam) {
      const idList = idsParam.split(',').map((s) => s.trim()).filter(Boolean)
      if (idList.length > 0) filtersWhere.id = { in: idList }
    }

    // Exclude exercises hidden by this user
    let hiddenIds: string[] = []
    try {
      const hiddenExercises = await prisma.hiddenExercise.findMany({
        where: { userId: user.id },
        select: { exerciseId: true },
      })
      hiddenIds = hiddenExercises.map((h) => h.exerciseId)
    } catch {
      // Table may not exist yet if migration hasn't run — skip filtering
    }

    const where: Prisma.ExerciseWhereInput = {
      AND: [
        accessWhere,
        filtersWhere,
        ...(hiddenIds.length > 0 ? [{ id: { notIn: hiddenIds } }] : []),
      ],
    }

    const [exercises, totalCount] = await prisma.$transaction([
        prisma.exercise.findMany({
            where,
            orderBy: { [sortBy]: sortOrder },
            skip: offset,
            take: limit
        }),
        prisma.exercise.count({ where })
    ])

    const totalPages = Math.ceil(totalCount / limit)
    const currentPage = Math.floor(offset / limit) + 1
    const hasNextPage = offset + limit < totalCount
    const hasPreviousPage = offset > 0

    return NextResponse.json({
        exercises,
        pagination: {
            totalCount,
            totalPages,
            currentPage,
            limit,
            offset,
            hasNextPage,
            hasPreviousPage
        }
    })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
    try {
        const user = await requireAuth()
        const hasCoachAccess = user.role === 'ADMIN' || user.role === 'COACH' || await canAccessCoachPlatform(user.id)
        const body = await request.json()

        if (!hasCoachAccess) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
        
        // Basic validation
        if (!body.name || !body.category || !body.biomechanicalPillar) {
             return NextResponse.json(
                { error: 'Name, Category and Biomechanical Pillar are required' },
                { status: 400 }
            )
        }

        const visibility: ExerciseVisibility = body.visibility === 'BUSINESS' ? 'BUSINESS' : 'PRIVATE'
        const requestedBusinessId = visibility === 'BUSINESS'
          ? await resolveRequestedExerciseBusinessId(user.id, request)
          : null

        if (visibility === 'BUSINESS' && !requestedBusinessId) {
          return NextResponse.json(
            { error: 'Business visibility requires an active business membership' },
            { status: 403 }
          )
        }

        // Coaches can only create private/business exercises. Admins may create system/public exercises.
        const isPublic = user.role === 'ADMIN' ? Boolean(body.isPublic) : false
        const coachId =
          isPublic ? null : (user.role === 'ADMIN' && typeof body.coachId === 'string' ? body.coachId : user.id)
        const businessId = isPublic ? null : requestedBusinessId

        const exercise = await prisma.exercise.create({
            data: {
                name: body.name,
                nameSv: body.nameSv || body.name,
                nameEn: body.nameEn || body.name,
                category: body.category,
                biomechanicalPillar: body.biomechanicalPillar,
                muscleGroup: body.muscleGroup,
                progressionLevel: body.progressionLevel,
                difficulty: body.difficulty,
                description: body.description,
                instructions: body.instructions,
                equipment: body.equipment,
                videoUrl: body.videoUrl,
                plyometricIntensity: body.plyometricIntensity,
                contactsPerRep: body.contactsPerRep,
                isPublic,
                coachId,
                businessId,
            }
        })
        
        return NextResponse.json(exercise, { status: 201 })
    } catch (error) {
        return handleApiError(error)
    }
}
