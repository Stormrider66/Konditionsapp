/**
 * Program Importer — Resolve Exercises
 *
 * POST /api/programs/resolve-exercises
 *
 * Given a batch of human-readable exercise names (e.g. "Back Squat",
 * "Knäböj", "Plankan 45s"), return top-k candidates from the coach-visible
 * Exercise library with a confidence score.
 *
 * Phase 2 quality step: after import-parse produces a ParsedProgram where
 * strength segments carry `exerciseName` but not `exerciseId`, the client
 * calls this route to auto-assign IDs for high-confidence matches and
 * surface everything else in a "needs mapping" panel.
 *
 * Matching strategy (no DB extensions required):
 *   1. Pull candidate Exercises where any of name / nameSv / nameEn contains
 *      any token from any query. One round-trip regardless of batch size.
 *   2. Score per-name in memory: exact > all-tokens-match > token-overlap.
 *   3. Return top-5 per input name, plus a `bestMatch` if score >= 0.95.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, handleApiError } from '@/lib/api/utils'
import { canAccessCoachPlatform } from '@/lib/user-capabilities'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export const runtime = 'nodejs'

const MAX_NAMES_PER_REQUEST = 200
const AUTO_ASSIGN_THRESHOLD = 0.95

interface ResolveRequest {
  names: string[]
  // Optional hints to break ties
  categoryHint?: string
  pillarHint?: string
}

interface Candidate {
  id: string
  name: string
  nameSv?: string | null
  nameEn?: string | null
  category?: string | null
  biomechanicalPillar?: string | null
  equipment?: string | null
  score: number
}

interface Resolution {
  name: string
  bestMatch: Candidate | null
  candidates: Candidate[]
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const hasCoachAccess =
      user.role === 'ADMIN' ||
      user.role === 'COACH' ||
      (await canAccessCoachPlatform(user.id))

    const body = (await request.json().catch(() => ({}))) as ResolveRequest
    const rawNames = Array.isArray(body?.names) ? body.names : []

    // Normalize + dedupe query names (keep original spelling so the UI can
    // render the source text as the user entered it).
    const uniqueNames = Array.from(
      new Set(
        rawNames
          .map((n) => (typeof n === 'string' ? n.trim() : ''))
          .filter((n) => n.length > 0)
      )
    ).slice(0, MAX_NAMES_PER_REQUEST)

    if (uniqueNames.length === 0) {
      return NextResponse.json({ resolutions: [] })
    }

    // Access scope mirrors the main /api/exercises endpoint: coaches and
    // admins see public + their own, athletes see public + their coach's.
    // Also determine the "alias owner" — the coach whose learned aliases apply
    // to this request. Athletes ride on their coach's alias pool so decisions
    // their coach made earlier carry through.
    let accessWhere: Prisma.ExerciseWhereInput
    let aliasOwnerId: string | null = null
    if (user.role === 'ADMIN') {
      accessWhere = {}
      aliasOwnerId = user.id
    } else if (hasCoachAccess) {
      accessWhere = { OR: [{ isPublic: true }, { coachId: user.id }] }
      aliasOwnerId = user.id
    } else if (user.role === 'ATHLETE') {
      const resolved = await resolveAthleteClientId()
      let coachId: string | undefined
      if (resolved) {
        const client = await prisma.client.findUnique({
          where: { id: resolved.clientId },
          select: { userId: true },
        })
        coachId = client?.userId ?? undefined
      }
      accessWhere = coachId
        ? { OR: [{ isPublic: true }, { coachId }] }
        : { OR: [{ isPublic: true }] }
      aliasOwnerId = coachId ?? null
    } else {
      accessWhere = { OR: [{ isPublic: true }] }
    }

    // ─── Alias short-circuit ──────────────────────────────────────────────
    // Prefer a confirmed mapping over any fuzzy match. Coach-scoped aliases
    // beat system-wide aliases for the same name; within that scope first
    // write wins (deterministic since the pool is small).
    const aliasWhere: Prisma.ExerciseNameAliasWhereInput = aliasOwnerId
      ? { OR: [{ coachId: aliasOwnerId }, { coachId: null }] }
      : { coachId: null }
    const aliasRows = await prisma.exerciseNameAlias.findMany({
      where: aliasWhere,
      select: { alias: true, exerciseId: true, coachId: true, createdAt: true },
    })
    // Precedence: system-wide first so coach-scoped overwrites; within the
    // same scope, older first so the most-recent write wins. Sorting in
    // memory keeps the intent explicit regardless of Postgres NULL ordering
    // quirks between providers.
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
    // Candidate shapes. Uses a single round-trip.
    const aliasExerciseIds = Array.from(new Set(aliasHits.values()))
    const aliasExerciseRows = aliasExerciseIds.length
      ? await prisma.exercise.findMany({
          where: { id: { in: aliasExerciseIds } },
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

    // Names that got an alias hit skip the fuzzy pass entirely.
    const namesForFuzzy = uniqueNames.filter((n) => !aliasHits.has(n))

    // Rebuild token pool restricted to names that still need fuzzy matching.
    // Names resolved via alias don't contribute tokens — keeps the candidate
    // query tight.
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
          // Hard cap on pool size to protect memory. 500 candidates is plenty —
          // our seeded library is ~500 rows.
          take: 500,
        })
      : []

    const resolutions: Resolution[] = uniqueNames.map((name) => {
      // Alias short-circuit: confirmed mapping returns score=1 with no
      // alternatives. The UI treats bestMatch.score=1 as auto-assigned.
      const aliased = aliasHits.get(name)
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
          const best = bestNameScore(name, ex)
          let score = best
          // Tie-break: category / pillar hints bump score a little.
          if (body?.categoryHint && ex.category && body.categoryHint === ex.category) {
            score += 0.02
          }
          if (
            body?.pillarHint &&
            ex.biomechanicalPillar &&
            body.pillarHint === ex.biomechanicalPillar
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

    return NextResponse.json({ resolutions })
  } catch (error) {
    return handleApiError(error)
  }
}

// ─── Scoring ─────────────────────────────────────────────────────────────────

/**
 * Break a name into lowercased word tokens, stripping punctuation and common
 * noise (trailing "s", rep counts like "3x10", unit suffixes).
 */
