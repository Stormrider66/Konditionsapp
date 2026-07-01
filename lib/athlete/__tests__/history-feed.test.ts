import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  workoutLogFindMany: vi.fn(),
  adHocFindMany: vi.fn(),
  strengthFindMany: vi.fn(),
  cardioFindMany: vi.fn(),
  hybridFindMany: vi.fn(),
  agilityFindMany: vi.fn(),
  wodFindMany: vi.fn(),
  quickErgFindMany: vi.fn(),
  phoneRunFindMany: vi.fn(),
  garminFindMany: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    workoutLog: { findMany: mocks.workoutLogFindMany },
    adHocWorkout: { findMany: mocks.adHocFindMany },
    strengthSessionAssignment: { findMany: mocks.strengthFindMany },
    cardioSessionAssignment: { findMany: mocks.cardioFindMany },
    hybridWorkoutAssignment: { findMany: mocks.hybridFindMany },
    agilityWorkoutAssignment: { findMany: mocks.agilityFindMany },
    aIGeneratedWOD: { findMany: mocks.wodFindMany },
    quickErgSession: { findMany: mocks.quickErgFindMany },
    phoneRunSession: { findMany: mocks.phoneRunFindMany },
    garminActivity: { findMany: mocks.garminFindMany },
  },
}))

import {
  getAthleteHistoryFeed,
  historyTimeframeStart,
  resolveHistoryTimeframe,
} from '../history-feed'

const NOW = new Date('2026-06-11T12:00:00.000Z')

function emptyAll() {
  mocks.workoutLogFindMany.mockResolvedValue([])
  mocks.adHocFindMany.mockResolvedValue([])
  mocks.strengthFindMany.mockResolvedValue([])
  mocks.cardioFindMany.mockResolvedValue([])
  mocks.hybridFindMany.mockResolvedValue([])
  mocks.agilityFindMany.mockResolvedValue([])
  mocks.wodFindMany.mockResolvedValue([])
  mocks.quickErgFindMany.mockResolvedValue([])
  mocks.phoneRunFindMany.mockResolvedValue([])
  mocks.garminFindMany.mockResolvedValue([])
}

beforeEach(() => {
  vi.clearAllMocks()
  emptyAll()
})

describe('resolveHistoryTimeframe / historyTimeframeStart', () => {
  it('defaults invalid values to 30days', () => {
    expect(resolveHistoryTimeframe(undefined)).toBe('30days')
    expect(resolveHistoryTimeframe('nonsense')).toBe('30days')
    expect(resolveHistoryTimeframe('7days')).toBe('7days')
  })

  it('computes window starts', () => {
    expect(historyTimeframeStart('7days', NOW).toISOString()).toBe('2026-06-04T12:00:00.000Z')
    expect(historyTimeframeStart('1year', NOW).toISOString()).toBe('2025-06-11T12:00:00.000Z')
  })
})

