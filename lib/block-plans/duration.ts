import { addDays, addWeeks, differenceInCalendarDays } from 'date-fns'

export type BlockPlanLocale = 'en' | 'sv'

export interface BlockPlanBlockInput {
  title?: string | null
  startDate: string | Date
  endDate: string | Date
  order?: number | null
}

export type DisplayBlockPlanBlock<T extends BlockPlanBlockInput> = Omit<T, 'startDate' | 'endDate'> & {
  startDate: Date
  endDate: Date
}

function toDate(value: string | Date) {
  return value instanceof Date ? value : new Date(value)
}

function validDate(value: string | Date) {
  const date = toDate(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function blockPlanBlockWeeks(block: BlockPlanBlockInput) {
  const start = validDate(block.startDate)
  const end = validDate(block.endDate)
  if (!start || !end || end < start) return 1
  return Math.max(1, Math.ceil((differenceInCalendarDays(end, start) + 1) / 7))
}

export function blockPlanTotalWeeks(blocks: readonly BlockPlanBlockInput[]) {
  return blocks.reduce((sum, block) => sum + blockPlanBlockWeeks(block), 0)
}

export function blockPlanWeekLabel(weeks: number, locale: BlockPlanLocale) {
  if (locale === 'sv') return `${weeks} ${weeks === 1 ? 'vecka' : 'veckor'}`
  return `${weeks} ${weeks === 1 ? 'week' : 'weeks'}`
}

export function inferBlockPlanLocale(text: string | null | undefined, fallback: BlockPlanLocale = 'en') {
  return /\bvecka|veckor|veckors\b/i.test(text ?? '') ? 'sv' : fallback
}

export function blockPlanNameWithActualWeeks(name: string, totalWeeks: number) {
  return name
    .replace(/^(\s*)\d+\s+veckors(\b.*)$/i, `$1${totalWeeks} veckors$2`)
    .replace(/^(\s*)\d+\s+veckor(\b.*)$/i, `$1${totalWeeks} ${totalWeeks === 1 ? 'vecka' : 'veckor'}$2`)
    .replace(/^(\s*)\d+\s*-\s*week(\b.*)$/i, `$1${totalWeeks}-week$2`)
    .replace(/^(\s*)\d+\s+weeks?(\b.*)$/i, `$1${totalWeeks} ${totalWeeks === 1 ? 'week' : 'weeks'}$2`)
}

export function hasAutoBlockPlanDescription(description: string | null | undefined) {
  const text = (description ?? '').trim()
  if (!text) return false
  const durationMentions = text.match(/\d+\s*(?:-\s*)?(?:week|weeks|vecka|veckor|veckors)\b/gi)
  return (durationMentions?.length ?? 0) >= 2
}

export function summarizeBlockPlanWeeks(
  blocks: readonly BlockPlanBlockInput[],
  locale: BlockPlanLocale,
) {
  return blocks
    .map((block, index) => {
      const title = block.title?.trim() || (locale === 'sv' ? `Block ${index + 1}` : `Block ${index + 1}`)
      return `${blockPlanWeekLabel(blockPlanBlockWeeks(block), locale)} ${title}`
    })
    .join(', ')
}

export function blockPlanDescriptionWithActualWeeks(
  description: string | null | undefined,
  blocks: readonly BlockPlanBlockInput[],
  locale = inferBlockPlanLocale(description),
) {
  if (!description || !hasAutoBlockPlanDescription(description)) return description ?? ''
  return `${summarizeBlockPlanWeeks(blocks, locale)}.`
}

export function hasOverlappingBlockPlanDates(blocks: readonly BlockPlanBlockInput[]) {
  let previousEnd: Date | null = null
  for (const block of blocks) {
    const start = validDate(block.startDate)
    const end = validDate(block.endDate)
    if (!start || !end) continue
    if (previousEnd && start <= previousEnd) return true
    previousEnd = end
  }
  return false
}

export function normalizeBlockPlanDates<T extends BlockPlanBlockInput>(
  blocks: readonly T[],
): Array<DisplayBlockPlanBlock<T>> {
  if (blocks.length === 0) return []

  let cursor = validDate(blocks[0].startDate) ?? new Date()
  return blocks.map((block) => {
    const startDate = new Date(cursor)
    const endDate = addDays(addWeeks(startDate, blockPlanBlockWeeks(block)), -1)
    cursor = addDays(endDate, 1)
    return {
      ...block,
      startDate,
      endDate,
    }
  })
}

export function displayBlockPlanBlocks<T extends BlockPlanBlockInput>(
  blocks: readonly T[],
): Array<DisplayBlockPlanBlock<T>> {
  if (hasOverlappingBlockPlanDates(blocks)) return normalizeBlockPlanDates(blocks)
  return blocks.map((block) => ({
    ...block,
    startDate: validDate(block.startDate) ?? new Date(),
    endDate: validDate(block.endDate) ?? new Date(),
  }))
}
