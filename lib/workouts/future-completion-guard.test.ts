import { describe, expect, it } from 'vitest'
import {
  FUTURE_WORKOUT_COMPLETION_CODE,
  getFutureWorkoutCompletionWarning,
} from './future-completion-guard'

describe('getFutureWorkoutCompletionWarning', () => {
  const now = new Date('2026-05-14T12:00:00.000Z')

  it('requires confirmation for workouts scheduled after today', () => {
    const warning = getFutureWorkoutCompletionWarning({
      assignedDate: new Date('2026-05-15T10:00:00.000Z'),
      now,
    })

    expect(warning).toEqual({
      code: FUTURE_WORKOUT_COMPLETION_CODE,
      error: 'This workout is scheduled for 2026-05-15. Confirm if you want to log it in advance.',
      scheduledDate: '2026-05-15',
    })
  })

  it('keeps Swedish copy when locale is sv', () => {
    const warning = getFutureWorkoutCompletionWarning({
      assignedDate: new Date('2026-05-15T10:00:00.000Z'),
      now,
      locale: 'sv',
    })

    expect(warning).toEqual({
      code: FUTURE_WORKOUT_COMPLETION_CODE,
      error: 'Passet är planerat till 2026-05-15. Bekräfta om du vill registrera det i förväg.',
      scheduledDate: '2026-05-15',
    })
  })

  it('allows same-day completion', () => {
    const warning = getFutureWorkoutCompletionWarning({
      assignedDate: new Date('2026-05-14T18:00:00.000Z'),
      now,
    })

    expect(warning).toBeNull()
  })

  it('allows explicit future completion override', () => {
    const warning = getFutureWorkoutCompletionWarning({
      assignedDate: new Date('2026-05-15T10:00:00.000Z'),
      allowFutureCompletion: true,
      now,
    })

    expect(warning).toBeNull()
  })
})
