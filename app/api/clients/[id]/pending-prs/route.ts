/**
 * Pending Auto-Detected PRs API
 *
 * GET /api/clients/[id]/pending-prs
 *
 * Returns OneRepMaxHistory entries with source='ESTIMATED' for one
 * client — the auto-detected PRs the runner created from logged sets.
 * The coach uses this list to confirm + promote each one to TESTED
 * once they've eyeballed the actual set, or delete it if it was a
 * fluke / data-entry error.
 *
 * Only returns entries that are still the *current* PR for their
 * exercise. Older estimated entries that have since been beaten by a
 * confirmed PR don't need attention anymore.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, handleApiError } from '@/lib/api/utils'
import { canAccessClient } from '@/lib/auth-utils'

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

    // Pull all of the client's PRs newest first; we'll filter in-memory
    // to "ESTIMATED entries that are still the highest for their
    // exercise" without a per-exercise subquery roundtrip.
    const rows = await prisma.oneRepMaxHistory.findMany({
      where: { clientId },
      orderBy: { date: 'desc' },
      include: {
        exercise: {
          select: { id: true, name: true, nameSv: true, category: true },
        },
      },
    })

    const seen = new Set<string>()
    const pending: Array<{
      id: string
      exerciseId: string
      exerciseName: string
      oneRepMax: number
      unit: string
      date: string
      notes: string | null
    }> = []

    for (const row of rows) {
      // First-write-wins per exercise: the newest row is the current
      // max regardless of source.
      if (seen.has(row.exerciseId)) continue
      seen.add(row.exerciseId)
      if (row.source !== 'ESTIMATED') continue
      pending.push({
        id: row.id,
        exerciseId: row.exerciseId,
        exerciseName: row.exercise.nameSv || row.exercise.name,
        oneRepMax: row.oneRepMax,
        unit: row.unit,
        date: row.date.toISOString(),
        notes: row.notes,
      })
    }

    return NextResponse.json({ success: true, data: pending })
  } catch (error: unknown) {
    return handleApiError(error)
  }
}
