import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, handleApiError } from '@/lib/api/utils'
import { Prisma } from '@prisma/client'
import { logger } from '@/lib/logger'

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

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)

    // Pagination with limits
    // Keep a hard cap to prevent accidental heavy queries/DoS.
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')))
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
    } else if (user.role === 'COACH') {
      accessWhere.OR = [{ isPublic: true }, { coachId: user.id }]
    } else if (user.role === 'ATHLETE') {
      const athleteAccount = await prisma.athleteAccount.findUnique({
        where: { userId: user.id },
        select: {
          client: {
            select: { userId: true },
          },
        },
      })
      const coachId = athleteAccount?.client.userId
      accessWhere.OR = coachId ? [{ isPublic: true }, { coachId }] : [{ isPublic: true }]
    } else {
      accessWhere.OR = [{ isPublic: true }]
    }

    const filtersWhere: Prisma.ExerciseWhereInput = {}

    if (category && category !== 'ALL') {
      filtersWhere.category = category as any // WorkoutType enum
    }

    if (pillar && pillar !== 'ALL') {
      filtersWhere.biomechanicalPillar = pillar as any // BiomechanicalPillar enum
    }

    if (level && level !== 'ALL') {
      filtersWhere.progressionLevel = level as any // ProgressionLevel enum
    }

    if (difficulty && difficulty !== 'ALL') {
      filtersWhere.difficulty = difficulty
    }

    if (equipment) {
      const equipmentList = equipment.split(',').map((e) => e.trim())
      filtersWhere.equipment = { in: equipmentList }
    }

    if (intensity && intensity !== 'ALL') {
      filtersWhere.plyometricIntensity = intensity as Prisma.EnumPlyometricIntensityNullableFilter
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

    const where: Prisma.ExerciseWhereInput = {
      AND: [accessWhere, filtersWhere],
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
        const body = await request.json()

        if (user.role !== 'COACH' && user.role !== 'ADMIN') {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
        
        // Basic validation
        if (!body.name || !body.category || !body.biomechanicalPillar) {
             return NextResponse.json(
                { error: 'Name, Category and Biomechanical Pillar are required' },
                { status: 400 }
            )
        }

        // Coaches can only create private exercises for themselves.
        // Admins may create system/public exercises.
        const isPublic = user.role === 'ADMIN' ? Boolean(body.isPublic) : false
        const coachId =
          isPublic ? null : (user.role === 'ADMIN' && typeof body.coachId === 'string' ? body.coachId : user.id)

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
            }
        })
        
        return NextResponse.json(exercise, { status: 201 })
    } catch (error) {
        return handleApiError(error)
    }
}
