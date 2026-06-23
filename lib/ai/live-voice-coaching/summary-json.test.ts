import { describe, expect, it } from 'vitest'
import { parseLiveVoiceSummaryJson } from './summary-json'

describe('parseLiveVoiceSummaryJson', () => {
  it('parses plain JSON', () => {
    expect(parseLiveVoiceSummaryJson('{"summary":"Good session"}')).toEqual({
      summary: 'Good session',
    })
  })

  it('parses fenced JSON', () => {
    expect(parseLiveVoiceSummaryJson('```json\n{"summary":"Solid work"}\n```')).toEqual({
      summary: 'Solid work',
    })
  })

  it('extracts a JSON object from surrounding text', () => {
    expect(parseLiveVoiceSummaryJson('Here is the summary:\n{"painOrInjuryMentioned":false}')).toEqual({
      painOrInjuryMentioned: false,
    })
  })
})
