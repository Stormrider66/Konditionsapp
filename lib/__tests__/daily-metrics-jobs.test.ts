import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BackgroundJobStatus } from '@prisma/client'

const mockPrisma = vi.hoisted(() => ({
  dailyMetricsProcessingJob: {
    upsert: vi.fn(),
    findMany: vi.fn(),
    updateMany: vi.fn(),
    update: vi.fn(),
  },
  dailyMetrics: {
    findUnique: vi.fn(),
  },
}))

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}))

import {
  buildDailyMetricsJobKey,
  enqueueDailyMetricsPostWriteJob,
  processDailyMetricsPostWriteJobs,
} from '@/lib/daily-metrics-jobs'

describe('daily-metrics durable jobs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('builds a stable job key and upserts the durable job record', async () => {
    await enqueueDailyMetricsPostWriteJob({
      clientId: 'client-1',
      date: '2026-03-15',
      signature: 'sig-1',
      shouldRunSideEffects: true,
      sideEffectsInput: {
        clientId: 'client-1',
        date: '2026-03-15',
        injuryPain: 0,
        stress: 0,
        sleepHours: 8,
        energyLevel: 8,
        readinessScore: null,
        readinessLevel: null,
        muscleSoreness: 1,
        requestPhysioContact: false,
      },
    })

    expect(buildDailyMetricsJobKey('client-1', '2026-03-15')).toBe('client-1:2026-03-15')
    expect(mockPrisma.dailyMetricsProcessingJob.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { jobKey: 'client-1:2026-03-15' },
        update: expect.objectContaining({
          signature: 'sig-1',
          status: BackgroundJobStatus.PENDING,
        }),
        create: expect.objectContaining({
          jobKey: 'client-1:2026-03-15',
          clientId: 'client-1',
          signature: 'sig-1',
          status: BackgroundJobStatus.PENDING,
        }),
      })
    )
  })

  it('claims and completes a pending job', async () => {
    mockPrisma.dailyMetricsProcessingJob.findMany.mockResolvedValue([
      {
        id: 'job-1',
        jobKey: 'client-1:2026-03-15',
        attempts: 0,
        startedAt: null,
        payload: {
          clientId: 'client-1',
          date: '2026-03-15',
          signature: 'sig-1',
          shouldRunSideEffects: false,
          sideEffectsInput: {
            clientId: 'client-1',
            date: '2026-03-15',
            injuryPain: 0,
            stress: 0,
            sleepHours: 8,
            energyLevel: 8,
            readinessScore: null,
            readinessLevel: null,
            muscleSoreness: 1,
            requestPhysioContact: false,
          },
        },
      },
    ])
    mockPrisma.dailyMetricsProcessingJob.updateMany.mockResolvedValue({ count: 1 })
    mockPrisma.dailyMetrics.findUnique.mockResolvedValue(null)
    mockPrisma.dailyMetricsProcessingJob.update.mockResolvedValue({})

    const result = await processDailyMetricsPostWriteJobs({ limit: 10 })

    expect(result).toEqual({
      scanned: 1,
      claimed: 1,
      completed: 1,
      failed: 0,
    })
    expect(mockPrisma.dailyMetricsProcessingJob.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'job-1' }),
        data: expect.objectContaining({
          status: BackgroundJobStatus.PROCESSING,
          attempts: { increment: 1 },
        }),
      })
    )
    expect(mockPrisma.dailyMetricsProcessingJob.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'job-1' },
        data: expect.objectContaining({
          status: BackgroundJobStatus.COMPLETED,
          lockedAt: null,
        }),
      })
    )
  })

  it('marks a job as failed and schedules a retry when processing throws', async () => {
    mockPrisma.dailyMetricsProcessingJob.findMany.mockResolvedValue([
      {
        id: 'job-2',
        jobKey: 'client-2:2026-03-15',
        attempts: 1,
        startedAt: null,
        payload: {
          clientId: 'client-2',
          date: '2026-03-15',
          signature: 'sig-2',
          shouldRunSideEffects: false,
          sideEffectsInput: {
            clientId: 'client-2',
            date: '2026-03-15',
            injuryPain: 0,
            stress: 0,
            sleepHours: 8,
            energyLevel: 8,
            readinessScore: null,
            readinessLevel: null,
            muscleSoreness: 1,
            requestPhysioContact: false,
          },
        },
      },
    ])
    mockPrisma.dailyMetricsProcessingJob.updateMany.mockResolvedValue({ count: 1 })
    mockPrisma.dailyMetrics.findUnique.mockRejectedValue(new Error('db down'))
    mockPrisma.dailyMetricsProcessingJob.update.mockResolvedValue({})

    const result = await processDailyMetricsPostWriteJobs({ limit: 10 })

    expect(result).toEqual({
      scanned: 1,
      claimed: 1,
      completed: 0,
      failed: 1,
    })
    expect(mockPrisma.dailyMetricsProcessingJob.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'job-2' },
        data: expect.objectContaining({
          status: BackgroundJobStatus.FAILED,
          lockedAt: null,
          lastError: 'db down',
          runAfter: expect.any(Date),
        }),
      })
    )
  })
})
