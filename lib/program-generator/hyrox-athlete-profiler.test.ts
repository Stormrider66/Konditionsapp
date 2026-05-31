import { describe, expect, it } from 'vitest'
import { analyzeAthleteProfile } from './hyrox-athlete-profiler'

describe('HYROX athlete profiler localization wording', () => {
  it('uses English target-time wording by default when no station data is available', () => {
    const profile = analyzeAthleteProfile({
      gender: 'male',
      goalTime: '1:20:00',
    })

    expect(profile.goalAssessment).toContain('Target time')
    expect(profile.goalAssessment).not.toContain('Måltid')
    expect(profile.goalAssessment).not.toContain('måltid')
  })

  it('uses English missing-target wording by default', () => {
    const profile = analyzeAthleteProfile({
      gender: 'female',
    })

    expect(profile.goalAssessment).toContain('target time')
    expect(profile.goalAssessment).not.toContain('måltid')
  })

  it('preserves Swedish target-time wording for Swedish locale', () => {
    const profile = analyzeAthleteProfile({
      gender: 'male',
      goalTime: '1:20:00',
      locale: 'sv',
    })

    expect(profile.goalAssessment).toContain('Mål-tid')
    expect(profile.goalAssessment).not.toContain('Måltid')
  })
})
