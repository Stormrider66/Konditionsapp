/**
 * Auto-PR from a logged set
 *
 * POST /api/strength-pr/from-set
 *
 * Called by the athlete-side runner when their just-logged set
 * produces an estimated1RM higher than their stored max for the
 * exercise. Writes a single OneRepMaxHistory row with source
 * 'ESTIMATED' (the value came from a non-1RM set via Epley, not a
 * tested single).
 *
 * Why a focused endpoint vs reusing POST /api/strength-pr:
 *  - The original endpoint also creates a ProgressionTracking row and
 *    has no clientId-ownership check. The athlete already created a
 *    SetLog via /sets, so a second progression row would duplicate
 *    that data, and a missing ownership check is a real auth gap.
 *  - Here the validation is straightforward: caller must own the
 *    referenced assignment, and the exerciseId must be one of the
 *    exercises actually present on that assignment's session (so an
 *    athlete can't backdoor PRs for unrelated exercises).
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { logError } from '@/lib/logger-console'

interface SessionExerciseShape {
  exerciseId: string
  followUps?: Array<{ exerciseId: string }>
}

interface SectionDataShape {
  exercises?: SessionExerciseShape[]
}

export async function POST(request: NextRequest) {
  try {
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }
    const { clientId } = resolved

    const body = await request.json()
    const {
      assignmentId,
      exerciseId,
      oneRepMax,
      bodyWeight,
    } = body as {
      assignmentId?: string
      exerciseId?: string
      oneRepMax?: number
      bodyWeight?: number
    }

    if (!assignmentId || !exerciseId || typeof oneRepMax !== 'number' || oneRepMax <= 0) {
      return NextResponse.json(
        { success: false, error: 'assignmentId, exerciseId and oneRepMax > 0 are required' },
        { status: 400 }
      )
    }

    // Verify the assignment belongs to the athlete and pull the session
    // exercises so we can confirm the exerciseId actually appears on it.
    const assignment = await prisma.strengthSessionAssignment.findUnique({
      where: { id: assignmentId },
      select: {
        athleteId: true,
        session: {
          select: {
            exercises: true,
            warmupData: true,
            prehabData: true,
            coreData: true,
            cooldownData: true,
          },
        },
      },
    })
    if (!assignment) {
      return NextResponse.json({ success: false, error: 'Assignment not found' }, { status: 404 })
    }
    if (assignment.athleteId !== clientId) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    // Walk every section's exercise JSON (and follow-ups) and confirm
    // the requested exerciseId is one the athlete is actually assigned.
    const sessionExerciseIds = new Set<string>()
    const collect = (list: SessionExerciseShape[] | undefined) => {
      list?.forEach((e) => {
        sessionExerciseIds.add(e.exerciseId)
        e.followUps?.forEach((f) => sessionExerciseIds.add(f.exerciseId))
      })
    }
    collect(assignment.session.exercises as unknown as SessionExerciseShape[] | null ?? undefined)
    collect((assignment.session.warmupData as unknown as SectionDataShape | null)?.exercises)
    collect((assignment.session.prehabData as unknown as SectionDataShape | null)?.exercises)
    collect((assignment.session.coreData as unknown as SectionDataShape | null)?.exercises)
    collect((assignment.session.cooldownData as unknown as SectionDataShape | null)?.exercises)

    if (!sessionExerciseIds.has(exerciseId)) {
      return NextResponse.json(
        { success: false, error: 'Exercise not part of this assignment' },
        { status: 400 }
      )
    }

    // Re-check stored max server-side, KG-scoped (auto-PRs only make
    // sense in kilograms). The runner makes the call after a client-
    // side comparison, but we don't trust it — a stale client could
    // otherwise downgrade a real PR if the user hammered "Spara"
    // multiple times with old state.
    const latest = await prisma.oneRepMaxHistory.findFirst({
      where: { clientId, exerciseId, unit: 'KG' },
      orderBy: { date: 'desc' },
      select: { oneRepMax: true },
    })
    if (latest && oneRepMax <= latest.oneRepMax) {
      return NextResponse.json(
        {
          success: false,
          error: 'Inte en ny PR',
          currentMax: latest.oneRepMax,
        },
        { status: 409 }
      )
    }

    const created = await prisma.oneRepMaxHistory.create({
      data: {
        clientId,
        exerciseId,
        date: new Date(),
        oneRepMax,
        source: 'ESTIMATED',
        // Always KG — the value here came from Epley applied to a
        // weighted set, which only makes sense in kilograms.
        unit: 'KG',
        bodyWeight: bodyWeight ?? null,
        notes: 'Auto-detekterad från loggat set',
      },
    })

    return NextResponse.json({ success: true, data: created })
  } catch (error) {
    logError('PR-from-set error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to record PR' },
      { status: 500 }
    )
  }
}
