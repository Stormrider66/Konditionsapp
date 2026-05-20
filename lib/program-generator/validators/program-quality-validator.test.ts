import { describe, expect, it } from 'vitest'
import type { CreateTrainingProgramDTO } from '@/types'
import { validateGeneratedProgramQuality } from './program-quality-validator'

function baseProgram(overrides: Partial<CreateTrainingProgramDTO> = {}): CreateTrainingProgramDTO {
  return {
    clientId: 'client-1',
    coachId: 'coach-1',
    name: 'Testprogram',
    goalType: 'custom',
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-02-01'),
    weeks: [
      {
        weekNumber: 1,
        phase: 'BASE',
        volume: 45,
        focus: 'Grund',
        days: Array.from({ length: 7 }).map((_, index) => ({
          dayNumber: index + 1,
          notes: index === 0 ? '' : 'Vilodag',
          workouts: index === 0
            ? [
                {
                  type: 'CYCLING',
                  name: 'Aerob distans',
                  intensity: 'EASY',
                  duration: 45,
                  instructions: 'Jämn zon 2-belastning med lugn kadens.',
                  segments: [
                    { order: 1, type: 'warmup', duration: 10, description: 'Lätt uppvärmning' },
                    { order: 2, type: 'work', duration: 25, description: 'Zon 2' },
                    { order: 3, type: 'cooldown', duration: 10, description: 'Nedvarvning' },
                  ],
                },
              ]
            : [],
        })),
      },
    ],
    ...overrides,
  }
}

describe('validateGeneratedProgramQuality', () => {
  it('accepts a program with useful workouts', () => {
    const result = validateGeneratedProgramQuality(baseProgram(), {
      sport: 'CYCLING',
      expectedSessionsPerWeek: 2,
    })

    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
    expect(result.stats.workouts).toBe(1)
  })

  it('rejects empty generated programs', () => {
    const result = validateGeneratedProgramQuality(baseProgram({
      weeks: [
        {
          weekNumber: 1,
          phase: 'BASE',
          volume: 0,
          focus: 'Tom',
          days: Array.from({ length: 7 }).map((_, index) => ({
            dayNumber: index + 1,
            notes: '',
            workouts: [],
          })),
        },
      ],
    }), {
      sport: 'STRENGTH',
      expectedSessionsPerWeek: 3,
    })

    expect(result.valid).toBe(false)
    expect(result.errors.join(' ')).toContain('inga träningspass')
    expect(result.errors.join(' ')).toContain('tomma veckor')
  })

  it('rejects workouts without coaching content', () => {
    const program = baseProgram()
    program.weeks![0].days[0].workouts[0] = {
      type: 'CYCLING',
      name: 'X',
      intensity: 'EASY',
      segments: [],
    }

    const result = validateGeneratedProgramQuality(program, {
      sport: 'CYCLING',
      expectedSessionsPerWeek: 1,
    })

    expect(result.valid).toBe(false)
    expect(result.errors.join(' ')).toContain('utan tillräckligt träningsinnehåll')
  })
})
