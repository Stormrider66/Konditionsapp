import { describe, expect, it } from 'vitest'

import {
  buildQuickErgPersonalBests,
  extractQuickErgRecordsFromSession,
  findQuickErgSessionPrBadges,
  type QuickErgProgressSession,
} from './progress'

function session(overrides: Partial<QuickErgProgressSession>): QuickErgProgressSession {
  return {
    id: 'session-1',
    machineType: 'CONCEPT2_BIKEERG',
    startedAt: '2026-06-15T10:00:00.000Z',
    durationSec: 600,
    distanceMeters: 3000,
    avgPower: 180,
    maxPower: 500,
    normalizedPower: 190,
    bestEfforts: [
      {
        type: 'power',
        label: '30s',
        value: 260,
        unit: 'W',
        startSec: 10,
        endSec: 39,
        durationSec: 30,
      },
      {
        type: 'power',
        label: '300s',
        value: 205,
        unit: 'W',
        startSec: 60,
        endSec: 359,
        durationSec: 300,
      },
      {
        type: 'pace',
        label: '1000m',
        value: 170,
        unit: 'sec',
        startSec: 0,
        endSec: 170,
        distanceMeters: 1000,
      },
    ],
    ...overrides,
  }
}

describe('quick erg progress records', () => {
  it('extracts machine-specific power, pace, and session records', () => {
    const records = extractQuickErgRecordsFromSession(session({ id: 'bike-1' }))

    expect(records).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'power_30s', value: 260, unit: 'W' }),
      expect.objectContaining({ key: 'power_300s', value: 205, unit: 'W' }),
      expect.objectContaining({ key: 'pace_1000m', value: 170, unit: 'sec' }),
      expect.objectContaining({ key: 'longest_distance', value: 3000, unit: 'm' }),
    ]))
  })

  it('builds personal bests without mixing machine types', () => {
    const bests = buildQuickErgPersonalBests([
      session({ id: 'bike-1', machineType: 'CONCEPT2_BIKEERG', avgPower: 180 }),
      session({ id: 'bike-2', machineType: 'CONCEPT2_BIKEERG', avgPower: 210 }),
      session({ id: 'row-1', machineType: 'CONCEPT2_ROW', avgPower: 240 }),
    ])

    expect(bests).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'avg_power', machineType: 'CONCEPT2_BIKEERG', value: 210 }),
      expect.objectContaining({ key: 'avg_power', machineType: 'CONCEPT2_ROW', value: 240 }),
    ]))
  })

  it('detects new records against earlier sessions on the same machine', () => {
    const previous = session({
      id: 'bike-old',
      startedAt: '2026-06-14T10:00:00.000Z',
      avgPower: 180,
      bestEfforts: [
        {
          type: 'power',
          label: '30s',
          value: 250,
          unit: 'W',
          startSec: 0,
          endSec: 29,
          durationSec: 30,
        },
        {
          type: 'pace',
          label: '1000m',
          value: 175,
          unit: 'sec',
          startSec: 0,
          endSec: 175,
          distanceMeters: 1000,
        },
      ],
    })
    const current = session({
      id: 'bike-new',
      startedAt: '2026-06-15T10:00:00.000Z',
      avgPower: 190,
      bestEfforts: [
        {
          type: 'power',
          label: '30s',
          value: 275,
          unit: 'W',
          startSec: 0,
          endSec: 29,
          durationSec: 30,
        },
        {
          type: 'pace',
          label: '1000m',
          value: 168,
          unit: 'sec',
          startSec: 0,
          endSec: 168,
          distanceMeters: 1000,
        },
      ],
    })

    const badges = findQuickErgSessionPrBadges(current, [previous])

    expect(badges).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'power_30s', value: 275, previousValue: 250 }),
      expect.objectContaining({ key: 'pace_1000m', value: 168, previousValue: 175 }),
      expect.objectContaining({ key: 'avg_power', value: 190, previousValue: 180 }),
    ]))
  })

  it('returns a first-session badge when there is no earlier session for the machine', () => {
    const badges = findQuickErgSessionPrBadges(
      session({ id: 'first-bike' }),
      [session({ id: 'row-old', machineType: 'CONCEPT2_ROW', startedAt: '2026-06-14T10:00:00.000Z' })]
    )

    expect(badges).toEqual([
      expect.objectContaining({
        key: 'first_session',
        label: 'First BikeErg session',
        machineType: 'CONCEPT2_BIKEERG',
      }),
    ])
  })
})
