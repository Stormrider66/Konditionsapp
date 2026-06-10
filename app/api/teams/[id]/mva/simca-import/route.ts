/**
 * SIMCA result artifact import
 *
 * Stores an external SIMCA export alongside in-app MVA models. This
 * first version preserves the uploaded result and basic dimensions so
 * coaches can round-trip safely before we add format-specific parsers.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { hasProTierAccess } from '@/lib/subscription/require-feature-access'
import {
  detectFormat,
  extractSimcaSummaryFromContent,
  validateSimcaImport,
  matchRoster,
} from '@/lib/mva/simca-parse'
import type { Prisma, SportType } from '@prisma/client'

const MAX_IMPORT_CHARS = 1_000_000

type AppLocale = 'en' | 'sv'

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

function countRows(content: string): number {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean).length
}

function countColumns(content: string): number {
  const firstLine = content.split(/\r?\n/).find((line) => line.trim().length > 0)
  if (!firstLine) return 0
  const delimiter = firstLine.includes('\t') ? '\t' : firstLine.includes(';') ? ';' : ','
  return firstLine.split(delimiter).length
}

function readDelimitedMetadata(content: string): { exportVersion?: string; exportPreset?: string; exportedAt?: string } {
  const lines = content.split(/\r?\n/).filter((line) => line.trim())
  if (lines.length < 2) return {}
  const delimiter = lines[0].includes('\t') ? '\t' : lines[0].includes(';') ? ';' : ','
  const headers = lines[0].split(delimiter).map((value) => value.trim().replace(/^"|"$/g, ''))
  const values = lines[1].split(delimiter).map((value) => value.trim().replace(/^"|"$/g, ''))
  const byHeader = new Map(headers.map((header, index) => [header, values[index]]))
  return {
    exportVersion: byHeader.get('simca_export_version') || undefined,
    exportPreset: byHeader.get('simca_export_preset') || undefined,
    exportedAt: byHeader.get('simca_export_generated_at') || undefined,
  }
}

async function authorizeTeam(teamId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }) }
  }

  const team = await prisma.team.findFirst({
    where: { id: teamId, userId: user.id },
    select: { id: true, sportType: true },
  })

  if (!team) {
    return { error: NextResponse.json({ success: false, error: 'Team not found' }, { status: 404 }) }
  }

  // Platform admins bypass the PRO-tier gate
  if (!(await hasProTierAccess(user.id))) {
    const locale = await getUserLocale(user.id)
    return {
      error: NextResponse.json(
        { success: false, error: t(locale, 'A PRO subscription is required for SIMCA import', 'PRO-prenumeration krävs för SIMCA-import') },
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

    const imports = await prisma.mVAModel.findMany({
      where: {
        teamId,
        modelType: 'SIMCA_IMPORT',
        status: 'IMPORTED',
      },
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: {
        id: true,
        createdAt: true,
        config: true,
        nObservations: true,
        nXVariables: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: imports.map((item) => {
        const config = item.config as {
          fileName?: string
          format?: string
          rowCount?: number
          columnCount?: number
          exportVersion?: string
          exportPreset?: string
          exportedAt?: string
          detectedAthletes?: number
          detectedVip?: number
          matchedRoster?: number
          unmatchedSimca?: number
          importedByName?: string
          warnings?: { code: string; severity: 'info' | 'warning'; messageEn: string; messageSv: string }[]
        }

        return {
          id: item.id,
          createdAt: item.createdAt.toISOString(),
          fileName: config.fileName ?? 'simca-result',
          format: config.format ?? 'unknown',
          rowCount: config.rowCount ?? item.nObservations,
          columnCount: config.columnCount ?? item.nXVariables,
          exportVersion: config.exportVersion ?? null,
          exportPreset: config.exportPreset ?? null,
          exportedAt: config.exportedAt ?? null,
          detectedAthletes: config.detectedAthletes ?? null,
          detectedVip: config.detectedVip ?? null,
          matchedRoster: config.matchedRoster ?? null,
          unmatchedSimca: config.unmatchedSimca ?? null,
          importedByName: config.importedByName ?? null,
          warnings: config.warnings ?? [],
        }
      }),
    })
  } catch (error) {
    console.error('SIMCA imports list error:', error)
    return NextResponse.json(
      { success: false, error: t(locale, 'Server error while fetching SIMCA imports', 'Serverfel vid hämtning av SIMCA-importer') },
      { status: 500 }
    )
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let locale: AppLocale = 'en'

  try {
    const { id: teamId } = await params
    const auth = await authorizeTeam(teamId)
    if (auth.error) return auth.error
    locale = auth.locale

    const body = await request.json()
    const fileName = typeof body?.fileName === 'string' ? body.fileName.slice(0, 160) : 'simca-result'
    const content = typeof body?.content === 'string' ? body.content : ''

    if (!content.trim()) {
      return NextResponse.json({ success: false, error: t(locale, 'Empty SIMCA file', 'Tom SIMCA-fil') }, { status: 400 })
    }

    if (content.length > MAX_IMPORT_CHARS) {
      return NextResponse.json(
        { success: false, error: t(locale, 'The SIMCA file is too large for the first import version', 'SIMCA-filen är för stor för första importversionen') },
        { status: 413 }
      )
    }

    const format = detectFormat(fileName, content)
    const parsedJson = format === 'json'
      ? (() => { try { return JSON.parse(content) } catch { return null } })()
      : null
    const rowCount = format === 'json' ? 0 : countRows(content)
    const columnCount = format === 'json' ? 0 : countColumns(content)
    const metadata = format === 'csv' ? readDelimitedMetadata(content) : {}
    const sport: SportType = auth.team.sportType || 'GENERAL_FITNESS'

    // Parse the SIMCA artifact up-front instead of deferring to compare time,
    // so the coach learns immediately what was recognized and validated.
    const summary = extractSimcaSummaryFromContent(content, format)
    const warnings = validateSimcaImport(summary, rowCount, format)

    // Match recognized athletes against the team roster + record provenance.
    const [roster, importer] = await Promise.all([
      prisma.team.findUnique({
        where: { id: teamId },
        select: { members: { select: { id: true, name: true } } },
      }),
      prisma.user.findUnique({ where: { id: auth.user.id }, select: { name: true, email: true } }),
    ])
    const rosterMatch = matchRoster(summary.athletes, roster?.members ?? [])
    const importedByName = importer?.name || importer?.email || 'Unknown'

    const model = await prisma.mVAModel.create({
      data: {
        teamId,
        coachId: auth.user.id,
        sport,
        modelType: 'SIMCA_IMPORT',
        config: {
          source: 'SIMCA',
          fileName,
          format,
          rowCount,
          columnCount,
          exportVersion: metadata.exportVersion ?? null,
          exportPreset: metadata.exportPreset ?? null,
          exportedAt: metadata.exportedAt ?? null,
          importedAt: new Date().toISOString(),
          importedBy: auth.user.id,
          importedByName,
          detectedAthletes: summary.athletes.length,
          detectedVip: summary.vipScores.length,
          matchedRoster: rosterMatch.matched.length,
          unmatchedSimca: rosterMatch.unmatchedSimca.length,
          warnings,
        } as unknown as Prisma.InputJsonValue,
        xVariables: [],
        nObservations: rowCount,
        nXVariables: columnCount,
        nComponents: 0,
        explainedVarianceX: [],
        modelData: {
          fileName,
          format,
          content,
          json: parsedJson,
          summary,
          rosterMatch,
        } as unknown as Prisma.InputJsonValue,
        status: 'IMPORTED',
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        id: model.id,
        fileName,
        format,
        rowCount,
        columnCount,
        detectedAthletes: summary.athletes.length,
        detectedVip: summary.vipScores.length,
        matchedRoster: rosterMatch.matched.length,
        unmatchedSimca: rosterMatch.unmatchedSimca,
        unmatchedRoster: rosterMatch.unmatchedRoster,
        warnings,
      },
    })
  } catch (error) {
    console.error('SIMCA import error:', error)
    return NextResponse.json(
      { success: false, error: t(locale, 'Server error during SIMCA import', 'Serverfel vid SIMCA-import') },
      { status: 500 }
    )
  }
}
