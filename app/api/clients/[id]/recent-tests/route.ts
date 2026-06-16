/**
 * Recent Sport Tests API
 *
 * GET /api/clients/[id]/recent-tests
 *
 * Returns the 5 most recent test entries across every test source the
 * app currently supports — physiological Test rows, hockey physical
 * tests, and custom test protocols. Powers the Analys tab's "Senaste
 * tester" card so the coach gets a peek at sport-specific PRs without
 * having to flip to the Tests tab.
 *
 * The full Tests tab still owns drill-down + entry; this endpoint is
 * read-only summary.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, handleApiError } from '@/lib/api/utils'
import { canAccessClient } from '@/lib/auth-utils'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

interface RecentTestEntry {
  id: string
  date: string
  /** Discriminator for which model this row came from. */
  kind: 'TEST' | 'HOCKEY_PHYSICAL' | 'CUSTOM'
  /** Human label — testType for Test, protocol name for CustomTestResult, etc. */
  label: string
  /** One-line summary value (e.g. "VO2max 58.2 ml/kg/min"), nullable. */
  summary: string | null
  qualityReviewStatus?: 'CLEAR' | 'REVIEW_REQUIRED' | 'APPROVED' | null
  qualityWarningCount?: number
}

const LIMIT = 5

function numberFromJson(value: unknown, key: string): number | null {
  if (!value || typeof value !== 'object') return null
  const raw = (value as Record<string, unknown>)[key]
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : null
}

function bestOf(values: Array<number | null | undefined>, lowerIsBetter = false): number | null {
  const valid = values.filter((value): value is number => value != null && Number.isFinite(value))
  if (valid.length === 0) return null
  return lowerIsBetter ? Math.min(...valid) : Math.max(...valid)
}

function jsonArrayCount(value: unknown): number {
  return Array.isArray(value) ? value.length : 0
}

