import { NextResponse } from 'next/server'
import { z } from 'zod'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { AVAILABLE_VOICES, DEFAULT_VOICE } from '@/lib/ai/live-voice-coaching/voices'

export const dynamic = 'force-dynamic'

const validVoiceNames = AVAILABLE_VOICES.map((v) => v.name)

export async function GET() {
  const resolved = await resolveAthleteClientId()
  if (!resolved) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
  const resolved = await resolveAthleteClientId()
  if (!resolved) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const parsed = z.object({
    voice: z.string().refine((v) => validVoiceNames.includes(v), {
      message: `Voice must be one of: ${validVoiceNames.join(', ')}`,
    }),
  }).safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid voice', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  await prisma.client.update({
    where: { id: resolved.clientId },
    data: { preferredVoiceCoachVoice: parsed.data.voice },
  })

  return NextResponse.json({ voice: parsed.data.voice })
}
