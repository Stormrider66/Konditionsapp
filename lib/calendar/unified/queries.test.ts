import { describe, expect, it } from 'vitest'

import { isUnmatchedQuickErgCalendarSession } from './queries'

describe('isUnmatchedQuickErgCalendarSession', () => {
  it('keeps free Quick Erg sessions visible in the calendar', () => {
    expect(isUnmatchedQuickErgCalendarSession({ externalMatch: null })).toBe(true)
  })

  it('hides Quick Erg sessions that already completed a planned cardio assignment', () => {
    expect(isUnmatchedQuickErgCalendarSession({
      externalMatch: {
        type: 'cardio_assignment',
        assignmentId: 'assignment-1',
        sessionId: 'cardio-session-1',
        sessionName: 'Bike intervals',
        assignedDate: '2026-06-15T00:00:00.000Z',
        previousStatus: 'SCHEDULED',
        matchedAt: '2026-06-15T12:00:00.000Z',
      },
    })).toBe(false)
  })
})
