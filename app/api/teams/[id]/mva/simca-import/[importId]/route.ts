/**
 * Download an imported SIMCA artifact.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

function csvEscapeFilename(value: string): string {
  return value.replace(/["\r\n]/g, '').slice(0, 160) || 'simca-result.txt'
}

function contentTypeFor(format: string, fileName: string): string {
  const lower = fileName.toLowerCase()
  if (format === 'json' || lower.endsWith('.json')) return 'application/json; charset=utf-8'
  if (format === 'csv' || lower.endsWith('.csv')) return 'text/csv; charset=utf-8'
  if (lower.endsWith('.tsv')) return 'text/tab-separated-values; charset=utf-8'
  return 'text/plain; charset=utf-8'
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

  const subscription = await prisma.subscription.findUnique({
    where: { userId: user.id },
  })

  if (!subscription || !['PRO', 'ENTERPRISE'].includes(subscription.tier)) {
    return {
      error: NextResponse.json(
        { success: false, error: 'PRO-prenumeration krävs för SIMCA-import' },
        { status: 403 }
      ),
    }
  }

  return { user, team }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; importId: string }> }
) {
  try {
    const { id: teamId, importId } = await params
    const auth = await authorizeTeam(teamId)
    if (auth.error) return auth.error

    const model = await prisma.mVAModel.findFirst({
      where: {
        id: importId,
        teamId,
        modelType: 'SIMCA_IMPORT',
        status: 'IMPORTED',
      },
      select: {
        modelData: true,
      },
    })

    if (!model) {
      return NextResponse.json({ success: false, error: 'SIMCA-import hittades inte' }, { status: 404 })
    }

    const modelData = model.modelData as {
      fileName?: string
      format?: string
      content?: string
    }
    const fileName = csvEscapeFilename(modelData.fileName ?? 'simca-result.txt')
    const format = modelData.format ?? 'text'
    const content = modelData.content ?? ''

    return new NextResponse(content, {
      headers: {
        'Content-Type': contentTypeFor(format, fileName),
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('SIMCA import download error:', error)
    return NextResponse.json(
      { success: false, error: 'Serverfel vid nedladdning av SIMCA-import' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; importId: string }> }
) {
  try {
    const { id: teamId, importId } = await params
    const auth = await authorizeTeam(teamId)
    if (auth.error) return auth.error

    const model = await prisma.mVAModel.findFirst({
      where: {
        id: importId,
        teamId,
        modelType: 'SIMCA_IMPORT',
        status: 'IMPORTED',
      },
      select: { id: true },
    })

    if (!model) {
      return NextResponse.json({ success: false, error: 'SIMCA-import hittades inte' }, { status: 404 })
    }

    await prisma.mVAModel.delete({
      where: { id: model.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('SIMCA import delete error:', error)
    return NextResponse.json(
      { success: false, error: 'Serverfel vid borttagning av SIMCA-import' },
      { status: 500 }
    )
  }
}
