import { describe, expect, it } from 'vitest'

import {
  generateCardioSessionPDF,
  getCardioExportTotals,
  type CardioSegment,
} from './cardio-session-export'

describe('getCardioExportTotals', () => {
  it('converts repeated interval rows into full session totals', () => {
    const segments: CardioSegment[] = [
      { type: 'WARMUP', duration: 10, distance: 1, zone: 2 },
      { type: 'INTERVAL', duration: 6, distance: 0.3, zone: 4, repeats: 5, restDuration: 2 },
      { type: 'COOLDOWN', duration: 10, distance: 1, zone: 2 },
    ]

    expect(getCardioExportTotals(segments)).toEqual({
      totalDuration: 58,
      totalDistance: 3.5,
      avgZone: 3,
    })
  })

  it('reads zones whether they are stored as numbers or labels', () => {
    const segments: CardioSegment[] = [
      { type: 'STEADY', duration: 20, zone: 'Z2' },
      { type: 'INTERVAL', duration: 5, zone: '4' },
    ]

    expect(getCardioExportTotals(segments).avgZone).toBe(3)
  })

  it('generates a PDF when intensity is missing', () => {
    const blob = generateCardioSessionPDF({
      sessionName: 'Threshold intervals',
      locale: 'sv',
      segments: [
        { type: 'WARMUP', duration: 10, distance: 1, zone: 2 },
        { type: 'INTERVAL', duration: 6, distance: 0.3, zone: 4, repeats: 5, restDuration: 2 },
      ],
    })

    expect(blob.size).toBeGreaterThan(0)
  })
})
