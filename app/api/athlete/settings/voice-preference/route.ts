import { NextResponse } from 'next/server'
import { z } from 'zod'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { AVAILABLE_VOICES, DEFAULT_VOICE } from '@/lib/ai/live-voice-coaching/voices'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

export const dynamic = 'force-dynamic'

const validVoiceNames = AVAILABLE_VOICES.map((v) => v.name)

export async function GET(request?: Request) {
  const locale = resolveLocale(request)
  const resolved = await resolveAthleteClientId()
  if (!resolved) {
    return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
  }

  const client = await prisma.client.findUnique({
    where: { id: resolved.clientId },
    select: { preferredVoiceCoachVoice: true },
  })

  return NextResponse.json({
    voice: client?.preferredVoiceCoachVoice || DEFAULT_VOICE,
    available: AVAILABLE_VOICES,
  })
}

export async function PATCH(request: Request) {
  let locale: AppLocale = resolveLocale(request)
  const resolved = await resolveAthleteClientId()
  if (!resolved) {
    return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
  }
  locale = resolveLocale(request, resolved.user.language)

  const body = await request.json()
  const parsed = z.object({
    voice: z.string().refine((v) => validVoiceNames.includes(v), {
      message: `Voice must be one of: ${validVoiceNames.join(', ')}`,
    }),
  }).safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: t(locale, 'Invalid voice', 'Ogiltig röst'), details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  await prisma.client.update({
    where: { id: resolved.clientId },
    data: { preferredVoiceCoachVoice: parsed.data.voice },
  })

  return NextResponse.json({ voice: parsed.data.voice })
}

function resolveLocale(request?: Request, userLanguage?: string | null): AppLocale {
  return request ? resolveRequestLocale(request, userLanguage) : userLanguage === 'sv' ? 'sv' : 'en'
}

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}
