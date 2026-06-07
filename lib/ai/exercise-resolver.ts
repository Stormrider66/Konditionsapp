/**
 * Exercise Name Resolver — shared service
 *
 * Given a batch of human-readable exercise names, return top-k candidates from
 * a scoped Exercise pool with a confidence score. Used by both
 * /api/programs/resolve-exercises (standalone) and /api/programs/import-parse
 * (one-shot pipeline).
 *
 * Responsibilities:
 *   1. Short-circuit via coach-scoped or system-wide alias hits (score=1).
 *   2. Fetch a candidate Exercise pool in a single query, filtered to what
 *      the caller can see (accessWhere) and restricted to names that still
 *      need fuzzy matching after the alias pass.
 *   3. Score per-name in memory with a tiered heuristic: exact > prefix /
 *      suffix > all-tokens-present > majority-tokens > single-token overlap.
 */

import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import {
  scoreNameAgainstRow,
  tokenize,
} from '@/lib/ai/library-name-match'

const MAX_NAMES_PER_REQUEST = 200
const AUTO_ASSIGN_THRESHOLD = 0.95
const POOL_CAP = 500

const BUSINESS_EXERCISE_ROLES = [
  'OWNER',
  'ADMIN',
  'COACH',
  'PHYSICAL_TRAINER',
  'ASSISTANT_COACH',
  'PHYSIO',
]

export interface ResolveHints {
  categoryHint?: string
  pillarHint?: string
}

export interface Candidate {
  id: string
  name: string
  nameSv?: string | null
  nameEn?: string | null
  category?: string | null
  biomechanicalPillar?: string | null
  equipment?: string | null
  score: number
}

export interface Resolution {
  name: string
  bestMatch: Candidate | null
  candidates: Candidate[]
}

export interface ResolveExercisesInput {
  names: string[]
  /** Which coach's aliases contribute. null = only system-wide aliases. */
  aliasOwnerId: string | null
  /** Prisma where clause scoping the candidate Exercise pool. */
  accessWhere: Prisma.ExerciseWhereInput
  hints?: ResolveHints
}

/** Run the resolver against a precomputed access scope and alias owner. */
export async function resolveExercises(
  input: ResolveExercisesInput
): Promise<{ resolutions: Resolution[] }> {
  const { aliasOwnerId, accessWhere, hints } = input

  const uniqueNames = Array.from(
    new Set(
      (input.names ?? [])
        .map((n) => (typeof n === 'string' ? n.trim() : ''))
        .filter((n) => n.length > 0)
    )
  ).slice(0, MAX_NAMES_PER_REQUEST)

  if (uniqueNames.length === 0) {
    return { resolutions: [] }
  }

  // ─── Alias short-circuit ──────────────────────────────────────────────
  const aliasWhere: Prisma.ExerciseNameAliasWhereInput = aliasOwnerId
    ? { OR: [{ coachId: aliasOwnerId }, { coachId: null }] }
    : { coachId: null }

  // Tolerate a missing ExerciseNameAlias table: if the migration hasn't been
  // applied on this environment yet, skip the alias pass and fall through to
  // fuzzy matching rather than taking the whole resolver down with us.
  let aliasRows: Array<{
    alias: string
    exerciseId: string
    coachId: string | null
    createdAt: Date
  }> = []
  try {
    aliasRows = await prisma.exerciseNameAlias.findMany({
      where: aliasWhere,
      select: { alias: true, exerciseId: true, coachId: true, createdAt: true },
    })
  } catch (e) {
    if (isMissingTableError(e)) {
      console.warn(
        '[exercise-resolver] ExerciseNameAlias table missing — skipping alias pass. ' +
          'Apply the migration with: export $(grep -E "^(DATABASE_URL|DIRECT_DATABASE_URL)=" .env.local | xargs) && npx prisma migrate deploy'
      )
    } else {
      throw e
    }
  }
  // Precedence: system-wide first so coach-scoped overwrites; within the same
  // scope, older first so the most-recent write wins.
  aliasRows.sort((a, b) => {
    if (a.coachId === null && b.coachId !== null) return -1
    if (a.coachId !== null && b.coachId === null) return 1
    return a.createdAt.getTime() - b.createdAt.getTime()
  })
  const aliasMap = new Map<string, string>()
  for (const r of aliasRows) {
    aliasMap.set(r.alias.toLowerCase(), r.exerciseId)
  }

  const aliasHits = new Map<string, string>()
  for (const name of uniqueNames) {
    const hit = aliasMap.get(name.toLowerCase())
    if (hit) aliasHits.set(name, hit)
  }

  // Fetch full Exercise rows for alias-hit IDs so we can render rich
  // Candidate shapes. Single round-trip.
  const aliasExerciseIds = Array.from(new Set(aliasHits.values()))
  const aliasExerciseRows = aliasExerciseIds.length
    ? await prisma.exercise.findMany({
        where: { AND: [accessWhere, { id: { in: aliasExerciseIds } }] },
        select: {
          id: true,
          name: true,
          nameSv: true,
          nameEn: true,
          category: true,
          biomechanicalPillar: true,
          equipment: true,
        },
      })
    : []
  const aliasExerciseById = new Map(aliasExerciseRows.map((e) => [e.id, e]))
  const validAliasHits = new Map(
    Array.from(aliasHits.entries()).filter(([, exerciseId]) => aliasExerciseById.has(exerciseId))
  )

  const namesForFuzzy = uniqueNames.filter((n) => !validAliasHits.has(n))

  // ─── Fuzzy candidate pool ─────────────────────────────────────────────
  const fuzzyTokenSet = new Set<string>()
  for (const n of namesForFuzzy) {
    for (const t of tokenize(n)) fuzzyTokenSet.add(t)
  }
  const orClauses: Prisma.ExerciseWhereInput[] = []
  for (const t of fuzzyTokenSet) {
    orClauses.push({ name: { contains: t, mode: 'insensitive' } })
    orClauses.push({ nameSv: { contains: t, mode: 'insensitive' } })
    orClauses.push({ nameEn: { contains: t, mode: 'insensitive' } })
  }

  const pool = orClauses.length
    ? await prisma.exercise.findMany({
        where: { AND: [accessWhere, { OR: orClauses }] },
        select: {
          id: true,
          name: true,
          nameSv: true,
          nameEn: true,
          category: true,
          biomechanicalPillar: true,
          equipment: true,
        },
        take: POOL_CAP,
      })
    : []

  const resolutions: Resolution[] = uniqueNames.map((name) => {
    const aliased = validAliasHits.get(name)
    if (aliased) {
      const ex = aliasExerciseById.get(aliased)
      if (ex) {
        const c: Candidate = {
          id: ex.id,
          name: ex.name,
          nameSv: ex.nameSv,
          nameEn: ex.nameEn,
          category: ex.category,
          biomechanicalPillar: ex.biomechanicalPillar,
          equipment: ex.equipment,
          score: 1,
        }
        return { name, bestMatch: c, candidates: [c] }
      }
    }

    const scored = pool
      .map<Candidate>((ex) => {
        const base = scoreNameAgainstRow(name, ex)
        let score = base
        if (hints?.categoryHint && ex.category && hints.categoryHint === ex.category) {
          score += 0.02
        }
        if (
          hints?.pillarHint &&
          ex.biomechanicalPillar &&
          hints.pillarHint === ex.biomechanicalPillar
        ) {
          score += 0.02
        }
        return {
          id: ex.id,
          name: ex.name,
          nameSv: ex.nameSv,
          nameEn: ex.nameEn,
          category: ex.category,
          biomechanicalPillar: ex.biomechanicalPillar,
          equipment: ex.equipment,
          score: Math.min(1, score),
        }
      })
      .filter((c) => c.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)

    const bestMatch =
      scored[0] && scored[0].score >= AUTO_ASSIGN_THRESHOLD ? scored[0] : null
    return { name, bestMatch, candidates: scored }
  })

  return { resolutions }
}

