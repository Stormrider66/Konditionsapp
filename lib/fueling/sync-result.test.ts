import { describe, expect, it } from 'vitest'
import { buildFuelingSyncResultCopy } from './sync-result'

describe('buildFuelingSyncResultCopy', () => {
  it('describes successful workout updates', () => {
    expect(buildFuelingSyncResultCopy(4)).toEqual({
      tone: 'success',
      titleEn: '4 upcoming sessions updated.',
      titleSv: '4 kommande pass uppdaterade.',
      bodyEn: 'The athlete now sees carb targets on sessions that match the plan.',
      bodySv: 'Atleten ser nu carb-mål på de pass som matchar planen.',
      buttonLabelEn: '4 sessions',
      buttonLabelSv: '4 pass',
    })
  })

  it('explains when no upcoming workouts matched', () => {
    expect(buildFuelingSyncResultCopy(0)).toEqual({
      tone: 'empty',
      titleEn: 'No upcoming sessions were updated.',
      titleSv: 'Inga kommande pass uppdaterades.',
      bodyEn: 'There are no active upcoming sessions that match length, sport, and intensity yet.',
      bodySv: 'Det finns inga aktiva kommande pass som matchar längd, sport och intensitet ännu.',
      buttonLabelEn: 'No sessions',
      buttonLabelSv: 'Inga pass',
    })
  })
})
