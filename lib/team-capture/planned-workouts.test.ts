import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockPrisma = vi.hoisted(() => ({
  cardioSessionAssignment: { findMany: vi.fn() },
  hybridWorkoutAssignment: { findMany: vi.fn() },
}))

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }))

import {
  listPlannedTeamCaptureWorkoutOptions,
  teamCaptureAssignmentDayBounds,
} from './workout-template'

describe('planned Team Conditioning workouts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.hybridWorkoutAssignment.findMany.mockResolvedValue([])
  })

  it('uses UTC-midnight bounds for date-only assignment columns', () => {
    expect(teamCaptureAssignmentDayBounds('2026-07-01')).toEqual({
      dayStart: new Date('2026-07-01T00:00:00.000Z'),
      dayEnd: new Date('2026-07-02T00:00:00.000Z'),
    })
    expect(teamCaptureAssignmentDayBounds('2026-02-30')).toBeNull()
  })

  it('loads and groups capture-ready workouts assigned to team athletes for the day', async () => {
    mockPrisma.cardioSessionAssignment.findMany.mockResolvedValue([
      {
        athlete: { id: 'dean', name: 'Dean Kukan' },
        session: {
          id: 'cardio-1',
          name: 'Aerobic 2 – Dean Kukan',
          sport: 'CYCLING',
          segments: [
            { type: 'INTERVAL', equipment: 'ASSAULT_BIKE', calories: 60 },
            { type: 'INTERVAL', equipment: 'ROW', calories: 60 },
            { type: 'INTERVAL', equipment: 'WATTBIKE', calories: 60 },
          ],
        },
      },
      {
        athlete: { id: 'teammate', name: 'Team Mate' },
        session: {
          id: 'cardio-1',
          name: 'Aerobic 2 – Dean Kukan',
          sport: 'CYCLING',
          segments: [
            { type: 'INTERVAL', equipment: 'ASSAULT_BIKE', calories: 60 },
            { type: 'INTERVAL', equipment: 'ROW', calories: 60 },
            { type: 'INTERVAL', equipment: 'WATTBIKE', calories: 60 },
          ],
        },
      },
    ])

    const dayStart = new Date('2026-07-01T00:00:00.000Z')
    const dayEnd = new Date('2026-07-02T00:00:00.000Z')
    const options = await listPlannedTeamCaptureWorkoutOptions({
      teamId: 'team-1',
      businessId: 'business-1',
      dayStart,
      dayEnd,
    })

    expect(options).toHaveLength(1)
    expect(options[0]).toMatchObject({
      id: 'cardio-1',
      type: 'CARDIO',
      name: 'Aerobic 2 – Dean Kukan',
      plannedFor: [
        { id: 'dean', name: 'Dean Kukan' },
        { id: 'teammate', name: 'Team Mate' },
      ],
      template: {
        stations: [
          { equipmentKey: 'ASSAULT_BIKE', targetCalories: 60 },
          { equipmentKey: 'ROW', targetCalories: 60 },
          { equipmentKey: 'WATTBIKE', targetCalories: 60 },
        ],
      },
    })
    expect(mockPrisma.cardioSessionAssignment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          assignedDate: { gte: dayStart, lt: dayEnd },
          athlete: { teamId: 'team-1', businessId: 'business-1' },
          status: { in: ['PENDING', 'SCHEDULED', 'MODIFIED'] },
        }),
      })
    )
  })
})
