import { describe, expect, it } from 'vitest'

import { serializeQuickErg } from './serializers'

describe('serializeQuickErg', () => {
  it('maps an unmatched Quick Erg session to a completed calendar item', () => {
    const item = serializeQuickErg({
      id: 'quick-erg-1',
      machineType: 'CONCEPT2_BIKEERG',
      machineKind: 'bike',
      deviceName: 'PM5 BikeErg',
      completedAt: new Date('2026-06-15T12:03:00.000Z'),
      durationSec: 180,
      distanceMeters: 1234,
      avgHeartRate: 142,
      maxHeartRate: 156,
      avgPower: 210,
      maxPower: 360,
      calories: 48,
      rpe: 6,
      notes: 'Felt smooth.',
    }, 'full')

    expect(item.type).toBe('QUICK_ERG')
    expect(item.title).toBe('BikeErg')
    expect(item.status).toBe('COMPLETED')
    expect(item.date).toEqual(new Date('2026-06-15T12:03:00.000Z'))
    expect(item.description).toBe('Felt smooth.')
    expect(item.metadata).toMatchObject({
      source: 'quick-erg',
      isCompleted: true,
      workoutType: 'CYCLING',
      machineType: 'CONCEPT2_BIKEERG',
      duration: 3,
      durationSec: 180,
      distance: 1.23,
      distanceMeters: 1234,
      avgHR: 142,
      maxHR: 156,
      avgPower: 210,
      maxPower: 360,
      rpe: 6,
      linkHref: '/athlete/quick-erg/quick-erg-1',
    })
  })
})
