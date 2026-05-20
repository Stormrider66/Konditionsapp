/**
 * Drill Image Analysis API
 *
 * POST - Upload a clipboard/whiteboard photo and get structured drill data
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCoach } from '@/lib/auth-utils'
import { analyzeClipboardPhoto } from '@/lib/drills/analyze-clipboard'
import { prisma } from '@/lib/prisma'

type AppLocale = 'en' | 'sv'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireCoach()
    const locale: AppLocale = user.language === 'sv' ? 'sv' : 'en'

    const body = await req.json()
    const { imageBase64, mimeType } = body

    if (!imageBase64 || !mimeType) {
      return NextResponse.json(
        { error: t(locale, 'Image data is required', 'Bilddata krävs') },
        { status: 400 },
      )
    }

    // Get business context for API key resolution
    const membership = await prisma.businessMember.findFirst({
      where: { userId: user.id, isActive: true },
      select: { businessId: true },
    })

    const result = await analyzeClipboardPhoto(
      imageBase64,
      mimeType,
      user.id,
      membership?.businessId,
      { userId: user.id, category: 'coach_drill_clipboard_analysis' },
      locale,
    )

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const message = error instanceof Error ? error.message : 'Analysis failed'
    console.error('Drill analysis error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
