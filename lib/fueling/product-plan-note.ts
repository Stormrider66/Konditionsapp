export interface SavedFuelingProductPlanNote {
  summary: string | null
  packedCarbsG: number | null
  targetCarbsG: number | null
  differenceG: number | null
  lines: string[]
}

const PRODUCT_PLAN_HEADER = 'Produktplan:'

export function extractSavedFuelingProductPlanNote(notes: string | null | undefined): SavedFuelingProductPlanNote | null {
  if (!notes) return null

  const lines = notes.split(/\r?\n/)
  const headerIndex = findLastProductPlanHeader(lines)
  if (headerIndex === -1) return null

  const block = collectProductPlanBlock(lines, headerIndex)
  if (block.length === 0) return null

  const summary = block[0] && block[0] !== 'Produkter ej valda ännu.' ? block[0] : null
  const packedLine = block.find((line) => line.startsWith('Packat:')) ?? ''
  const differenceLine = block.find((line) => line.startsWith('Skillnad:')) ?? ''

  return {
    summary,
    packedCarbsG: parseFirstNumber(packedLine),
    targetCarbsG: parseTargetCarbs(packedLine),
    differenceG: parseSignedNumber(differenceLine),
    lines: block,
  }
}

function findLastProductPlanHeader(lines: string[]): number {
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    if (lines[index]?.trim() === PRODUCT_PLAN_HEADER) return index
  }

  return -1
}

function collectProductPlanBlock(lines: string[], headerIndex: number): string[] {
  const block: string[] = []

  for (let index = headerIndex + 1; index < lines.length; index += 1) {
    const line = lines[index]?.trim() ?? ''
    if (!line) break
    if (line === PRODUCT_PLAN_HEADER) break
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
  const match = value.match(/planm[aå]l\s+(\d+(?:[.,]\d+)?)/i)
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
