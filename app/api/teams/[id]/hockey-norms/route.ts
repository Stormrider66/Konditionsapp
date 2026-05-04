import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireCoach } from '@/lib/auth-utils'
import { getAccessibleTeam } from '@/lib/coach/team-access'
import { logError } from '@/lib/logger-console'
import { mergeHockeyNormReferences, normalizeNormPosition } from '@/lib/hockey/norm-references'

const normSchema = z.object({
  level: z.string().trim().min(1).max(32),
  position: z.string().trim().max(32).optional().default('All'),
  metricKey: z.string().trim().min(1).max(80),
  target: z.coerce.number().finite(),
  elite: z.coerce.number().finite(),
  priorityThreshold: z.coerce.number().finite().nullable().optional(),
  unit: z.string().trim().min(1).max(24),
  lowerIsBetter: z.boolean().optional().default(false),
})

const putSchema = z.object({
  norms: z.array(normSchema).max(200),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireCoach()
    const { id: teamId } = await params
    const businessSlug = request.nextUrl.searchParams.get('businessSlug') ?? undefined

    const accessibleTeam = await getAccessibleTeam(user.id, teamId, businessSlug)
    if (!accessibleTeam) {
      return NextResponse.json({ success: false, error: 'Team not found' }, { status: 404 })
    }

    const saved = await prisma.hockeyNormReference.findMany({
      where: { teamId, coachId: user.id },
      orderBy: [
        { level: 'asc' },
        { metricKey: 'asc' },
        { position: 'asc' },
      ],
    })

    return NextResponse.json({
      success: true,
      data: {
        norms: mergeHockeyNormReferences(saved),
        saved,
      },
    })
  } catch (error) {
    logError('Hockey norm GET error:', error)
    return NextResponse.json({ success: false, error: 'Failed to load hockey norms' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireCoach()
    const { id: teamId } = await params
    const businessSlug = request.nextUrl.searchParams.get('businessSlug') ?? undefined

    const accessibleTeam = await getAccessibleTeam(user.id, teamId, businessSlug)
    if (!accessibleTeam) {
      return NextResponse.json({ success: false, error: 'Team not found' }, { status: 404 })
    }

    const body = putSchema.parse(await request.json())
    const deduped = new Map<string, z.infer<typeof normSchema>>()
    for (const norm of body.norms) {
      const normalized = { ...norm, position: normalizeNormPosition(norm.position) }
      deduped.set(`${normalized.level}:${normalized.position}:${normalized.metricKey}`, normalized)
    }

    await prisma.$transaction([
      prisma.hockeyNormReference.deleteMany({
        where: { teamId, coachId: user.id },
      }),
      prisma.hockeyNormReference.createMany({
        data: Array.from(deduped.values()).map((norm) => ({
          teamId,
          coachId: user.id,
          level: norm.level,
          position: normalizeNormPosition(norm.position),
          metricKey: norm.metricKey,
          target: norm.target,
          elite: norm.elite,
          priorityThreshold: norm.priorityThreshold ?? null,
          unit: norm.unit,
          lowerIsBetter: norm.lowerIsBetter === true,
        })),
      }),
    ])

    const saved = await prisma.hockeyNormReference.findMany({
      where: { teamId, coachId: user.id },
      orderBy: [
        { level: 'asc' },
        { metricKey: 'asc' },
        { position: 'asc' },
      ],
    })

    return NextResponse.json({
      success: true,
      data: {
        norms: mergeHockeyNormReferences(saved),
        saved,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Invalid hockey norm payload' }, { status: 400 })
    }
    logError('Hockey norm PUT error:', error)
    return NextResponse.json({ success: false, error: 'Failed to save hockey norms' }, { status: 500 })
  }
}
