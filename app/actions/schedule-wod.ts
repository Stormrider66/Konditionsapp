'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { resolveAthleteClientId } from '@/lib/auth-utils'

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

    // 3. Find today's Training Day for this athlete
    const activeProgram = await prisma.trainingProgram.findFirst({
      where: { clientId, isActive: true },
      include: {
        weeks: {
          include: {
            days: true
          }
        }
      }
    })

    let targetDayId: string

    if (activeProgram) {
      const firstWeek = activeProgram.weeks[0]
      const firstDay = firstWeek?.days[0]

      if (firstDay) {
        targetDayId = firstDay.id
      } else {
        return { success: false, error: 'Inga träningsdagar hittades i ditt aktiva program' }
      }
    } else {
      return { success: false, error: 'Du behöver ett aktivt träningsprogram för att schemalägga pass' }
    }

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
