import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  prisma: {
    integrationToken: {
      findFirst: vi.fn(),
    },
    client: {
      findUnique: vi.fn(),
    },
    garminActivity: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    cardioSessionAssignment: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    bodyComposition: {
      upsert: vi.fn(),
    },
    dailyMetrics: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  },
  processGarminActivityZonesForClient: vi.fn(),
  refreshWorkoutEvaluationsAround: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: mocks.prisma,
}))

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

vi.mock('@/lib/integrations/zone-distribution-service', () => ({
  processGarminActivityZonesForClient: mocks.processGarminActivityZonesForClient,
}))

vi.mock('@/lib/workout-evaluation', () => ({
  refreshWorkoutEvaluationsAround: mocks.refreshWorkoutEvaluationsAround,
}))

vi.mock('@/lib/training/adhoc-garmin-matcher', () => ({
  findMatchingAdHocWorkout: vi.fn().mockResolvedValue(null),
  linkAdHocToGarmin: vi.fn(),
}))

vi.mock('@/lib/hybrid/garmin-hybrid-link', () => ({
  linkGarminToHybridLogByActivity: vi.fn().mockResolvedValue(false),
}))

vi.mock('@/lib/managed-agents', () => ({
  isAgentProcessingEnabled: vi.fn(() => false),
  dispatchEvent: vi.fn(),
}))

import { processGarminWebhookPayload } from '@/lib/integrations/garmin/webhook-service'

describe('Garmin webhook zone processing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.prisma.integrationToken.findFirst.mockResolvedValue({ clientId: 'client-1' } as never)
    mocks.prisma.client.findUnique.mockResolvedValue({ manualMaxHR: 190, tests: [] } as never)
    mocks.prisma.cardioSessionAssignment.findMany.mockResolvedValue([] as never)
    mocks.prisma.dailyMetrics.findUnique.mockResolvedValue(null as never)
    mocks.prisma.bodyComposition.upsert.mockResolvedValue({} as never)
    mocks.prisma.dailyMetrics.upsert.mockResolvedValue({} as never)
    mocks.processGarminActivityZonesForClient.mockResolvedValue(null as never)
    mocks.refreshWorkoutEvaluationsAround.mockResolvedValue(undefined as never)
  })

  it('processes zone distribution after saving a Garmin activity summary with heart rate', async () => {
    const startDate = new Date('2026-05-20T09:39:13.000Z')
    mocks.prisma.garminActivity.upsert.mockResolvedValue({
      id: 'garmin-row-1',
      clientId: 'client-1',
      startDate,
      duration: 1800,
      type: 'RUNNING',
      mappedType: 'RUNNING',
    } as never)

    const result = await processGarminWebhookPayload({
      activities: [
        {
          userId: 'garmin-user-1',
          activityId: 22945900587,
          activityType: 'RUNNING',
          startTimeInSeconds: Math.floor(startDate.getTime() / 1000),
          startTimeOffsetInSeconds: 0,
          activityDurationInSeconds: 1800,
          distanceInMeters: 5000,
          averageHeartRateInBeatsPerMinute: 141,
          maxHeartRateInBeatsPerMinute: 170,
        },
      ],
    })

    expect(result.activities).toBe(1)
    expect(mocks.processGarminActivityZonesForClient).toHaveBeenCalledWith('client-1', 'garmin-row-1')
  })

  it('reprocesses zone distribution when Garmin activity details add HR stream data', async () => {
    const startDate = new Date('2026-05-20T09:39:13.000Z')
    mocks.prisma.garminActivity.findUnique.mockResolvedValue({ id: 'garmin-row-1', startDate } as never)
    mocks.prisma.garminActivity.update.mockResolvedValue({} as never)

    const result = await processGarminWebhookPayload({
      activityDetails: [
        {
          userId: 'garmin-user-1',
          activityId: 22945900587,
          heartRateZones: {
            zone1TimeInSeconds: 60,
            zone2TimeInSeconds: 120,
            zone3TimeInSeconds: 30,
          },
          samples: [
            { recordingTime: 1, heartRate: 120 },
            { recordingTime: 2, heartRate: 142 },
          ],
        },
      ],
    })

    expect(result.activityDetails).toBe(1)
    expect(mocks.processGarminActivityZonesForClient).toHaveBeenCalledWith('client-1', 'garmin-row-1')
    expect(mocks.refreshWorkoutEvaluationsAround).toHaveBeenCalledWith('client-1', startDate)
  })

  it('saves plausible Garmin body composition data', async () => {
    mocks.prisma.client.findUnique.mockResolvedValue({ height: 172 } as never)

    const result = await processGarminWebhookPayload({
      bodyComps: [
        {
          userId: 'garmin-user-1',
          summaryId: 'body-comp-1',
          calendarDate: '2026-06-02',
          weightInGrams: 77000,
          bodyFatInPercent: 18.2,
          skeletalMuscleMassInGrams: 35500,
          boneMassInGrams: 3200,
          bodyWaterInPercent: 55.4,
        },
      ],
    })

    expect(result.bodyComps).toBe(1)
    expect(mocks.prisma.bodyComposition.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          weightKg: 77,
          bodyFatPercent: 18.2,
          muscleMassKg: 35.5,
          boneMassKg: 3.2,
          waterPercent: 55.4,
          deviceBrand: 'Garmin',
        }),
      })
    )
    expect(mocks.prisma.dailyMetrics.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          factorScores: expect.objectContaining({
            garminBodyComposition: expect.objectContaining({
              weightKg: 77,
              source: 'webhook',
            }),
          }),
        }),
      })
    )
  })

  it('skips implausible Garmin body composition data', async () => {
    mocks.prisma.client.findUnique.mockResolvedValue({ height: 172 } as never)

    const result = await processGarminWebhookPayload({
      bodyComps: [
        {
          userId: 'garmin-user-1',
          summaryId: 'generated-body-comp',
          calendarDate: '2026-06-02',
          weightInGrams: 64930,
          bodyFatInPercent: 43.110924,
          skeletalMuscleMassInGrams: 21730,
          boneMassInGrams: 34220,
          bodyWaterInPercent: 88.00809,
        },
      ],
    })

    expect(result.bodyComps).toBe(0)
    expect(mocks.prisma.bodyComposition.upsert).not.toHaveBeenCalled()
    expect(mocks.prisma.dailyMetrics.upsert).not.toHaveBeenCalled()
  })
})
