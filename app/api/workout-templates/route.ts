import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { Prisma, SportType } from '@prisma/client'

export async function GET(req: NextRequest) {
  try {
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { user } = resolved

    const { searchParams } = new URL(req.url)
    const category = searchParams.get('category')
    const difficulty = searchParams.get('difficulty')
    const sport = searchParams.get('sport')
    const q = searchParams.get('q')
    const favoritesOnly = searchParams.get('favorites') === 'true'
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')

    const andConditions: Prisma.WorkoutTemplateWhereInput[] = [
      { isSystem: true },
    ]

    if (category) {
      andConditions.push({ category: category as Prisma.EnumWorkoutTemplateCategoryFilter })
    }

    if (difficulty) {
      andConditions.push({ difficulty: difficulty as Prisma.EnumWorkoutTemplateDifficultyFilter })
    }

    if (sport) {
      andConditions.push({
        OR: [
          { targetSports: { has: sport as SportType } },
          { targetSports: { isEmpty: true } },
        ],
      })
    }

    if (q) {
      andConditions.push({
        OR: [
          { nameSv: { contains: q, mode: 'insensitive' } },
          { name: { contains: q, mode: 'insensitive' } },
          { descriptionSv: { contains: q, mode: 'insensitive' } },
          { tags: { has: q.toLowerCase() } },
        ],
      })
    }

    if (favoritesOnly) {
      andConditions.push({
        favorites: { some: { userId: user.id } },
      })
    }

    const where: Prisma.WorkoutTemplateWhereInput = {
      AND: andConditions,
    }

    const [templates, total] = await Promise.all([
      prisma.workoutTemplate.findMany({
        where,
        select: {
          id: true,
          name: true,
          nameSv: true,
          descriptionSv: true,
          category: true,
          workoutType: true,
          difficulty: true,
          targetSports: true,
          muscleGroups: true,
          equipment: true,
          estimatedDuration: true,
          usageCount: true,
          tags: true,
          favorites: {
            where: { userId: user.id },
            select: { id: true },
          },
        },
        orderBy: { usageCount: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.workoutTemplate.count({ where }),
    ])

    const result = templates.map(({ favorites, ...t }) => ({
      ...t,
      isFavorite: favorites.length > 0,
    }))

    return NextResponse.json({ templates: result, total })
  } catch (error) {
    console.error('Error fetching workout templates:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
