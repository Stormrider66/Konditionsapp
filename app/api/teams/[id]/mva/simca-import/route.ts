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
import type { Prisma, SportType } from '@prisma/client'

const MAX_IMPORT_CHARS = 1_000_000

function detectFormat(fileName: string, content: string): 'json' | 'csv' | 'text' {
  const lower = fileName.toLowerCase()
  if (lower.endsWith('.json')) return 'json'
  if (lower.endsWith('.csv') || lower.endsWith('.tsv')) return 'csv'
  const trimmed = content.trim()
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    return 'json'
  }
  if (trimmed.includes(',') || trimmed.includes('\t') || trimmed.includes(';')) return 'csv'
  return 'text'
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

function tryParseJson(content: string): unknown | null {
  try {
    return JSON.parse(content)
  } catch {
    return null
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: teamId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const team = await prisma.team.findFirst({
      where: { id: teamId, userId: user.id },
      select: { id: true, sportType: true },
    })

    if (!team) {
      return NextResponse.json({ success: false, error: 'Team not found' }, { status: 404 })
    }

    const subscription = await prisma.subscription.findUnique({
      where: { userId: user.id },
    })

    if (!subscription || !['PRO', 'ENTERPRISE'].includes(subscription.tier)) {
      return NextResponse.json(
        { success: false, error: 'PRO-prenumeration krävs för SIMCA-import' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const fileName = typeof body?.fileName === 'string' ? body.fileName.slice(0, 160) : 'simca-result'
    const content = typeof body?.content === 'string' ? body.content : ''

    if (!content.trim()) {
      return NextResponse.json({ success: false, error: 'Tom SIMCA-fil' }, { status: 400 })
    }

    if (content.length > MAX_IMPORT_CHARS) {
      return NextResponse.json(
        { success: false, error: 'SIMCA-filen är för stor för första importversionen' },
        { status: 413 }
      )
    }

    const format = detectFormat(fileName, content)
    const parsedJson = format === 'json' ? tryParseJson(content) : null
    const rowCount = format === 'json' ? 0 : countRows(content)
    const columnCount = format === 'json' ? 0 : countColumns(content)
    const sport: SportType = team.sportType || 'GENERAL_FITNESS'

    const model = await prisma.mVAModel.create({
      data: {
        teamId,
        coachId: user.id,
        sport,
        modelType: 'SIMCA_IMPORT',
        config: {
          source: 'SIMCA',
          fileName,
          format,
          rowCount,
          columnCount,
          importedAt: new Date().toISOString(),
        } as Prisma.InputJsonValue,
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
        } as Prisma.InputJsonValue,
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
      },
    })
  } catch (error) {
    console.error('SIMCA import error:', error)
    return NextResponse.json(
      { success: false, error: 'Serverfel vid SIMCA-import' },
      { status: 500 }
    )
  }
}
