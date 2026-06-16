import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockPrisma = vi.hoisted(() => ({
  client: {
    findMany: vi.fn(),
  },
}))

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

import {
  buildHockeyAerobicFieldsFromLabTest,
  getLinkedHockeyAerobicProfiles,
  hasHockeyAerobicData,
} from './aerobic-profile-link'

beforeEach(() => {
  vi.clearAllMocks()
  mockPrisma.client.findMany.mockResolvedValue([])
})

describe('buildHockeyAerobicFieldsFromLabTest', () => {
  it('maps saved lab VO2 and lactate test data to hockey aerobic metrics', () => {
    const fields = buildHockeyAerobicFieldsFromLabTest({
      vo2max: 60.5,
      maxHR: 185,
      maxLactate: null,
      postTestMeasurements: [{ timeMin: 3, lactate: 14.7 }],
      aerobicThreshold: {
        unit: 'km/h',
        value: 8.5,
        lactate: 4.2,
        heartRate: 143,
      },
      anaerobicThreshold: {
        unit: 'km/h',
        value: 12.1,
        lactate: 6.43,
        heartRate: 171,
      },
    })

    expect(fields).toMatchObject({
      vo2Max: 60.5,
      lt1SpeedKmh: 8.5,
      lt1HeartRate: 143,
      lt1Lactate: 4.2,
      lt2SpeedKmh: 12.1,
      lt2HeartRate: 171,
      lt2Lactate: 6.43,
      maxLactate: 14.7,
      maxHeartRate: 185,
    })
    expect(hasHockeyAerobicData(fields)).toBe(true)
  })

  it('falls back to stage maxima when summary fields are missing', () => {
    const fields = buildHockeyAerobicFieldsFromLabTest({
      testStages: [
        { vo2: 45.2, lactate: 5.8, heartRate: 161 },
        { vo2: 57.9, lactate: 12.4, heartRate: 188 },
      ],
    })

    expect(fields.vo2Max).toBe(57.9)
    expect(fields.maxLactate).toBe(12.4)
    expect(fields.maxHeartRate).toBe(188)
  })

  it('ignores lab tests still waiting for quality review when linking profiles', async () => {
    await getLinkedHockeyAerobicProfiles(['client-1'])

    expect(mockPrisma.client.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          tests: expect.objectContaining({
            where: {
              qualityReviewStatus: { not: 'REVIEW_REQUIRED' },
            },
          }),
        }),
      })
    )
  })
})
