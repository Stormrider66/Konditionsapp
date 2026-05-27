import { describe, expect, it } from 'vitest'
import { analyzeAthleteProfile } from './hyrox-athlete-profiler'

describe('HYROX athlete profiler localization wording', () => {
  it('does not label target time as a meal when no station data is available', () => {
    const profile = analyzeAthleteProfile({
      gender: 'male',
      goalTime: '1:20:00',
    })

    expect(profile.goalAssessment).toContain('Mål-tid')
    expect(profile.goalAssessment).not.toContain('Måltid')
    expect(profile.goalAssessment).not.toContain('måltid')
  })

  it('does not label missing target time as a meal', () => {
    const profile = analyzeAthleteProfile({
      gender: 'female',
    })

    expect(profile.goalAssessment).toContain('mål-tid')
    expect(profile.goalAssessment).not.toContain('måltid')
  })
})
