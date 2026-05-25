import { describe, expect, it } from 'vitest'

import {
  generateCardioSessionPDF,
  getCardioExportTotals,
  normalizeCardioExportSegments,
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

  it('normalizes saved seconds and meters before totaling', () => {
    const savedSegments: CardioSegment[] = [
      { type: 'WARMUP', duration: 600, zone: 2 },
      { type: 'INTERVAL', distance: 1000, zone: 4 },
      { type: 'RECOVERY', duration: 120, zone: 1 },
      { type: 'INTERVAL', distance: 300, zone: 5 },
      { type: 'RECOVERY', duration: 120, zone: 1 },
      { type: 'INTERVAL', distance: 1000, zone: 4 },
      { type: 'RECOVERY', duration: 120, zone: 1 },
      { type: 'INTERVAL', distance: 300, zone: 4 },
      { type: 'COOLDOWN', duration: 600, distance: 1429, zone: 1 },
    ]

    const normalized = normalizeCardioExportSegments(savedSegments)
    expect(normalized[0].duration).toBe(10)
    expect(normalized[1].distance).toBe(1)
    expect(normalized[3].distance).toBe(0.3)
    expect(normalized[8].distance).toBe(1.429)

    const totals = getCardioExportTotals(savedSegments)
    expect(totals.totalDuration).toBe(26)
    expect(totals.totalDistance).toBeCloseTo(4.029, 3)
    expect(totals.avgZone).toBe(3)
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
