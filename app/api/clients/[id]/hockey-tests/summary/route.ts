/**
 * Athlete hockey test summary
 *
 * GET /api/clients/[id]/hockey-tests/summary
 *
 * Read-only profile endpoint for latest hockey physical metrics and
 * compact history. Uses normal client access checks, so it works from
 * both coach and athlete profile contexts.
 */

import { NextResponse } from 'next/server'
import { requireAuth, handleApiError } from '@/lib/api/utils'
import { canAccessClient } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

function numberFromJson(value: unknown, key: string): number | null {
  if (!value || typeof value !== 'object') return null
  const raw = (value as Record<string, unknown>)[key]
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : null
}

function bestOf(values: Array<number | null | undefined>, lowerIsBetter = false): number | null {
  const valid = values.filter((value): value is number => value != null && Number.isFinite(value))
  if (valid.length === 0) return null
  return lowerIsBetter ? Math.min(...valid) : Math.max(...valid)
}

function round(value: number | null, decimals = 1): number | null {
  if (value == null || !Number.isFinite(value)) return null
  const factor = Math.pow(10, decimals)
  return Math.round(value * factor) / factor
}

function fatigueDrop(value: unknown): number | null {
  if (!Array.isArray(value) || value.length < 2) return null
  const times = value.filter((entry): entry is number => typeof entry === 'number' && Number.isFinite(entry))
  if (times.length < 2) return null
  const first = times[0]
  const worst = Math.max(...times)
  if (first <= 0) return null
  return round(((worst - first) / first) * 100, 1)
}

function toSummary(test: Awaited<ReturnType<typeof loadTests>>[number]) {
  const beepScore = test.beepTestLevel
    ? test.beepTestLevel + ((test.beepTestShuttle ?? 0) / 10)
    : null

  return {
    id: test.id,
    testDate: test.testDate.toISOString(),
    sourceType: test.sourceType,
    notes: test.notes,
    metrics: {
      muscleLabWkg: round(numberFromJson(test.muscleLabMaxima, 'maxAveragePowerPerBodyMass'), 1),
      muscleLabPower: round(numberFromJson(test.muscleLabMaxima, 'maxAveragePower'), 0),
      backSquat1RM: test.backSquat1RM,
      powerClean1RM: test.powerClean1RM,
      benchPress1RM: test.benchPress1RM,
      pullUp1RM: test.pullUp1RM,
      gripMax: bestOf([test.gripStrengthLeft, test.gripStrengthRight]),
      standingLongJump: test.standingLongJump,
      threeJumpBest: bestOf([test.threeJumpLeft, test.threeJumpRight]),
      beepScore: round(beepScore, 1),
      sprint10m: test.sprint10m,
      sprint20mFly: test.sprint20mFly,
      sprint30mFly: test.sprint30mFly,
      agilityBest: bestOf([test.agility505Left, test.agility505Right], true),
      enduranceFatigueDrop: fatigueDrop(test.endurance7x40),
    },
  }
}

async function loadTests(clientId: string) {
  return prisma.hockeyPhysicalTest.findMany({
    where: { clientId },
    orderBy: { testDate: 'desc' },
    take: 12,
    select: {
      id: true,
      testDate: true,
      sourceType: true,
      notes: true,
      agility505Left: true,
      agility505Right: true,
      sprint10m: true,
      sprint20mFly: true,
      sprint30mFly: true,
      endurance7x40: true,
      gripStrengthLeft: true,
      gripStrengthRight: true,
      standingLongJump: true,
      threeJumpLeft: true,
      threeJumpRight: true,
      beepTestLevel: true,
      beepTestShuttle: true,
      backSquat1RM: true,
      powerClean1RM: true,
      benchPress1RM: true,
      pullUp1RM: true,
      muscleLabMaxima: true,
    },
  })
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id: clientId } = await params
    const hasAccess = await canAccessClient(user.id, clientId)

    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const tests = await loadTests(clientId)
    const history = tests.map(toSummary)

    return NextResponse.json({
      success: true,
      data: {
        latest: history[0] ?? null,
        history,
        count: history.length,
      },
    })
  } catch (error: unknown) {
    return handleApiError(error)
  }
}
