import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  prisma: {
    garminActivity: {
      findUnique: vi.fn(),
    },
    activityHRZoneDistribution: {
      upsert: vi.fn(),
    },
  },
}))

vi.mock('@/lib/prisma', () => ({
  prisma: mocks.prisma,
}))

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

import { processGarminActivityZones } from '@/lib/integrations/zone-distribution-service'
import type { TrainingZone } from '@/types'

const zones: TrainingZone[] = [
  { zone: 1, name: 'Z1', intensity: 'easy', hrMin: 90, hrMax: 119, percentMin: 0, percentMax: 0, effect: 'recovery' },
  { zone: 2, name: 'Z2', intensity: 'aerobic', hrMin: 120, hrMax: 149, percentMin: 0, percentMax: 0, effect: 'base' },
  { zone: 3, name: 'Z3', intensity: 'tempo', hrMin: 150, hrMax: 169, percentMin: 0, percentMax: 0, effect: 'tempo' },
  { zone: 4, name: 'Z4', intensity: 'threshold', hrMin: 170, hrMax: 184, percentMin: 0, percentMax: 0, effect: 'threshold' },
  { zone: 5, name: 'Z5', intensity: 'max', hrMin: 185, hrMax: 205, percentMin: 0, percentMax: 0, effect: 'vo2' },
]

describe('processGarminActivityZones', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.prisma.activityHRZoneDistribution.upsert.mockResolvedValue({} as never)
  })

  it('stores Garmin stream zones scaled to the recorded activity duration', async () => {
    mocks.prisma.garminActivity.findUnique.mockResolvedValue({
      id: 'garmin-activity-1',
      hrStream: [100, 130, 155],
      hrStreamFetched: true,
      hrZoneSeconds: null,
      maxHeartrate: 170,
      averageHeartrate: 128,
      duration: 300,
    } as never)

    const distribution = await processGarminActivityZones('garmin-activity-1', zones, 200)

    expect(distribution).toMatchObject({
      zone1Seconds: 100,
      zone2Seconds: 100,
      zone3Seconds: 100,
      totalTrackedSeconds: 300,
    })
    expect(mocks.prisma.activityHRZoneDistribution.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { garminActivityId: 'garmin-activity-1' },
        update: expect.objectContaining({
          zone1Seconds: 100,
          zone2Seconds: 100,
          zone3Seconds: 100,
          totalTrackedSeconds: 300,
        }),
      })
    )
  })
})
