/**
 * Bulk Strength PR API
 *
 * POST /api/strength-pr/bulk
 *
 * Onboards a whole team's 1RM data in one paste — the missing piece
 * for the team-coach % of 1RM workflow. Without this, prescribing
 * "5×80%" to a 25-player roster requires 25 manual PR entries per
 * exercise, which nobody actually does.
 *
 * Body shape:
 *   { teamId: string, entries: Array<{
 *       clientId, exerciseId, oneRepMax,
 *       date?, source?, notes?, bodyWeight?
 *     }> }
 *
 * Each entry is validated server-side: the clientId must be in the
 * coach-owned team's roster, the exerciseId must exist, oneRepMax must
 * be positive. Failures are reported per-index so the client can show
 * row-level error states without rolling back successful inserts.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireCoach, canAccessClient } from '@/lib/auth-utils'
import { logError } from '@/lib/logger-console'

interface BulkPREntry {
  clientId: string
  exerciseId: string
  oneRepMax: number
  date?: string
  source?: 'TESTED' | 'CALCULATED' | 'ESTIMATED'
  notes?: string
  bodyWeight?: number
  unit?: string
}

interface BulkPRError {
  index: number
  message: string
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireCoach()
    const body = await request.json()
    const { teamId, clientId, entries } = body as {
      teamId?: string
      clientId?: string
      entries?: BulkPREntry[]
    }

    if (!Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json(
        { error: 'Non-empty entries[] is required' },
        { status: 400 }
      )
    }
    if (!teamId && !clientId) {
      return NextResponse.json(
        { error: 'Either teamId or clientId is required' },
        { status: 400 }
      )
    }
    if (entries.length > 1000) {
      // Hard cap to prevent runaway batches; real teams are far below this.
      return NextResponse.json(
        { error: 'Max 1000 entries per request' },
        { status: 400 }
      )
    }

    // Build the set of acceptable clientIds based on the scope:
    //   - teamId: every roster member (entries must have clientId in the team)
    //   - clientId: just that one client (entries' clientId must match it)
    // Then validate exercises exist in parallel.
    let memberIdSet: Set<string>
    if (teamId) {
      const team = await prisma.team.findFirst({
        where: { id: teamId, userId: user.id },
        select: { id: true, members: { select: { id: true } } },
      })
      if (!team) {
        return NextResponse.json({ error: 'Team not found' }, { status: 404 })
      }
      memberIdSet = new Set(team.members.map((m) => m.id))
    } else {
      const hasAccess = await canAccessClient(user.id, clientId!)
      if (!hasAccess) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      memberIdSet = new Set([clientId!])
    }

    const exercises = await prisma.exercise.findMany({
      where: {
        id: { in: Array.from(new Set(entries.map((e) => e.exerciseId))) },
      },
      select: { id: true },
    })
    const exerciseIdSet = new Set(exercises.map((e) => e.id))

    const errors: BulkPRError[] = []
    const validRows: Array<{
      clientId: string
      exerciseId: string
      oneRepMax: number
      date: Date
      source: string
      notes: string | null
      bodyWeight: number | null
      unit: string
    }> = []

    entries.forEach((entry, index) => {
      if (!entry.clientId || !memberIdSet.has(entry.clientId)) {
        errors.push({
          index,
          message: teamId ? 'Atleten finns inte i laget' : 'Fel klient-id',
        })
        return
      }
      if (!entry.exerciseId || !exerciseIdSet.has(entry.exerciseId)) {
        errors.push({ index, message: 'Övningen kunde inte matchas' })
        return
      }
      if (typeof entry.oneRepMax !== 'number' || entry.oneRepMax <= 0) {
        errors.push({ index, message: 'Vikten måste vara > 0' })
        return
      }
      validRows.push({
        clientId: entry.clientId,
        exerciseId: entry.exerciseId,
        oneRepMax: entry.oneRepMax,
        date: entry.date ? new Date(entry.date) : new Date(),
        source: entry.source ?? 'TESTED',
        notes: entry.notes ?? null,
        bodyWeight: entry.bodyWeight ?? null,
        unit: typeof entry.unit === 'string' ? entry.unit : 'KG',
      })
    })

    let created = 0
    if (validRows.length > 0) {
      // createMany is fine here — no per-row return value needed and
      // none of the columns require a per-row computed value.
      const result = await prisma.oneRepMaxHistory.createMany({
        data: validRows,
        skipDuplicates: false,
      })
      created = result.count
    }

    return NextResponse.json({
      success: true,
      created,
      attempted: entries.length,
      errors,
    })
  } catch (error) {
    logError('Bulk strength-pr error:', error)
    return NextResponse.json(
      { error: 'Failed to bulk import PRs' },
      { status: 500 }
    )
  }
}
