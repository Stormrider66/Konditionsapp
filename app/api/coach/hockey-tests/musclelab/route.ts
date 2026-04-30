export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireCoach } from '@/lib/auth-utils'
import { parseMuscleLabRawText, parseMuscleLabWorkbook } from '@/lib/hockey/musclelab'

export async function POST(req: NextRequest) {
  try {
    await requireCoach()

    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'Ingen MuscleLab-fil uppladdad' }, { status: 400 })
    }

    const isWorkbook =
      file.name.toLowerCase().endsWith('.xlsx') ||
      file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

    const parsed = isWorkbook
      ? await parseMuscleLabWorkbook(Buffer.from(await file.arrayBuffer()))
      : parseMuscleLabRawText(await file.text(), file.name)

    return NextResponse.json(parsed)
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('MuscleLab import error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Kunde inte läsa MuscleLab-filen' },
      { status: 500 },
    )
  }
}
