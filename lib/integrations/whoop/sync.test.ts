import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  prisma: {
    dailyMetrics: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    whoopActivity: {
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

vi.mock('@/lib/integrations/recovery-source', () => ({
  resolveRecoverySource: vi.fn(),
}))

import { syncWhoopRecovery, syncWhoopSleep, syncWhoopWorkout } from '@/lib/integrations/whoop/sync'

describe('WHOOP sync mapping', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.prisma.dailyMetrics.findUnique.mockResolvedValue(null as never)
    mocks.prisma.dailyMetrics.upsert.mockResolvedValue({} as never)
    mocks.prisma.whoopActivity.upsert.mockResolvedValue({} as never)
  })

  it('writes canonical sleep fields only when WHOOP is the selected recovery source', async () => {
    await syncWhoopSleep(
      'client-1',
      {
        id: 'sleep-1',
        user_id: 123,
        start: '2026-06-16T22:00:00.000Z',
        end: '2026-06-17T06:00:00.000Z',
        score_state: 'SCORED',
        score: {
          sleep_performance_percentage: 86,
          stage_summary: {
            total_light_sleep_time_milli: 12_600_000,
            total_slow_wave_sleep_time_milli: 5_400_000,
            total_rem_sleep_time_milli: 7_200_000,
            total_awake_time_milli: 900_000,
          },
        },
      },
      true,
    )

    expect(mocks.prisma.dailyMetrics.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          sleepHours: 7,
          sleepQuality: 9,
          factorScores: expect.objectContaining({
            whoop: expect.objectContaining({
              sleep: expect.objectContaining({
                id: 'sleep-1',
                performancePercentage: 86,
              }),
            }),
          }),
        }),
      }),
    )
  })

  it('stores recovery under factorScores when canonical writes are disabled', async () => {
    await syncWhoopRecovery(
      'client-1',
      {
        cycle_id: 456,
        sleep_id: 'sleep-1',
        score_state: 'SCORED',
        score: {
          recovery_score: 72,
          resting_heart_rate: 48,
          hrv_rmssd_milli: 91,
          spo2_percentage: 98,
        },
      },
      {
        id: 'sleep-1',
        user_id: 123,
        start: '2026-06-16T22:00:00.000Z',
        end: '2026-06-17T06:00:00.000Z',
      },
      undefined,
      false,
    )

    expect(mocks.prisma.dailyMetrics.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.not.objectContaining({
          hrvRMSSD: expect.anything(),
          restingHR: expect.anything(),
        }),
      }),
    )
    expect(mocks.prisma.dailyMetrics.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          factorScores: expect.objectContaining({
            whoop: expect.objectContaining({
              recovery: expect.objectContaining({
                recoveryScore: 72,
                restingHeartRate: 48,
                hrvRMSSD: 91,
              }),
            }),
          }),
        }),
      }),
    )
  })

  it('upserts workout summaries with WHOOP zone durations', async () => {
    await syncWhoopWorkout('client-1', {
      id: 'workout-1',
      user_id: 123,
      start: '2026-06-17T10:00:00.000Z',
      end: '2026-06-17T10:45:00.000Z',
      sport_name: 'running',
      sport_id: 1,
      score_state: 'SCORED',
      score: {
        strain: 10.2,
        average_heart_rate: 142,
        max_heart_rate: 174,
        distance_meter: 8600,
        zone_durations: {
          zone_one_milli: 300_000,
          zone_two_milli: 1_500_000,
        },
      },
    })

    expect(mocks.prisma.whoopActivity.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { whoopWorkoutId: 'workout-1' },
        create: expect.objectContaining({
          clientId: 'client-1',
          mappedType: 'RUNNING',
          mappedIntensity: 'MODERATE',
          duration: 2700,
          distance: 8600,
          averageHeartrate: 142,
          hrZoneMilli: expect.objectContaining({
            zone_one_milli: 300_000,
            zone_two_milli: 1_500_000,
          }),
        }),
      }),
    )
  })
})