function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(
      (t) =>
        t.length >= 2 &&
        !/^\d+x?\d*$/.test(t) && // reject "3x10", "10", "3x"
        !STOP_WORDS.has(t)
    )
}

const STOP_WORDS = new Set([
  'reps',
  'rep',
  'set',
  'sets',
  'min',
  'sek',
  'sec',
  'kg',
  'lbs',
  'st',
  'av',
  'för',
  'per',
  'with',
  'and',
  'the',
  'at',
])

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function bestNameScore(
  query: string,
  exercise: {
    name: string
    nameSv?: string | null
    nameEn?: string | null
  }
): number {
  const candidates = [exercise.name, exercise.nameSv, exercise.nameEn].filter(
    (v): v is string => typeof v === 'string' && v.length > 0
  )
  let best = 0
  for (const c of candidates) {
    const s = pairScore(query, c)
    if (s > best) best = s
  }
  return best
}

/**
 * Score a single (query, candidate) pair in [0, 1].
 *
 * Tiers:
 *   1.00  exact normalized match
 *   0.95  query is a normalized prefix / suffix of candidate (or vice versa)
 *   0.85  all query tokens are present in candidate
 *   0.70  majority of query tokens are in candidate
 *   0.50  at least one multi-char token overlaps and length ratio is reasonable
 *   0.00  no useful overlap
 */
function pairScore(query: string, candidate: string): number {
  const q = normalize(query)
  const c = normalize(candidate)
  if (!q || !c) return 0

  if (q === c) return 1

  // Prefix / suffix containment is common for "Back Squat" vs "Back Squat (BB)"
  if (c.startsWith(q) || c.endsWith(q) || q.startsWith(c) || q.endsWith(c)) {
    // Scale slightly by length ratio so "squat" vs "something squat that thing"
    // doesn't score as high as "squat" vs "back squat".
    const ratio = Math.min(q.length, c.length) / Math.max(q.length, c.length)
    return 0.8 + 0.15 * ratio
  }

  const qTokens = tokenize(query)
  const cTokens = new Set(tokenize(candidate))
  if (qTokens.length === 0 || cTokens.size === 0) return 0

  const present = qTokens.filter((t) => cTokens.has(t))
  const coverage = present.length / qTokens.length
  const inverse = present.length / cTokens.size

  if (coverage === 1) {
    // All query tokens match; inverse penalizes matching against much longer
    // candidates (so "squat" matching "goblet box squat overhead" is ok-good
    // but not perfect).
    return 0.75 + 0.1 * inverse
  }
  if (coverage >= 0.6) {
    return 0.55 + 0.15 * coverage
  }
  if (coverage > 0 && present.some((t) => t.length >= 4)) {
    return 0.4 * coverage + 0.1
  }
  return 0
}
