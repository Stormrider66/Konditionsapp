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
import {
  canAccessClientInTeam,
  getPrimaryBusinessMembership,
  getAccessibleTeamWhere,
  getWritableTeam,
} from '@/lib/coach/team-access'
import { z } from 'zod'
import { Prisma } from '@prisma/client'

const createTestSchema = z.object({
  clientId: z.string().uuid(),
  teamId: z.string().uuid().optional(),
  testDate: z.string(),
  notes: z.string().max(2000).optional(),
  // On-ice
  agility505Left: z.number().positive().optional(),
  agility505Right: z.number().positive().optional(),
  sprint5m: z.number().positive().optional(),
  sprint10m: z.number().positive().optional(),
  sprint20m: z.number().positive().optional(),
  sprint30m: z.number().positive().optional(),
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
  // Endurance
  beepTestLevel: z.number().positive().optional(),
  beepTestShuttle: z.number().int().positive().optional(),
  // Strength
  backSquat1RM: z.number().positive().optional(),
  powerClean1RM: z.number().positive().optional(),
  benchPress1RM: z.number().positive().optional(),
  pullUp1RM: z.number().positive().optional(),
  // MuscleLab summary import
  muscleLabJumps: z.array(z.record(z.unknown())).optional(),
  muscleLabMaxima: z.record(z.unknown()).optional(),
  muscleLabRaw: z.record(z.unknown()).optional(),
  sourceType: z.enum(['MANUAL', 'MUSCLE_LAB_IMPORT']).default('MANUAL'),
})

export async function GET(req: NextRequest) {
  try {
    const user = await requireCoach()
    const permissions = await getStaffPermissions(user.id)

    const { searchParams } = new URL(req.url)
    const teamId = searchParams.get('teamId')
    const clientId = searchParams.get('clientId')
    const accessibleTeamWhere = await getAccessibleTeamWhere(user.id)
    const accessibleTeams = await prisma.team.findMany({
      where: teamId ? { id: teamId, AND: [accessibleTeamWhere] } : accessibleTeamWhere,
      select: { id: true },
    })
    const accessibleTeamIds = accessibleTeams.map((team) => team.id)
    const allowedTeamIds = permissions.isTeamScoped
      ? accessibleTeamIds.filter((id) => permissions.assignedTeamIds.includes(id))
      : accessibleTeamIds

    if ((teamId && allowedTeamIds.length === 0) || (!teamId && allowedTeamIds.length === 0)) {
      return NextResponse.json({ tests: [] })
    }

    const tests = await prisma.hockeyPhysicalTest.findMany({
      where: {
        ...(clientId ? { clientId } : {}),
        ...(teamId ? { teamId } : { teamId: { in: allowedTeamIds } }),
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

    if (parsed.data.teamId) {
      const team = await getWritableTeam(user.id, parsed.data.teamId, undefined, 'tests')
      const canAccessClient = team
        ? await canAccessClientInTeam(user.id, parsed.data.clientId, parsed.data.teamId)
        : false

      if (!team || !canAccessClient) {
        return NextResponse.json({ error: 'Team or athlete not found' }, { status: 404 })
      }
    } else {
      const membership = await getPrimaryBusinessMembership(user.id)
      const client = await prisma.client.findFirst({
        where: {
          id: parsed.data.clientId,
          OR: [
            { userId: user.id },
            ...(membership?.businessId ? [{ businessId: membership.businessId }] : []),
          ],
        },
        select: { id: true },
      })
      if (!client) {
        return NextResponse.json({ error: 'Athlete not found' }, { status: 404 })
      }
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
        sprint5m: parsed.data.sprint5m,
        sprint10m: parsed.data.sprint10m,
        sprint20m: parsed.data.sprint20m,
        sprint30m: parsed.data.sprint30m,
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
        beepTestLevel: parsed.data.beepTestLevel,
        beepTestShuttle: parsed.data.beepTestShuttle,
        backSquat1RM: parsed.data.backSquat1RM,
        powerClean1RM: parsed.data.powerClean1RM,
        benchPress1RM: parsed.data.benchPress1RM,
        pullUp1RM: parsed.data.pullUp1RM,
        muscleLabJumps: parsed.data.muscleLabJumps as Prisma.InputJsonValue | undefined,
        muscleLabMaxima: parsed.data.muscleLabMaxima as Prisma.InputJsonValue | undefined,
        muscleLabRaw: parsed.data.muscleLabRaw as Prisma.InputJsonValue | undefined,
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
