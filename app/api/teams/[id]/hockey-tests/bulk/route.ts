/**
 * Team Hockey Tests Bulk API
 *
 * POST /api/teams/[id]/hockey-tests/bulk
 *
 * Saves a whole roster's hockey battery for one test date. Each entry
 * becomes one HockeyPhysicalTest row, or updates the existing row for
 * the same athlete/team/date.
 */

import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { requireCoach } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { getWritableTeam } from '@/lib/coach/team-access'

const powerMapSchema = z.record(z.coerce.number().positive()).optional()

const entrySchema = z.object({
  clientId: z.string().uuid(),
  agility505Left: z.coerce.number().positive().optional(),
  agility505Right: z.coerce.number().positive().optional(),
  sprint5m: z.coerce.number().positive().optional(),
  sprint10m: z.coerce.number().positive().optional(),
  sprint20m: z.coerce.number().positive().optional(),
  sprint30m: z.coerce.number().positive().optional(),
  sprint20mFly: z.coerce.number().positive().optional(),
  sprint30mFly: z.coerce.number().positive().optional(),
  endurance7x40: z.array(z.coerce.number().positive()).max(7).optional(),
  jumpSquatLadder: powerMapSchema,
  singleLegJumpLeft: powerMapSchema,
  singleLegJumpRight: powerMapSchema,
  gripStrengthLeft: z.coerce.number().positive().optional(),
  gripStrengthRight: z.coerce.number().positive().optional(),
  standingLongJump: z.coerce.number().positive().optional(),
  threeJumpLeft: z.coerce.number().positive().optional(),
  threeJumpRight: z.coerce.number().positive().optional(),
  beepTestLevel: z.coerce.number().positive().optional(),
  beepTestShuttle: z.coerce.number().int().positive().optional(),
  vo2max: z.coerce.number().positive().optional(),
  lt1HeartRate: z.coerce.number().int().positive().optional(),
  lt1SpeedKmh: z.coerce.number().positive().optional(),
  lt1Lactate: z.coerce.number().positive().optional(),
  lt2HeartRate: z.coerce.number().int().positive().optional(),
  lt2SpeedKmh: z.coerce.number().positive().optional(),
  lt2Lactate: z.coerce.number().positive().optional(),
  maxHeartRate: z.coerce.number().int().positive().optional(),
  maxLactate: z.coerce.number().positive().optional(),
  rampDurationSec: z.coerce.number().int().positive().optional(),
  peakSpeedKmh: z.coerce.number().positive().optional(),
  rerMax: z.coerce.number().positive().optional(),
  veMax: z.coerce.number().positive().optional(),
  breathingFrequencyMax: z.coerce.number().positive().optional(),
  economyMlKgKm: z.coerce.number().positive().optional(),
  hrRecovery1Min: z.coerce.number().int().optional(),
  hrRecovery2Min: z.coerce.number().int().optional(),
  lactateClearance3Min: z.coerce.number().optional(),
  lactateClearance5Min: z.coerce.number().optional(),
  lactateClearance10Min: z.coerce.number().optional(),
  backSquat1RM: z.coerce.number().positive().optional(),
  powerClean1RM: z.coerce.number().positive().optional(),
  benchPress1RM: z.coerce.number().positive().optional(),
  pullUp1RM: z.coerce.number().positive().optional(),
})

const bulkSchema = z.object({
  testDate: z.string().min(8),
  notes: z.string().max(2000).optional(),
  entries: z.array(entrySchema).min(1).max(80),
})

function dayRange(dateInput: string) {
  const start = new Date(dateInput)
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 1)
  return { start, end }
}

function hasValues(entry: z.infer<typeof entrySchema>) {
  const { clientId: _clientId, ...rest } = entry
  return Object.values(rest).some((value) => {
    if (Array.isArray(value)) return value.length > 0
    if (value && typeof value === 'object') return Object.keys(value).length > 0
    return value != null
  })
}

