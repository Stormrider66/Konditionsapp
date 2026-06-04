// app/api/timing-gates/[sessionId]/results/route.ts
// API routes for timing gate session results

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { canAccessAthlete } from '@/lib/auth/athlete-access'
import { SportTestProtocol } from '@prisma/client'
import { z } from 'zod'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

const createResultSchema = z.object({
  athleteId: z.string().uuid().optional(),
  unmatchedAthleteName: z.string().optional(),
  testProtocol: z.nativeEnum(SportTestProtocol).optional(),
  attemptNumber: z.number().int().min(1).default(1),
  splitTimes: z.array(z.number()),
  totalTime: z.number(),
  acceleration: z.number().optional(),
  maxVelocity: z.number().optional(),
  codDeficit: z.number().optional(),
  valid: z.boolean().default(true),
  invalidReason: z.string().optional(),
  notes: z.string().optional()
})

const matchAthleteSchema = z.object({
  athleteId: z.string().uuid()
})

interface RouteParams {
  params: Promise<{ sessionId: string }>
}

// GET /api/timing-gates/[sessionId]/results - List results for session
export async function GET(request: NextRequest, { params }: RouteParams) {
  const locale = resolveRequestLocale(request)

  try {
    const { sessionId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const athleteId = searchParams.get('athleteId')
    const validOnly = searchParams.get('validOnly') === 'true'
    const sortBy = searchParams.get('sortBy') || 'totalTime'
    const sortOrder = searchParams.get('sortOrder') || 'asc'

    // Verify session exists and user has access
    const session = await prisma.timingGateSession.findUnique({
      where: { id: sessionId },
      select: { coachId: true }
    })

    if (!session) {
      return NextResponse.json({ error: t(locale, 'Session not found', 'Sessionen hittades inte') }, { status: 404 })
    }

    if (session.coachId !== user.id) {
      return NextResponse.json({ error: t(locale, 'You can only view your own sessions', 'Du kan bara visa dina egna sessioner') }, { status: 403 })
    }

    const where: Record<string, unknown> = { sessionId }

    if (athleteId) {
      const access = await canAccessAthlete(user.id, athleteId)
      if (!access.allowed) {
        return NextResponse.json({ error: t(locale, 'Forbidden', 'Förbjudet') }, { status: 403 })
      }
      where.athleteId = athleteId
    }

    if (validOnly) {
      where.valid = true
    }

    const results = await prisma.timingGateResult.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      include: {
        athlete: {
          select: { id: true, name: true }
        }
      }
    })

    return NextResponse.json(results)
  } catch (error) {
    console.error('Error fetching timing gate results:', error)
    return NextResponse.json(
      { error: t(locale, 'Failed to fetch timing gate results', 'Kunde inte hämta timing gate-resultat') },
      { status: 500 }
    )
  }
}

// POST /api/timing-gates/[sessionId]/results - Add manual result
export async function POST(request: NextRequest, { params }: RouteParams) {
  const locale = resolveRequestLocale(request)

  try {
    const { sessionId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }

    // Verify session exists and user owns it
    const session = await prisma.timingGateSession.findUnique({
      where: { id: sessionId },
      select: { coachId: true }
    })

    if (!session) {
      return NextResponse.json({ error: t(locale, 'Session not found', 'Sessionen hittades inte') }, { status: 404 })
    }

    if (session.coachId !== user.id) {
      return NextResponse.json({ error: t(locale, 'You can only add results to your own sessions', 'Du kan bara lägga till resultat i dina egna sessioner') }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = createResultSchema.parse(body)

    const result = await prisma.timingGateResult.create({
      data: {
        sessionId,
        ...validatedData
      },
      include: {
        athlete: {
          select: { id: true, name: true }
        }
      }
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: t(locale, 'Validation error', 'Valideringsfel'), details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error creating timing gate result:', error)
    return NextResponse.json(
      { error: t(locale, 'Failed to create timing gate result', 'Kunde inte skapa timing gate-resultat') },
      { status: 500 }
    )
  }
}

// PUT /api/timing-gates/[sessionId]/results - Match athlete to unassigned result
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const locale = resolveRequestLocale(request)

  try {
    const { sessionId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }

    // Verify session exists and user owns it
    const session = await prisma.timingGateSession.findUnique({
      where: { id: sessionId },
      select: { coachId: true }
    })

    if (!session) {
      return NextResponse.json({ error: t(locale, 'Session not found', 'Sessionen hittades inte') }, { status: 404 })
    }

    if (session.coachId !== user.id) {
      return NextResponse.json({ error: t(locale, 'You can only modify your own sessions', 'Du kan bara ändra dina egna sessioner') }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const resultId = searchParams.get('resultId')

    if (!resultId) {
      return NextResponse.json({ error: t(locale, 'resultId is required', 'resultId krävs') }, { status: 400 })
    }

    const body = await request.json()
    const { athleteId } = matchAthleteSchema.parse(body)

    const access = await canAccessAthlete(user.id, athleteId)
    if (!access.allowed) {
      return NextResponse.json({ error: t(locale, 'Forbidden', 'Förbjudet') }, { status: 403 })
    }

    const result = await prisma.timingGateResult.update({
      where: { id: resultId },
      data: {
        athleteId,
        unmatchedAthleteName: null,
        unmatchedAthleteId: null
      },
      include: {
        athlete: {
          select: { id: true, name: true }
        }
      }
    })

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: t(locale, 'Validation error', 'Valideringsfel'), details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error matching athlete to result:', error)
    return NextResponse.json(
      { error: t(locale, 'Failed to match athlete to result', 'Kunde inte matcha idrottare till resultat') },
      { status: 500 }
    )
  }
}
