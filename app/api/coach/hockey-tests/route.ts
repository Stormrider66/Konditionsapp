/**
 * Hockey Physical Tests API
 *
 * GET  - List tests (filterable by team, athlete, date)
 * POST - Create a new test session
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCoach } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { getStaffPermissions } from '@/lib/permissions/assistant-coach'
import { z } from 'zod'

const createTestSchema = z.object({
  clientId: z.string().uuid(),
  teamId: z.string().uuid().optional(),
  testDate: z.string(),
  notes: z.string().max(2000).optional(),
  // On-ice
  agility505Left: z.number().positive().optional(),
  agility505Right: z.number().positive().optional(),
  sprint10m: z.number().positive().optional(),
  sprint20mFly: z.number().positive().optional(),
  sprint30mFly: z.number().positive().optional(),
  endurance7x40: z.array(z.number().positive()).max(7).optional(),
  // Power
  jumpSquatLadder: z.record(z.number()).optional(),
  singleLegJumpLeft: z.record(z.number()).optional(),
  singleLegJumpRight: z.record(z.number()).optional(),
  gripStrengthLeft: z.number().positive().optional(),
  gripStrengthRight: z.number().positive().optional(),
  // Jumps
  standingLongJump: z.number().positive().optional(),
  threeJumpLeft: z.number().positive().optional(),
  threeJumpRight: z.number().positive().optional(),
  sourceType: z.enum(['MANUAL', 'MUSCLE_LAB_IMPORT']).default('MANUAL'),
})

export async function GET(req: NextRequest) {
  try {
    const user = await requireCoach()
    const permissions = await getStaffPermissions(user.id)

    const { searchParams } = new URL(req.url)
    const teamId = searchParams.get('teamId')
    const clientId = searchParams.get('clientId')

    const tests = await prisma.hockeyPhysicalTest.findMany({
      where: {
        ...(clientId ? { clientId } : {}),
        ...(teamId ? { teamId } : {}),
        ...(permissions.isTeamScoped
          ? { teamId: { in: permissions.assignedTeamIds } }
          : { coach: { id: user.id } }),
      },
      include: {
        client: { select: { id: true, name: true } },
        team: { select: { id: true, name: true } },
      },
      orderBy: { testDate: 'desc' },
      take: 100,
    })

    return NextResponse.json({ tests })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireCoach()
    const body = await req.json()
    const parsed = createTestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Ogiltig indata', details: parsed.error.flatten() }, { status: 400 })
    }

    const test = await prisma.hockeyPhysicalTest.create({
      data: {
        clientId: parsed.data.clientId,
        teamId: parsed.data.teamId || null,
        coachId: user.id,
        testDate: new Date(parsed.data.testDate),
        notes: parsed.data.notes,
        agility505Left: parsed.data.agility505Left,
        agility505Right: parsed.data.agility505Right,
        sprint10m: parsed.data.sprint10m,
        sprint20mFly: parsed.data.sprint20mFly,
        sprint30mFly: parsed.data.sprint30mFly,
        endurance7x40: parsed.data.endurance7x40 || undefined,
        jumpSquatLadder: parsed.data.jumpSquatLadder || undefined,
        singleLegJumpLeft: parsed.data.singleLegJumpLeft || undefined,
        singleLegJumpRight: parsed.data.singleLegJumpRight || undefined,
        gripStrengthLeft: parsed.data.gripStrengthLeft,
        gripStrengthRight: parsed.data.gripStrengthRight,
        standingLongJump: parsed.data.standingLongJump,
        threeJumpLeft: parsed.data.threeJumpLeft,
        threeJumpRight: parsed.data.threeJumpRight,
        sourceType: parsed.data.sourceType,
      },
    })

    return NextResponse.json({ test }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error creating hockey test:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
