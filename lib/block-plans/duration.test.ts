import { describe, expect, it } from 'vitest'
import {
  blockPlanDescriptionWithActualWeeks,
  blockPlanNameWithActualWeeks,
  blockPlanTotalWeeks,
  displayBlockPlanBlocks,
  hasOverlappingBlockPlanDates,
} from './duration'

const piteaBlocks = [
  { order: 1, title: 'Base', startDate: '2026-04-27', endDate: '2026-05-24' },
  { order: 2, title: 'Maxstyrka', startDate: '2026-05-25', endDate: '2026-06-14' },
  { order: 3, title: 'Easy week', startDate: '2026-06-15', endDate: '2026-06-21' },
  { order: 4, title: 'Power', startDate: '2026-06-15', endDate: '2026-07-05' },
  { order: 5, title: 'Easy week', startDate: '2026-07-06', endDate: '2026-07-12' },
  { order: 6, title: 'Block 4', startDate: '2026-07-06', endDate: '2026-07-26' },
]

function isoDate(value: Date) {
  return value.toISOString().slice(0, 10)
}

describe('block plan duration helpers', () => {
  it('counts total weeks from blocks instead of the original template name', () => {
    expect(blockPlanTotalWeeks(piteaBlocks)).toBe(15)
    expect(blockPlanNameWithActualWeeks('9 veckor styrkeblock', 15)).toBe('15 veckor styrkeblock')
    expect(blockPlanNameWithActualWeeks('9-week strength block', 15)).toBe('15-week strength block')
  })

  it('summarizes automatic template descriptions from the actual blocks', () => {
    expect(
      blockPlanDescriptionWithActualWeeks(
        '3 veckor base, 3 veckor maxstyrka, 3 veckor power.',
        piteaBlocks,
        'sv',
      ),
    ).toBe('4 veckor Base, 3 veckor Maxstyrka, 1 vecka Easy week, 3 veckor Power, 1 vecka Easy week, 3 veckor Block 4.')
  })

  it('normalizes overlapping easy-week inserts for display and saving', () => {
    expect(hasOverlappingBlockPlanDates(piteaBlocks)).toBe(true)

    const displayBlocks = displayBlockPlanBlocks(piteaBlocks)
    expect(isoDate(displayBlocks[3].startDate)).toBe('2026-06-22')
    expect(isoDate(displayBlocks[4].startDate)).toBe('2026-07-13')
    expect(isoDate(displayBlocks[5].startDate)).toBe('2026-07-20')
    expect(isoDate(displayBlocks[5].endDate)).toBe('2026-08-09')
  })
})
