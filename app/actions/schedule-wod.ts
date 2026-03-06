'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { tzSafeDayStart, tzSafeDayEnd } from '@/lib/date-utils'

export async function scheduleWODToDashboard(wodId: string) {
  try {
    // 1. Authenticate and resolve correct clientId (handles both ATHLETE and COACH in athlete mode)
    const resolved = await resolveAthleteClientId()

    if (!resolved) {
      return { success: false, error: 'Ej inloggad' }
    }

    const clientId = resolved.clientId

    // 2. Fetch the WOD and verify ownership
    const wod = await prisma.aIGeneratedWOD.findUnique({
      where: { id: wodId }
    })

    if (!wod || wod.clientId !== clientId) {
      return { success: false, error: 'Passet hittades inte' }
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
      const adHocProgram = await prisma.trainingProgram.create({
        data: {
          clientId,
          name: 'Personlig Träning',
          startDate: now,
          endDate: new Date(now.getFullYear(), now.getMonth() + 3, now.getDate()),
          isActive: true,
          weeks: {
            create: {
              weekNumber: 1,
              phase: 'General',
              days: {
                create: {
                  date: now,
                  dayOfWeek: now.getDay() || 7,
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
    const workoutData = wod.workoutJson as any
    const sections = workoutData.sections || []

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
      STRENGTH: 'STYRKA',
      RUNNING: 'LÖPNING',
      HYROX: 'EXPLOSIVITET',
      CORE: 'CORE STABILITET',
      OTHER: 'TRÄNING'
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
        heroDescription: wod.subtitle || wod.description || 'AI Genererat pass',
        heroCategory: categoryMap[wType] || 'STYRKA',
        focusGeneratedBy: 'AI',
        segments: {
          create: sections.map((section: any, sIdx: number) => ({
            order: sIdx + 1,
            type: section.type === 'WARMUP' ? 'warmup' : section.type === 'COOLDOWN' ? 'cooldown' : 'work',
            duration: section.duration,
            section: section.type === 'WARMUP' ? 'WARMUP' : section.type === 'COOLDOWN' ? 'COOLDOWN' : 'MAIN',
            description: section.name,
            exerciseId: section.exercises?.[0]?.exerciseId,
            sets: section.exercises?.[0]?.sets,
            repsCount: section.exercises?.[0]?.reps,
            weight: section.exercises?.[0]?.weight,
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
