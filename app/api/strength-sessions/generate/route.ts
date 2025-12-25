/**
 * Strength Session Auto-Generation API
 *
 * POST - Generate a strength session automatically based on athlete profile
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireCoach } from '@/lib/auth-utils'
import { generateStrengthSession, type AutoGenerateParams } from '@/lib/training-engine/generators/auto-strength-generator'
import { StrengthPhase } from '@prisma/client'
import { logger } from '@/lib/logger'

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
    } = body

    // Validate required fields
    if (!goal || !phase) {
      return NextResponse.json(
        { error: 'Goal and phase are required' },
        { status: 400 }
      )
    }

    // Get athlete's recent exercises if clientId provided
    let recentExerciseIds: string[] = []
    let oneRmData: Record<string, number> = {}

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
    }

    // Fetch exercise library
    const exerciseLibrary = await prisma.exercise.findMany({
      where: {
        isPublic: true,
      },
      select: {
        id: true,
        name: true,
        nameSv: true,
        biomechanicalPillar: true,
        progressionLevel: true,
        equipment: true,
        category: true,
      },
    })

    // Map to include isPlyometric based on category
    const exerciseLibraryWithPlyometric = exerciseLibrary.map((ex) => ({
      ...ex,
      isPlyometric: ex.category === 'PLYOMETRIC',
    }))

    // Generate session
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

    const generatedSession = await generateStrengthSession(params, exerciseLibraryWithPlyometric)

    return NextResponse.json({
      success: true,
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
