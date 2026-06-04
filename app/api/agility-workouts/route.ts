// app/api/agility-workouts/route.ts
// API routes for agility workouts

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { AgilityWorkoutFormat, AgilityDrillCategory, DevelopmentStage, Prisma, SportType, WorkoutSectionType } from '@prisma/client'
import { z } from 'zod'
import {
  agilityWorkoutAccessWhere,
  resolveWorkoutBusinessScope,
} from '@/lib/workouts/business-scope'
import { normalizeWorkoutTags } from '@/lib/workouts/business-tags'
import {
  buildWorkoutLibraryMetadataData,
  normalizeWorkoutTrainingYear,
  WorkoutLibraryMetadataError,
} from '@/lib/workouts/library-metadata'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

function workoutLibraryMetadataErrorMessage(locale: AppLocale, message: string): string {
  if (message === 'Training year must be between 2000 and 2100') {
    return t(locale, message, 'Träningsåret måste vara mellan 2000 och 2100')
  }
  if (message === 'Team must be a valid team id') {
    return t(locale, message, 'Team måste vara ett giltigt team-id')
  }
  if (message === 'Team not found or unavailable') {
    return t(locale, message, 'Teamet hittades inte eller är inte tillgängligt')
  }
  return message
}

const workoutDrillSchema = z.object({
  drillId: z.string().uuid(),
  order: z.number().int().min(0),
  sectionType: z.nativeEnum(WorkoutSectionType).optional().default('MAIN'),
  sets: z.number().int().min(1).optional(),
  reps: z.number().int().min(1).optional(),
  duration: z.number().int().min(1).optional(),
  restSeconds: z.number().int().min(0).optional(),
  notes: z.string().optional()
})

const createWorkoutSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  format: z.nativeEnum(AgilityWorkoutFormat),
  totalDuration: z.number().int().min(1).optional(),
  restBetweenDrills: z.number().int().min(0).optional(),
  developmentStage: z.nativeEnum(DevelopmentStage).optional(),
  targetSports: z.array(z.nativeEnum(SportType)).optional().default([]),
  primaryFocus: z.nativeEnum(AgilityDrillCategory).optional(),
  isTemplate: z.boolean().optional().default(false),
  isPublic: z.boolean().optional().default(false),
  teamId: z.string().uuid().nullable().optional(),
  trainingYear: z.number().int().min(2000).max(2100).nullable().optional(),
  tags: z.array(z.string()).optional().default([]),
  drills: z.array(workoutDrillSchema).min(1)
})

// GET /api/agility-workouts - List workouts with filters
export async function GET(request: NextRequest) {
  const locale = resolveRequestLocale(request)

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    const businessScope = await resolveWorkoutBusinessScope(user.id, request)

    if (!businessScope) {
      return NextResponse.json({ error: t(locale, 'Business not found', 'Verksamheten hittades inte') }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') as AgilityWorkoutFormat | null
    const developmentStage = searchParams.get('developmentStage') as DevelopmentStage | null
    const sport = searchParams.get('sport') as SportType | null
    const teamId = searchParams.get('teamId')
    const trainingYear = normalizeWorkoutTrainingYear(searchParams.get('trainingYear') ?? undefined)
    const coachId = searchParams.get('coachId')
    const templatesOnly = searchParams.get('templatesOnly') === 'true'
    const search = searchParams.get('search')
    const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') || '100') || 100), 500)
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0') || 0)

    const andFilters: Prisma.AgilityWorkoutWhereInput[] = []

    if (format) {
      andFilters.push({ format })
    }

    if (developmentStage) {
      andFilters.push({ developmentStage })
    }

    if (sport) {
      andFilters.push({ targetSports: { has: sport } })
    }

    if (teamId && teamId !== 'all') {
      andFilters.push({ teamId })
    }

    if (typeof trainingYear === 'number') {
      andFilters.push({ trainingYear })
    }

    if (coachId) {
      andFilters.push({ coachId })
      if (businessScope.businessId) {
        andFilters.push(agilityWorkoutAccessWhere(user.id, businessScope.businessId))
      }
    } else {
      // Default: show user's workouts and public workouts
      andFilters.push(agilityWorkoutAccessWhere(user.id, businessScope.businessId))
    }

    if (templatesOnly) {
      andFilters.push({ isTemplate: true })
    }

    if (search) {
      andFilters.push({
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ]
      })
    }

    const tagFilters = searchParams.getAll('tag').filter(Boolean)
    if (tagFilters.length > 0) {
      andFilters.push({ tags: { hasSome: tagFilters } })
    }

    const where: Prisma.AgilityWorkoutWhereInput = { AND: andFilters }

    const [workouts, total] = await Promise.all([
      prisma.agilityWorkout.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        include: {
          coach: {
            select: { id: true, name: true }
          },
          drills: {
            orderBy: { order: 'asc' },
            include: {
              drill: {
                select: { id: true, name: true, nameSv: true, category: true, difficultyLevel: true }
              }
            }
          },
          _count: {
            select: {
              assignments: true,
              results: true
            }
          }
        },
        take: limit,
        skip: offset,
      }),
      prisma.agilityWorkout.count({ where }),
    ])

    return NextResponse.json({
      data: workouts,
      pagination: { total, limit, offset, hasMore: offset + workouts.length < total },
    })
  } catch (error) {
    if (error instanceof WorkoutLibraryMetadataError) {
      return NextResponse.json({ error: workoutLibraryMetadataErrorMessage(locale, error.message) }, { status: error.status })
    }
    console.error('Error fetching agility workouts:', error)
    return NextResponse.json(
      { error: t(locale, 'Failed to fetch agility workouts', 'Kunde inte hämta agilitypass') },
      { status: 500 }
    )
  }
}

