import { describe, expect, it } from 'vitest'
import type { CreateTrainingProgramDTO, CreateWorkoutDTO } from '@/types'
import { validateTeamSportProgram } from './team-sport-validator'

function baseProgram(workoutsByDay: Record<number, CreateWorkoutDTO[]>): CreateTrainingProgramDTO {
  return {
    clientId: 'client-1',
    coachId: 'coach-1',
    name: 'Team sport program',
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-02-01'),
    weeks: [
      {
        weekNumber: 1,
        phase: 'BASE',
        volume: 0,
        days: Array.from({ length: 7 }).map((_, index) => ({
          dayNumber: index + 1,
          workouts: workoutsByDay[index + 1] ?? [],
        })),
      },
    ],
  }
}

describe('validateTeamSportProgram', () => {
  it('rejects football heavy work the day before a match', () => {
    const program = baseProgram({
      6: [{
        type: 'STRENGTH',
        name: 'Heavy lower strength',
        intensity: 'THRESHOLD',
        duration: 45,
        segments: [],
      }],
      7: [{
        type: 'OTHER',
        name: 'Match',
        intensity: 'MAX',
        duration: 90,
        instructions: 'Match',
        segments: [],
      }],
    })

    const result = validateTeamSportProgram(program, 'TEAM_FOOTBALL')

    expect(result.valid).toBe(false)
    expect(result.errors.join(' ')).toContain('day before match')
  })

  it('flags hockey 3-game weeks with extra hard conditioning', () => {
    const program = baseProgram({
      2: [{
        type: 'CYCLING',
        name: 'Hard off-ice intervals',
        intensity: 'INTERVAL',
        duration: 45,
        segments: [],
      }],
      5: [{ type: 'OTHER', name: 'Match 1', intensity: 'MAX', duration: 60, segments: [] }],
      6: [{ type: 'OTHER', name: 'Match 2', intensity: 'MAX', duration: 60, segments: [] }],
      7: [{ type: 'OTHER', name: 'Match 3', intensity: 'MAX', duration: 60, segments: [] }],
    })

    const result = validateTeamSportProgram(program, 'TEAM_ICE_HOCKEY', {
      position: 'defense',
      matchesThisWeek: 3,
    })

    expect(result.valid).toBe(false)
    expect(result.errors.join(' ')).toContain('3-game week')
  })
})
