import { describe, expect, it } from 'vitest'
import type { AthleteData, TestData } from './types'
import { buildBasicProfileContext, buildTestContext } from './basic'

const athlete = {
  id: 'client-1',
  name: 'Hidden',
  gender: 'FEMALE',
  birthDate: new Date('1996-01-01'),
  height: 172,
  weight: 64,
  sportProfile: {
    primarySport: 'TEAM_ICE_HOCKEY',
  },
  tests: [],
  raceResults: [],
  trainingPrograms: [],
  injuryAssessments: [],
} as unknown as AthleteData

const test = {
  testDate: new Date('2026-01-15'),
  testType: 'RUNNING',
  maxHR: 190,
  vo2max: 55,
  aerobicThreshold: { heartRate: 150 },
  anaerobicThreshold: { heartRate: 170 },
} as unknown as TestData

describe('sport context basic localization', () => {
  it('builds English basic profile context by default', () => {
    const context = buildBasicProfileContext(athlete)

    expect(context).toContain('## Athlete profile')
    expect(context).toContain('**Name**: The athlete')
    expect(context).toContain('**Gender**: Female')
    expect(context).toContain('**Primary sport**: Ice hockey')
    expect(context).not.toContain('Atletprofil')
    expect(context).not.toContain('Kön')
  })

  it('preserves Swedish basic profile context for Swedish locale', () => {
    const context = buildBasicProfileContext(athlete, 'sv')

    expect(context).toContain('## Atletprofil')
    expect(context).toContain('**Namn**: Atleten')
    expect(context).toContain('**Kön**: Kvinna')
    expect(context).toContain('**Primär sport**: Ishockey')
  })

  it('localizes test context headings and labels', () => {
    const english = buildTestContext([test], 'en')
    const swedish = buildTestContext([test], 'sv')

    expect(english).toContain('## Latest test result')
    expect(english).toContain('**Max heart rate**')
    expect(english).toContain('**Aerobic threshold**')
    expect(swedish).toContain('## Senaste testresultat')
    expect(swedish).toContain('**Max puls**')
    expect(swedish).toContain('**Aerob tröskel**')
  })
})
