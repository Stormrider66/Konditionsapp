/**
 * Turn a batch of FoodScanCorrection rows into a short Swedish prompt block
 * that tells Gemini "these are the kinds of mistakes you've made on this
 * user before." Deliberately lighter-weight than a full retrieval system —
 * we just aggregate correction history and emit a handful of high-signal
 * bullet points.
 *
 * Pure function — no IO. Callers handle the DB query.
 */

export interface CorrectionInputRow {
  aiItemsJson: unknown
  finalItemsJson: unknown
  correctionType: string
  wentThroughRefine?: boolean | null
  createdAt?: Date | string | null
}

interface ParsedItem {
  name: string
  normalizedName: string
  estimatedGrams: number
}

export interface CorrectionHintsOptions {
  /** Minimum times a pattern must repeat to be emitted. Default: 2. */
  minOccurrences?: number
  /** Max lines in each sub-section (name swaps / grams bias / added / removed). Default: 3. */
  maxLinesPerSection?: number
}

/**
 * @returns a Swedish prompt block, or null if there's nothing informative to emit.
 */
export function buildCorrectionHints(
  rows: CorrectionInputRow[],
  options: CorrectionHintsOptions = {},
): string | null {
  const { minOccurrences = 2, maxLinesPerSection = 3 } = options
  if (rows.length === 0) return null

  const nameSwaps = new Map<string, { from: string; to: string; count: number }>()
  const gramsBias = new Map<string, { name: string; deltas: number[] }>()
  const addedTotals = new Map<string, { name: string; count: number }>()
  const removedTotals = new Map<string, { name: string; count: number }>()

  for (const row of rows) {
    const aiItems = parseItems(row.aiItemsJson)
    const finalItems = parseItems(row.finalItemsJson)
    if (aiItems.length === 0 || finalItems.length === 0) continue

    const aiByName = indexByName(aiItems)
    const finalByName = indexByName(finalItems)

    // Refined corrections are stronger signal — count them twice.
    const weight = row.wentThroughRefine ? 2 : 1

    const removedNames: string[] = []
    const addedNames: string[] = []
    for (const name of aiByName.keys()) if (!finalByName.has(name)) removedNames.push(name)
    for (const name of finalByName.keys()) if (!aiByName.has(name)) addedNames.push(name)

    // Clean 1↔1 rename: treat as a single swap signal, not as add+remove.
    if (removedNames.length === 1 && addedNames.length === 1) {
      const from = aiByName.get(removedNames[0])!
      const to = finalByName.get(addedNames[0])!
      const key = `${from.normalizedName}→${to.normalizedName}`
      const bucket = nameSwaps.get(key)
      if (bucket) bucket.count += weight
      else nameSwaps.set(key, { from: from.name, to: to.name, count: weight })
    } else {
      for (const name of removedNames) {
        const item = aiByName.get(name)!
        const bucket = removedTotals.get(name)
        if (bucket) bucket.count += weight
        else removedTotals.set(name, { name: item.name, count: weight })
      }
      for (const name of addedNames) {
        const item = finalByName.get(name)!
        const bucket = addedTotals.get(name)
        if (bucket) bucket.count += weight
        else addedTotals.set(name, { name: item.name, count: weight })
      }
    }

    // Grams bias: for items present in both arrays, collect the signed delta.
    for (const [name, aiItem] of aiByName.entries()) {
      const finalItem = finalByName.get(name)
      if (!finalItem) continue
      if (!Number.isFinite(aiItem.estimatedGrams) || !Number.isFinite(finalItem.estimatedGrams)) continue
      const delta = finalItem.estimatedGrams - aiItem.estimatedGrams
      if (Math.abs(delta) < 5) continue
      const bucket = gramsBias.get(name)
      if (bucket) {
        for (let i = 0; i < weight; i++) bucket.deltas.push(delta)
      } else {
        gramsBias.set(name, { name: aiItem.name, deltas: Array(weight).fill(delta) })
      }
    }
  }

  const swapLines = Array.from(nameSwaps.values())
    .filter((s) => s.count >= minOccurrences)
    .sort((a, b) => b.count - a.count)
    .slice(0, maxLinesPerSection)
    .map((s) => `- "${s.from}" korrigeras ofta till "${s.to}" (${s.count} ggr)`)

  const biasLines = Array.from(gramsBias.values())
    .filter((g) => g.deltas.length >= minOccurrences)
    .map((g) => {
      const avg = g.deltas.reduce((a, b) => a + b, 0) / g.deltas.length
      return { name: g.name, avg, count: g.deltas.length }
    })
    .filter((g) => Math.abs(g.avg) >= 10)
    .sort((a, b) => Math.abs(b.avg) - Math.abs(a.avg))
    .slice(0, maxLinesPerSection)
    .map((g) => {
      const sign = g.avg > 0 ? '+' : ''
      const direction = g.avg > 0 ? 'underskatta' : 'överskatta'
      return `- ${g.name}: tenderar att ${direction} portionen (snitt ${sign}${Math.round(g.avg)}g, ${g.count} rättelser)`
    })

  const addedLines = Array.from(addedTotals.values())
    .filter((a) => a.count >= minOccurrences)
    .sort((a, b) => b.count - a.count)
    .slice(0, maxLinesPerSection)
    .map((a) => `- Användaren lägger ofta till: ${a.name} (${a.count} ggr)`)

  const removedLines = Array.from(removedTotals.values())
    .filter((r) => r.count >= minOccurrences)
    .sort((a, b) => b.count - a.count)
    .slice(0, maxLinesPerSection)
    .map((r) => `- Användaren tar ofta bort: ${r.name} (${r.count} ggr)`)

  const anyLines =
    swapLines.length > 0 || biasLines.length > 0 || addedLines.length > 0 || removedLines.length > 0
  if (!anyLines) return null

  const lines: string[] = []
  lines.push('TIDIGARE RÄTTELSER (starkare signal än frekvensmönster nedan — här har AI:n faktiskt haft fel):')
  for (const l of swapLines) lines.push(l)
  for (const l of biasLines) lines.push(l)
  for (const l of addedLines) lines.push(l)
  for (const l of removedLines) lines.push(l)
  return lines.join('\n')
}

function parseItems(json: unknown): ParsedItem[] {
  if (!Array.isArray(json)) return []
  const out: ParsedItem[] = []
  for (const raw of json) {
    if (!raw || typeof raw !== 'object') continue
    const rec = raw as Record<string, unknown>
    const name = typeof rec.name === 'string' ? rec.name : null
    if (!name) continue
    const grams = typeof rec.estimatedGrams === 'number' ? rec.estimatedGrams : Number(rec.estimatedGrams)
    if (!Number.isFinite(grams)) continue
    out.push({ name, normalizedName: name.toLowerCase().trim(), estimatedGrams: grams })
  }
  return out
}

function indexByName(items: ParsedItem[]): Map<string, ParsedItem> {
  const m = new Map<string, ParsedItem>()
  for (const item of items) m.set(item.normalizedName, item)
  return m
}
