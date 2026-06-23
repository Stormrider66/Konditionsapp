import { describe, expect, it } from 'vitest'
import {
  getAiCapabilityActionResultLink,
  resolveAppHref,
} from './action-result-links'

describe('AI action result links', () => {
  it('prefixes athlete and coach app paths with the business base path', () => {
    expect(resolveAppHref('/athlete/cardio?start=assignment-1', '/skelleftea')).toBe('/skelleftea/athlete/cardio?start=assignment-1')
    expect(resolveAppHref('/coach/messages', '/skelleftea')).toBe('/skelleftea/coach/messages')
  })

  it('does not double-prefix already scoped paths', () => {
    expect(resolveAppHref('/skelleftea/athlete/cardio?start=assignment-1', '/skelleftea')).toBe('/skelleftea/athlete/cardio?start=assignment-1')
  })

  it('links confirmed cardio workout actions to the returned start path', () => {
    const link = getAiCapabilityActionResultLink(
      { capabilityId: 'createCardioWorkout' },
      { success: true, result: { startPath: '/athlete/cardio?start=assignment-1' } },
      '/skelleftea'
    )

    expect(link).toEqual({
      href: '/skelleftea/athlete/cardio?start=assignment-1',
      label: 'openWorkout',
    })
  })

  it('falls back to assignment id for cardio workout actions', () => {
    const link = getAiCapabilityActionResultLink(
      { capabilityId: 'createCardioWorkout' },
      { success: true, result: { assignmentId: 'assignment 1' } },
      '/skelleftea'
    )

    expect(link).toEqual({
      href: '/skelleftea/athlete/cardio?start=assignment%201',
      label: 'openWorkout',
    })
  })
})
