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

  // ── Strength / Gym ─────────────────────────────────────────────

  {
    id: 'strength-hypertrophy-12w',
    name: 'Strength / Hypertrophy / 12w / Intermediate',
    sport: 'STRENGTH',
    methodology: 'PYRAMIDAL',
    totalWeeks: 12,
    sessionsPerWeek: 4,
    experienceLevel: 'intermediate',
    goal: 'Bygga muskelmassa, fokus på överkropp och ben',
    hasTestData: false,
  },
  {
    id: 'strength-power-8w',
    name: 'Strength / Max Strength / 8w / Advanced',
    sport: 'STRENGTH',
    methodology: 'PYRAMIDAL',
    totalWeeks: 8,
    sessionsPerWeek: 5,
    experienceLevel: 'advanced',
    goal: 'Maximera styrka i SBD (squat, bänk, mark)',
    hasTestData: false,
  },
  {
    id: 'general-fitness-beginner-8w',
    name: 'General Fitness / 8w / Beginner',
    sport: 'GENERAL_FITNESS',
    methodology: 'POLARIZED',
    totalWeeks: 8,
    sessionsPerWeek: 3,
    experienceLevel: 'beginner',
    goal: 'Komma igång med träning, gå ner 5 kg',
    hasTestData: false,
  },
  {
    id: 'general-fitness-intermediate-12w',
    name: 'General Fitness / 12w / Intermediate',
    sport: 'GENERAL_FITNESS',
    methodology: 'PYRAMIDAL',
    totalWeeks: 12,
    sessionsPerWeek: 4,
    experienceLevel: 'intermediate',
    goal: 'Förbättra kondition och styrka parallellt',
    hasTestData: false,
  },
  {
    id: 'functional-fitness-12w',
    name: 'Functional Fitness / 12w / Intermediate',
    sport: 'FUNCTIONAL_FITNESS',
    methodology: 'PYRAMIDAL',
    totalWeeks: 12,
    sessionsPerWeek: 5,
    experienceLevel: 'intermediate',
    goal: 'Förbättra benchmarks (pull-ups, snatch, clean & jerk)',
    hasTestData: false,
  },
  {
    id: 'hyrox-16w-advanced',
    name: 'HYROX / 16w / Advanced',
    sport: 'HYROX',
    methodology: 'POLARIZED',
    totalWeeks: 16,
    sessionsPerWeek: 6,
    experienceLevel: 'advanced',
    goal: 'HYROX Pro under 1:10',
    hasTestData: false,
  },
  {
    id: 'strength-injury-shoulder',
    name: 'Strength / Injury (Shoulder) / 8w',
    sport: 'STRENGTH',
    methodology: 'PYRAMIDAL',
    totalWeeks: 8,
    sessionsPerWeek: 3,
    experienceLevel: 'intermediate',
    goal: 'Träna runt axelskada, behålla styrka i underkropp',
    injuries: [
      {
        type: 'shoulder_impingement',
        painLevel: 5,
        bodyPart: 'axel',
        status: 'recovering',
        notes: 'Smärta vid press ovanför huvudet och bänkpress med bred grepp',
      },
    ],
    hasTestData: false,
  },
  {
    id: 'general-fitness-home-8w',
    name: 'General Fitness / Home / 8w / Beginner',
    sport: 'GENERAL_FITNESS',
    methodology: 'POLARIZED',
    totalWeeks: 8,
    sessionsPerWeek: 3,
    experienceLevel: 'beginner',
    goal: 'Träna hemma med hantlar och kroppsvikt',
    hasTestData: false,
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
