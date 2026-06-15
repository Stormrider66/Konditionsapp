import { describe, expect, it } from 'vitest'

import {
  buildQuickErgPlannedCardioSuggestions,
  scoreQuickErgPlannedCardioCandidate,
  type QuickErgMatchableSession,
  type QuickErgPlannedCardioCandidate,
} from './planned-match'

const session: QuickErgMatchableSession = {
  id: 'quick-1',
  machineType: 'CONCEPT2_BIKEERG',
  startedAt: '2026-06-15T10:00:00.000Z',
  durationSec: 1800,
  distanceMeters: 12000,
}

const candidate: QuickErgPlannedCardioCandidate = {
  id: 'assignment-1',
  sessionId: 'cardio-1',
  sessionName: 'BikeErg aerobic ride',
  assignedDate: '2026-06-15T00:00:00.000Z',
  status: 'PENDING',
  sport: 'CYCLING',
  plannedDurationSec: 1800,
  plannedDistanceMeters: 12000,
}

describe('quick erg planned cardio matching', () => {
  it('scores strong same-day machine-specific matches highly', () => {
    const scored = scoreQuickErgPlannedCardioCandidate(session, candidate)

    expect(scored.confidence).toBeGreaterThanOrEqual(0.9)
    expect(scored.reasons).toEqual(expect.arrayContaining([
      'Same day',
      'Matching sport',
      'Machine match',
      'Similar duration',
      'Similar distance',
    ]))
  })

  it('keeps weak unrelated candidates out of suggestions', () => {
    const suggestions = buildQuickErgPlannedCardioSuggestions(session, [
      {
        ...candidate,
        id: 'assignment-weak',
        sessionName: 'Pool recovery',
        assignedDate: '2026-06-17T00:00:00.000Z',
        sport: 'SWIMMING',
        plannedDurationSec: 600,
        plannedDistanceMeters: null,
      },
    ])

    expect(suggestions).toHaveLength(0)
  })

  it('sorts the strongest candidate first', () => {
    const suggestions = buildQuickErgPlannedCardioSuggestions(session, [
      {
        ...candidate,
        id: 'assignment-close',
        sessionName: 'General endurance',
        sport: 'GENERAL_FITNESS',
        plannedDistanceMeters: null,
      },
      candidate,
    ])

    expect(suggestions[0].id).toBe('assignment-1')
  })
})
