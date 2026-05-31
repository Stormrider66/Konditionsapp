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
const swedishUserVisiblePattern = /[åäöÅÄÖ]|\b(Vilodag|Uppvärmning|Nedvarvning|Löpning|löpning|Vila|Rörlighet|Återhämtning)\b/

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

  it('creates custom cycling fallback content in English by default', async () => {
    const program = await generateCyclingProgram({
      clientId: 'client-1',
      coachId: 'coach-1',
      goal: 'custom',
      durationWeeks: 4,
      sessionsPerWeek: 4,
      ftp: 260,
      locale: 'en',
    }, client)

    expectRealProgram(program, 'CYCLING', 4)
    expect(JSON.stringify(program)).not.toMatch(swedishUserVisiblePattern)
    expect(program.name).toContain('Cycling program')
    expect(program.notes).toContain('Custom cycling program')
  })

  it('uses English labels for custom cycling VO2 hill intervals', async () => {
    const program = await generateCyclingProgram({
      clientId: 'client-1',
      coachId: 'coach-1',
      goal: 'custom',
      durationWeeks: 4,
      sessionsPerWeek: 6,
      ftp: 260,
      locale: 'en',
    }, client)

    const serialized = JSON.stringify(program)

    expect(serialized).toContain('VO2 / hill intervals')
    expect(serialized).not.toContain('backintervaller')
  })

  it('keeps custom cycling fallback content Swedish for Swedish users', async () => {
    const program = await generateCyclingProgram({
      clientId: 'client-1',
      coachId: 'coach-1',
      goal: 'custom',
      durationWeeks: 4,
      sessionsPerWeek: 4,
      ftp: 260,
      locale: 'sv',
    }, client)

    expectRealProgram(program, 'CYCLING', 4)
    expect(program.name).toContain('Cykelprogram')
    expect(program.notes).toContain('Anpassat cykelprogram')
  })

  it('localizes cycling template programs for English users', async () => {
    const program = await generateCyclingProgram({
      clientId: 'client-1',
      coachId: 'coach-1',
      goal: 'base-builder',
      durationWeeks: 4,
      sessionsPerWeek: 3,
      weeklyHours: 8,
      locale: 'en',
    }, client)

    expectRealProgram(program, 'CYCLING', 3)
    expect(JSON.stringify(program)).not.toMatch(swedishUserVisiblePattern)
    expect(program.name).toContain('Base Builder')
    expect(program.weeks?.[0].focus).toContain('Basic aerobic development')
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
    expect(program.notes).toContain('ski-specific strength')
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

  it('creates strength program content in English by default', async () => {
    const program = await generateStrengthProgram({
      clientId: 'client-1',
      coachId: 'coach-1',
      goal: 'general',
      durationWeeks: 6,
      sessionsPerWeek: 3,
      locale: 'en',
    }, client)

    expectRealProgram(program, 'STRENGTH', 3)
    expect(JSON.stringify(program)).not.toMatch(swedishUserVisiblePattern)
    expect(program.name).toContain('General strength')
    expect(program.weeks?.[0].focus).toContain('Build foundational strength')
  })

  it('uses English anti-rotation notes and classifies English plyometrics', async () => {
    const program = await generateStrengthProgram({
      clientId: 'client-1',
      coachId: 'coach-1',
      goal: 'running-economy',
      durationWeeks: 6,
      sessionsPerWeek: 3,
      locale: 'en',
    }, client)

    const serialized = JSON.stringify(program)
    const workouts = program.weeks?.flatMap((week) => week.days.flatMap((day) => day.workouts)) ?? []

    expect(serialized).not.toContain('Antirotation')
    expect(workouts.some((workout) => workout.name === 'Plyometrics and stiffness' && workout.type === 'PLYOMETRIC')).toBe(true)
  })

  it('keeps strength program content Swedish for Swedish users', async () => {
    const program = await generateStrengthProgram({
      clientId: 'client-1',
      coachId: 'coach-1',
      goal: 'general',
      durationWeeks: 6,
      sessionsPerWeek: 3,
      locale: 'sv',
    }, client)

    expectRealProgram(program, 'STRENGTH', 3)
    expect(program.name).toContain('Allmän styrka')
    expect(program.weeks?.[0].focus).toContain('Bygg grundstyrka')
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

  it('creates custom HYROX fallback content in English by default', () => {
    const startDate = getProgramStartDate()
    const program = createEmptyHyroxProgram({
      clientId: 'client-1',
      coachId: 'coach-1',
      goal: 'custom',
      durationWeeks: 4,
      sessionsPerWeek: 5,
      experienceLevel: 'intermediate',
      locale: 'en',
    }, client, startDate, getProgramEndDate(startDate, 4))

    expectRealProgram(program, 'HYROX', 5)
    expect(JSON.stringify(program)).not.toMatch(swedishUserVisiblePattern)
    expect(program.notes).toContain('Custom HYROX program')
    expect(program.weeks?.[0].focus).toContain('Station-specific training')
  })

  it('keeps custom HYROX fallback content Swedish for Swedish users', () => {
    const startDate = getProgramStartDate()
    const program = createEmptyHyroxProgram({
      clientId: 'client-1',
      coachId: 'coach-1',
      goal: 'custom',
      durationWeeks: 4,
      sessionsPerWeek: 5,
      experienceLevel: 'intermediate',
      locale: 'sv',
    }, client, startDate, getProgramEndDate(startDate, 4))

    expectRealProgram(program, 'HYROX', 5)
    expect(program.notes).toContain('Anpassat HYROX-program')
    expect(program.weeks?.[0].focus).toContain('Stationsspecifik träning')
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
