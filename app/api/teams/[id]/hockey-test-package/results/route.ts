import { NextRequest, NextResponse } from 'next/server'
import { requireCoach } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { getWritableTeam } from '@/lib/coach/team-access'
import {
  DEFAULT_HOCKEY_TEST_PACKAGE,
  HOCKEY_SCALAR_METRIC_KEYS,
  normalizeHockeyTestPackage,
  type HockeyTestPackage,
  type HockeyTestPackageItem,
} from '@/lib/hockey/test-package'

type ResultEntry = {
  clientId: string
  packageItemId: string
  value: number
}

const INTEGER_METRICS = new Set(['lt1HeartRate', 'lt2HeartRate', 'maxHeartRate', 'rampTimeSeconds'])

function normalizeName(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

async function hydrateLinkedExercises(pkg: HockeyTestPackage) {
  const exercises = await prisma.exercise.findMany({
    select: { id: true, name: true, nameSv: true },
  })
  const candidates = exercises.map((exercise) => ({
    ...exercise,
    names: [exercise.name, exercise.nameSv ?? ''].filter(Boolean).map(normalizeName),
  }))

  return {
    ...pkg,
    items: pkg.items.map((item): HockeyTestPackageItem => {
      if (item.linkedExerciseId || item.category !== 'strength') return item
      const aliases = [item.label, ...item.aliases].map(normalizeName)
      const match = candidates.find((exercise) => (
        exercise.names.some((name) => aliases.some((alias) => name === alias))
      )) ?? candidates.find((exercise) => (
        exercise.names.some((name) => aliases.some((alias) => name.includes(alias) || alias.includes(name)))
      ))
      return match
        ? {
            ...item,
            linkedExerciseId: match.id,
            linkedExerciseName: match.nameSv || match.name,
          }
        : item
    }),
  }
}
function parseEntries(value: unknown): ResultEntry[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return []
    const record = entry as Record<string, unknown>
    if (
      typeof record.clientId !== 'string'
      || typeof record.packageItemId !== 'string'
      || typeof record.value !== 'number'
      || !Number.isFinite(record.value)
      || record.value <= 0
    ) {
      return []
    }
    return [{
      clientId: record.clientId,
      packageItemId: record.packageItemId,
      value: record.value,
    }]
  })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireCoach()
    const { id: teamId } = await params
    const businessSlug = request.nextUrl.searchParams.get('businessSlug') ?? undefined
    const team = await getWritableTeam(user.id, teamId, businessSlug, 'tests')
    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    const body = await request.json()
    const testDate = typeof body.testDate === 'string' && body.testDate
      ? new Date(body.testDate)
      : new Date()
    if (Number.isNaN(testDate.getTime())) {
      return NextResponse.json({ error: 'Invalid testDate' }, { status: 400 })
    }

    const entries = parseEntries(body.entries)
    if (entries.length === 0) {
      return NextResponse.json({ error: 'No valid entries' }, { status: 400 })
    }

    const storedTeam = await prisma.team.findUnique({
      where: { id: teamId },
      select: {
        hockeyTestPackage: true,
        members: { select: { id: true } },
      },
    })
    if (!storedTeam) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    const memberIds = new Set(storedTeam.members.map((member) => member.id))
    const testPackage = await hydrateLinkedExercises(
      normalizeHockeyTestPackage(storedTeam.hockeyTestPackage ?? DEFAULT_HOCKEY_TEST_PACKAGE)
    )
    const itemsById = new Map(testPackage.items.filter((item) => item.enabled).map((item) => [item.id, item]))

    const errors: Array<{ index: number; message: string }> = []
    const byClient = new Map<string, Array<{ item: HockeyTestPackageItem; value: number }>>()

    entries.forEach((entry, index) => {
      if (!memberIds.has(entry.clientId)) {
        errors.push({ index, message: 'Atleten finns inte i laget' })
        return
      }
      const item = itemsById.get(entry.packageItemId)
      if (!item) {
        errors.push({ index, message: 'Testet finns inte i lagets testpaket' })
        return
      }
      if (!HOCKEY_SCALAR_METRIC_KEYS.includes(item.metricKey)) {
        errors.push({ index, message: 'Testet stöds inte i manuell tabell ännu' })
        return
      }
      const next = byClient.get(entry.clientId) ?? []
      next.push({
        item,
        value: INTEGER_METRICS.has(item.metricKey) ? Math.round(entry.value) : entry.value,
      })
      byClient.set(entry.clientId, next)
    })

    let hockeyCreated = 0
    let hockeyUpdated = 0
    let prCreated = 0
    let prUpdated = 0
    const unlinkedStrengthItems = new Set<string>()

    for (const [clientId, rows] of byClient.entries()) {
      const hockeyData = Object.fromEntries(
        rows.map(({ item, value }) => [item.metricKey, value])
      )
      const existing = await prisma.hockeyPhysicalTest.findFirst({
        where: { clientId, teamId, testDate },
        select: { id: true },
        orderBy: { createdAt: 'desc' },
      })

      if (existing) {
        await prisma.hockeyPhysicalTest.update({
          where: { id: existing.id },
          data: {
            ...hockeyData,
            sourceType: 'MANUAL',
          },
        })
        hockeyUpdated++
      } else {
        await prisma.hockeyPhysicalTest.create({
          data: {
            clientId,
            teamId,
            coachId: user.id,
            testDate,
            sourceType: 'MANUAL',
            ...hockeyData,
          },
        })
        hockeyCreated++
      }

      for (const { item, value } of rows) {
        if (item.category !== 'strength') continue
        if (!item.linkedExerciseId) {
          unlinkedStrengthItems.add(item.label)
          continue
        }
        const upsertResult = await prisma.oneRepMaxHistory.upsert({
          where: {
            clientId_exerciseId_date: {
              clientId,
              exerciseId: item.linkedExerciseId,
              date: testDate,
            },
          },
          update: {
            oneRepMax: value,
            source: 'TESTED',
            unit: item.unit.toUpperCase() || 'KG',
            notes: `Hockeytest: ${item.label}`,
          },
          create: {
            clientId,
            exerciseId: item.linkedExerciseId,
            date: testDate,
            oneRepMax: value,
            source: 'TESTED',
            unit: item.unit.toUpperCase() || 'KG',
            notes: `Hockeytest: ${item.label}`,
          },
          select: { createdAt: true },
        })
        const ageMs = Date.now() - upsertResult.createdAt.getTime()
        if (ageMs < 1000) prCreated++
        else prUpdated++
      }
    }

    return NextResponse.json({
      success: true,
      attempted: entries.length,
      hockeyCreated,
      hockeyUpdated,
      prCreated,
      prUpdated,
      errors,
      warnings: Array.from(unlinkedStrengthItems).map((label) => (
        `${label} saknar kopplad övning och sparades därför bara som hockeytest.`
      )),
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Hockey package result save failed:', error)
    return NextResponse.json({ error: 'Failed to save hockey package results' }, { status: 500 })
  }
}
