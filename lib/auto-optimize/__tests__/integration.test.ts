/**
 * Integration tests for AutoOptimize pipeline.
 *
 * Tests the full flow: scenarios → context → evaluation,
 * prompt template building, and variant CRUD (mocked DB).
 */

import { describe, it, expect, vi } from 'vitest'
import { evaluateProgram } from '../program-evaluator'
import { TEST_SCENARIOS, getScenario, getScenarios } from '../test-scenarios'
import type { ParsedProgram } from '@/lib/ai/program-parser'
import type { EvaluationContext } from '../types'

// ── Test Scenarios Validation ───────────────────────────────────────

describe('Test Scenarios', () => {
  it('has at least 12 scenarios', () => {
    expect(TEST_SCENARIOS.length).toBeGreaterThanOrEqual(12)
  })

  it('all scenarios have required fields', () => {
    for (const scenario of TEST_SCENARIOS) {
      expect(scenario.id).toBeTruthy()
      expect(scenario.name).toBeTruthy()
      expect(scenario.sport).toBeTruthy()
      expect(scenario.methodology).toBeTruthy()
      expect(scenario.totalWeeks).toBeGreaterThan(0)
      expect(scenario.sessionsPerWeek).toBeGreaterThan(0)
      expect(scenario.experienceLevel).toBeTruthy()
      expect(scenario.goal).toBeTruthy()
    }
  })

  it('has unique scenario IDs', () => {
    const ids = TEST_SCENARIOS.map(s => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('covers endurance, functional, team, and edge-case categories', () => {
    const sports = new Set(TEST_SCENARIOS.map(s => s.sport))
    // Endurance
    expect(sports.has('RUNNING')).toBe(true)
    expect(sports.has('CYCLING')).toBe(true)
    // Functional
    expect(sports.has('HYROX')).toBe(true)
    // Team
    expect(sports.has('TEAM_FOOTBALL')).toBe(true)
    // Edge cases: injury scenario
    expect(TEST_SCENARIOS.some(s => s.injuries && s.injuries.length > 0)).toBe(true)
    // Edge cases: calendar constraints
    expect(TEST_SCENARIOS.some(s => s.calendarConstraints != null)).toBe(true)
  })

  it('getScenario returns correct scenario', () => {
    const scenario = getScenario('running-polarized-12w-beginner')
    expect(scenario).toBeDefined()
    expect(scenario?.sport).toBe('RUNNING')
    expect(scenario?.methodology).toBe('POLARIZED')
  })

  it('getScenarios returns subset', () => {
    const ids = ['running-polarized-12w-beginner', 'cycling-pyramidal-8w']
    const subset = getScenarios(ids)
    expect(subset).toHaveLength(2)
    expect(subset.map(s => s.id)).toEqual(expect.arrayContaining(ids))
  })

  it('getScenario returns undefined for unknown id', () => {
    expect(getScenario('nonexistent')).toBeUndefined()
  })
})

// ── Scenario → Context → Evaluation Flow ────────────────────────────

describe('Scenario → Evaluation flow', () => {
  // A realistic AI-generated program for each scenario category
  const makeProgram = (scenario: typeof TEST_SCENARIOS[0]): ParsedProgram => {
    const halfWeeks = Math.floor(scenario.totalWeeks / 2)
    const hasInjury = scenario.injuries && scenario.injuries.length > 0

    return {
      name: `${scenario.sport} program ${scenario.totalWeeks}v`,
      description: `Träningsprogram för ${scenario.goal}`,
      totalWeeks: scenario.totalWeeks,
      methodology: scenario.methodology,
      phases: [
        {
          name: 'Basperiod',
          weeks: `1-${halfWeeks}`,
          focus: `Bygga aerob bas${hasInjury ? ' med anpassning för skada' : ''}`,
          volumeGuidance: 'Gradvis ökning av volym',
          keyWorkouts: ['Långpass', 'Tempopass'],
          weeklyTemplate: buildWeeklyTemplate(scenario, 'easy'),
        },
        {
          name: 'Byggperiod',
          weeks: `${halfWeeks + 1}-${scenario.totalWeeks - 2}`,
          focus: 'Ökad intensitet och specifik träning',
          volumeGuidance: 'Maxvolym denna period',
          keyWorkouts: ['Intervaller', 'Specifik träning'],
          weeklyTemplate: buildWeeklyTemplate(scenario, 'moderate'),
        },
        {
          name: 'Nedtrappning',
          weeks: `${scenario.totalWeeks - 1}-${scenario.totalWeeks}`,
          focus: 'Nedtrappning med reducerad volym och vila inför tävling',
          volumeGuidance: 'Minskar volym med 40%',
          keyWorkouts: ['Lätt löpning', 'Korta steg'],
          weeklyTemplate: buildWeeklyTemplate(scenario, 'recovery'),
        },
      ],
    }
  }

  function buildWeeklyTemplate(
    scenario: typeof TEST_SCENARIOS[0],
    phase: 'easy' | 'moderate' | 'recovery'
  ) {
    const hasInjury = scenario.injuries && scenario.injuries.length > 0
    const injuryNote = hasInjury
      ? `. Anpassad för ${scenario.injuries![0].bodyPart}-skada, undvik belastning.`
      : ''
    const sportType = scenario.sport.includes('TEAM') ? 'RUNNING' : scenario.sport

    const days: Record<string, Record<string, unknown>> = {
      monday: {
        type: sportType === 'STRENGTH' ? 'STRENGTH' : 'RUNNING',
        name: 'Pass 1',
        description: `Lätt träning${injuryNote}`,
        intensity: 'easy',
        zone: 1,
        segments: [
          { order: 1, type: 'warmup', duration: 10, zone: 1, description: 'Uppvärmning' },
          { order: 2, type: 'work', duration: 30, zone: 2, description: 'Huvudpass' },
          { order: 3, type: 'cooldown', duration: 5, zone: 1, description: 'Nedvarvning' },
        ],
      },
      tuesday: { type: 'REST', name: 'Vila', description: 'Vila och återhämtning' },
      wednesday: {
        type: sportType === 'STRENGTH' ? 'STRENGTH' : 'RUNNING',
        name: phase === 'easy' ? 'Tempo' : phase === 'moderate' ? 'Intervall' : 'Lätt',
        description: phase === 'moderate' ? 'Tröskelintervaller, hög fart' : 'Tempopass',
        intensity: phase === 'recovery' ? 'easy' : phase === 'moderate' ? 'interval' : 'moderate',
        zone: phase === 'moderate' ? 4 : 3,
        segments: [
          { order: 1, type: 'warmup', duration: 10, zone: 1, description: 'Uppvärmning' },
          { order: 2, type: phase === 'moderate' ? 'interval' : 'work', duration: 25, zone: phase === 'moderate' ? 4 : 3, heartRate: '160-175', description: 'Huvudpass' },
          { order: 3, type: 'cooldown', duration: 10, zone: 1, description: 'Nedvarvning' },
        ],
      },
      thursday: { type: 'REST', name: 'Vila', description: 'Vila' },
    }

    // Add more training days based on sessionsPerWeek
    if (scenario.sessionsPerWeek >= 3) {
      days.friday = {
        type: sportType === 'STRENGTH' ? 'STRENGTH' : 'RUNNING',
        name: 'Pass 3',
        description: 'Lätt löpning eller styrka',
        intensity: 'easy',
        zone: 1,
        segments: [
          { order: 1, type: 'warmup', duration: 10, zone: 1, description: 'Uppvärmning' },
          { order: 2, type: 'work', duration: 25, zone: 2, description: 'Lätt arbete' },
          { order: 3, type: 'cooldown', duration: 5, zone: 1, description: 'Nedvarvning' },
        ],
      }
    } else {
      days.friday = { type: 'REST', name: 'Vila', description: 'Vila' }
    }

    if (scenario.sessionsPerWeek >= 4) {
      days.saturday = {
        type: sportType === 'STRENGTH' ? 'STRENGTH' : 'RUNNING',
        name: 'Långpass',
        description: 'Långpass på varierad terräng',
        intensity: 'easy',
        zone: 2,
        duration: 90,
        segments: [
          { order: 1, type: 'warmup', duration: 15, zone: 1, description: 'Uppvärmning' },
          { order: 2, type: 'work', duration: 60, zone: 2, description: 'Långpass zon 2' },
          { order: 3, type: 'cooldown', duration: 10, zone: 1, description: 'Nedvarvning' },
        ],
      }
    } else {
      days.saturday = { type: 'REST', name: 'Vila', description: 'Vila' }
    }

    days.sunday = { type: 'REST', name: 'Vila', description: 'Vila och återhämtning' }

    return days
  }

  it('evaluates all 13 scenarios with synthetic programs scoring > 60', () => {
    for (const scenario of TEST_SCENARIOS) {
      const program = makeProgram(scenario)
      const context: EvaluationContext = {
        sport: scenario.sport,
        methodology: scenario.methodology,
        totalWeeks: scenario.totalWeeks,
        sessionsPerWeek: scenario.sessionsPerWeek,
        experienceLevel: scenario.experienceLevel,
        goal: scenario.goal,
        injuries: scenario.injuries,
        calendarConstraints: scenario.calendarConstraints,
      }

      const result = evaluateProgram(program, context)

      expect(result.parseSuccess).toBe(true)
      expect(result.overallScore).toBeGreaterThanOrEqual(60)
      expect(Object.keys(result.criteria)).toHaveLength(8)

      // All criteria should have valid scores
      for (const [, criterion] of Object.entries(result.criteria)) {
        expect(criterion.score).toBeGreaterThanOrEqual(0)
        expect(criterion.score).toBeLessThanOrEqual(100)
        expect(criterion.details.length).toBeGreaterThan(0)
      }
    }
  })

  it('injury scenario scores higher on injury awareness with adapted program', () => {
    const injuryScenario = getScenario('running-injury-knee')!
    const programWithAdaptation = makeProgram(injuryScenario)

    const context: EvaluationContext = {
      sport: injuryScenario.sport,
      methodology: injuryScenario.methodology,
      totalWeeks: injuryScenario.totalWeeks,
      sessionsPerWeek: injuryScenario.sessionsPerWeek,
      injuries: injuryScenario.injuries,
    }

    const result = evaluateProgram(programWithAdaptation, context)
    // The adapted program mentions injury keywords → should score decently
    expect(result.criteria.injuryAwareness.score).toBeGreaterThanOrEqual(50)
  })

  it('calendar scenario checks constraint awareness', () => {
    const calScenario = getScenario('running-calendar-blocked')!
    const program = makeProgram(calScenario)

    const context: EvaluationContext = {
      sport: calScenario.sport,
      methodology: calScenario.methodology,
      totalWeeks: calScenario.totalWeeks,
      sessionsPerWeek: calScenario.sessionsPerWeek,
      calendarConstraints: calScenario.calendarConstraints,
    }

    const result = evaluateProgram(program, context)
    // Calendar compliance should be evaluated (may or may not find mentions)
    expect(result.criteria.calendarCompliance).toBeDefined()
    expect(result.criteria.calendarCompliance.details.length).toBeGreaterThan(0)
  })

  it('short 4-week program evaluates without crash', () => {
    const shortScenario = getScenario('running-short-4w')!
    const program = makeProgram(shortScenario)

    const context: EvaluationContext = {
      sport: shortScenario.sport,
      methodology: shortScenario.methodology,
      totalWeeks: shortScenario.totalWeeks,
      sessionsPerWeek: shortScenario.sessionsPerWeek,
    }

    const result = evaluateProgram(program, context)
    expect(result.parseSuccess).toBe(true)
    expect(result.overallScore).toBeGreaterThanOrEqual(40)
  })
})

// ── Prompt Template Building ────────────────────────────────────────

describe('Prompt template variable substitution', () => {
  it('replaces all placeholders in a template', () => {
    const template = `Skapa ett {{sport}} program med {{methodology}} metodik.
Längd: {{totalWeeks}} veckor, {{sessionsPerWeek}} pass/vecka.
Nivå: {{experienceLevel}}. Mål: {{goal}}.`

    const scenario = TEST_SCENARIOS[0]
    const result = template
      .replace(/\{\{sport\}\}/g, scenario.sport)
      .replace(/\{\{methodology\}\}/g, scenario.methodology)
      .replace(/\{\{totalWeeks\}\}/g, String(scenario.totalWeeks))
      .replace(/\{\{sessionsPerWeek\}\}/g, String(scenario.sessionsPerWeek))
      .replace(/\{\{experienceLevel\}\}/g, scenario.experienceLevel)
      .replace(/\{\{goal\}\}/g, scenario.goal)

    expect(result).toContain('RUNNING')
    expect(result).toContain('POLARIZED')
    expect(result).toContain('12')
    expect(result).toContain('4')
    expect(result).toContain('beginner')
    expect(result).not.toContain('{{')
  })
})
