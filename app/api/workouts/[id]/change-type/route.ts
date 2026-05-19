import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireCoachAuth, handleApiError } from '@/lib/api/utils'
import { canAccessWorkout } from '@/lib/auth-utils'

type AppLocale = 'en' | 'sv'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireCoachAuth()
    const locale = getUserLocale(user.language)
    const { id } = await params
    const body = await request.json()
    const { newType } = body

    if (!newType) {
      return NextResponse.json({ error: 'newType is required' }, { status: 400 })
    }

    const hasAccess = await canAccessWorkout(user.id, id)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Workout not found' }, { status: 404 })
    }

    // Transaction to change type and clear segments
    const updatedWorkout = await prisma.$transaction(async (tx) => {
      // 1. Delete all existing segments (since they're type-specific)
      await tx.workoutSegment.deleteMany({
        where: { workoutId: id }
      })

      // 2. Update workout type and reset duration/distance
      const workout = await tx.workout.update({
        where: { id },
        data: {
          type: newType,
          name: getDefaultWorkoutName(newType, locale),
          duration: null,
          distance: null,
          instructions: null,
        }
      })

      return workout
    })

    return NextResponse.json({
      success: true,
      workout: updatedWorkout,
      message: t(locale, 'Workout type changed successfully', 'Träningspassets typ har ändrats')
    })

  } catch (error) {
    return handleApiError(error)
  }
}

function getDefaultWorkoutName(type: string, locale: AppLocale): string {
  const names: Record<AppLocale, Record<string, string>> = {
    en: {
      RUNNING: 'New run workout',
      STRENGTH: 'New strength workout',
      CORE: 'New core workout',
      CYCLING: 'New cycling workout',
      SWIMMING: 'New swim workout',
      ALTERNATIVE: 'New alternative workout',
    },
    sv: {
      RUNNING: 'Nytt löppass',
      STRENGTH: 'Nytt styrkepass',
      CORE: 'Nytt core-pass',
      CYCLING: 'Nytt cykelpass',
      SWIMMING: 'Nytt simpass',
      ALTERNATIVE: 'Nytt alternativt pass',
    },
  }
  return names[locale][type] || t(locale, 'New workout', 'Nytt träningspass')
}

function getUserLocale(language: string | null | undefined): AppLocale {
  return language === 'sv' ? 'sv' : 'en'
}

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}
