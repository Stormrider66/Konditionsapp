import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { requireCoach } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { getAccessibleTeam, getWritableTeam } from '@/lib/coach/team-access'
import {
  DEFAULT_HOCKEY_TEST_PACKAGE,
  hockeyTestPackageToJson,
  normalizeHockeyTestPackage,
  type HockeyTestPackage,
  type HockeyTestPackageItem,
} from '@/lib/hockey/test-package'

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

  const items = pkg.items.map((item): HockeyTestPackageItem => {
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
  })

  return { ...pkg, items }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireCoach()
    const { id: teamId } = await params
    const businessSlug = request.nextUrl.searchParams.get('businessSlug') ?? undefined
    const team = await getAccessibleTeam(user.id, teamId, businessSlug)
    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    const stored = await prisma.team.findUnique({
      where: { id: teamId },
      select: { hockeyTestPackage: true },
    })
    const basePackage = normalizeHockeyTestPackage(stored?.hockeyTestPackage ?? DEFAULT_HOCKEY_TEST_PACKAGE)
    const testPackage = await hydrateLinkedExercises(basePackage)

    return NextResponse.json({ success: true, package: testPackage })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Failed to load hockey test package' }, { status: 500 })
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
    const team = await getWritableTeam(user.id, teamId, businessSlug, 'tests')
    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    const body = await request.json()
    const nextPackage = normalizeHockeyTestPackage(body.package)
    const updated = await prisma.team.update({
      where: { id: teamId },
      data: {
        hockeyTestPackage: hockeyTestPackageToJson(nextPackage) as Prisma.InputJsonValue,
      },
      select: { hockeyTestPackage: true },
    })

    return NextResponse.json({
      success: true,
      package: await hydrateLinkedExercises(normalizeHockeyTestPackage(updated.hockeyTestPackage)),
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Failed to save hockey test package' }, { status: 500 })
  }
}
