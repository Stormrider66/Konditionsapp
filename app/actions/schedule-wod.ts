'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export async function scheduleWODToDashboard(wodId: string, clientId: string) {
  try {
    // 1. Fetch the drafted WOD
    const wod = await prisma.aIGeneratedWOD.findUnique({
      where: { id: wodId }
    })

    if (!wod || wod.clientId !== clientId) {
      throw new Error('WOD not found or unauthorized')
    }

    // 2. Find or create today's Training Day for this athlete
    // To do this properly, we need the active program week
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
      // Find today's date in the program
      // For simplicity in this action, we'll just grab the most recent day or create an ad-hoc one
      // In a full implementation, you'd match by actual date.
      const firstWeek = activeProgram.weeks[0]
      const firstDay = firstWeek?.days[0]
      
      if (firstDay) {
        targetDayId = firstDay.id
      } else {
        throw new Error('No valid training days found in active program')
      }
    } else {
      // If no active program, create an ad-hoc Workout not tied to a specific day, 
      // or handle your ad-hoc structure. For this example, we assume we need a Day.
      throw new Error('Athlete must have an active program to schedule a workout')
    }

    // 3. Parse the WOD JSON structure
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

    // Determine Hero category based on type
    const categoryMap: Record<string, string> = {
      STRENGTH: 'STYRKA',
      RUNNING: 'LÖPNING',
      HYROX: 'EXPLOSIVITET',
      CORE: 'CORE STABILITET',
      OTHER: 'TRÄNING'
    }

    // 4. Create the official Workout record
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
        // Hero Card fields
        heroTitle: wod.title,
        heroDescription: wod.subtitle || wod.description || 'AI Genererat pass',
        heroCategory: categoryMap[wType] || 'STYRKA',
        focusGeneratedBy: 'AI',
        
        // Nested segments creation
        segments: {
          create: sections.map((section: any, sIdx: number) => ({
            order: sIdx + 1,
            type: section.type === 'WARMUP' ? 'warmup' : section.type === 'COOLDOWN' ? 'cooldown' : 'work',
            duration: section.duration,
            section: section.type === 'WARMUP' ? 'WARMUP' : section.type === 'COOLDOWN' ? 'COOLDOWN' : 'MAIN',
            description: section.name,
            // If the section only has one exercise, we can map it here.
            // Complex WOD to Segment mapping usually requires one segment per exercise for strength.
            // For simplicity, mapping the first exercise to the segment.
            exerciseId: section.exercises?.[0]?.exerciseId,
            sets: section.exercises?.[0]?.sets,
            repsCount: section.exercises?.[0]?.reps,
            weight: section.exercises?.[0]?.weight,
          }))
        }
      }
    })

    logger.info('Scheduled AI WOD to Hero Card', { wodId, workoutId: officialWorkout.id })

    // 5. Revalidate the dashboard so the HeroCard updates instantly
    revalidatePath('/athlete/dashboard')

    return { success: true, workoutId: officialWorkout.id }
  } catch (error) {
    logger.error('Failed to schedule WOD', { wodId, error })
    return { success: false, error: (error as Error).message }
  }
}