/**
 * Recognize the Prisma / Postgres "relation does not exist" error we get
 * when a migration hasn't been applied yet. Structural check — the error
 * shape from Prisma changes between versions, so we sniff the code + text.
 */
function isMissingTableError(e: unknown): boolean {
  if (!e || typeof e !== 'object') return false
  const err = e as { code?: string; message?: string; meta?: { code?: string } }
  if (err.code === 'P2021' || err.meta?.code === 'P2021') return true // Prisma: table does not exist
  if (err.code === '42P01') return true // Postgres: undefined table
  if (typeof err.message === 'string' && /does not exist|relation .* does not exist/i.test(err.message)) {
    return true
  }
  return false
}

// ─── Access-scope helpers ───────────────────────────────────────────────────

/**
 * Derive both the Exercise-pool access scope and the alias-owner id from the
 * three user contexts we care about: admin, coach, athlete. Returns the same
 * shape regardless of role so callers can share the resolver service.
 */
export async function deriveExerciseResolverScope(params: {
  userId: string
  userRole: string
  hasCoachAccess: boolean
  athleteClientId?: string | null
}): Promise<{
  accessWhere: Prisma.ExerciseWhereInput
  aliasOwnerId: string | null
}> {
  const { userId, userRole, hasCoachAccess, athleteClientId } = params

  if (userRole === 'ADMIN') {
    return { accessWhere: {}, aliasOwnerId: userId }
  }
  if (hasCoachAccess) {
    const businessIds = await getActiveBusinessIdsForUser(userId)
    return {
      accessWhere: {
        OR: [
          { isPublic: true },
          { coachId: userId },
          ...businessExerciseAccessClauses(businessIds),
        ],
      },
      aliasOwnerId: userId,
    }
  }
  if (userRole === 'ATHLETE' && athleteClientId) {
    const client = await prisma.client.findUnique({
      where: { id: athleteClientId },
      select: { userId: true, businessId: true },
    })
    const coachId = client?.userId ?? undefined
    const businessId = client?.businessId ?? undefined
    return {
      accessWhere: {
        OR: [
          { isPublic: true },
          ...(coachId ? [{ coachId }] : []),
          ...(businessId ? businessExerciseAccessClauses([businessId]) : []),
        ],
      },
      aliasOwnerId: coachId ?? null,
    }
  }
  return { accessWhere: { OR: [{ isPublic: true }] }, aliasOwnerId: null }
}

async function getActiveBusinessIdsForUser(userId: string): Promise<string[]> {
  const memberships = await prisma.businessMember.findMany({
    where: {
      userId,
      isActive: true,
      role: { in: BUSINESS_EXERCISE_ROLES },
      business: { isActive: true },
    },
    select: { businessId: true },
  })
  return memberships.map((membership) => membership.businessId)
}

function businessExerciseAccessClauses(businessIds: string[]): Prisma.ExerciseWhereInput[] {
  if (businessIds.length === 0) return []
  return [
    { businessId: { in: businessIds } },
    { businessShares: { some: { businessId: { in: businessIds } } } },
  ]
}
