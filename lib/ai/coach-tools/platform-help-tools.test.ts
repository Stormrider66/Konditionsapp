import { describe, expect, it } from 'vitest'

import { buildTrainingCaptureGuide } from './platform-help-tools'

describe('training capture guide', () => {
  it('explains the all-source Team cardio workflow in English', () => {
    const guide = buildTrainingCaptureGuide('ALL', 'en')

    expect(guide.success).toBe(true)
    expect(guide.supportedEquipmentKeys).toEqual([
      'BIKE_ERG',
      'ROW',
      'SKI_ERG',
      'WATTBIKE',
      'ASSAULT_BIKE',
      'ECHO_BIKE',
      'AIR_BIKE',
      'RUN',
      'REST',
    ])
    expect(guide.workflow.join(' ')).toContain('master clock')
    expect(guide.dataMergeRules.join(' ')).toContain('Garmin')
    expect(guide.dataMergeRules.join(' ')).toContain('Workout Evaluation')
    expect(guide.sections.map((section) => section.title)).toContain('Concept2 PM5 role')
  })

  it('can narrow the guide to Garmin-specific guidance in Swedish', () => {
    const guide = buildTrainingCaptureGuide('GARMIN', 'sv')

    expect(guide.title).toContain('Garmin')
    expect(guide.sections).toHaveLength(1)
    expect(guide.sections[0].title).toBe('Garmins roll')
    expect(guide.sections[0].bullets.join(' ')).toContain('lap-markeringar')
  })
})
