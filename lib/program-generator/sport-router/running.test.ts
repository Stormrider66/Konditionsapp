import { describe, expect, it } from 'vitest'
import { SportType } from '@prisma/client'
import type { Client } from '@/types'
import { applyCalendarConstraints, formatLocalDate } from './calendar-constraints'
import { createCustomRunningProgram } from './running'
import type { SportProgramParams } from './types'

const SWEDISH_USER_VISIBLE = /[åäöÅÄÖ]|\b(Långpass|Lugn löpning|Vilodag|Löpprogram|Uppvärmning|Nedvarvning|Tävlings|Underhåll|tröskel|Tröskel)\b/

const client: Client = {
  id: 'client-1',
  userId: 'user-1',
  name: 'Test Athlete',
  gender: 'MALE',
  birthDate: new Date('1990-01-01'),
  height: 180,
  weight: 75,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
}

function baseParams(locale?: 'en' | 'sv'): SportProgramParams {
  return {
    clientId: 'client-1',
    coachId: 'coach-1',
    sport: SportType.RUNNING,
    goal: 'half-marathon',
    dataSource: 'MANUAL',
    durationWeeks: 6,
    sessionsPerWeek: 4,
    methodology: 'POLARIZED',
    experienceLevel: 'intermediate',
    includeStrength: true,
    strengthSessionsPerWeek: 1,
    coreSessionsPerWeek: 1,
    locale,
  }
}

describe('custom running program localization', () => {
  it.each(['POLARIZED', 'NORWEGIAN_SINGLE', 'NORWEGIAN_DOUBLES', 'CANOVA', 'PYRAMIDAL'])(
    'generates English user-facing copy by default for %s',
    (methodology) => {
      const program = createCustomRunningProgram({ ...baseParams(), methodology }, client)
      const serialized = JSON.stringify(program)
      const serializedLower = serialized.toLowerCase()

      expect(program.notes).toContain('Running program for half marathon')
      expect(serializedLower).toContain('long run')
      expect(serialized).toContain('Rest day')
      expect(serialized).toContain('Strength session')
      expect(serialized).not.toMatch(SWEDISH_USER_VISIBLE)
    }
  )

  it('preserves Swedish copy when the Swedish locale is requested', () => {
    const program = createCustomRunningProgram(baseParams('sv'), client)
    const serialized = JSON.stringify(program)

    expect(program.notes).toContain('Löpprogram för halvmaraton')
    expect(serialized).toContain('Långpass')
    expect(serialized).toContain('Vilodag')
  })

  it('localizes calendar constraint notes in generated programs', () => {
    const program = createCustomRunningProgram(baseParams(), client)
    const blockedDate = formatLocalDate(program.startDate)
    const constrained = applyCalendarConstraints(program, {
      blockedDates: [blockedDate],
      reducedDates: [],
      altitudePeriods: [],
    })
    const serialized = JSON.stringify(constrained.weeks?.[0]?.days?.[0])

    expect(serialized).toContain('Rest day (calendar block)')
    expect(serialized).not.toMatch(SWEDISH_USER_VISIBLE)
  })
})
