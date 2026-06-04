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
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'
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

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

function resolveLocale(request?: Request, userLanguage?: string | null): AppLocale {
  return request ? resolveRequestLocale(request, userLanguage) : userLanguage === 'sv' ? 'sv' : 'en'
}

export async function GET(request?: Request) {
  let locale: AppLocale = resolveLocale(request)

  try {
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json(
        { success: false, error: t(locale, 'Unauthorized', 'Obehörig') },
        { status: 401 }
      )
    }
    locale = resolveLocale(request, resolved.user.language)
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
      { success: false, error: t(locale, 'Failed to fetch PRs', 'Kunde inte hämta personbästan') },
      { status: 500 }
    )
  }
}
