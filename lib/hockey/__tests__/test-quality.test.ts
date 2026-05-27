import { describe, expect, it } from 'vitest'
import { buildHockeyQualityFlags } from '../test-quality'

describe('buildHockeyQualityFlags', () => {
  it('returns English quality copy by default', () => {
    const flags = buildHockeyQualityFlags({
      metrics: {
        sprint5m: 1.2,
        sprint10m: 1.1,
      },
    })

    expect(flags[0]).toMatchObject({
      key: 'sprint10m',
      label: 'Check 5-10 m sprint',
      detail: '10 m total time cannot be faster than or equal to 5 m total time.',
    })
  })

  it('keeps Swedish quality copy for Swedish users', () => {
    const flags = buildHockeyQualityFlags({
      metrics: {
        sprint5m: 1.2,
        sprint10m: 1.1,
      },
    }, 'sv')

    expect(flags[0]).toMatchObject({
      key: 'sprint10m',
      label: 'Kontrollera 5-10m sprint',
      detail: '10m total tid kan inte vara snabbare än eller lika med 5m total tid.',
    })
  })
})
