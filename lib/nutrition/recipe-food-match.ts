/**
 * Recipe ingredient → Food-table match confidence.
 *
 * The recipe-photo scanner auto-applies the single top-ranked Food row with no
 * human in the loop, so a sloppy `ILIKE` hit silently corrupts the saved recipe.
 * The classic failure is a short query that is only a *fragment* of a longer
 * food name riding on popularity ranking — e.g. lookup "vanilj" → "Vaniljpudding",
 * or "ris" → "griskött".
 *
 * We therefore trust an auto-applied hit only when the query occurs as a whole
 * word (or whole phrase) inside the candidate name — never as a sub-word
 * fragment. Anything weaker falls back to the model's own per-100 g estimate,
 * which keeps the user's real ingredient name instead of renaming it to the
 * wrong food. Because that estimate fallback is always available, the gate is
 * deliberately biased toward strictness: a false negative just means "use a
 * labelled AI estimate with the correct name", while a false positive means
 * "wrong food, wrong name, wrong macros" — the bug we are fixing.
 */

// Letters (incl. å/ä/ö and other Unicode) and digits are word chars; spaces,
// commas, %, parentheses, hyphens, etc. are boundaries.
const WORD_CHAR = /[\p{L}\p{N}]/u

function isBoundary(ch: string | undefined): boolean {
  return ch === undefined || !WORD_CHAR.test(ch)
}

function normalize(value: string): string {
  return value.normalize('NFC').toLowerCase().trim()
}

/**
 * True when `needle` appears in `haystack` delimited by word boundaries on both
 * sides (start/end of string or a non-alphanumeric char). Whole-word, not bare
 * substring: "vanilj" is NOT a whole word inside "vaniljpudding", but "havregryn"
 * IS inside "havregryn, fullkorn".
 */
export function occursAsWholeWord(needle: string, haystack: string): boolean {
  const n = normalize(needle)
  const h = normalize(haystack)
  if (n.length === 0) return false
  let from = 0
  for (;;) {
    const idx = h.indexOf(n, from)
    if (idx === -1) return false
    if (isBoundary(h[idx - 1]) && isBoundary(h[idx + n.length])) return true
    from = idx + 1
  }
}

/**
 * Whether an extracted ingredient query is confidently the same food as a
 * candidate `Food.searchName`. Used to gate auto-applied recipe-scan matches.
 */
export function isConfidentFoodMatch(query: string, candidateSearchName: string): boolean {
  const q = normalize(query)
  if (q.length < 2) return false
  if (q === normalize(candidateSearchName)) return true
  return occursAsWholeWord(q, candidateSearchName)
}

/**
 * Pick the first candidate (already ordered by relevance/popularity) that the
 * gate accepts as the same food. Returns `null` when none clear the bar, so the
 * caller can fall back to the model's estimate.
 */
export function pickConfidentFood<T extends { searchName: string }>(
  query: string,
  candidates: readonly T[]
): T | null {
  for (const candidate of candidates) {
    if (isConfidentFoodMatch(query, candidate.searchName)) return candidate
  }
  return null
}
