'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { tzSafeDayStart, tzSafeDayEnd } from '@/lib/date-utils'

type AppLocale = 'en' | 'sv'
type WodSection = {
  type?: string
  duration?: number
  name?: string
  exercises?: {
    exerciseId?: string
    sets?: number
    reps?: number
    weight?: number
  }[]
}

type WodJson = {
  sections?: WodSection[]
}

function resolveLocale(locale?: string | null): AppLocale {
  return locale === 'sv' ? 'sv' : 'en'
}

function copy(locale: AppLocale, en: string, sv: string) {
  return locale === 'sv' ? sv : en
}

export async function scheduleWODToDashboard(wodId: string, localeInput?: string) {
  const locale = resolveLocale(localeInput)
  try {
    // 1. Authenticate and resolve correct clientId (handles both ATHLETE and COACH in athlete mode)
    const resolved = await resolveAthleteClientId()

    if (!resolved) {
      return { success: false, error: copy(locale, 'Not signed in', 'Ej inloggad') }
    }

    const clientId = resolved.clientId

    // Resolve coach (owner) of this client record
    const clientRecord = await prisma.client.findUnique({
      where: { id: clientId },
      select: { userId: true },
    })
    if (!clientRecord) {
      return { success: false, error: copy(locale, 'Client profile is missing', 'Klientprofil saknas') }
    }
    const coachId = clientRecord.userId

    // 2. Fetch the WOD and verify ownership
    const wod = await prisma.aIGeneratedWOD.findUnique({
      where: { id: wodId }
    })

    if (!wod || wod.clientId !== clientId) {
      return { success: false, error: copy(locale, 'Workout not found', 'Passet hittades inte') }
    }

    // 3. Find today's Training Day for this athlete (auto-create if needed)
    const now = new Date()
    let todayDay = await prisma.trainingDay.findFirst({
      where: {
        date: { gte: tzSafeDayStart(now), lte: tzSafeDayEnd(now) },
        week: { program: { clientId, isActive: true } }
      },
      orderBy: { date: 'desc' },
    })

    // If no training day exists, auto-create an ad-hoc program so the WOD can be scheduled
    if (!todayDay) {
      const weekStart = new Date(now)
      weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7)) // Monday
      weekStart.setHours(0, 0, 0, 0)
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6)
      weekEnd.setHours(23, 59, 59, 999)

      const adHocProgram = await prisma.trainingProgram.create({
        data: {
          clientId,
          coachId,
          name: copy(locale, 'Personal Training', 'Personlig Träning'),
          startDate: now,
          endDate: new Date(now.getFullYear(), now.getMonth() + 3, now.getDate()),
          isActive: true,
          weeks: {
            create: {
              weekNumber: 1,
              phase: 'BASE',
              startDate: weekStart,
              endDate: weekEnd,
              days: {
                create: {
                  date: now,
                  dayNumber: now.getDay() || 7,
                },
              },
            },
          },
        },
        include: { weeks: { include: { days: true } } },
      })

      todayDay = adHocProgram.weeks[0].days[0]
    }

    const targetDayId = todayDay.id

    // 4. Parse the WOD JSON structure
    const workoutData = wod.workoutJson as WodJson | null
    const sections = Array.isArray(workoutData?.sections) ? workoutData.sections : []

    // Map workoutType to WorkoutType enum
    const typeMap: Record<string, 'STRENGTH' | 'RUNNING' | 'CYCLING' | 'SWIMMING' | 'HYROX' | 'CORE' | 'OTHER'> = {
      strength: 'STRENGTH',
      cardio: 'RUNNING',
      mixed: 'HYROX',
      core: 'CORE'
    }

    const wType = (wod.workoutType && typeMap[wod.workoutType]) || 'OTHER'

    // Map intensity to enum
    const intensityMap: Record<string, 'RECOVERY' | 'EASY' | 'MODERATE' | 'THRESHOLD' | 'INTERVAL' | 'MAX'> = {
      recovery: 'RECOVERY',
      easy: 'EASY',
      moderate: 'MODERATE',
      threshold: 'THRESHOLD',
    }
    const wIntensity = wod.intensityAdjusted ? (intensityMap[wod.intensityAdjusted] || 'MODERATE') : 'MODERATE'

    const categoryMap: Record<string, string> = {
      STRENGTH: copy(locale, 'STRENGTH', 'STYRKA'),
      RUNNING: copy(locale, 'RUNNING', 'LÖPNING'),
      HYROX: copy(locale, 'EXPLOSIVENESS', 'EXPLOSIVITET'),
      CORE: copy(locale, 'CORE STABILITY', 'CORE STABILITET'),
      OTHER: copy(locale, 'TRAINING', 'TRÄNING')
    }

    // 5. Create the official Workout record
    const officialWorkout = await prisma.workout.create({
      data: {
        dayId: targetDayId,
        type: wType,
        name: wod.title,
        description: wod.description,
        intensity: wIntensity,
        duration: wod.requestedDuration,
        status: 'PLANNED',
        isCustom: true,
        heroTitle: wod.title,
        heroDescription: wod.subtitle || wod.description || copy(locale, 'AI-generated workout', 'AI Genererat pass'),
        heroCategory: categoryMap[wType] || copy(locale, 'STRENGTH', 'STYRKA'),
        focusGeneratedBy: 'AI',
        segments: {
          create: sections.map((section, sIdx) => ({
            order: sIdx + 1,
            type: section.type === 'WARMUP' ? 'warmup' : section.type === 'COOLDOWN' ? 'cooldown' : 'work',
            duration: section.duration,
            section: section.type === 'WARMUP' ? 'WARMUP' : section.type === 'COOLDOWN' ? 'COOLDOWN' : 'MAIN',
            description: section.name,
            exerciseId: section.exercises?.[0]?.exerciseId,
            sets: section.exercises?.[0]?.sets,
            repsCount: section.exercises?.[0]?.reps?.toString(),
            weight: section.exercises?.[0]?.weight?.toString(),
          }))
        }
      }
    })

    logger.info('Scheduled AI WOD to Hero Card', { wodId, workoutId: officialWorkout.id })

    // Revalidate both standard and business-scoped dashboard paths
    revalidatePath('/athlete/dashboard')
    revalidatePath('/[businessSlug]/athlete/dashboard', 'page')

    return { success: true, workoutId: officialWorkout.id }
  } catch (error) {
    logger.error('Failed to schedule WOD', { wodId, error })
    return { success: false, error: (error as Error).message }
  }
}
