import { describe, expect, it } from 'vitest'
import { sortFuelingPlansForDisplay } from './plan-ordering'

describe('sortFuelingPlansForDisplay', () => {
  it('prefers upcoming plans, then undated plans, then past plans', () => {
    const sorted = sortFuelingPlansForDisplay([
      plan('past', '2026-04-01', '2026-04-02'),
      plan('undated', null, '2026-05-02'),
      plan('future-later', '2026-06-01', '2026-05-01'),
      plan('future-sooner', '2026-05-20', '2026-05-01'),
    ], new Date('2026-05-11T12:00:00'))

    expect(sorted.map((item) => item.id)).toEqual([
      'future-sooner',
      'future-later',
      'undated',
      'past',
    ])
  })

  it('orders undated plans by latest update', () => {
    const sorted = sortFuelingPlansForDisplay([
      plan('older', null, '2026-05-01'),
      plan('newer', null, '2026-05-03'),
    ], new Date('2026-05-11T12:00:00'))

    expect(sorted.map((item) => item.id)).toEqual(['newer', 'older'])
  })

  it('uses latest update as a tie-breaker for plans on the same date', () => {
    const sorted = sortFuelingPlansForDisplay([
      plan('older', '2026-06-01', '2026-05-01'),
      plan('newer', '2026-06-01', '2026-05-03'),
    ], new Date('2026-05-11T12:00:00'))

    expect(sorted.map((item) => item.id)).toEqual(['newer', 'older'])
  })
})

function plan(id: string, raceDate: string | null, updatedAt: string) {
  return {
    id,
    raceDate,
    updatedAt,
    createdAt: updatedAt,
  }
}
