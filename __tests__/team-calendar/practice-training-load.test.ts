/**
 * Attendance-aware practice load sync. These rows feed athlete ACWR
 * monitoring, so pin: who gets load (ABSENT excluded, UNKNOWN included),
 * idempotent re-sync (old estimates always replaced), and cleanup when a
 * practice loses its plan or is deleted.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    client: { findMany: vi.fn() },
    teamEvent: { findMany: vi.fn() },
    trainingLoad: { deleteMany: vi.fn(), createMany: vi.fn() },
  },
}))

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

import { prisma } from '@/lib/prisma'
import {
  eligiblePracticeClientIds,
  resyncPracticeTrainingLoadForEvents,
  syncPracticeTrainingLoad,
  PRACTICE_LOAD_TYPE,
} from '@/lib/team-calendar/practice-training-load'

const ROSTER = ['c1', 'c2', 'c3']

const PLAN = {
  intensity: 'moderate',
  blocks: [{ focus: 'conditioning', durationMinutes: 20 }], // RPE 8.5 → 17 TSS
}

describe('eligiblePracticeClientIds', () => {
  it('includes the whole roster when there is no attendance list', () => {
    expect(eligiblePracticeClientIds(ROSTER, undefined)).toEqual(ROSTER)
    expect(eligiblePracticeClientIds(ROSTER, null)).toEqual(ROSTER)
    expect(eligiblePracticeClientIds(ROSTER, 'garbage')).toEqual(ROSTER)
  })

  it('excludes only players explicitly marked ABSENT', () => {
    const attendance = [
      { clientId: 'c1', status: 'ABSENT' },
      { clientId: 'c2', status: 'ATTENDING' },
      { clientId: 'c3', status: 'UNKNOWN' },
    ]
    expect(eligiblePracticeClientIds(ROSTER, attendance)).toEqual(['c2', 'c3'])
  })

  it('keeps unlisted roster members and ignores malformed entries', () => {
    const attendance = [
      { clientId: 'c2', status: 'ABSENT' },
      { status: 'ABSENT' }, // no clientId
      null,
      'not-an-object',
    ]
    expect(eligiblePracticeClientIds(ROSTER, attendance)).toEqual(['c1', 'c3'])
  })

  it('ignores ABSENT marks for players no longer on the roster', () => {
    const attendance = [{ clientId: 'gone', status: 'ABSENT' }]
    expect(eligiblePracticeClientIds(ROSTER, attendance)).toEqual(ROSTER)
  })
})

describe('syncPracticeTrainingLoad', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(prisma.client.findMany).mockResolvedValue(
      ROSTER.map((id) => ({ id })) as never
    )
    vi.mocked(prisma.trainingLoad.deleteMany).mockResolvedValue({ count: 0 } as never)
    vi.mocked(prisma.trainingLoad.createMany).mockImplementation((async (args: { data: unknown[] }) => ({
      count: args.data.length,
    })) as never)
  })

  it('writes one row per non-absent roster member, per event', async () => {
    const written = await syncPracticeTrainingLoad({
      teamId: 'team-1',
      events: [
        {
          id: 'event-1',
          startDate: new Date('2026-06-15T17:00:00Z'),
          attendance: [{ clientId: 'c2', status: 'ABSENT' }],
        },
      ],
      practicePlan: PLAN,
    })

    expect(written).toBe(2)
    const rows = vi.mocked(prisma.trainingLoad.createMany).mock.calls[0]?.[0]?.data as Array<{
      clientId: string
      dailyLoad: number
      loadType: string
      workoutId: string
    }>
    expect(rows.map((r) => r.clientId)).toEqual(['c1', 'c3'])
    expect(rows[0].loadType).toBe(PRACTICE_LOAD_TYPE)
    expect(rows[0].workoutId).toBe('event-1')
    expect(rows[0].dailyLoad).toBe(17)
  })

  it('applies each event instance its own attendance list', async () => {
    const written = await syncPracticeTrainingLoad({
      teamId: 'team-1',
      events: [
        { id: 'event-1', startDate: new Date(), attendance: [{ clientId: 'c1', status: 'ABSENT' }] },
        { id: 'event-2', startDate: new Date(), attendance: undefined },
      ],
      practicePlan: PLAN,
    })

    // event-1: c2+c3, event-2: full roster
    expect(written).toBe(5)
  })

  it('always clears previous estimates, even when the new plan has no load', async () => {
    const written = await syncPracticeTrainingLoad({
      teamId: 'team-1',
      events: [{ id: 'event-1', startDate: new Date() }],
      practicePlan: { blocks: [] },
    })

    expect(written).toBe(0)
    expect(prisma.trainingLoad.deleteMany).toHaveBeenCalledWith({
      where: { loadType: PRACTICE_LOAD_TYPE, workoutId: { in: ['event-1'] } },
    })
    expect(prisma.trainingLoad.createMany).not.toHaveBeenCalled()
  })
})

describe('resyncPracticeTrainingLoadForEvents', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(prisma.client.findMany).mockResolvedValue(
      ROSTER.map((id) => ({ id })) as never
    )
    vi.mocked(prisma.trainingLoad.deleteMany).mockResolvedValue({ count: 0 } as never)
    vi.mocked(prisma.trainingLoad.createMany).mockImplementation((async (args: { data: unknown[] }) => ({
      count: args.data.length,
    })) as never)
  })

  it('re-reads events from the database and applies their current attendance', async () => {
    vi.mocked(prisma.teamEvent.findMany).mockResolvedValue([
      {
        id: 'event-1',
        teamId: 'team-1',
        type: 'PRACTICE',
        startDate: new Date(),
        practicePlan: PLAN,
        attendance: [{ clientId: 'c3', status: 'ABSENT' }],
      },
    ] as never)

    const written = await resyncPracticeTrainingLoadForEvents(['event-1'])
    expect(written).toBe(2) // c1 + c2
  })

  it('clears estimates for events that are gone or no longer practices', async () => {
    vi.mocked(prisma.teamEvent.findMany).mockResolvedValue([
      {
        id: 'event-1',
        teamId: 'team-1',
        type: 'GAME',
        startDate: new Date(),
        practicePlan: PLAN,
        attendance: null,
      },
    ] as never)

    const written = await resyncPracticeTrainingLoadForEvents(['event-1', 'event-deleted'])
    expect(written).toBe(0)
    expect(prisma.trainingLoad.deleteMany).toHaveBeenCalledWith({
      where: { loadType: PRACTICE_LOAD_TYPE, workoutId: { in: ['event-deleted', 'event-1'] } },
    })
    expect(prisma.trainingLoad.createMany).not.toHaveBeenCalled()
  })
})
