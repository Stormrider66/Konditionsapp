export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireCoach } from '@/lib/auth-utils'
import { parseMuscleLabRawText, parseMuscleLabWorkbook } from '@/lib/hockey/musclelab'

type AppLocale = 'en' | 'sv'

export async function POST(req: NextRequest) {
  let locale: AppLocale = 'en'
  try {
    const user = await requireCoach()
    locale = user.language === 'sv' ? 'sv' : 'en'

    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: t(locale, 'No MuscleLab file uploaded', 'Ingen MuscleLab-fil uppladdad') }, { status: 400 })
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
      { error: error instanceof Error ? error.message : t(locale, 'Could not read the MuscleLab file', 'Kunde inte läsa MuscleLab-filen') },
      { status: 500 },
    )
  }
}

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}
