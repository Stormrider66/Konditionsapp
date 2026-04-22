/**
 * Diff the AI's scan items vs. what the user actually saved and produce a
 * single correction label. Pure function — no IO, no logging. Callers decide
 * whether to persist.
 *
 * Returns `null` when nothing material changed (pure reorders, macro-only
 * tweaks that don't touch name or grams, etc.) so the caller can skip
 * writing a noise row.
 */

export type CorrectionType = 'NAME' | 'GRAMS' | 'ADDED_ITEM' | 'REMOVED_ITEM' | 'MULTIPLE'

export interface DiffableItem {
  name: string
  estimatedGrams: number
}

export interface ClassifyOptions {
  /** Minimum relative gram change to count as a correction. Default: 0.1 (10%). */
  gramsRelativeThreshold?: number
  /** Minimum absolute gram change to count as a correction. Default: 5. */
  gramsAbsoluteThreshold?: number
}

const normalize = (s: string) => s.toLowerCase().trim().replace(/\s+/g, ' ')

export function classifyCorrection(
  aiItems: DiffableItem[],
  finalItems: DiffableItem[],
  options: ClassifyOptions = {},
): CorrectionType | null {
  const { gramsRelativeThreshold = 0.1, gramsAbsoluteThreshold = 5 } = options

  const aiCount = aiItems.length
  const finalCount = finalItems.length

  // Build normalized sets so pure reorders don't count as corrections.
  const aiNames = aiItems.map((i) => normalize(i.name))
  const finalNames = finalItems.map((i) => normalize(i.name))

  const aiSet = new Set(aiNames)
  const finalSet = new Set(finalNames)

  let addedItem = false
  let removedItem = false
  for (const n of finalNames) if (!aiSet.has(n)) addedItem = true
  for (const n of aiNames) if (!finalSet.has(n)) removedItem = true

  // For items present in both arrays, compare grams. Match by normalized name
  // (not by index) so reordering doesn't generate false positives.
  const aiByName = new Map<string, DiffableItem>()
  for (let i = 0; i < aiItems.length; i++) aiByName.set(aiNames[i], aiItems[i])
  const finalByName = new Map<string, DiffableItem>()
  for (let i = 0; i < finalItems.length; i++) finalByName.set(finalNames[i], finalItems[i])

  let gramsChanged = false
  for (const [name, aiItem] of aiByName.entries()) {
    const finalItem = finalByName.get(name)
    if (!finalItem) continue
    const diff = Math.abs(finalItem.estimatedGrams - aiItem.estimatedGrams)
    if (diff < gramsAbsoluteThreshold) continue
    if (aiItem.estimatedGrams <= 0) {
      if (diff >= gramsAbsoluteThreshold) gramsChanged = true
      continue
    }
    if (diff / aiItem.estimatedGrams >= gramsRelativeThreshold) gramsChanged = true
  }

  // Renames are harder to detect without Levenshtein — we treat any unmatched
  // name on either side as an add/remove. Count-preserving swaps ("kyckling"
  // → "kycklingfilé") naturally show up as one add + one remove, and get
  // reported as MULTIPLE or a combined rename below.
  const signals = [addedItem, removedItem, gramsChanged].filter(Boolean).length

  // Special case: same count, one item in ai not in final and vice versa,
  // nothing else changed → user likely renamed a single item. Report NAME.
  if (
    signals === 2 &&
    addedItem &&
    removedItem &&
    !gramsChanged &&
    aiCount === finalCount
  ) {
    const addedCount = finalNames.filter((n) => !aiSet.has(n)).length
    const removedCount = aiNames.filter((n) => !finalSet.has(n)).length
    if (addedCount === 1 && removedCount === 1) return 'NAME'
  }

  if (signals === 0) return null
  if (signals > 1) return 'MULTIPLE'
  if (gramsChanged) return 'GRAMS'
  if (addedItem) return 'ADDED_ITEM'
  if (removedItem) return 'REMOVED_ITEM'
  return null
}
