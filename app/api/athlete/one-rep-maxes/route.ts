/**
 * Athlete-scoped 1RM History API
 *
 * GET /api/athlete/one-rep-maxes
 *
 * Mirrors the coach endpoint at /api/clients/[id]/one-rep-maxes but
 * resolves the clientId from the authenticated athlete's session
 * (via resolveAthleteClientId) instead of taking it from the URL.
 * Athletes can only see their own PRs — never another athlete's.
 *
 * Response shape matches the coach endpoint so the UI table component
 * stays the same; only the data source URL differs.
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { logError } from '@/lib/logger-console'

interface OneRepMaxEntry {
  id: string
  date: Date
  oneRepMax: number
  source: string
  unit: string
  bodyWeight: number | null
  notes: string | null
}

interface OneRepMaxGroup {
  exerciseId: string
  exerciseName: string
  exerciseNameSv: string | null
  category: string
  current: OneRepMaxEntry
  history: OneRepMaxEntry[]
}

export async function GET() {
  try {
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }
    const { clientId } = resolved

    const rows = await prisma.oneRepMaxHistory.findMany({
      where: { clientId },
      orderBy: { date: 'desc' },
      include: {
        exercise: {
          select: { id: true, name: true, nameSv: true, category: true },
        },
      },
    })

    // First row per exercise wins → that's the current PR (orderBy
    // date desc above). Same shape as the coach endpoint so the
    // athlete-side table component can re-use the type contract.
    const groups = new Map<string, OneRepMaxGroup>()
    for (const row of rows) {
      const entry: OneRepMaxEntry = {
        id: row.id,
        date: row.date,
        oneRepMax: row.oneRepMax,
        source: row.source,
        unit: row.unit,
        bodyWeight: row.bodyWeight,
        notes: row.notes,
      }
      const existing = groups.get(row.exerciseId)
      if (existing) {
        existing.history.push(entry)
      } else {
        groups.set(row.exerciseId, {
          exerciseId: row.exerciseId,
          exerciseName: row.exercise.name,
          exerciseNameSv: row.exercise.nameSv,
          category: row.exercise.category,
          current: entry,
          history: [entry],
        })
      }
    }

    return NextResponse.json({
      success: true,
      data: Array.from(groups.values()),
    })
  } catch (error: unknown) {
    logError('Athlete one-rep-maxes error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch PRs' },
      { status: 500 }
    )
  }
}
