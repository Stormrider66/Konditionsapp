/**
 * Compare two imported SIMCA artifacts.
 *
 * The first pass intentionally accepts loose SIMCA exports. It extracts
 * common score/outlier/VIP columns from JSON or delimited text so coaches can
 * compare monthly result files without needing one exact desktop export shape.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { hasProTierAccess } from '@/lib/subscription/require-feature-access'

type AppLocale = 'en' | 'sv'

interface SimcaAthleteScore {
  key: string
  name: string
  pc1: number | null
  pc2: number | null
  hotellingT2: number | null
  dmodx: number | null
  isOutlier: boolean
}

interface SimcaVipScore {
  key: string
  variableName: string
  vip: number
  coefficient: number | null
}

interface SimcaSummary {
  athletes: SimcaAthleteScore[]
  vipScores: SimcaVipScore[]
}

function normalizeKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9åäö]/gi, '')
}

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

async function getUserLocale(userId: string): Promise<AppLocale> {
  const appUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { language: true },
  })
  return appUser?.language === 'sv' ? 'sv' : 'en'
}

function safeNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value !== 'string') return null
  const parsed = Number(value.trim().replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : null
}

function safeString(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value.trim()
  if (typeof value === 'number') return String(value)
  return null
}

function safeBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  if (typeof value !== 'string') return false
  const normalized = value.trim().toLowerCase()
  return ['1', 'true', 'yes', 'ja', 'outlier', 'outside', 'utanför'].includes(normalized)
}

function parseDelimitedLine(line: string, delimiter: string): string[] {
  const cells: string[] = []
  let cell = ''
  let quoted = false

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    const next = line[i + 1]

    if (char === '"' && quoted && next === '"') {
      cell += '"'
      i += 1
    } else if (char === '"') {
      quoted = !quoted
    } else if (char === delimiter && !quoted) {
      cells.push(cell.trim())
      cell = ''
    } else {
      cell += char
    }
  }

  cells.push(cell.trim())
  return cells
}

function parseDelimitedRows(content: string): Record<string, string>[] {
  const lines = content.split(/\r?\n/).filter((line) => line.trim())
  if (lines.length < 2) return []

  const headerLine = lines[0]
  const delimiter = headerLine.includes('\t') ? '\t' : headerLine.includes(';') ? ';' : ','
  const headers = parseDelimitedLine(headerLine, delimiter)

  return lines.slice(1).map((line) => {
    const cells = parseDelimitedLine(line, delimiter)
    const row: Record<string, string> = {}
    headers.forEach((header, index) => {
      row[header] = cells[index] ?? ''
    })
    return row
  })
}

function getValue(row: Record<string, unknown>, candidates: string[]): unknown {
  const normalizedCandidates = candidates.map(normalizeKey)
  const entries = Object.entries(row).map(([key, value]) => [normalizeKey(key), value] as const)
  const exact = entries.find(([key]) => normalizedCandidates.includes(key))
  if (exact) return exact[1]

  const partial = entries.find(([key]) => normalizedCandidates.some((candidate) => key.includes(candidate)))
  return partial?.[1]
}

function rowToAthlete(row: Record<string, unknown>): SimcaAthleteScore | null {
  const name = safeString(getValue(row, ['athlete', 'athleteName', 'player', 'playerName', 'object', 'objectName', 'name', 'id']))
  if (!name) return null

  const pc1 = safeNumber(getValue(row, ['pc1', 't1', 'score1', 'component1']))
  const pc2 = safeNumber(getValue(row, ['pc2', 'score2', 'component2']))
  const hotellingT2 = safeNumber(getValue(row, ['hotelling', 'hotellingT2', 't2hotelling', 'tSquared']))
  const dmodx = safeNumber(getValue(row, ['dmodx', 'dmodxps', 'distanceToModel']))
  const outlierValue = getValue(row, ['outlier', 'isOutlier', 'outside', 'flag'])

  if (pc1 === null && pc2 === null && hotellingT2 === null && dmodx === null && outlierValue === undefined) {
    return null
  }

  return {
    key: normalizeKey(name),
    name,
    pc1,
    pc2,
    hotellingT2,
    dmodx,
    isOutlier: safeBoolean(outlierValue),
  }
}

function rowToVip(row: Record<string, unknown>): SimcaVipScore | null {
  const variableName = safeString(getValue(row, ['variable', 'variableName', 'xVariable', 'x', 'name']))
  const vip = safeNumber(getValue(row, ['vip', 'vipScore', 'vipPred', 'variableImportance']))
  if (!variableName || vip === null) return null

  return {
    key: normalizeKey(variableName),
    variableName,
    vip,
    coefficient: safeNumber(getValue(row, ['coefficient', 'coeff', 'coef', 'loading', 'p1'])),
  }
}

function collectObjectRows(value: unknown, rows: Record<string, unknown>[] = []): Record<string, unknown>[] {
  if (Array.isArray(value)) {
    value.forEach((item) => {
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        rows.push(item as Record<string, unknown>)
      } else {
        collectObjectRows(item, rows)
      }
    })
    return rows
  }

  if (value && typeof value === 'object') {
    Object.values(value).forEach((child) => collectObjectRows(child, rows))
  }

  return rows
}

function uniqueByKey<T extends { key: string }>(items: T[]): T[] {
  const seen = new Set<string>()
  return items.filter((item) => {
    if (seen.has(item.key)) return false
    seen.add(item.key)
    return true
  })
}

function extractSimcaSummary(modelData: unknown): SimcaSummary {
  const data = modelData as { content?: string; json?: unknown; format?: string }
  const rows = data.json
    ? collectObjectRows(data.json)
    : data.content
      ? parseDelimitedRows(data.content)
      : []

  const athletes = uniqueByKey(rows.map(rowToAthlete).filter((item): item is SimcaAthleteScore => Boolean(item)))
  const vipScores = uniqueByKey(rows.map(rowToVip).filter((item): item is SimcaVipScore => Boolean(item)))

  return { athletes, vipScores }
}

function distance(
  baseline: Pick<SimcaAthleteScore, 'pc1' | 'pc2'>,
  current: Pick<SimcaAthleteScore, 'pc1' | 'pc2'>
): number | null {
  if (baseline.pc1 === null || current.pc1 === null) return null
  const pc1Delta = current.pc1 - baseline.pc1
  const pc2Delta = baseline.pc2 !== null && current.pc2 !== null ? current.pc2 - baseline.pc2 : 0
  return Math.sqrt(pc1Delta ** 2 + pc2Delta ** 2)
}

async function authorizeTeam(teamId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }) }
  }

  const team = await prisma.team.findFirst({
    where: { id: teamId, userId: user.id },
    select: { id: true },
  })

  if (!team) {
    return { error: NextResponse.json({ success: false, error: 'Team not found' }, { status: 404 }) }
  }

  // Platform admins bypass the PRO-tier gate
  if (!(await hasProTierAccess(user.id))) {
    const locale = await getUserLocale(user.id)
    return {
      error: NextResponse.json(
        { success: false, error: t(locale, 'A PRO subscription is required for SIMCA comparison', 'PRO-prenumeration krävs för SIMCA-jämförelse') },
        { status: 403 }
      ),
    }
  }

  return { user, team, locale: await getUserLocale(user.id) }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let locale: AppLocale = 'en'

  try {
    const { id: teamId } = await params
    const auth = await authorizeTeam(teamId)
    if (auth.error) return auth.error
    locale = auth.locale

    const url = new URL(request.url)
    const baselineId = url.searchParams.get('baselineId')
    const currentId = url.searchParams.get('currentId')

    if (!baselineId || !currentId || baselineId === currentId) {
      return NextResponse.json(
        { success: false, error: t(auth.locale, 'Choose two different SIMCA imports to compare', 'Välj två olika SIMCA-importer att jämföra') },
        { status: 400 }
      )
    }

    const imports = await prisma.mVAModel.findMany({
      where: {
        id: { in: [baselineId, currentId] },
        teamId,
        modelType: 'SIMCA_IMPORT',
        status: 'IMPORTED',
      },
      select: {
        id: true,
        createdAt: true,
        config: true,
        modelData: true,
      },
    })

    const baseline = imports.find((item) => item.id === baselineId)
    const current = imports.find((item) => item.id === currentId)

    if (!baseline || !current) {
      return NextResponse.json({ success: false, error: t(auth.locale, 'SIMCA import not found', 'SIMCA-import hittades inte') }, { status: 404 })
    }

    const baselineSummary = extractSimcaSummary(baseline.modelData)
    const currentSummary = extractSimcaSummary(current.modelData)
    const baselineAthletes = new Map(baselineSummary.athletes.map((item) => [item.key, item]))
    const currentAthletes = new Map(currentSummary.athletes.map((item) => [item.key, item]))
    const baselineVip = new Map(baselineSummary.vipScores.map((item) => [item.key, item]))
    const currentVip = new Map(currentSummary.vipScores.map((item) => [item.key, item]))

    const athleteMovement = Array.from(currentAthletes.values())
      .map((currentAthlete) => {
        const baselineAthlete = baselineAthletes.get(currentAthlete.key)
        if (!baselineAthlete) return null
        const scoreDistance = distance(baselineAthlete, currentAthlete)
        return {
          athleteName: currentAthlete.name,
          baselinePc1: baselineAthlete.pc1,
          baselinePc2: baselineAthlete.pc2,
          currentPc1: currentAthlete.pc1,
          currentPc2: currentAthlete.pc2,
          pc1Delta: baselineAthlete.pc1 !== null && currentAthlete.pc1 !== null
            ? currentAthlete.pc1 - baselineAthlete.pc1
            : null,
          pc2Delta: baselineAthlete.pc2 !== null && currentAthlete.pc2 !== null
            ? currentAthlete.pc2 - baselineAthlete.pc2
            : null,
          distance: scoreDistance,
          baselineOutlier: baselineAthlete.isOutlier,
          currentOutlier: currentAthlete.isOutlier,
        }
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .sort((a, b) => (b.distance ?? -1) - (a.distance ?? -1))
      .slice(0, 10)

    const newOutliers = Array.from(currentAthletes.values())
      .filter((item) => item.isOutlier && !baselineAthletes.get(item.key)?.isOutlier)
      .map((item) => item.name)

    const resolvedOutliers = Array.from(baselineAthletes.values())
      .filter((item) => item.isOutlier && !currentAthletes.get(item.key)?.isOutlier)
      .map((item) => item.name)

    const vipChanges = Array.from(currentVip.values())
      .map((currentItem) => {
        const baselineItem = baselineVip.get(currentItem.key)
        if (!baselineItem) return null
        return {
          variableName: currentItem.variableName,
          baselineVip: baselineItem.vip,
          currentVip: currentItem.vip,
          vipDelta: currentItem.vip - baselineItem.vip,
          baselineCoefficient: baselineItem.coefficient,
          currentCoefficient: currentItem.coefficient,
        }
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .sort((a, b) => Math.abs(b.vipDelta) - Math.abs(a.vipDelta))
      .slice(0, 10)

    const newTopVip = Array.from(currentVip.values())
      .filter((item) => item.vip >= 1 && (baselineVip.get(item.key)?.vip ?? 0) < 1)
      .map((item) => item.variableName)

    const resolvedTopVip = Array.from(baselineVip.values())
      .filter((item) => item.vip >= 1 && (currentVip.get(item.key)?.vip ?? 0) < 1)
      .map((item) => item.variableName)

    const baselineConfig = baseline.config as { fileName?: string }
    const currentConfig = current.config as { fileName?: string }

    return NextResponse.json({
      success: true,
      data: {
        baseline: {
          id: baseline.id,
          fileName: baselineConfig.fileName ?? 'baseline',
          createdAt: baseline.createdAt.toISOString(),
          athletesDetected: baselineSummary.athletes.length,
          vipDetected: baselineSummary.vipScores.length,
        },
        current: {
          id: current.id,
          fileName: currentConfig.fileName ?? 'current',
          createdAt: current.createdAt.toISOString(),
          athletesDetected: currentSummary.athletes.length,
          vipDetected: currentSummary.vipScores.length,
        },
        summary: {
          matchedAthletes: athleteMovement.length,
          matchedVipVariables: vipChanges.length,
          newOutlierCount: newOutliers.length,
          resolvedOutlierCount: resolvedOutliers.length,
          newTopVipCount: newTopVip.length,
          resolvedTopVipCount: resolvedTopVip.length,
        },
        athleteMovement,
        newOutliers,
        resolvedOutliers,
        vipChanges,
        newTopVip,
        resolvedTopVip,
      },
    })
  } catch (error) {
    console.error('SIMCA compare error:', error)
    return NextResponse.json(
      { success: false, error: t(locale, 'Server error during SIMCA comparison', 'Serverfel vid SIMCA-jämförelse') },
      { status: 500 }
    )
  }
}
