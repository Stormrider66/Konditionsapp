import { describe, expect, it } from 'vitest'
import type { Client, CreateTrainingProgramDTO } from '@/types'
import { generateCyclingProgram } from './cycling-generator'
import { generateSkiingProgram } from './skiing-generator'
import { generateSwimmingProgram } from './swimming-generator'
import { generateTriathlonProgram } from './triathlon-generator'
import { generateStrengthProgram } from './strength-generator'
import { createEmptyHyroxProgram } from './hyrox/empty-program'
import { getProgramEndDate, getProgramStartDate } from '../date-utils'
import { generateSportProgram } from '../sport-router/dispatcher'
import { validateGeneratedProgramQuality } from '../validators/program-quality-validator'

const client = { id: 'client-1', name: 'Alex Athlete' } as Client

function expectRealProgram(
  program: CreateTrainingProgramDTO,
  sport: string,
  expectedSessionsPerWeek: number
) {
  const result = validateGeneratedProgramQuality(program, {
    sport,
    expectedSessionsPerWeek,
  })

  expect(result.valid, result.errors.join(', ')).toBe(true)
  expect(result.stats.workouts).toBeGreaterThan(0)
  expect(result.stats.activeWeeks).toBe(result.stats.weeks)
}

describe('non-running fallback generators', () => {
  it('creates useful custom cycling programs', async () => {
    const program = await generateCyclingProgram({
      clientId: 'client-1',
      coachId: 'coach-1',
      goal: 'custom',
      durationWeeks: 6,
      sessionsPerWeek: 4,
      ftp: 260,
    }, client)

    expectRealProgram(program, 'CYCLING', 4)
    expect(program.weeks?.[0].days.flatMap((day) => day.workouts).some((workout) => workout.type === 'CYCLING')).toBe(true)
  })

  it('creates useful custom skiing programs', async () => {
    const program = await generateSkiingProgram({
      clientId: 'client-1',
      coachId: 'coach-1',
      goal: 'custom',
      durationWeeks: 6,
      sessionsPerWeek: 4,
      technique: 'classic',
    }, client)

    expectRealProgram(program, 'SKIING', 4)
    expect(program.notes).toContain('skidstyrka')
  })

  it('creates useful custom swimming programs', async () => {
    const program = await generateSwimmingProgram({
      clientId: 'client-1',
      coachId: 'coach-1',
      goal: 'custom',
      durationWeeks: 6,
      sessionsPerWeek: 4,
      css: '1:35',
    }, client)

    expectRealProgram(program, 'SWIMMING', 4)
    expect(program.weeks?.[0].days.flatMap((day) => day.workouts).some((workout) => workout.type === 'SWIMMING')).toBe(true)
  })

  it('creates useful custom triathlon programs', async () => {
    const program = await generateTriathlonProgram({
      clientId: 'client-1',
      coachId: 'coach-1',
      goal: 'custom',
      durationWeeks: 6,
      sessionsPerWeek: 5,
      weeklyHours: 8,
    }, client)

    expectRealProgram(program, 'TRIATHLON', 5)
    const workoutTypes = new Set(program.weeks?.[0].days.flatMap((day) => day.workouts.map((workout) => workout.type)))
    expect(workoutTypes.has('SWIMMING')).toBe(true)
    expect(workoutTypes.has('CYCLING')).toBe(true)
    expect(workoutTypes.has('RUNNING') || workoutTypes.has('TRIATHLON')).toBe(true)
  })

  it('creates useful strength programs', async () => {
    const program = await generateStrengthProgram({
      clientId: 'client-1',
      coachId: 'coach-1',
      goal: 'general',
      durationWeeks: 8,
      sessionsPerWeek: 3,
    }, client)

    expectRealProgram(program, 'STRENGTH', 3)
    expect(program.weeks?.[0].days.flatMap((day) => day.workouts).every((workout) => workout.segments.length > 0)).toBe(true)
  })

  it('creates useful custom HYROX programs', () => {
    const startDate = getProgramStartDate()
    const program = createEmptyHyroxProgram({
      clientId: 'client-1',
      coachId: 'coach-1',
      goal: 'custom',
      durationWeeks: 6,
      sessionsPerWeek: 4,
      experienceLevel: 'intermediate',
    }, client, startDate, getProgramEndDate(startDate, 6))

    expectRealProgram(program, 'HYROX', 4)
    expect(program.weeks?.[0].days.flatMap((day) => day.workouts).some((workout) => workout.type === 'HYROX')).toBe(true)
  })

  it('quality-gates programs through the sport router', async () => {
    const program = await generateSportProgram({
      clientId: 'client-1',
      coachId: 'coach-1',
      sport: 'CYCLING',
      goal: 'custom',
      dataSource: 'PROFILE',
      durationWeeks: 4,
      sessionsPerWeek: 3,
      manualFtp: 250,
    }, client)

    expectRealProgram(program, 'CYCLING', 3)
  })
})
