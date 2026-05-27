import { describe, expect, it } from 'vitest'
import { buildMentalPrepMessage, buildMentalPrepPageContext, type MentalPrepChatEvent } from './mental-prep-chat'

const event: MentalPrepChatEvent = {
  prepType: 'RACE_PLAN',
  raceName: 'Stockholm Marathon',
  raceDate: '2026-06-01',
  distance: 'MARATHON',
  targetTime: '3:30:00',
  daysUntilRace: 2,
}

describe('mental prep chat localization', () => {
  it('uses English target-time labels for English chat starts', () => {
    expect(buildMentalPrepMessage(event, 'en')).toContain('My target time is 3:30:00.')
    expect(buildMentalPrepPageContext(event, 'en')).toContain('**Target time:** 3:30:00')
  })

  it('does not label race target time as a meal in Swedish chat starts', () => {
    expect(buildMentalPrepMessage(event, 'sv')).toContain('Min mål-tid är 3:30:00.')
    expect(buildMentalPrepPageContext(event, 'sv')).toContain('**Mål-tid:** 3:30:00')
    expect(buildMentalPrepMessage(event, 'sv')).not.toContain('måltid')
    expect(buildMentalPrepPageContext(event, 'sv')).not.toContain('Måltid')
  })
})
