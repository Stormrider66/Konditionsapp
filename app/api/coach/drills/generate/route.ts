/**
 * Text-to-Drill Generation API
 *
 * POST - Coach describes a drill in natural language, AI generates structure
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCoach } from '@/lib/auth-utils'
import { generateDrillFromText } from '@/lib/drills/generate-from-text'
import { prisma } from '@/lib/prisma'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

export async function POST(req: NextRequest) {
  let locale: AppLocale = 'en'

  try {
    const user = await requireCoach()
    locale = resolveRequestLocale(req, user.language)

    const body = await req.json()
    const { prompt, sportType } = body

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 5) {
      return NextResponse.json(
        { error: t(locale, 'Describe the drill in at least a few words', 'Beskriv övningen med minst några ord') },
        { status: 400 },
      )
    }

    if (prompt.length > 2000) {
      return NextResponse.json(
        { error: t(locale, 'The description is too long (max 2000 characters)', 'Beskrivningen är för lång (max 2000 tecken)') },
        { status: 400 },
      )
    }

    // Get business context for API key resolution
    const membership = await prisma.businessMember.findFirst({
      where: { userId: user.id, isActive: true },
      select: { businessId: true },
    })

    const result = await generateDrillFromText(
      prompt.trim(),
      sportType || 'ICE_HOCKEY',
      user.id,
      membership?.businessId,
      { userId: user.id, category: 'coach_drill_text_generation' },
      locale,
    )

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    const message = error instanceof Error ? error.message : t(locale, 'Generation failed', 'Genereringen misslyckades')
    console.error('Drill generation error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
