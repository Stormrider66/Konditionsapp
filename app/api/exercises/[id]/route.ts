// app/api/exercises/[id]/route.ts
/**
 * Individual Exercise API
 *
 * Endpoints:
 * - GET /api/exercises/:id - Get exercise details
 * - PUT /api/exercises/:id - Update exercise
 * - DELETE /api/exercises/:id - Delete exercise
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, handleApiError } from '@/lib/api/utils'
import { canAccessExercise } from '@/lib/auth-utils'
import { canAccessCoachPlatform } from '@/lib/user-capabilities'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

/**
 * GET - Get single exercise by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let locale = resolveRequestLocale(request)

  try {
    const user = await requireAuth()
    locale = resolveRequestLocale(request, user.language)
    const { id: exerciseId } = await params

    const exercise = await prisma.exercise.findUnique({
      where: { id: exerciseId },
      include: {
        _count: {
          select: {
            progressionTracking: true, // How many athletes use this exercise
          },
        },
      },
    })

    if (!exercise) {
      return NextResponse.json({ error: t(locale, 'Exercise not found', 'Övningen hittades inte') }, { status: 404 })
    }

    const hasAccess = await canAccessExercise(user.id, exerciseId)
    if (!hasAccess) {
      return NextResponse.json({ error: t(locale, 'Forbidden', 'Saknar behörighet') }, { status: 403 })
    }

    return NextResponse.json(exercise, { status: 200 })
  } catch (error: unknown) {
    return handleApiError(error)
  }
}

/**
 * PUT - Update exercise
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let locale = resolveRequestLocale(request)

  try {
    const user = await requireAuth()
    locale = resolveRequestLocale(request, user.language)
    const hasCoachAccess = user.role === 'ADMIN' || user.role === 'COACH' || await canAccessCoachPlatform(user.id)
    if (!hasCoachAccess) {
      return NextResponse.json({ error: t(locale, 'Forbidden', 'Saknar behörighet') }, { status: 403 })
    }

    const { id: exerciseId } = await params
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
    } = body

    // Check if exercise exists
    const existingExercise = await prisma.exercise.findUnique({
      where: { id: exerciseId },
    })

    if (!existingExercise) {
      return NextResponse.json({ error: t(locale, 'Exercise not found', 'Övningen hittades inte') }, { status: 404 })
    }

    const hasAccess = await canAccessExercise(user.id, exerciseId)
    if (!hasAccess) {
      return NextResponse.json({ error: t(locale, 'Forbidden', 'Saknar behörighet') }, { status: 403 })
    }

    // For public exercises, only admins may update videoUrl
    if (existingExercise.isPublic) {
      if (user.role !== 'ADMIN') {
        return NextResponse.json(
          { error: t(locale, 'Cannot modify public library exercises', 'Publika biblioteksövningar kan inte ändras') },
          { status: 403 }
        )
      }

      const allowedPublicFields = ['videoUrl']
      const attemptedFields = Object.keys(body).filter(key => body[key] !== undefined)
      const disallowedFields = attemptedFields.filter(field => !allowedPublicFields.includes(field))

      if (disallowedFields.length > 0) {
        return NextResponse.json(
          {
            error: t(locale, 'Cannot modify public library exercises. Only video URL can be updated.', 'Publika biblioteksövningar kan inte ändras. Endast video-URL kan uppdateras.'),
            disallowedFields,
          },
          { status: 403 }
        )
      }

      // Update only videoUrl for public exercises
      const updated = await prisma.exercise.update({
        where: { id: exerciseId },
        data: {
          ...(videoUrl !== undefined && { videoUrl }),
        },
      })

      return NextResponse.json(updated, { status: 200 })
    }

    // Only the owning coach (or admin) can update custom exercises
    if (user.role !== 'ADMIN' && existingExercise.coachId !== user.id) {
      return NextResponse.json({ error: t(locale, 'Forbidden', 'Saknar behörighet') }, { status: 403 })
    }

    // Update exercise (custom exercises can update all fields)
    const updated = await prisma.exercise.update({
      where: { id: exerciseId },
      data: {
        ...(name && { name }),
        ...(nameSv && { nameSv }),
        ...(nameEn && { nameEn }),
        ...(category && { category }),
        ...(muscleGroup && { muscleGroup }),
        ...(biomechanicalPillar && { biomechanicalPillar }),
        ...(progressionLevel && { progressionLevel }),
        ...(description !== undefined && { description }),
        ...(instructions !== undefined && { instructions }),
        ...(equipment !== undefined && { equipment }),
        ...(difficulty && { difficulty }),
        ...(videoUrl !== undefined && { videoUrl }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(plyometricIntensity && { plyometricIntensity }),
        ...(contactsPerRep !== undefined && { contactsPerRep }),
      },
    })

    return NextResponse.json(updated, { status: 200 })
  } catch (error: unknown) {
    return handleApiError(error)
  }
}

/**
 * DELETE - Delete exercise
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let locale = resolveRequestLocale(request)

  try {
    const user = await requireAuth()
    locale = resolveRequestLocale(request, user.language)
    const hasCoachAccess = user.role === 'ADMIN' || user.role === 'COACH' || await canAccessCoachPlatform(user.id)
    if (!hasCoachAccess) {
      return NextResponse.json({ error: t(locale, 'Forbidden', 'Saknar behörighet') }, { status: 403 })
    }

    const { id: exerciseId } = await params

    // Check if exercise exists
    const existingExercise = await prisma.exercise.findUnique({
      where: { id: exerciseId },
      include: {
        _count: {
          select: {
            progressionTracking: true,
            segments: true,
          },
        },
      },
    })

    if (!existingExercise) {
      return NextResponse.json({ error: t(locale, 'Exercise not found', 'Övningen hittades inte') }, { status: 404 })
    }

    const hasAccess = await canAccessExercise(user.id, exerciseId)
    if (!hasAccess) {
      return NextResponse.json({ error: t(locale, 'Forbidden', 'Saknar behörighet') }, { status: 403 })
    }

    // Only allow deleting custom exercises (not public library)
    if (existingExercise.isPublic) {
      return NextResponse.json(
        { error: t(locale, 'Cannot delete public library exercises', 'Publika biblioteksövningar kan inte raderas') },
        { status: 403 }
      )
    }

    // Only the owning coach (or admin) can delete custom exercises
    if (user.role !== 'ADMIN' && existingExercise.coachId !== user.id) {
      return NextResponse.json({ error: t(locale, 'Forbidden', 'Saknar behörighet') }, { status: 403 })
    }

    // Check if exercise is in use
    const inUse =
      existingExercise._count.progressionTracking > 0 ||
      existingExercise._count.segments > 0

    if (inUse) {
      return NextResponse.json(
        {
          error: t(locale, 'Exercise is in use', 'Övningen används'),
          message: t(
            locale,
            `This exercise is used in ${existingExercise._count.segments} workouts and has ${existingExercise._count.progressionTracking} progression records. Archive it instead of deleting.`,
            `Den här övningen används i ${existingExercise._count.segments} pass och har ${existingExercise._count.progressionTracking} progressionsposter. Arkivera den istället för att radera.`
          ),
          inUse: {
            workouts: existingExercise._count.segments,
            progressionRecords: existingExercise._count.progressionTracking,
          },
        },
        { status: 409 }
      )
    }

    // Delete exercise
    await prisma.exercise.delete({
      where: { id: exerciseId },
    })

    return NextResponse.json(
      { message: t(locale, 'Exercise deleted successfully', 'Övningen har raderats') },
      { status: 200 }
    )
  } catch (error: unknown) {
    return handleApiError(error)
  }
}
