/**
 * Unified Assessment Timeline API
 *
 * GET /api/clients/[id]/assessments?kind=<AssessmentKind>&limit=<n>
 *
 * One chronological feed across every test source the app supports:
 * physiological Test rows, hockey physical batteries, sport field tests,
 * ergometer tests, and custom protocols. Each row is tagged with its `kind`
 * and an `isTeamTest` marker (derived from teamId where the model has one).
 *
 * Phase 1 of the athlete-profile IA redesign — supersedes the limited
 * /recent-tests peek as the Development tab's test history surface.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, handleApiError } from '@/lib/api/utils'
import { canAccessClient } from '@/lib/auth-utils'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'
import type { AssessmentEntry, AssessmentKind } from '@/lib/coach/assessment-feed'

const DEFAULT_LIMIT = 25
const MAX_LIMIT = 100

const ALL_KINDS: AssessmentKind[] = [
  'ENDURANCE',
  'HOCKEY_PHYSICAL',
  'SPORT_TEST',
  'ERGOMETER',
  'CUSTOM',
]

function tr(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

/** UPPER_SNAKE → "Upper snake" for enum-derived labels. */
function humanize(value: string): string {
  const lower = value.toLowerCase().replace(/_/g, ' ').trim()
  return lower.charAt(0).toUpperCase() + lower.slice(1)
}

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

function enduranceLabel(testType: string, locale: AppLocale): string {
  switch (testType) {
    case 'RUNNING':
      return tr(locale, 'Running', 'Löpning')
    case 'CYCLING':
      return tr(locale, 'Cycling', 'Cykling')
    case 'SKIING':
      return tr(locale, 'Skiing', 'Skidor')
    default:
      return humanize(testType)
  }
}

