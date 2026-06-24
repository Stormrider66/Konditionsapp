import { describe, expect, it } from 'vitest'
import {
  buildUpdateLiveWorkoutFeedbackPreview,
  updateLiveWorkoutFeedbackInputSchema,
} from './athlete-live-workout-feedback'

describe('athlete live workout feedback action', () => {
  it('rejects empty feedback', () => {
    const parsed = updateLiveWorkoutFeedbackInputSchema.safeParse({
      date: '2026-06-24',
    })

    expect(parsed.success).toBe(false)
  })

  it('builds a clear live workout feedback preview', () => {
    const parsed = updateLiveWorkoutFeedbackInputSchema.safeParse({
      date: '2026-06-24',
      rpe: 8,
      painLevel: 3,
      painBodyPart: 'left knee',
      targetAdjustment: 'Increase target by 10 W next interval',
      note: 'Feels controlled but hard.',
    })

    expect(parsed.success).toBe(true)
    if (!parsed.success) return

    const preview = buildUpdateLiveWorkoutFeedbackPreview(parsed.data, 'en')
    const details = preview.details.join(' | ')
    expect(details).toContain('2026-06-24')
    expect(details).toContain('RPE: 8/10')
    expect(details).toContain('left knee 3/10')
    expect(details).toContain('Increase target by 10 W')
    expect(preview.confirmLabel).toBe('Save feedback')
  })
})
