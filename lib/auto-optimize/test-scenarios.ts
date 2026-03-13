/**
 * Test Scenarios
 *
 * Static athlete profiles covering critical sport/methodology/edge-case combinations
 * for evaluating AI-generated training programs.
 */

import type { TestScenario } from './types'

export const TEST_SCENARIOS: TestScenario[] = [
  // ── Endurance ───────────────────────────────────────────────────

  {
    id: 'running-polarized-12w-beginner',
    name: 'Running / Polarized / 12w / Beginner',
    sport: 'RUNNING',
    methodology: 'POLARIZED',
    totalWeeks: 12,
    sessionsPerWeek: 4,
    experienceLevel: 'beginner',
    goal: 'Förbättra 10 km-tid från 55 till 50 min',
    hasTestData: false,
  },
  {
    id: 'running-norwegian-16w-advanced',
    name: 'Running / Norwegian / 16w / Advanced',
    sport: 'RUNNING',
    methodology: 'NORWEGIAN',
    totalWeeks: 16,
    sessionsPerWeek: 7,
    experienceLevel: 'advanced',
    goal: 'Halvmaraton under 1:20',
    hasTestData: true,
  },
  {
    id: 'running-canova-20w-marathon',
    name: 'Running / Canova / 20w / Marathon',
    sport: 'RUNNING',
    methodology: 'CANOVA',
    totalWeeks: 20,
    sessionsPerWeek: 6,
    experienceLevel: 'intermediate',
    goal: 'Maraton under 3:15',
    hasTestData: true,
  },
  {
    id: 'cycling-pyramidal-8w',
    name: 'Cycling / Pyramidal / 8w / Intermediate',
    sport: 'CYCLING',
    methodology: 'PYRAMIDAL',
    totalWeeks: 8,
    sessionsPerWeek: 5,
    experienceLevel: 'intermediate',
    goal: 'Öka FTP med 10% inför Vätternrundan',
    hasTestData: true,
  },

  // ── Multi-sport ─────────────────────────────────────────────────

  {
    id: 'triathlon-polarized-16w',
    name: 'Triathlon / Polarized / 16w / Intermediate',
    sport: 'TRIATHLON',
    methodology: 'POLARIZED',
    totalWeeks: 16,
    sessionsPerWeek: 8,
    experienceLevel: 'intermediate',
    goal: 'Olympisk distans triathlon under 2:30',
    hasTestData: false,
  },
  {
    id: 'swimming-12w',
    name: 'Swimming / 12w / Beginner',
    sport: 'SWIMMING',
    methodology: 'POLARIZED',
    totalWeeks: 12,
    sessionsPerWeek: 4,
    experienceLevel: 'beginner',
    goal: 'Simma 1500m i öppet vatten',
    hasTestData: false,
  },
  {
    id: 'skiing-pyramidal-24w',
    name: 'Skiing / Pyramidal / 24w / Advanced',
    sport: 'SKIING',
    methodology: 'PYRAMIDAL',
    totalWeeks: 24,
    sessionsPerWeek: 6,
    experienceLevel: 'advanced',
    goal: 'Vasaloppet under 7 timmar',
    hasTestData: true,
  },

  // ── Functional ──────────────────────────────────────────────────

  {
    id: 'hyrox-12w',
    name: 'HYROX / 12w / Intermediate',
    sport: 'HYROX',
    methodology: 'POLARIZED',
    totalWeeks: 12,
    sessionsPerWeek: 5,
    experienceLevel: 'intermediate',
    goal: 'HYROX-tävling under 1:30 (Pro division)',
    hasTestData: false,
  },
  {
    id: 'strength-8w',
    name: 'Strength / 8w / Beginner',
    sport: 'STRENGTH',
    methodology: 'PYRAMIDAL',
    totalWeeks: 8,
    sessionsPerWeek: 4,
    experienceLevel: 'beginner',
    goal: 'Bygga grundstyrka, lära sig baslyft',
    hasTestData: false,
  },

  // ── Team Sport ──────────────────────────────────────────────────

  {
    id: 'football-16w-preseason',
    name: 'Football / 16w / Pre-season',
    sport: 'TEAM_FOOTBALL',
    methodology: 'POLARIZED',
    totalWeeks: 16,
    sessionsPerWeek: 5,
    experienceLevel: 'intermediate',
    goal: 'Försäsongsförberedelse: kondition + styrka + explosivitet',
    hasTestData: true,
  },

  // ── Edge Cases ──────────────────────────────────────────────────

  {
    id: 'running-injury-knee',
    name: 'Running / Injury (Knee, Pain 4)',
    sport: 'RUNNING',
    methodology: 'POLARIZED',
    totalWeeks: 12,
    sessionsPerWeek: 4,
    experienceLevel: 'intermediate',
    goal: 'Återkomst efter knäskada, bygga upp till 10 km',
    injuries: [
      {
        type: 'patellofemoral_syndrome',
        painLevel: 4,
        bodyPart: 'knä',
        status: 'recovering',
        notes: 'Smärta vid löpning i nerförsbacke, OK på plan mark',
      },
    ],
    hasTestData: false,
  },
  {
    id: 'running-calendar-blocked',
    name: 'Running / Calendar Constraints',
    sport: 'RUNNING',
    methodology: 'POLARIZED',
    totalWeeks: 12,
    sessionsPerWeek: 5,
    experienceLevel: 'intermediate',
    goal: 'Halvmaraton under 1:45',
    calendarConstraints: {
      blockedDates: ['2026-04-10', '2026-04-11', '2026-04-12', '2026-04-13'],
      reducedDates: ['2026-05-01', '2026-05-02'],
      altitudePeriods: [],
    },
    hasTestData: false,
  },
  {
    id: 'running-short-4w',
    name: 'Running / Short 4w Program',
    sport: 'RUNNING',
    methodology: 'POLARIZED',
    totalWeeks: 4,
    sessionsPerWeek: 4,
    experienceLevel: 'intermediate',
    goal: 'Kort upptrappning inför tävling om 4 veckor',
    hasTestData: false,
  },
]

/**
 * Get scenario by ID
 */
export function getScenario(id: string): TestScenario | undefined {
  return TEST_SCENARIOS.find(s => s.id === id)
}

/**
 * Get subset of scenarios by IDs
 */
export function getScenarios(ids: string[]): TestScenario[] {
  return TEST_SCENARIOS.filter(s => ids.includes(s.id))
}
