/**
 * Strength Session Auto-Generation API
 *
 * POST - Generate a strength session automatically based on athlete profile
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireCoach } from '@/lib/auth-utils'
import { generateStrengthSession, generateWeeklyProgram, type AutoGenerateParams } from '@/lib/training-engine/generators/auto-strength-generator'
import { StrengthPhase } from '@prisma/client'
import { logger } from '@/lib/logger'
import { getCalendarConstraints } from '@/lib/calendar/availability-calculator'

interface GenerateRequestBody {
  clientId?: string
  goal: 'strength' | 'power' | 'injury-prevention' | 'running-economy'
  phase: StrengthPhase
  sessionsPerWeek: 1 | 2 | 3
  equipmentAvailable: string[]
  timePerSession: number
  athleteLevel?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ELITE'
  includeWarmup?: boolean
  includeCore?: boolean
  includeCooldown?: boolean
  mode?: 'single' | 'weekly'
  weekStartDate?: string // ISO date string
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireCoach()
    const body: GenerateRequestBody = await request.json()

    const {
      clientId,
      goal,
      phase,
      sessionsPerWeek = 2,
      equipmentAvailable = ['all'],
      timePerSession = 45,
      athleteLevel = 'INTERMEDIATE',
      includeWarmup = true,
      includeCore = true,
      includeCooldown = true,
      mode = 'single',
      weekStartDate,
    } = body

    // Validate required fields
    if (!goal || !phase) {
      return NextResponse.json(
        { error: 'Goal and phase are required' },
        { status: 400 }
      )
    }

    // Get athlete's recent exercises, 1RM data, and restrictions if clientId provided
    let recentExerciseIds: string[] = []
    let oneRmData: Record<string, number> = {}
    let restrictedExerciseIds: string[] = []
    let restrictedBodyParts: string[] = []
    let restrictionTypes: string[] = []

    if (clientId) {
      // Get exercises from last 2 weeks
      const twoWeeksAgo = new Date()
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)

      const recentLogs = await prisma.progressionTracking.findMany({
        where: {
          clientId,
          date: { gte: twoWeeksAgo },
        },
        select: {
          exerciseId: true,
        },
        distinct: ['exerciseId'],
      })

      recentExerciseIds = recentLogs.map((log) => log.exerciseId)

      // Get 1RM estimates
      const oneRmHistory = await prisma.oneRepMaxHistory.findMany({
        where: {
          clientId,
        },
        orderBy: {
          date: 'desc',
        },
        distinct: ['exerciseId'],
        select: {
          exerciseId: true,
          oneRepMax: true,
        },
      })

      oneRmData = oneRmHistory.reduce((acc, rm) => {
        acc[rm.exerciseId] = rm.oneRepMax
        return acc
      }, {} as Record<string, number>)

      // Get active training restrictions
      try {
        const restrictions = await prisma.trainingRestriction.findMany({
          where: {
            clientId,
            isActive: true,
            OR: [
              { endDate: null },
              { endDate: { gte: new Date() } },
            ],
          },
          select: {
            type: true,
            bodyParts: true,
            affectedExerciseIds: true,
          },
        })

        restrictedExerciseIds = restrictions.flatMap((r) => r.affectedExerciseIds || [])
        restrictedBodyParts = restrictions.flatMap((r) => r.bodyParts || [])
        restrictionTypes = restrictions.map((r) => r.type)
      } catch {
        // Table may not exist — skip
      }
    }

    // Fetch exercise library (include contraindications and targetBodyParts for filtering)
    const exerciseLibrary = await prisma.exercise.findMany({
      where: {
        OR: [{ isPublic: true }, ...(clientId ? [{ coachId: user.id }] : [])],
      },
      select: {
        id: true,
        name: true,
        nameSv: true,
        biomechanicalPillar: true,
        progressionLevel: true,
        equipment: true,
        category: true,
        targetBodyParts: true,
        contraindications: true,
      },
    })

    // Filter out restricted exercises and map
    const exerciseLibraryFiltered = exerciseLibrary
      .filter((ex) => {
        // Exclude specifically restricted exercises
        if (restrictedExerciseIds.includes(ex.id)) return false

        // Exclude exercises targeting restricted body parts
        if (restrictedBodyParts.length > 0 && ex.targetBodyParts && ex.targetBodyParts.length > 0) {
          const hasRestrictedPart = ex.targetBodyParts.some((part: string) =>
            restrictedBodyParts.some((restricted) =>
              part.toLowerCase().includes(restricted.toLowerCase()) ||
              restricted.toLowerCase().includes(part.toLowerCase())
            )
          )
          if (hasRestrictedPart) return false
        }

        // Exclude exercises contraindicated by restriction types
        if (ex.contraindications && ex.contraindications.length > 0) {
          const hasContraindication = ex.contraindications.some((ci: string) =>
            restrictionTypes.some((rt) =>
              ci.toLowerCase().includes(rt.toLowerCase().replace(/_/g, ' ')) ||
              rt.toLowerCase().replace(/_/g, ' ').includes(ci.toLowerCase())
            )
          )
          if (hasContraindication) return false
        }

        // Exclude jumping/plyometric exercises if NO_JUMPING restriction
        if (restrictionTypes.includes('NO_JUMPING') && ex.category === 'PLYOMETRIC') return false

        // Exclude upper body if NO_UPPER_BODY restriction
        if (restrictionTypes.includes('NO_UPPER_BODY') && ex.biomechanicalPillar === 'UPPER_BODY') return false

        // Exclude lower body pillars if NO_LOWER_BODY restriction
        if (restrictionTypes.includes('NO_LOWER_BODY') &&
          ['POSTERIOR_CHAIN', 'KNEE_DOMINANCE', 'FOOT_ANKLE'].includes(ex.biomechanicalPillar || '')) return false

        return true
      })
      .map((ex) => ({
        ...ex,
        isPlyometric: ex.category === 'PLYOMETRIC',
      }))

    // Build generation params
    const params: AutoGenerateParams = {
      athleteId: clientId || user.id,
      goal,
      phase,
      sessionsPerWeek,
      equipmentAvailable,
      timePerSession,
      athleteLevel,
      includeWarmup,
      includeCore,
      includeCooldown,
      recentExerciseIds,
      oneRmData,
    }

    if (mode === 'weekly') {
      // Weekly program mode — generate multiple complementary sessions
      // Fetch calendar constraints if athlete selected
      let calendarConstraintsData: { blockedDates: string[]; reducedDates: string[]; startDate?: string } | undefined
      if (clientId && weekStartDate) {
        try {
          const start = new Date(weekStartDate)
          const end = new Date(start)
          end.setDate(end.getDate() + 6)
          const constraints = await getCalendarConstraints(clientId, start, end)
          calendarConstraintsData = {
            blockedDates: constraints.blockedDates,
            reducedDates: constraints.reducedDates,
            startDate: weekStartDate,
          }
        } catch {
          // Calendar constraints not available — generate without
        }
      }

      const sessions = await generateWeeklyProgram(params, exerciseLibraryFiltered, calendarConstraintsData)

      // Attach calendar info to response
      return NextResponse.json({
        success: true,
        mode: 'weekly',
        data: sessions,
        calendar: calendarConstraintsData ? {
          blockedDates: calendarConstraintsData.blockedDates,
          reducedDates: calendarConstraintsData.reducedDates,
        } : null,
      })
    }

    // Single session mode (default)
    const generatedSession = await generateStrengthSession(params, exerciseLibraryFiltered)

    return NextResponse.json({
      success: true,
      mode: 'single',
      data: generatedSession,
    })
  } catch (error) {
    logger.error('Error generating strength session', {}, error)
    return NextResponse.json(
      { error: 'Failed to generate strength session' },
      { status: 500 }
    )
  }
}
