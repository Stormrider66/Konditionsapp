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
  },
  processGarminActivityZonesForClient: vi.fn(),
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

vi.mock('@/lib/training/adhoc-garmin-matcher', () => ({
  findMatchingAdHocWorkout: vi.fn().mockResolvedValue(null),
  linkAdHocToGarmin: vi.fn(),
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
    mocks.processGarminActivityZonesForClient.mockResolvedValue(null as never)
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
    mocks.prisma.garminActivity.findUnique.mockResolvedValue({ id: 'garmin-row-1' } as never)
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
  })
})
