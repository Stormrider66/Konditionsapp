import { describe, expect, it } from 'vitest'
import { extractJsonFromAiResponse } from './response-parser'

describe('extractJsonFromAiResponse', () => {
  it('extracts JSON from a closed markdown fence', () => {
    expect(extractJsonFromAiResponse('```json\n{"type":"STRENGTH"}\n```')).toBe(
      '{"type":"STRENGTH"}'
    )
  })

  it('extracts a complete JSON object from an unclosed markdown fence', () => {
    expect(extractJsonFromAiResponse('```json\n{"type":"STRENGTH"}')).toBe(
      '{"type":"STRENGTH"}'
    )
  })

  it('keeps braces inside strings while trimming trailing text', () => {
    const response = 'Sure:\n{"notes":"Superset {A}", "warnings":["ok"]}\nextra'

    expect(extractJsonFromAiResponse(response)).toBe(
      '{"notes":"Superset {A}", "warnings":["ok"]}'
    )
  })

  it('ignores stray closing tokens after the first complete JSON object', () => {
    const response = '{"type":"STRENGTH","warnings":["ok"]}\n  ]\n}'

    expect(extractJsonFromAiResponse(response)).toBe(
      '{"type":"STRENGTH","warnings":["ok"]}'
    )
  })

  it('returns the best candidate when JSON is incomplete', () => {
    expect(extractJsonFromAiResponse('```json\n{"type":"STRENGTH"')).toBe(
      '{"type":"STRENGTH"'
    )
  })
})