describe('getAthleteHistoryFeed', () => {
  it('queries WorkoutLog by User.id and every other source by Client.id', async () => {
    await getAthleteHistoryFeed({
      userId: 'user-1',
      clientId: 'client-1',
      fallbackAdHocName: 'Workout',
      now: NOW,
    })

    expect(mocks.workoutLogFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ athleteId: 'user-1' }) })
    )
    for (const fn of [
      mocks.adHocFindMany,
      mocks.strengthFindMany,
      mocks.cardioFindMany,
      mocks.hybridFindMany,
      mocks.agilityFindMany,
    ]) {
      expect(fn).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ athleteId: 'client-1' }) })
      )
    }
    expect(mocks.wodFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ clientId: 'client-1' }) })
    )
    expect(mocks.quickErgFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ clientId: 'client-1' }) })
    )
    expect(mocks.phoneRunFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ clientId: 'client-1' }) })
    )
  })

  it('merges all sources sorted by date desc and converts cardio plus live capture units', async () => {
    mocks.workoutLogFindMany.mockResolvedValue([
      {
        id: 'log-1',
        completedAt: new Date('2026-06-09T10:00:00Z'),
        distance: 5,
        duration: 30,
        perceivedEffort: 6,
        workout: {
          id: 'w-1',
          name: 'Tempo run',
          type: 'RUNNING',
          day: { week: { program: { id: 'p-1', name: 'Marathon block' } } },
        },
      },
    ])
    mocks.cardioFindMany.mockResolvedValue([
      {
        id: 'ca-1',
        completedAt: new Date('2026-06-10T10:00:00Z'),
        actualDuration: 1800, // seconds → 30 min
        actualDistance: 5000, // metres → 5 km
        session: { name: 'Row intervals', sport: 'ROWING' },
      },
    ])
    mocks.wodFindMany.mockResolvedValue([
      {
        id: 'wod-1',
        title: 'AI Blast',
        primarySport: 'HYROX',
        actualDuration: 25,
        requestedDuration: 30,
        sessionRPE: 8,
        completedAt: new Date('2026-06-08T10:00:00Z'),
        source: 'chat',
      },
    ])
    mocks.quickErgFindMany.mockResolvedValue([
      {
        id: 'qe-1',
        machineType: 'CONCEPT2_ROW',
        machineKind: 'rower',
        deviceName: 'PM5 123',
        completedAt: new Date('2026-06-10T11:00:00Z'),
        durationSec: 900,
        distanceMeters: 2500,
        rpe: 7,
      },
    ])
    mocks.phoneRunFindMany.mockResolvedValue([
      {
        id: 'pr-1',
        completedAt: new Date('2026-06-10T12:00:00Z'),
        durationSec: 1234,
        distanceMeters: 4321,
        rpe: 5,
      },
    ])

    const feed = await getAthleteHistoryFeed({
      userId: 'user-1',
      clientId: 'client-1',
      fallbackAdHocName: 'Workout',
      now: NOW,
    })

    expect(feed.items.map((i) => i.id)).toEqual(['pr-1', 'qe-1', 'ca-1', 'log-1', 'wod-1'])
    const phoneRun = feed.items[0]
    expect(phoneRun.name).toBe('Phone run')
    expect(phoneRun.type).toBe('RUNNING')
    expect(phoneRun.duration).toBe(21)
    expect(phoneRun.distance).toBeCloseTo(4.321)
    expect(phoneRun.perceivedEffort).toBe(5)
    expect(phoneRun.source).toBe('phone-run')
    const quickErg = feed.items[1]
    expect(quickErg.name).toBe('RowErg')
    expect(quickErg.type).toBe('ROWING')
    expect(quickErg.duration).toBe(15)
    expect(quickErg.distance).toBe(2.5)
    expect(quickErg.perceivedEffort).toBe(7)
    expect(quickErg.source).toBe('quick-erg')
    expect(quickErg.linkHref).toBe('/athlete/quick-erg/qe-1')
    const cardio = feed.items[2]
    expect(cardio.duration).toBe(30)
    expect(cardio.distance).toBe(5)
    expect(feed.items[4].source).toBe('ai-chat')
    expect(feed.items[3].programName).toBe('Marathon block')
  })

  it('computes stats over the full timeframe while the type filter narrows items only', async () => {
    mocks.workoutLogFindMany.mockResolvedValue([
      {
        id: 'log-1',
        completedAt: new Date('2026-06-09T10:00:00Z'),
        distance: 5,
        duration: 30,
        perceivedEffort: 6,
        workout: {
          id: 'w-1',
          name: 'Tempo run',
          type: 'RUNNING',
          day: { week: { program: { id: 'p-1', name: 'Block' } } },
        },
      },
    ])
    mocks.strengthFindMany.mockResolvedValue([
      {
        id: 'st-1',
        completedAt: new Date('2026-06-10T10:00:00Z'),
        duration: 45,
        rpe: 8,
        session: { name: 'Heavy day' },
      },
    ])

    const feed = await getAthleteHistoryFeed({
      userId: 'user-1',
      clientId: 'client-1',
      typeFilter: 'STRENGTH',
      fallbackAdHocName: 'Workout',
      now: NOW,
    })

    expect(feed.items).toHaveLength(1)
    expect(feed.items[0].id).toBe('st-1')
    // Stats still include the filtered-out run.
    expect(feed.stats.totalWorkouts).toBe(2)
    expect(feed.stats.totalDistanceKm).toBe(5)
    expect(feed.stats.totalDurationMin).toBe(75)
    expect(feed.stats.avgRPE).toBe(7)
  })

  it('uses the localized fallback name for unparsed ad-hoc workouts', async () => {
    mocks.adHocFindMany.mockResolvedValue([
      {
        id: 'ah-1',
        workoutDate: new Date('2026-06-07T10:00:00Z'),
        workoutName: null,
        parsedStructure: null,
        inputType: 'TEXT',
      },
    ])

    const feed = await getAthleteHistoryFeed({
      userId: 'user-1',
      clientId: 'client-1',
      fallbackAdHocName: 'Träningspass',
      now: NOW,
    })

    expect(feed.items[0].name).toBe('Träningspass')
    expect(feed.items[0].isAdHoc).toBe(true)
  })
})
