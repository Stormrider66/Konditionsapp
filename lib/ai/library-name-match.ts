/**
 * Library name-matching helpers.
 *
 * Shared scoring primitives for fuzzy-matching a free-text name (often
 * AI-extracted from an imported program / workout) against rows from a
 * library table — Exercise (`exercise-resolver.ts`) or AgilityDrill
 * (workout import-parse route's drill matcher).
 *
 * Tiered scoring:
 *   1.00         exact normalized match
 *   0.80–0.95    prefix/suffix containment, scaled by length ratio
 *   0.75–0.85    100% query-token coverage with low candidate overhead
 *   0.55–0.70    ≥60% query-token coverage
 *   0.40–0.50    partial coverage with at least one ≥4-char token
 *   0            no overlap
 *
 * `scoreNameAgainstRow` accepts a row with up to three name fields
 * (Exercise has name/nameSv/nameEn; AgilityDrill has name/nameSv) and
 * returns the best score across them. Hints (categoryHint / pillarHint)
 * land as small additive bumps — useful when the import provides context
 * like "this is a knee-dominant exercise".
 */

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

export function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(
      (t) =>
        t.length >= 2 &&
        !/^\d+x?\d*$/.test(t) &&
        !STOP_WORDS.has(t)
    )
}

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Score a single (query, candidate-name) pair on the 0–1 scale. */
export function pairScore(query: string, candidate: string): number {
  const q = normalize(query)
  const c = normalize(candidate)
  if (!q || !c) return 0

  if (q === c) return 1
  if (c.startsWith(q) || c.endsWith(q) || q.startsWith(c) || q.endsWith(c)) {
    const ratio = Math.min(q.length, c.length) / Math.max(q.length, c.length)
    return 0.8 + 0.15 * ratio
  }

  const qTokens = tokenize(query)
  const cTokens = new Set(tokenize(candidate))
  if (qTokens.length === 0 || cTokens.size === 0) return 0

  const present = qTokens.filter((t) => cTokens.has(t))
  const coverage = present.length / qTokens.length
  const inverse = present.length / cTokens.size

  if (coverage === 1) return 0.75 + 0.1 * inverse
  if (coverage >= 0.6) return 0.55 + 0.15 * coverage
  if (coverage > 0 && present.some((t) => t.length >= 4)) return 0.4 * coverage + 0.1
  return 0
}

/**
 * Pick the best score across a row's available name fields. Library rows
 * commonly carry multiple translations — we want the highest-scoring one
 * to win regardless of which language the source happened to use.
 */
export function scoreNameAgainstRow(
  query: string,
  row: { name: string; nameSv?: string | null; nameEn?: string | null }
): number {
  const candidates = [row.name, row.nameSv, row.nameEn].filter(
    (v): v is string => typeof v === 'string' && v.length > 0
  )
  let best = 0
  for (const c of candidates) {
    const s = pairScore(query, c)
    if (s > best) best = s
  }
  return best
}
