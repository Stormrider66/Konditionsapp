/**
 * Tests for Auto Strength Generator
 *
 * Unit tests for the core generation logic:
 * - Single session generation
 * - Weekly program (A/B/C differentiation)
 * - Exercise selection respects equipment filters
 * - Rationale generation
 */

import { describe, it, expect } from 'vitest'
import {
  generateStrengthSession,
  generateWeeklyProgram,
  type AutoGenerateParams,
} from '@/lib/training-engine/generators/auto-strength-generator'

const mockExerciseLibrary = [
  { id: 'pc1', name: 'Deadlift', nameSv: 'Marklyft', biomechanicalPillar: 'POSTERIOR_CHAIN' as const, progressionLevel: 'LEVEL_2' as const, equipment: 'barbell', category: 'STRENGTH', isPlyometric: false },
  { id: 'pc2', name: 'Hip Thrust', nameSv: 'Höftlyft', biomechanicalPillar: 'POSTERIOR_CHAIN' as const, progressionLevel: 'LEVEL_2' as const, equipment: 'barbell', category: 'STRENGTH', isPlyometric: false },
  { id: 'kd1', name: 'Squat', nameSv: 'Knäböj', biomechanicalPillar: 'KNEE_DOMINANCE' as const, progressionLevel: 'LEVEL_2' as const, equipment: 'barbell', category: 'STRENGTH', isPlyometric: false },
  { id: 'kd2', name: 'Leg Press', nameSv: 'Benpress', biomechanicalPillar: 'KNEE_DOMINANCE' as const, progressionLevel: 'LEVEL_2' as const, equipment: 'machine', category: 'STRENGTH', isPlyometric: false },
  { id: 'uni1', name: 'Lunge', nameSv: 'Utfall', biomechanicalPillar: 'UNILATERAL' as const, progressionLevel: 'LEVEL_2' as const, equipment: 'dumbbell', category: 'STRENGTH', isPlyometric: false },
  { id: 'uni2', name: 'Step Up', nameSv: 'Steguppstigning', biomechanicalPillar: 'UNILATERAL' as const, progressionLevel: 'LEVEL_2' as const, equipment: 'dumbbell', category: 'STRENGTH', isPlyometric: false },
  { id: 'core1', name: 'Plank', nameSv: 'Planka', biomechanicalPillar: 'ANTI_ROTATION_CORE' as const, progressionLevel: 'LEVEL_1' as const, equipment: 'bodyweight', category: 'CORE', isPlyometric: false },
  { id: 'core2', name: 'Dead Bug', nameSv: 'Död insekt', biomechanicalPillar: 'ANTI_ROTATION_CORE' as const, progressionLevel: 'LEVEL_1' as const, equipment: 'bodyweight', category: 'CORE', isPlyometric: false },
  { id: 'prehab1', name: 'Copenhagen Plank', nameSv: 'Copenhagen plank', biomechanicalPillar: 'ANTI_ROTATION_CORE' as const, progressionLevel: 'LEVEL_2' as const, equipment: 'bodyweight', category: 'CORE', isPlyometric: false, isRehabExercise: true, targetBodyParts: ['groin', 'adductor'] },
  { id: 'prehab2', name: 'Single Leg Calf Iso', nameSv: 'Enbens tåhävning isohåll', biomechanicalPillar: 'FOOT_ANKLE' as const, progressionLevel: 'LEVEL_1' as const, equipment: 'bodyweight', category: 'STRENGTH', isPlyometric: false, isRehabExercise: true, targetBodyParts: ['ankle', 'calf'] },
  { id: 'plyo1', name: 'Box Jump', nameSv: 'Lådhopp', biomechanicalPillar: 'KNEE_DOMINANCE' as const, progressionLevel: 'LEVEL_3' as const, equipment: 'box', category: 'PLYOMETRIC', isPlyometric: true },
]

const baseParams: AutoGenerateParams = {
  athleteId: 'athlete-1',
  goal: 'strength',
  phase: 'ANATOMICAL_ADAPTATION',
  sessionsPerWeek: 2,
  equipmentAvailable: ['barbell', 'dumbbell', 'bodyweight'],
  timePerSession: 45,
  athleteLevel: 'INTERMEDIATE',
  includeWarmup: false,
  includeCore: true,
  includeCooldown: false,
}

