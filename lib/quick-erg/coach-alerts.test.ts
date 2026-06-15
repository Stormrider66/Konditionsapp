import { describe, expect, it } from 'vitest'

import {
  isQuickErgCoachAlertType,
  quickErgCoachAlertPayload,
  quickErgCoachAlertSessionHref,
  quickErgCoachAlertSourceId,
  quickErgCoachAlertTypeFromSignal,
} from './coach-alerts'

const baseSignal = {
  id: 'session-1:load',
  type: 'HIGH_LOAD' as const,
  tone: 'warning' as const,
  sessionId: 'session-1',
  machineName: 'BikeErg',
  startedAt: '2026-06-15T10:00:00.000Z',
  metric: 'RPE 9/10',
}

describe('quick erg coach alerts', () => {
  it('maps coach signal types to persistent alert types and source ids', () => {
    expect(quickErgCoachAlertTypeFromSignal('NEW_SESSION')).toBe('QUICK_ERG_NEW_SESSION')
    expect(quickErgCoachAlertTypeFromSignal('PERSONAL_BEST')).toBe('QUICK_ERG_PERSONAL_BEST')
    expect(quickErgCoachAlertTypeFromSignal('HIGH_LOAD')).toBe('QUICK_ERG_HIGH_LOAD')
    expect(quickErgCoachAlertTypeFromSignal('UNMATCHED_PLAN')).toBe('QUICK_ERG_UNMATCHED_PLAN')
    expect(quickErgCoachAlertSourceId('session-1', 'HIGH_LOAD')).toBe('quick_erg:session-1:high_load')
  })

  it('guards quick erg alert types', () => {
    expect(isQuickErgCoachAlertType('QUICK_ERG_HIGH_LOAD')).toBe(true)
    expect(isQuickErgCoachAlertType('HIGH_ACWR')).toBe(false)
  })

  it('builds high-load alert payloads with severity and context', () => {
    const payload = quickErgCoachAlertPayload({
      coachId: 'coach-1',
      clientId: 'client-1',
      clientName: 'Henrik',
      signal: baseSignal,
      durationSec: 227,
      distanceMeters: 1020,
      rpe: 9,
      trainingLoad: 65,
      now: new Date('2026-06-15T12:00:00.000Z'),
      locale: 'en',
    })

    expect(payload.alertType).toBe('QUICK_ERG_HIGH_LOAD')
    expect(payload.severity).toBe('HIGH')
    expect(payload.sourceId).toBe('quick_erg:session-1:high_load')
    expect(payload.contextData).toMatchObject({
      kind: 'quick_erg',
      signalType: 'HIGH_LOAD',
      sessionId: 'session-1',
      machineName: 'BikeErg',
      rpe: 9,
      trainingLoad: 65,
    })
    expect(payload.message).toContain('Review recovery')
  })

  it('builds deterministic coach session hrefs', () => {
    expect(quickErgCoachAlertSessionHref('/star-by-thomson', 'client-1', 'session-1'))
      .toBe('/star-by-thomson/coach/clients/client-1/quick-erg/session-1')
  })
})