function formatHockeySummary(test: {
  muscleLabMaxima: unknown
  backSquat1RM: number | null
  powerClean1RM: number | null
  benchPress1RM: number | null
  standingLongJump: number | null
  sprint5m: number | null
  sprint10m: number | null
  sprint20m: number | null
  sprint30m: number | null
  agility505Left: number | null
  agility505Right: number | null
  beepTestLevel: number | null
  beepTestShuttle: number | null
  wingate30sAveragePower: number | null
}, locale: AppLocale): string | null {
  const parts: string[] = []
  const muscleLabWkg = numberFromJson(test.muscleLabMaxima, 'maxAveragePowerPerBodyMass')
  const agilityBest = bestOf([test.agility505Left, test.agility505Right], true)

  if (muscleLabWkg != null) parts.push(`MuscleLab ${muscleLabWkg.toFixed(1)} W/kg`)
  if (test.backSquat1RM != null) {
    parts.push(`${locale === 'sv' ? 'Knäböj' : 'Back squat'} ${test.backSquat1RM.toFixed(0)} kg`)
  }
  if (test.powerClean1RM != null) parts.push(`PC ${test.powerClean1RM.toFixed(0)} kg`)
  if (test.benchPress1RM != null) {
    parts.push(`${locale === 'sv' ? 'Bänk' : 'Bench press'} ${test.benchPress1RM.toFixed(0)} kg`)
  }
  if (test.standingLongJump != null) parts.push(`SLJ ${test.standingLongJump.toFixed(0)} cm`)
  if (test.sprint5m != null) parts.push(`5m ${test.sprint5m.toFixed(2)} s`)
  if (test.sprint10m != null) parts.push(`10m ${test.sprint10m.toFixed(2)} s`)
  if (test.sprint30m != null) parts.push(`30m ${test.sprint30m.toFixed(2)} s`)
  if (agilityBest != null) parts.push(`5-10-5 ${agilityBest.toFixed(2)} s`)
  if (test.beepTestLevel != null) {
    parts.push(`Beep ${test.beepTestLevel}${test.beepTestShuttle ? `.${test.beepTestShuttle}` : ''}`)
  }
  if (test.wingate30sAveragePower != null) parts.push(`Wingate ${test.wingate30sAveragePower.toFixed(0)} W`)

  return parts.length > 0 ? parts.slice(0, 3).join(' · ') : null
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const locale: AppLocale = resolveRequestLocale(request, user.language)
    const { id: clientId } = await params

    const hasAccess = await canAccessClient(user.id, clientId)
    if (!hasAccess) {
      return NextResponse.json({ error: t(locale, 'Forbidden', 'Förbjudet') }, { status: 403 })
    }

    // Pull from the three test sources in parallel. Each grabs a few
    // more than LIMIT so we have headroom after merging + sorting.
    const [tests, hockey, custom, testCount, hockeyCount, customCount] = await Promise.all([
      prisma.test.findMany({
        where: { clientId, status: { not: 'DRAFT' } },
        orderBy: { testDate: 'desc' },
        take: LIMIT * 2,
        select: {
          id: true,
          testDate: true,
          testType: true,
          vo2max: true,
          maxHR: true,
          qualityReviewStatus: true,
          qualityWarnings: true,
        },
      }),
      prisma.hockeyPhysicalTest.findMany({
        where: { clientId },
        orderBy: { testDate: 'desc' },
        take: LIMIT * 2,
        select: {
          id: true,
          testDate: true,
          muscleLabMaxima: true,
          backSquat1RM: true,
          powerClean1RM: true,
          benchPress1RM: true,
          standingLongJump: true,
          sprint5m: true,
          sprint10m: true,
          sprint20m: true,
          sprint30m: true,
          agility505Left: true,
          agility505Right: true,
          beepTestLevel: true,
          beepTestShuttle: true,
          wingate30sAveragePower: true,
        },
      }),
      prisma.customTestResult.findMany({
        where: { clientId },
        orderBy: { testDate: 'desc' },
        take: LIMIT * 2,
        include: {
          protocol: { select: { name: true } },
        },
      }),
      prisma.test.count({ where: { clientId, status: { not: 'DRAFT' } } }),
      prisma.hockeyPhysicalTest.count({ where: { clientId } }),
      prisma.customTestResult.count({ where: { clientId } }),
    ])

    const entries: RecentTestEntry[] = []

    for (const t of tests) {
      // Format the most useful single number per test type into a
      // one-line summary the card can show inline.
      let summary: string | null = null
      if (t.vo2max != null) summary = `VO₂max ${t.vo2max.toFixed(1)} ml/kg/min`
      else if (t.maxHR != null) summary = `MaxHR ${t.maxHR} bpm`
      entries.push({
        id: t.id,
        date: t.testDate.toISOString(),
        kind: 'TEST',
        label: t.testType,
        summary,
        qualityReviewStatus: t.qualityReviewStatus as RecentTestEntry['qualityReviewStatus'],
        qualityWarningCount: jsonArrayCount(t.qualityWarnings),
      })
    }

    for (const h of hockey) {
      entries.push({
        id: h.id,
        date: h.testDate.toISOString(),
        kind: 'HOCKEY_PHYSICAL',
        label: locale === 'sv' ? 'Hockey fysprov' : 'Hockey physical test',
        summary: formatHockeySummary(h, locale),
      })
    }

    for (const c of custom) {
      entries.push({
        id: c.id,
        date: c.testDate.toISOString(),
        kind: 'CUSTOM',
        label: c.protocol.name,
        summary: null,
      })
    }

    // Newest first, then trim.
    entries.sort((a, b) => (a.date < b.date ? 1 : -1))
    return NextResponse.json({
      success: true,
      data: entries.slice(0, LIMIT),
      counts: {
        test: testCount,
        hockey: hockeyCount,
        custom: customCount,
      },
    })
  } catch (error: unknown) {
    return handleApiError(error)
  }
}

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}
