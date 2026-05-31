import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { requireCoach } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { getAccessibleTeamWhere, getWritableTeam } from '@/lib/coach/team-access'
import { jsonWithPerfDebug, startPerfDebug } from '@/lib/api/perf-debug'
import {
  DEFAULT_HOCKEY_TEST_PACKAGE,
  hockeyTestPackageToJson,
  localizeHockeyTestPackage,
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

type ExerciseCandidate = {
  id: string
  name: string
  nameSv: string | null
  nameEn: string | null
  names: string[]
}

type AppLocale = 'en' | 'sv'

let exerciseCandidateCache: { expiresAt: number; candidates: ExerciseCandidate[] } | null = null
const EXERCISE_CANDIDATE_TTL_MS = 10 * 60 * 1000
const PACKAGE_RESPONSE_TTL_MS = 5 * 60 * 1000
const packageResponseCache = new Map<string, { expiresAt: number; payload: unknown }>()

function packageCacheKey(userId: string, teamId: string, locale: AppLocale, businessSlug?: string) {
  return `${userId}:${businessSlug ?? ''}:${teamId}:${locale}`
}

function clearPackageCacheForTeam(teamId: string) {
  for (const key of packageResponseCache.keys()) {
    if (key.endsWith(`:${teamId}`)) {
      packageResponseCache.delete(key)
    }
  }
}

async function getExerciseCandidates() {
  const now = Date.now()
  if (exerciseCandidateCache && exerciseCandidateCache.expiresAt > now) {
    return exerciseCandidateCache.candidates
  }

  const exercises = await prisma.exercise.findMany({
    select: { id: true, name: true, nameSv: true, nameEn: true },
  })
  const candidates = exercises.map((exercise) => ({
    ...exercise,
    names: [exercise.name, exercise.nameSv ?? '', exercise.nameEn ?? ''].filter(Boolean).map(normalizeName),
  }))
  exerciseCandidateCache = {
    expiresAt: now + EXERCISE_CANDIDATE_TTL_MS,
    candidates,
  }

  return candidates
}

function exerciseNameForLocale(exercise: ExerciseCandidate, locale: AppLocale): string {
  return locale === 'sv'
    ? exercise.nameSv || exercise.nameEn || exercise.name
    : exercise.nameEn || exercise.name || exercise.nameSv || 'Exercise'
}

function getRequestLocale(request: NextRequest): AppLocale {
  const acceptLanguage = request.headers.get('accept-language')?.toLowerCase()
  return acceptLanguage?.startsWith('sv') ? 'sv' : 'en'
}

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

async function hydrateLinkedExercises(pkg: HockeyTestPackage, locale: AppLocale) {
  const candidates = await getExerciseCandidates()

  const items = pkg.items.map((item): HockeyTestPackageItem => {
    if (item.linkedExerciseId || item.category !== 'strength') return item
    const aliases = [item.label, item.labelSv ?? '', ...item.aliases].map(normalizeName)
    const match = candidates.find((exercise) => (
      exercise.names.some((name) => aliases.some((alias) => name === alias))
    )) ?? candidates.find((exercise) => (
      exercise.names.some((name) => aliases.some((alias) => name.includes(alias) || alias.includes(name)))
    ))

    return match
      ? {
          ...item,
          linkedExerciseId: match.id,
          linkedExerciseName: exerciseNameForLocale(match, locale),
        }
      : item
  })

  return localizeHockeyTestPackage({ ...pkg, items }, locale)
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const perf = startPerfDebug(request)
  let locale = getRequestLocale(request)

  try {
    const user = await requireCoach()
    locale = user.language === 'sv' ? 'sv' : 'en'
    const { id: teamId } = await params
    const businessSlug = request.nextUrl.searchParams.get('businessSlug') ?? undefined
    const cacheKey = packageCacheKey(user.id, teamId, locale, businessSlug)
    const cached = packageResponseCache.get(cacheKey)
    if (cached && cached.expiresAt > Date.now()) {
      return jsonWithPerfDebug(perf, cached.payload, {}, { 'x-cache': 'hit' })
    }

    const accessibleTeamWhere = await getAccessibleTeamWhere(user.id, businessSlug)
    const stored = await prisma.team.findFirst({
      where: {
        id: teamId,
        AND: [accessibleTeamWhere],
      },
      select: { hockeyTestPackage: true },
    })
    if (!stored) {
      return jsonWithPerfDebug(perf, { error: t(locale, 'Team not found', 'Laget hittades inte') }, { status: 404 })
    }

    const basePackage = normalizeHockeyTestPackage(stored?.hockeyTestPackage ?? DEFAULT_HOCKEY_TEST_PACKAGE)
    const testPackage = await hydrateLinkedExercises(basePackage, locale)
    const payload = { success: true, package: testPackage }
    packageResponseCache.set(cacheKey, {
      expiresAt: Date.now() + PACKAGE_RESPONSE_TTL_MS,
      payload,
    })

    return jsonWithPerfDebug(perf, payload, {}, { 'x-cache': 'miss' })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return jsonWithPerfDebug(perf, { error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    return jsonWithPerfDebug(
      perf,
      { error: t(locale, 'Failed to load hockey test package', 'Kunde inte ladda hockeytestpaketet') },
      { status: 500 }
    )
  }
}
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let locale = getRequestLocale(request)

  try {
    const user = await requireCoach()
    locale = user.language === 'sv' ? 'sv' : 'en'
    const { id: teamId } = await params
    const businessSlug = request.nextUrl.searchParams.get('businessSlug') ?? undefined
    const team = await getWritableTeam(user.id, teamId, businessSlug, 'tests')
    if (!team) {
      return NextResponse.json({ error: t(locale, 'Team not found', 'Laget hittades inte') }, { status: 404 })
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
    clearPackageCacheForTeam(teamId)

    return NextResponse.json({
      success: true,
      package: await hydrateLinkedExercises(normalizeHockeyTestPackage(updated.hockeyTestPackage), locale),
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    return NextResponse.json(
      { error: t(locale, 'Failed to save hockey test package', 'Kunde inte spara hockeytestpaketet') },
      { status: 500 }
    )
  }
}
