// app/api/exercises/route.ts
/**
 * Exercise Library API
 *
 * Endpoints:
 * - GET /api/exercises - List exercises with filters, search, pagination
 * - POST /api/exercises - Create custom exercise
 *
 * Query Parameters for GET:
 * - search: Search by name (Swedish or English)
 * - pillar: Filter by biomechanical pillar
 * - level: Filter by progression level
 * - category: Filter by category (STRENGTH, PLYOMETRIC, etc.)
 * - equipment: Filter by equipment (comma-separated)
 * - difficulty: Filter by difficulty (Beginner, Intermediate, Advanced)
 * - intensity: Filter by plyometric intensity (LOW, MODERATE, HIGH)
 * - isPublic: Filter by public/custom (true/false)
 * - userId: Filter by creator (for custom exercises)
 * - limit: Results per page (default: 50)
 * - offset: Pagination offset (default: 0)
 * - sortBy: Sort field (name, difficulty, category)
 * - sortOrder: Sort direction (asc, desc)
 */

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * GET - List exercises with filters
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams

    // Pagination
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Sorting
    const sortBy = searchParams.get('sortBy') || 'name'
    const sortOrder = searchParams.get('sortOrder') || 'asc'

    // Filters
    const search = searchParams.get('search')
    const pillar = searchParams.get('pillar')
    const level = searchParams.get('level')
    const category = searchParams.get('category')
    const equipment = searchParams.get('equipment')
    const difficulty = searchParams.get('difficulty')
    const intensity = searchParams.get('intensity')
    const isPublic = searchParams.get('isPublic')
    const userId = searchParams.get('userId')

    // Build where clause
    const where: any = {}

    // Search (Swedish or English name)
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { nameSv: { contains: search, mode: 'insensitive' } },
        { nameEn: { contains: search, mode: 'insensitive' } },
      ]
    }

    // Biomechanical pillar filter
    if (pillar && pillar !== 'ALL') {
      where.biomechanicalPillar = pillar
    }

    // Progression level filter
    if (level && level !== 'ALL') {
      where.progressionLevel = level
    }

    // Category filter
    if (category && category !== 'ALL') {
      where.category = category
    }

    // Equipment filter (comma-separated)
    if (equipment) {
      const equipmentList = equipment.split(',').map((e) => e.trim())
      where.equipment = {
        in: equipmentList,
      }
    }

    // Difficulty filter
    if (difficulty && difficulty !== 'ALL') {
      where.difficulty = difficulty
    }

    // Plyometric intensity filter
    if (intensity && intensity !== 'ALL') {
      where.plyometricIntensity = intensity
    }

    // Public/custom filter
    if (isPublic !== null) {
      where.isPublic = isPublic === 'true'
    }

    // User filter (for custom exercises)
    if (userId) {
      where.userId = userId
    }

    // Execute query with pagination
    const [exercises, totalCount] = await Promise.all([
      prisma.exercise.findMany({
        where,
        orderBy: {
          [sortBy]: sortOrder,
        },
        skip: offset,
        take: limit,
        select: {
          id: true,
          name: true,
          nameSv: true,
          nameEn: true,
          category: true,
          muscleGroup: true,
          biomechanicalPillar: true,
          progressionLevel: true,
          description: true,
          instructions: true,
          equipment: true,
          difficulty: true,
          videoUrl: true,
          imageUrl: true,
          isPublic: true,
          plyometricIntensity: true,
          contactsPerRep: true,
          userId: true,
        },
      }),
      prisma.exercise.count({ where }),
    ])

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limit)
    const currentPage = Math.floor(offset / limit) + 1
    const hasNextPage = offset + limit < totalCount
    const hasPreviousPage = offset > 0

    return NextResponse.json(
      {
        exercises,
        pagination: {
          totalCount,
          totalPages,
          currentPage,
          limit,
          offset,
          hasNextPage,
          hasPreviousPage,
        },
        filters: {
          search,
          pillar,
          level,
          category,
          equipment,
          difficulty,
          intensity,
          isPublic,
        },
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Error fetching exercises:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST - Create custom exercise
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      name,
      nameSv,
      nameEn,
      category,
      muscleGroup,
      biomechanicalPillar,
      progressionLevel,
      description,
      instructions,
      equipment,
      difficulty,
      videoUrl,
      imageUrl,
      plyometricIntensity,
      contactsPerRep,
      userId,
    } = body

    // Validation
    if (!name || !category || !biomechanicalPillar) {
      return NextResponse.json(
        { error: 'name, category, and biomechanicalPillar are required' },
        { status: 400 }
      )
    }

    // Create exercise
    const exercise = await prisma.exercise.create({
      data: {
        name,
        nameSv: nameSv || name,
        nameEn: nameEn || name,
        category,
        muscleGroup,
        biomechanicalPillar,
        progressionLevel,
        description,
        instructions,
        equipment,
        difficulty,
        videoUrl,
        imageUrl,
        isPublic: false, // Custom exercises are private by default
        plyometricIntensity,
        contactsPerRep,
        userId,
      },
    })

    return NextResponse.json(exercise, { status: 201 })
  } catch (error: any) {
    console.error('Error creating exercise:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