describe('generateStrengthSession', () => {
  it('generates a session with exercises', async () => {
    const session = await generateStrengthSession(baseParams, mockExerciseLibrary)

    expect(session.name).toBeTruthy()
    expect(session.description).toBeTruthy()
    expect(session.phase).toBe('ANATOMICAL_ADAPTATION')
    expect(session.exercises.length).toBeGreaterThan(0)
    expect(session.totalExercises).toBeGreaterThan(0)
    expect(session.totalSets).toBeGreaterThan(0)
  })

  it('generates rationale explaining exercise choices', async () => {
    const session = await generateStrengthSession(baseParams, mockExerciseLibrary)

    expect(session.rationale).toBeTruthy()
    expect(session.rationale).toContain('övningar')
  })

  it('respects equipment filter', async () => {
    const params = { ...baseParams, equipmentAvailable: ['bodyweight'] }
    const session = await generateStrengthSession(params, mockExerciseLibrary)

    // Should only use exercises with bodyweight or no equipment
    const mainExercises = session.exercises.filter((e) => e.section === 'MAIN')
    for (const ex of mainExercises) {
      const lib = mockExerciseLibrary.find((l) => l.id === ex.exerciseId)
      if (lib) {
        expect(lib.equipment === 'bodyweight' || !lib.equipment).toBe(true)
      }
    }
  })

  it('includes warmup section when requested', async () => {
    const params = { ...baseParams, includeWarmup: true }
    const session = await generateStrengthSession(params, mockExerciseLibrary)

    const warmupSection = session.sections.find((s) => s.type === 'WARMUP')
    expect(warmupSection).toBeDefined()
    expect(warmupSection!.exercises.length).toBeGreaterThan(0)
  })

  it('includes core section when requested', async () => {
    const params = { ...baseParams, includeCore: true }
    const session = await generateStrengthSession(params, mockExerciseLibrary)

    const coreSection = session.sections.find((s) => s.type === 'CORE')
    expect(coreSection).toBeDefined()
  })

  it('includes prehab section for hockey athletes', async () => {
    const params = { ...baseParams, sport: 'TEAM_ICE_HOCKEY', includePrehab: undefined }
    const session = await generateStrengthSession(params, mockExerciseLibrary)

    const prehabSection = session.sections.find((s) => s.type === 'PREHAB')
    expect(prehabSection).toBeDefined()
    expect(prehabSection!.exercises.length).toBeGreaterThan(0)
    expect(session.rationale).toContain('Prehab-sektion')
  })

  it('targets restricted body parts in prehab selection', async () => {
    const params = { ...baseParams, includePrehab: true, riskBodyParts: ['groin'] }
    const session = await generateStrengthSession(params, mockExerciseLibrary)

    const prehabExercises = session.exercises.filter((e) => e.section === 'PREHAB')
    expect(prehabExercises.map((e) => e.exerciseId)).toContain('prehab1')
  })

  it('avoids recently used exercises', async () => {
    const params = { ...baseParams, recentExerciseIds: ['pc1', 'kd1'] }
    const session = await generateStrengthSession(params, mockExerciseLibrary)

    const mainIds = session.exercises
      .filter((e) => e.section === 'MAIN')
      .map((e) => e.exerciseId)

    // Should not contain recently used exercises
    expect(mainIds).not.toContain('pc1')
    expect(mainIds).not.toContain('kd1')
  })
})

describe('generateWeeklyProgram', () => {
  it('generates correct number of sessions', async () => {
    const params = { ...baseParams, sessionsPerWeek: 3 as const }
    const sessions = await generateWeeklyProgram(params, mockExerciseLibrary)

    expect(sessions).toHaveLength(3)
  })

  it('names sessions with A/B/C labels', async () => {
    const params = { ...baseParams, sessionsPerWeek: 3 as const }
    const sessions = await generateWeeklyProgram(params, mockExerciseLibrary)

    expect(sessions[0].name).toContain('Pass A')
    expect(sessions[1].name).toContain('Pass B')
    expect(sessions[2].name).toContain('Pass C')
  })

  it('uses different exercises across sessions', async () => {
    const params = { ...baseParams, sessionsPerWeek: 2 as const }
    const sessions = await generateWeeklyProgram(params, mockExerciseLibrary)

    const session1Ids = sessions[0].exercises
      .filter((e) => e.section === 'MAIN')
      .map((e) => e.exerciseId)
    const session2Ids = sessions[1].exercises
      .filter((e) => e.section === 'MAIN')
      .map((e) => e.exerciseId)

    // Sessions should have at least some different exercises
    const overlap = session1Ids.filter((id) => session2Ids.includes(id))
    expect(overlap.length).toBeLessThan(session1Ids.length)
  })

  it('includes rationale for each session', async () => {
    const params = { ...baseParams, sessionsPerWeek: 2 as const }
    const sessions = await generateWeeklyProgram(params, mockExerciseLibrary)

    for (const session of sessions) {
      expect(session.rationale).toBeTruthy()
    }
  })
})
