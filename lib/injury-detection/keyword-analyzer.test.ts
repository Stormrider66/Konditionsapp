import { describe, expect, it } from 'vitest'
import { analyzeNotesForInjury } from './keyword-analyzer'

describe('keyword analyzer locale copy', () => {
  it('defaults the coach summary to English', () => {
    const result = analyzeNotesForInjury('Left knee pain after intervals')

    expect(result.summary).toContain('Mentions knee (left)')
    expect(result.summary).toContain('Indicates moderate severity')
    expect(result.summary).toContain('Keywords:')
    expect(result.summary).not.toContain('Nämner')
  })

  it('keeps the coach summary in Swedish when requested', () => {
    const result = analyzeNotesForInjury('Vänster knä smärta efter intervaller', 'sv')

    expect(result.summary).toContain('Nämner knä (vänster)')
    expect(result.summary).toContain('Indikerar måttlig allvarlighetsgrad')
    expect(result.summary).toContain('Nyckelord:')
  })
})