function hockeySummary(test: {
  muscleLabMaxima: unknown
  backSquat1RM: number | null
  powerClean1RM: number | null
  sprint10m: number | null
  agility505Left: number | null
  agility505Right: number | null
  vo2Max: number | null
}, locale: AppLocale): string | null {
  const parts: string[] = []
  const muscleLabWkg = numberFromJson(test.muscleLabMaxima, 'maxAveragePowerPerBodyMass')
  const agilityBest = bestOf([test.agility505Left, test.agility505Right], true)

  if (muscleLabWkg != null) parts.push(`MuscleLab ${muscleLabWkg.toFixed(1)} W/kg`)
  if (test.backSquat1RM != null) parts.push(`${tr(locale, 'Back squat', 'Knäböj')} ${test.backSquat1RM.toFixed(0)} kg`)
  if (test.powerClean1RM != null) parts.push(`PC ${test.powerClean1RM.toFixed(0)} kg`)
  if (test.sprint10m != null) parts.push(`10m ${test.sprint10m.toFixed(2)} s`)
  if (agilityBest != null) parts.push(`5-10-5 ${agilityBest.toFixed(2)} s`)
  if (test.vo2Max != null) parts.push(`VO₂max ${test.vo2Max.toFixed(1)}`)

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
      return NextResponse.json({ error: tr(locale, 'Forbidden', 'Förbjudet') }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const kindParam = searchParams.get('kind') as AssessmentKind | null
    const kindFilter = kindParam && ALL_KINDS.includes(kindParam) ? kindParam : null
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, Number.parseInt(searchParams.get('limit') ?? '', 10) || DEFAULT_LIMIT),
    )

    const wants = (kind: AssessmentKind) => !kindFilter || kindFilter === kind

    const [tests, hockey, sport, ergo, custom, enduranceCount, hockeyCount, sportCount, ergoCount, customCount] =
      await Promise.all([
        wants('ENDURANCE')
          ? prisma.test.findMany({
              where: { clientId, status: { not: 'DRAFT' } },
              orderBy: { testDate: 'desc' },
              take: limit,
              select: { id: true, testDate: true, testType: true, vo2max: true, maxHR: true },
            })
          : [],
        wants('HOCKEY_PHYSICAL')
          ? prisma.hockeyPhysicalTest.findMany({
              where: { clientId },
              orderBy: { testDate: 'desc' },
              take: limit,
              select: {
                id: true,
                testDate: true,
                teamId: true,
                muscleLabMaxima: true,
                backSquat1RM: true,
                powerClean1RM: true,
                sprint10m: true,
                agility505Left: true,
                agility505Right: true,
                vo2Max: true,
              },
            })
          : [],
        wants('SPORT_TEST')
          ? prisma.sportTest.findMany({
              where: { clientId },
              orderBy: { testDate: 'desc' },
              take: limit,
              select: {
                id: true,
                testDate: true,
                category: true,
                protocol: true,
                sport: true,
                primaryResult: true,
                primaryUnit: true,
                benchmarkTier: true,
              },
            })
          : [],
        wants('ERGOMETER')
          ? prisma.ergometerFieldTest.findMany({
              where: { clientId },
              orderBy: { testDate: 'desc' },
              take: limit,
              select: {
                id: true,
                testDate: true,
                ergometerType: true,
                testProtocol: true,
                peakPower: true,
                avgPower: true,
                criticalPower: true,
                avgPace: true,
              },
            })
          : [],
        wants('CUSTOM')
          ? prisma.customTestResult.findMany({
              where: { clientId },
              orderBy: { testDate: 'desc' },
              take: limit,
              select: { id: true, testDate: true, teamId: true, protocol: { select: { name: true } } },
            })
          : [],
        prisma.test.count({ where: { clientId, status: { not: 'DRAFT' } } }),
        prisma.hockeyPhysicalTest.count({ where: { clientId } }),
        prisma.sportTest.count({ where: { clientId } }),
        prisma.ergometerFieldTest.count({ where: { clientId } }),
        prisma.customTestResult.count({ where: { clientId } }),
      ])

    const entries: AssessmentEntry[] = []

    for (const t of tests) {
      let summary: string | null = null
      if (t.vo2max != null) summary = `VO₂max ${t.vo2max.toFixed(1)} ml/kg/min`
      else if (t.maxHR != null) summary = `Max HR ${t.maxHR} bpm`
      entries.push({
        id: t.id,
        date: t.testDate.toISOString(),
        kind: 'ENDURANCE',
        label: enduranceLabel(t.testType, locale),
        summary,
        isTeamTest: false,
      })
    }

    for (const h of hockey) {
      entries.push({
        id: h.id,
        date: h.testDate.toISOString(),
        kind: 'HOCKEY_PHYSICAL',
        label: tr(locale, 'Hockey physical test', 'Hockey fysprov'),
        summary: hockeySummary(h, locale),
        isTeamTest: h.teamId != null,
      })
    }

    for (const s of sport) {
      const summaryParts: string[] = []
      if (s.primaryResult != null) {
        summaryParts.push(`${s.primaryResult}${s.primaryUnit ? ` ${s.primaryUnit}` : ''}`)
      }
      if (s.benchmarkTier) summaryParts.push(humanize(s.benchmarkTier))
      entries.push({
        id: s.id,
        date: s.testDate.toISOString(),
        kind: 'SPORT_TEST',
        label: humanize(s.protocol),
        summary: summaryParts.length > 0 ? summaryParts.join(' · ') : humanize(s.category),
        isTeamTest: false,
      })
    }

    for (const e of ergo) {
      let summary: string | null = null
      if (e.peakPower != null) summary = `${tr(locale, 'Peak', 'Topp')} ${e.peakPower.toFixed(0)} W`
      else if (e.criticalPower != null) summary = `CP ${e.criticalPower.toFixed(0)} W`
      else if (e.avgPower != null) summary = `${tr(locale, 'Avg', 'Snitt')} ${e.avgPower.toFixed(0)} W`
      entries.push({
        id: e.id,
        date: e.testDate.toISOString(),
        kind: 'ERGOMETER',
        label: `${humanize(e.ergometerType)} · ${humanize(e.testProtocol)}`,
        summary,
        isTeamTest: false,
      })
    }

    for (const c of custom) {
      entries.push({
        id: c.id,
        date: c.testDate.toISOString(),
        kind: 'CUSTOM',
        label: c.protocol.name,
        summary: null,
        isTeamTest: c.teamId != null,
      })
    }

    entries.sort((a, b) => (a.date < b.date ? 1 : -1))

    return NextResponse.json({
      success: true,
      data: entries.slice(0, limit),
      counts: {
        endurance: enduranceCount,
        hockey: hockeyCount,
        sport: sportCount,
        ergometer: ergoCount,
        custom: customCount,
        total: enduranceCount + hockeyCount + sportCount + ergoCount + customCount,
      },
    })
  } catch (error: unknown) {
    return handleApiError(error)
  }
}