// POST /api/agility-workouts - Create workout with drills
export async function POST(request: NextRequest) {
  let locale = resolveRequestLocale(request)

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    const businessScope = await resolveWorkoutBusinessScope(user.id, request)

    if (!businessScope) {
      return NextResponse.json({ error: t(locale, 'Business not found', 'Verksamheten hittades inte') }, { status: 403 })
    }

    // Verify user is a coach
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true, language: true }
    })
    locale = resolveRequestLocale(request, dbUser?.language)

    if (!dbUser || (dbUser.role !== 'COACH' && dbUser.role !== 'ADMIN')) {
      return NextResponse.json({ error: t(locale, 'Only coaches can create workouts', 'Endast coacher kan skapa pass') }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = createWorkoutSchema.parse(body)
    const metadataData = await buildWorkoutLibraryMetadataData(user.id, request, body, {
      defaultTrainingYear: true,
    })

    const { drills, ...workoutData } = validatedData

    // Verify all drills exist
    const drillIds = drills.map(d => d.drillId)
    const existingDrills = await prisma.agilityDrill.findMany({
      where: { id: { in: drillIds } },
      select: { id: true }
    })

    if (existingDrills.length !== drillIds.length) {
      return NextResponse.json(
        { error: t(locale, 'One or more drills not found', 'En eller flera övningar hittades inte') },
        { status: 400 }
      )
    }

    const workout = await prisma.agilityWorkout.create({
      data: {
        ...workoutData,
        ...metadataData,
        tags: normalizeWorkoutTags(workoutData.tags, businessScope.businessId),
        coachId: user.id,
        drills: {
          create: drills.map(drill => ({
            drillId: drill.drillId,
            order: drill.order,
            sectionType: drill.sectionType || 'MAIN',
            sets: drill.sets,
            reps: drill.reps,
            duration: drill.duration,
            restSeconds: drill.restSeconds,
            notes: drill.notes
          }))
        }
      },
      include: {
        drills: {
          orderBy: { order: 'asc' },
          include: {
            drill: true
          }
        }
      }
    })

    return NextResponse.json(workout, { status: 201 })
  } catch (error) {
    if (error instanceof WorkoutLibraryMetadataError) {
      return NextResponse.json({ error: workoutLibraryMetadataErrorMessage(locale, error.message) }, { status: error.status })
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: t(locale, 'Validation error', 'Valideringsfel'), details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error creating agility workout:', error)
    return NextResponse.json(
      { error: t(locale, 'Failed to create agility workout', 'Kunde inte skapa agilitypass') },
      { status: 500 }
    )
  }
}
