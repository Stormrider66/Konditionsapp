export interface SavedFuelingProductPlanNote {
  summary: string | null
  packedCarbsG: number | null
  targetCarbsG: number | null
  differenceG: number | null
  lines: string[]
}

const PRODUCT_PLAN_HEADERS = ['Produktplan:', 'Product plan:']
const EMPTY_PRODUCT_LINES = ['Produkter ej valda ännu.', 'No products selected yet.']

export function extractSavedFuelingProductPlanNote(notes: string | null | undefined): SavedFuelingProductPlanNote | null {
  if (!notes) return null

  const lines = notes.split(/\r?\n/)
  const headerIndex = findLastProductPlanHeader(lines)
  if (headerIndex === -1) return null

  const block = collectProductPlanBlock(lines, headerIndex)
  if (block.length === 0) return null

  const summary = block[0] && !EMPTY_PRODUCT_LINES.includes(block[0]) ? block[0] : null
  const packedLine = block.find((line) => /^(Packat|Packed):/i.test(line)) ?? ''
  const differenceLine = block.find((line) => /^(Skillnad|Difference):/i.test(line)) ?? ''

  return {
    summary,
    packedCarbsG: parseFirstNumber(packedLine),
    targetCarbsG: parseTargetCarbs(packedLine),
    differenceG: parseSignedNumber(differenceLine),
    lines: block,
  }
}

export function formatSavedFuelingProductPlanSummary(
  summary: string | null | undefined,
  locale: string
): string | null {
  if (!summary) return null
  if (locale.startsWith('sv')) return summary

  return summary
    .replace(/\b(\d+(?:[.,]\d+)?)\s+flask(?:a|or) sportdryck\b/gi, (_match, count: string) => {
      const numericCount = Number(count.replace(',', '.'))
      const label = numericCount === 1 ? 'sports drink bottle' : 'sports drink bottles'
      return `${count} ${label}`
    })
    .replace(/\bsportdryck\b/gi, 'sports drink')
    .replaceAll(' à ', ' at ')
}

function findLastProductPlanHeader(lines: string[]): number {
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    if (PRODUCT_PLAN_HEADERS.includes(lines[index]?.trim() ?? '')) return index
  }

  return -1
}

function collectProductPlanBlock(lines: string[], headerIndex: number): string[] {
  const block: string[] = []

  for (let index = headerIndex + 1; index < lines.length; index += 1) {
    const line = lines[index]?.trim() ?? ''
    if (!line) break
    if (PRODUCT_PLAN_HEADERS.includes(line)) break
    block.push(line)
  }

  return block
}

function parseFirstNumber(value: string): number | null {
  const match = value.match(/(\d+(?:[.,]\d+)?)/)
  if (!match) return null
  return parseNumericMatch(match[1])
}

function parseTargetCarbs(value: string): number | null {
  const match = value.match(/(?:planm[aå]l|plan target)\s+(\d+(?:[.,]\d+)?)/i)
  if (!match) return null
  return parseNumericMatch(match[1])
}

function parseSignedNumber(value: string): number | null {
  const match = value.match(/([+-]?\d+(?:[.,]\d+)?)/)
  if (!match) return null
  return parseNumericMatch(match[1])
}

function parseNumericMatch(value: string): number | null {
  const parsed = Number(value.replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : null
}
