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
    await requireAuth()
    const { searchParams } = new URL(request.url)

    // Pagination with limits
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
    const userId = searchParams.get('userId')

    const where: Prisma.ExerciseWhereInput = {}

    if (category && category !== 'ALL') {
      where.category = category
    }

    if (pillar && pillar !== 'ALL') {
      where.biomechanicalPillar = pillar as Prisma.EnumBiomechanicalPillarFilter
    }

    if (level && level !== 'ALL') {
      where.progressionLevel = level as Prisma.EnumProgressionLevelFilter
    }

    if (difficulty && difficulty !== 'ALL') {
      where.difficulty = difficulty
    }

    if (equipment) {
      const equipmentList = equipment.split(',').map((e) => e.trim())
      where.equipment = { in: equipmentList }
    }

    if (intensity && intensity !== 'ALL') {
      where.plyometricIntensity = intensity as Prisma.EnumPlyometricIntensityNullableFilter
    }

    if (isPublic !== null && isPublic !== undefined) {
      where.isPublic = isPublic === 'true'
    }

    if (userId) {
      where.userId = userId
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { nameSv: { contains: search, mode: 'insensitive' } },
        { nameEn: { contains: search, mode: 'insensitive' } },
        { muscleGroup: { contains: search, mode: 'insensitive' } },
      ]
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
        await requireAuth()
        const body = await request.json()
        
        // Basic validation
        if (!body.name || !body.category || !body.biomechanicalPillar) {
             return NextResponse.json(
                { error: 'Name, Category and Biomechanical Pillar are required' },
                { status: 400 }
            )
        }

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
                imageUrl: body.imageUrl,
                plyometricIntensity: body.plyometricIntensity,
                contactsPerRep: body.contactsPerRep,
                isPublic: body.isPublic || false,
                userId: body.userId
            }
        })
        
        return NextResponse.json(exercise, { status: 201 })
    } catch (error) {
        return handleApiError(error)
    }
}
