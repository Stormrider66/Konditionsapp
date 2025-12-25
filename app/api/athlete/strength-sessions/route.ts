import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAthlete } from '@/lib/auth-utils'
import { AssignmentStatus } from '@prisma/client'

/**
 * GET /api/athlete/strength-sessions
 * Get athlete's strength session assignments
 */
export async function GET(request: NextRequest) {
  try {
    const athlete = await requireAthlete()

    // Get athlete's client ID
    const athleteAccount = await prisma.athleteAccount.findUnique({
      where: { userId: athlete.id },
    })

    if (!athleteAccount) {
      return NextResponse.json(
        { success: false, error: 'Athlete account not found' },
        { status: 404 }
      )
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') // PENDING, IN_PROGRESS, COMPLETED, SKIPPED
    const fromDate = searchParams.get('from')
    const toDate = searchParams.get('to')
    const limit = parseInt(searchParams.get('limit') || '10')

    // Build where clause
    const where: {
      athleteId: string
      status?: AssignmentStatus
      assignedDate?: { gte?: Date; lte?: Date }
    } = {
      athleteId: athleteAccount.clientId,
    }

    if (status && Object.values(AssignmentStatus).includes(status as AssignmentStatus)) {
      where.status = status as AssignmentStatus
    }

    if (fromDate || toDate) {
      where.assignedDate = {}
      if (fromDate) where.assignedDate.gte = new Date(fromDate)
      if (toDate) where.assignedDate.lte = new Date(toDate)
    }

    // Get assignments
    const assignments = await prisma.strengthSessionAssignment.findMany({
      where,
      include: {
        session: {
          select: {
            id: true,
            name: true,
            description: true,
            phase: true,
            estimatedDuration: true,
            exercises: true,
            warmupData: true,
            coreData: true,
            cooldownData: true,
            totalSets: true,
            totalExercises: true,
          },
        },
        setLogs: {
          orderBy: { completedAt: 'desc' },
          take: 1, // Just get latest for summary
        },
      },
      orderBy: { assignedDate: 'desc' },
      take: limit,
    })

    // Transform for frontend
    const transformedAssignments = assignments.map((assignment) => {
      // Count exercises from JSON
      const exercises = assignment.session.exercises as Array<{
        exerciseId: string
        sets: number
      }>
      const totalMainExercises = exercises?.length || 0
      const totalMainSets = exercises?.reduce((sum, ex) => sum + (ex.sets || 0), 0) || 0

      // Count warmup/core/cooldown exercises
      const warmupData = assignment.session.warmupData as { exercises?: Array<{ sets: number }> } | null
      const coreData = assignment.session.coreData as { exercises?: Array<{ sets: number }> } | null
      const cooldownData = assignment.session.cooldownData as { exercises?: Array<{ sets: number }> } | null

      const warmupExercises = warmupData?.exercises?.length || 0
      const coreExercises = coreData?.exercises?.length || 0
      const cooldownExercises = cooldownData?.exercises?.length || 0

      const totalExercises = totalMainExercises + warmupExercises + coreExercises + cooldownExercises

      // Count logged sets for this assignment
      const completedSetsCount = assignment.setLogs.length

      return {
        id: assignment.id,
        assignedDate: assignment.assignedDate,
        status: assignment.status,
        completedAt: assignment.completedAt,
        rpe: assignment.rpe,
        duration: assignment.duration,
        notes: assignment.notes,
        session: {
          id: assignment.session.id,
          name: assignment.session.name,
          description: assignment.session.description,
          phase: assignment.session.phase,
          estimatedDuration: assignment.session.estimatedDuration,
          totalExercises,
          totalSets: totalMainSets,
          hasWarmup: warmupExercises > 0,
          hasCore: coreExercises > 0,
          hasCooldown: cooldownExercises > 0,
        },
        progress: {
          completedSets: completedSetsCount,
          lastActivity: assignment.setLogs[0]?.completedAt || null,
        },
      }
    })

    // Also get today's sessions for quick access
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const todaysSessions = await prisma.strengthSessionAssignment.findMany({
      where: {
        athleteId: athleteAccount.clientId,
        assignedDate: {
          gte: today,
          lt: tomorrow,
        },
      },
      include: {
        session: {
          select: {
            id: true,
            name: true,
            phase: true,
            estimatedDuration: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        assignments: transformedAssignments,
        today: todaysSessions.map((s) => ({
          id: s.id,
          status: s.status,
          session: s.session,
        })),
        stats: {
          pending: transformedAssignments.filter((a) => a.status === AssignmentStatus.PENDING).length,
          scheduled: transformedAssignments.filter((a) => a.status === AssignmentStatus.SCHEDULED).length,
          completed: transformedAssignments.filter((a) => a.status === AssignmentStatus.COMPLETED).length,
        },
      },
    })
  } catch (error) {
    console.error('Error fetching strength sessions:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch strength sessions' },
      { status: 500 }
    )
  }
}
