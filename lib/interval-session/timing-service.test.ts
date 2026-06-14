import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockPrisma = vi.hoisted(() => ({
  intervalSession: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  intervalSessionParticipant: {
    findFirst: vi.fn(),
  },
  intervalLap: {
    create: vi.fn(),
  },
}))

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
  },
}))

import { recordLap } from './timing-service'
import { advanceInterval } from './session-service'

describe('interval timing service', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-14T12:02:00.000Z'))
    vi.clearAllMocks()
    mockPrisma.intervalSession.findUnique.mockResolvedValue(null)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('records shared interval splits from the reset timer anchor', async () => {
    mockPrisma.intervalSession.findFirst.mockResolvedValue({
      id: 'session-1',
      coachId: 'coach-1',
      status: 'ACTIVE',
      currentInterval: 2,
      restMode: 'NONE',
      protocol: { intervalCount: 3 },
      timerStartedAt: new Date('2026-06-14T12:01:00.000Z'),
    })
    mockPrisma.intervalSessionParticipant.findFirst.mockResolvedValue({
      id: 'participant-1',
      clientId: 'client-1',
      laps: [
        {
          id: 'lap-1',
          intervalNumber: 1,
          splitTimeMs: 33300,
          cumulativeMs: 33300,
          recordedAt: new Date('2026-06-14T12:00:33.300Z'),
        },
      ],
    })
    mockPrisma.intervalLap.create.mockResolvedValue({})

    const result = await recordLap('session-1', 'coach-1', 'client-1', 27200)

    expect(result).toEqual({ success: true })
    expect(mockPrisma.intervalLap.create).toHaveBeenCalledWith({
      data: {
        participantId: 'participant-1',
        intervalNumber: 2,
        splitTimeMs: 27200,
        cumulativeMs: 27200,
      },
    })
  })

  it('resets the shared timer anchor when advancing non-individual intervals', async () => {
    mockPrisma.intervalSession.findFirst.mockResolvedValue({
      id: 'session-1',
      coachId: 'coach-1',
      status: 'ACTIVE',
      currentInterval: 1,
      restMode: 'NONE',
      groupRestStartedAt: null,
    })

    await advanceInterval('session-1', 'coach-1')

    expect(mockPrisma.intervalSession.update).toHaveBeenCalledWith({
      where: { id: 'session-1' },
      data: {
        currentInterval: 2,
        status: 'ACTIVE',
        timerStartedAt: new Date('2026-06-14T12:02:00.000Z'),
        groupRestStartedAt: null,
      },
    })
  })
})
