import { describe, expect, it } from 'vitest'
import { buildFuelingSyncResultCopy } from './sync-result'

describe('buildFuelingSyncResultCopy', () => {
  it('describes successful workout updates', () => {
    expect(buildFuelingSyncResultCopy(4)).toEqual({
      tone: 'success',
      titleSv: '4 kommande pass uppdaterade.',
      bodySv: 'Atleten ser nu carb-mål på de pass som matchar planen.',
      buttonLabelSv: '4 pass',
    })
  })

  it('explains when no upcoming workouts matched', () => {
    expect(buildFuelingSyncResultCopy(0)).toEqual({
      tone: 'empty',
      titleSv: 'Inga kommande pass uppdaterades.',
      bodySv: 'Det finns inga aktiva kommande pass som matchar längd, sport och intensitet ännu.',
      buttonLabelSv: 'Inga pass',
    })
  })
})