function toData(
  entry: z.infer<typeof entrySchema>,
  teamId: string,
  coachId: string,
  testDate: Date,
  notes?: string,
): Prisma.HockeyPhysicalTestUncheckedCreateInput {
  return {
    clientId: entry.clientId,
    teamId,
    coachId,
    testDate,
    notes,
    agility505Left: entry.agility505Left,
    agility505Right: entry.agility505Right,
    sprint5m: entry.sprint5m,
    sprint10m: entry.sprint10m,
    sprint20m: entry.sprint20m,
    sprint30m: entry.sprint30m,
    sprint20mFly: entry.sprint20mFly,
    sprint30mFly: entry.sprint30mFly,
    endurance7x40: entry.endurance7x40 as Prisma.InputJsonValue | undefined,
    jumpSquatLadder: entry.jumpSquatLadder as Prisma.InputJsonValue | undefined,
    singleLegJumpLeft: entry.singleLegJumpLeft as Prisma.InputJsonValue | undefined,
    singleLegJumpRight: entry.singleLegJumpRight as Prisma.InputJsonValue | undefined,
    gripStrengthLeft: entry.gripStrengthLeft,
    gripStrengthRight: entry.gripStrengthRight,
    standingLongJump: entry.standingLongJump,
    threeJumpLeft: entry.threeJumpLeft,
    threeJumpRight: entry.threeJumpRight,
    beepTestLevel: entry.beepTestLevel,
    beepTestShuttle: entry.beepTestShuttle,
    vo2max: entry.vo2max,
    lt1HeartRate: entry.lt1HeartRate,
    lt1SpeedKmh: entry.lt1SpeedKmh,
    lt1Lactate: entry.lt1Lactate,
    lt2HeartRate: entry.lt2HeartRate,
    lt2SpeedKmh: entry.lt2SpeedKmh,
    lt2Lactate: entry.lt2Lactate,
    maxHeartRate: entry.maxHeartRate,
    maxLactate: entry.maxLactate,
    rampDurationSec: entry.rampDurationSec,
    peakSpeedKmh: entry.peakSpeedKmh,
    rerMax: entry.rerMax,
    veMax: entry.veMax,
    breathingFrequencyMax: entry.breathingFrequencyMax,
    economyMlKgKm: entry.economyMlKgKm,
    hrRecovery1Min: entry.hrRecovery1Min,
    hrRecovery2Min: entry.hrRecovery2Min,
    lactateClearance3Min: entry.lactateClearance3Min,
    lactateClearance5Min: entry.lactateClearance5Min,
    lactateClearance10Min: entry.lactateClearance10Min,
    backSquat1RM: entry.backSquat1RM,
    powerClean1RM: entry.powerClean1RM,
    benchPress1RM: entry.benchPress1RM,
    pullUp1RM: entry.pullUp1RM,
    sourceType: 'MANUAL',
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireCoach()
    const { id: teamId } = await params
    const team = await getWritableTeam(user.id, teamId, undefined, 'tests')

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    const parsed = bulkSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Ogiltig indata', details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const entries = parsed.data.entries.filter(hasValues)
    if (entries.length === 0) {
      return NextResponse.json({ error: 'Inga testvärden att spara' }, { status: 400 })
    }

    const memberIds = new Set(
      (await prisma.team.findUnique({
        where: { id: teamId },
        select: { members: { select: { id: true } } },
      }))?.members.map((member) => member.id) ?? [],
    )
    const invalid = entries.find((entry) => !memberIds.has(entry.clientId))
    if (invalid) {
      return NextResponse.json({ error: 'Spelare saknas i laget' }, { status: 400 })
    }

    const { start, end } = dayRange(parsed.data.testDate)
    const testDate = start
    let created = 0
    let updated = 0

    await prisma.$transaction(async (tx) => {
      for (const entry of entries) {
        const existing = await tx.hockeyPhysicalTest.findFirst({
          where: {
            teamId,
            clientId: entry.clientId,
            testDate: { gte: start, lt: end },
          },
          select: { id: true },
        })
        const data = toData(entry, teamId, user.id, testDate, parsed.data.notes)

        if (existing) {
          const { clientId: _clientId, teamId: _teamId, coachId: _coachId, testDate: _testDate, ...updateData } = data
          await tx.hockeyPhysicalTest.update({
            where: { id: existing.id },
            data: updateData,
          })
          updated++
        } else {
          await tx.hockeyPhysicalTest.create({ data })
          created++
        }
      }
    })

    return NextResponse.json({
      success: true,
      created,
      updated,
      total: created + updated,
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Team hockey tests bulk error:', error)
    return NextResponse.json({ error: 'Kunde inte spara hockeytester' }, { status: 500 })
  }
}
