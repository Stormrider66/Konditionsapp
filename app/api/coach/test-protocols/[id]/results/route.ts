/**
 * Custom Test Protocol Results API
 *
 * GET  - List results for a protocol
 * POST - Record a new result
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCoach } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

interface RouteContext {
  params: Promise<{ id: string }>
}

type AppLocale = 'en' | 'sv'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

const recordResultSchema = z.object({
  clientId: z.string().uuid(),
  teamId: z.string().uuid().optional(),
  testDate: z.string(),
  values: z.record(z.unknown()),
  notes: z.string().max(2000).optional(),
})

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    await requireCoach()
    const { id: protocolId } = await context.params

    const results = await prisma.customTestResult.findMany({
      where: { protocolId },
      include: {
        client: { select: { id: true, name: true } },
        team: { select: { name: true } },
      },
      orderBy: { testDate: 'desc' },
      take: 100,
    })

    return NextResponse.json({ results })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const user = await requireCoach()
    const locale: AppLocale = user.language === 'sv' ? 'sv' : 'en'
    const { id: protocolId } = await context.params
    const body = await req.json()
    const parsed = recordResultSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: t(locale, 'Invalid input', 'Ogiltig indata'), details: parsed.error.flatten() }, { status: 400 })
    }

    const result = await prisma.customTestResult.create({
      data: {
        protocolId,
        clientId: parsed.data.clientId,
        coachId: user.id,
        teamId: parsed.data.teamId || null,
        testDate: new Date(parsed.data.testDate),
        values: JSON.parse(JSON.stringify(parsed.data.values)),
        notes: parsed.data.notes,
      },
    })

    return NextResponse.json({ result }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
