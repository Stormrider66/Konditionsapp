/**
 * Client 1RM History API
 *
 * GET /api/clients/:id/one-rep-maxes
 *
 * Returns every recorded 1RM for a client, grouped by exercise. The
 * `current` field on each group is the latest entry (the value that
 * percent-based session prescriptions resolve against). The `history`
 * array is full chronological history newest-first so a coach can see
 * progression and spot stale PRs.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, handleApiError } from '@/lib/api/utils'
import { canAccessClient } from '@/lib/auth-utils'
import { asRecord, isStrengthPrSyncProtocol, syncStrengthSportTestToPrHistory } from '@/lib/strength/sport-test-pr-sync'

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id: clientId } = await params

    const hasAccess = await canAccessClient(user.id, clientId)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const strengthTests = await prisma.sportTest.findMany({
      where: {
        clientId,
        category: 'STRENGTH',
      },
      select: {
        protocol: true,
        testDate: true,
        rawData: true,
        primaryResult: true,
      },
      orderBy: { testDate: 'asc' },
    })

    for (const test of strengthTests) {
      if (!isStrengthPrSyncProtocol(test.protocol)) continue
      await syncStrengthSportTestToPrHistory({
        clientId,
        protocol: test.protocol,
        testDate: test.testDate,
        rawData: asRecord(test.rawData),
        primaryResult: test.primaryResult,
        updateExistingSameDay: false,
      })
    }

    const rows = await prisma.oneRepMaxHistory.findMany({
      where: { clientId },
      orderBy: { date: 'desc' },
      include: {
        exercise: {
          select: {
            id: true,
            name: true,
            nameSv: true,
            category: true,
          },
        },
      },
    })

    // Group rows by exercise. Order is preserved (date desc) so the
    // first row per exercise is automatically the current PR.
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

    return NextResponse.json(
      {
        success: true,
        data: Array.from(groups.values()),
      },
      { status: 200 }
    )
  } catch (error: unknown) {
    return handleApiError(error)
  }
}
