// lib/program-generator/generators/strength-generator.ts
// Standalone strength training program generator

import { Client, CreateTrainingDayDTO, CreateTrainingProgramDTO, CreateWorkoutDTO, WorkoutIntensity } from '@/types'
import { getProgramStartDate, getProgramEndDate } from '../date-utils'
import { logger } from '@/lib/logger'

export interface StrengthProgramParams {
  clientId: string
  coachId: string
  goal: string
  durationWeeks: number
  sessionsPerWeek: number
  notes?: string
  targetRaceDate?: Date
}

/**
 * Generate a standalone strength training program
 * Uses the 5-phase periodization system from the strength training engine
 */
export async function generateStrengthProgram(
  params: StrengthProgramParams,
  client: Client
): Promise<CreateTrainingProgramDTO> {
  logger.debug('Starting strength program generation', {
    goal: params.goal,
    durationWeeks: params.durationWeeks,
    sessionsPerWeek: params.sessionsPerWeek,
  })

  const startDate = getProgramStartDate()
  const endDate = getProgramEndDate(startDate, params.durationWeeks)

  const goalLabels: Record<string, string> = {
    'injury-prevention': 'Skadeprevention',
    'power': 'Kraftutveckling',
    'running-economy': 'Löparekonomi',
    'general': 'Allmän styrka',
  }

  const goalDescriptions: Record<string, string> = {
    'injury-prevention': 'Fokus på stabilitet, balans och svaga punkter för att förebygga skador',
    'power': 'Explosivitet och maximal styrka för prestationsökning',
    'running-economy': 'Styrketräning optimerad för löpare - benstyrka och stabilitet',
    'general': 'Balanserad styrketräning för hela kroppen',
  }

  // Calculate phase distribution for strength periodization
  const phases = calculateStrengthPhases(params.durationWeeks, params.goal)

  const weeks = Array.from({ length: params.durationWeeks }).map((_, i) => {
    const weekNum = i + 1
    const phase = getStrengthPhaseForWeek(weekNum, phases)
    const days = buildStrengthWeekDays(params.goal, phase, weekNum, params.durationWeeks, params.sessionsPerWeek)

    return {
      weekNumber: weekNum,
      startDate: new Date(startDate.getTime() + i * 7 * 24 * 60 * 60 * 1000),
      phase: phase.phase,
      volume: days.reduce((sum, day) => sum + day.workouts.reduce((total, workout) => total + (workout.duration || 0), 0), 0),
      focus: phase.focus,
      days,
    }
  })

  return {
    clientId: params.clientId,
    coachId: params.coachId,
    testId: undefined,
    name: `${goalLabels[params.goal] || 'Styrkeprogram'} - ${client.name}`,
    goalType: params.goal,
    startDate,
    endDate,
    notes: params.notes || goalDescriptions[params.goal] || 'Periodiserat styrketräningsprogram',
    weeks,
  }
}

function buildStrengthWeekDays(
  goal: string,
  phase: { name: string; duration: number; focus: string; phase: 'BASE' | 'BUILD' | 'PEAK' | 'TAPER' },
  weekNumber: number,
  totalWeeks: number,
  sessionsPerWeek: number
): CreateTrainingDayDTO[] {
  const sessions = Math.min(6, Math.max(2, sessionsPerWeek))
  const load = getStrengthLoad(phase.phase, weekNumber, totalWeeks)
  const planned = getStrengthWorkoutPlan(goal, phase.phase, load)
  const priorityDays = sessions <= 2 ? [1, 4] : sessions === 3 ? [1, 3, 5] : sessions === 4 ? [1, 2, 4, 6] : [1, 2, 3, 5, 6, 7]

  const keep = new Map(priorityDays.slice(0, sessions).map((day, index) => [day, planned[index % planned.length]]))
  return Array.from({ length: 7 }).map((_, index) => ({
    dayNumber: index + 1,
    notes: keep.has(index + 1) ? phase.focus : 'Vilodag',
    workouts: keep.get(index + 1) ? [keep.get(index + 1)!] : [],
  }))
}

function getStrengthWorkoutPlan(
  goal: string,
  phase: 'BASE' | 'BUILD' | 'PEAK' | 'TAPER',
  load: StrengthLoad
): CreateWorkoutDTO[] {
  if (goal === 'injury-prevention') {
    return [
      strengthWorkout('Stabilitet och unilateral kontroll', 'MODERATE', load, [
        exercise('Split squat', load.sets, load.reps, 'Kontrollerad excentrisk fas och stabil knälinje'),
        exercise('Enbens RDL', load.sets, load.reps, 'Höftkontroll, baksida och balans'),
        exercise('Sidoplanka med benlyft', 3, '30-45 sek', 'Bål och höftstabilitet'),
      ]),
      strengthWorkout('Prehab helkropp', 'EASY', load, [
        exercise('Copenhagen plank', 3, '20-30 sek/sida', 'Ljumske och adduktorer'),
        exercise('Excentriska vadpressar', 3, '10-12', 'Fotled och vadkapacitet'),
        exercise('Face pull / utåtrotation', 3, '12-15', 'Axelkontroll'),
      ]),
      strengthWorkout('Rörlighet och robusthet', 'EASY', load, [
        exercise('Goblet squat', 3, '8-10', 'Djup, kontroll och rörlighet'),
        exercise('Dead bug', 3, '8/side', 'Båltryck och kontroll'),
        exercise('Lateral lunge', 3, '8/side', 'Sidledsstyrka och höftmobilitet'),
      ]),
    ]
  }

  if (goal === 'power') {
    return [
      strengthWorkout('Maxstyrka underkropp', phase === 'PEAK' ? 'THRESHOLD' : 'MODERATE', load, [
        exercise('Back squat eller trap bar deadlift', load.sets, load.reps, 'Tung men tekniskt ren huvudövning'),
        exercise('Bulgarian split squat', 3, '6-8/ben', 'Unilateral kraft'),
        exercise('Nordic hamstring', 3, '4-6', 'Excentrisk baksida'),
      ]),
      strengthWorkout('Explosiv power', 'INTERVAL', load, [
        exercise('Box jump', 4, '3-5', 'Full vila och maximal kvalitet'),
        exercise('Kettlebell swing', 4, '6-8', 'Explosiv höftsträckning'),
        exercise('Medicine ball throw', 4, '4-6', 'Rotationskraft'),
      ]),
      strengthWorkout('Överkropp och bålstyrka', 'MODERATE', load, [
        exercise('Bench press eller push press', load.sets, load.reps, 'Pressstyrka'),
        exercise('Pull-up eller rodd', load.sets, load.reps, 'Dragstyrka'),
        exercise('Pallof press', 3, '10/side', 'Antirotation'),
      ]),
    ]
  }

  if (goal === 'running-economy') {
    return [
      strengthWorkout('Löpekonomi - tung bas', 'MODERATE', load, [
        exercise('Trap bar deadlift', load.sets, load.reps, 'Hög kraft med neutral rygg'),
        exercise('Step-up', 3, '6-8/ben', 'Höftsträckning och knäkontroll'),
        exercise('Soleus raise', 3, '10-12', 'Specifik vadstyrka'),
      ]),
      strengthWorkout('Plyometrik och stiffness', 'INTERVAL', load, [
        exercise('Pogo jumps', 4, '15-20 sek', 'Kort markkontakt'),
        exercise('Bounds', 4, '20-30 m', 'Elastisk kraft'),
        exercise('Höft/bål-circuit', 3, '8-10', 'Kontroll i löpsteget'),
      ]),
      strengthWorkout('Prehab för löpare', 'EASY', load, [
        exercise('Monster walk', 3, '10/side', 'Höftabduktorer'),
        exercise('Hamstring slider', 3, '8-10', 'Baksida lår'),
        exercise('Tibialis raise', 3, '12-15', 'Underben och fotled'),
      ]),
    ]
  }

  return [
    strengthWorkout('Helkropp A', 'MODERATE', load, [
      exercise('Squat eller benpress', load.sets, load.reps, 'Benstyrka'),
      exercise('Hantelpress eller armhävning', load.sets, load.reps, 'Press'),
      exercise('Rodd', load.sets, load.reps, 'Drag'),
    ]),
    strengthWorkout('Helkropp B', 'MODERATE', load, [
      exercise('Marklyft/RDL', load.sets, load.reps, 'Höftdominant styrka'),
      exercise('Utfall', 3, '8/ben', 'Unilateral styrka'),
      exercise('Planka + sidoplanka', 3, '30-45 sek', 'Bål'),
    ]),
    strengthWorkout('Konditionell styrkecirkel', 'THRESHOLD', load, [
      exercise('Goblet squat', 3, '10-12', 'Kontrollerad helkroppsbelastning'),
      exercise('Farmer carry', 3, '30-40 m', 'Grepp och bål'),
      exercise('Sled push eller step-up', 3, '30 sek', 'Arbetskapacitet'),
    ]),
  ]
}

type StrengthLoad = {
  sets: number
  reps: string
  rest: number
}

function getStrengthLoad(phase: 'BASE' | 'BUILD' | 'PEAK' | 'TAPER', weekNumber: number, totalWeeks: number): StrengthLoad {
  if (phase === 'TAPER' || weekNumber === totalWeeks) return { sets: 2, reps: '5-6', rest: 90 }
  if (phase === 'PEAK') return { sets: 4, reps: '3-5', rest: 150 }
  if (phase === 'BUILD') return { sets: 4, reps: '5-8', rest: 120 }
  return { sets: 3, reps: '8-12', rest: 75 }
}

function strengthWorkout(
  name: string,
  intensity: WorkoutIntensity,
  load: StrengthLoad,
  exercises: Array<{ name: string; sets: number; reps: string; note: string }>
): CreateWorkoutDTO {
  return {
    type: name.toLowerCase().includes('plyometrik') || name.toLowerCase().includes('power') ? 'PLYOMETRIC' : 'STRENGTH',
    name,
    intensity,
    duration: intensity === 'EASY' ? 40 : 50,
    instructions: exercises.map((item) => `${item.name}: ${item.sets} x ${item.reps} (${item.note})`).join('. '),
    segments: [
      { order: 1, type: 'warmup', duration: 10, description: 'Dynamisk uppvärmning, aktivering och ramp-up set' },
      ...exercises.map((item, index) => ({
        order: index + 2,
        type: 'exercise' as const,
        duration: 10,
        sets: item.sets,
        repsCount: item.reps,
        rest: load.rest,
        description: `${item.name}: ${item.note}`,
      })),
      { order: exercises.length + 2, type: 'cooldown', duration: 5, description: 'Lätt rörlighet och andning' },
    ],
  }
}

function exercise(name: string, sets: number, reps: string, note: string) {
  return { name, sets, reps, note }
}

/**
 * Calculate strength periodization phases
 * Based on Bompa & Haff (2009) 5-phase model:
 * - Anatomical Adaptation (AA): 4-6 weeks
 * - Maximum Strength (MS): 6-8 weeks
 * - Power/Conversion: 3-4 weeks
 * - Maintenance: Varies
 * - Taper: 1-2 weeks
 */
function calculateStrengthPhases(durationWeeks: number, goal: string) {
  interface PhaseConfig {
    name: string
    duration: number
    focus: string
    phase: 'BASE' | 'BUILD' | 'PEAK' | 'TAPER'
  }

  const phases: PhaseConfig[] = []
  let remainingWeeks = durationWeeks

  // AA Phase (always first, 3-4 weeks)
  const aaWeeks = Math.min(4, Math.ceil(remainingWeeks * 0.25))
  phases.push({
    name: 'Anatomisk Adaptation',
    duration: aaWeeks,
    focus: 'Bygg grundstyrka med måttlig belastning och hög volym',
    phase: 'BASE',
  })
  remainingWeeks -= aaWeeks

  // Goal-specific middle phases
  if (goal === 'power' && remainingWeeks > 4) {
    // Max Strength then Power
    const msWeeks = Math.min(6, Math.ceil(remainingWeeks * 0.5))
    phases.push({
      name: 'Maxstyrka',
      duration: msWeeks,
      focus: 'Höjning av maximal styrka med tung belastning',
      phase: 'BUILD',
    })
    remainingWeeks -= msWeeks

    const powerWeeks = Math.max(3, remainingWeeks - 1)
    phases.push({
      name: 'Kraft/Explosivitet',
      duration: powerWeeks,
      focus: 'Konvertering till explosiv kraft och reaktiv styrka',
      phase: 'PEAK',
    })
    remainingWeeks -= powerWeeks
  } else if (goal === 'injury-prevention') {
    // Focus on stability throughout
    const stabilityWeeks = remainingWeeks - 1
    phases.push({
      name: 'Stabilitet & Balans',
      duration: stabilityWeeks,
      focus: 'Unilaterala övningar, core-styrka och funktionell stabilitet',
      phase: 'BUILD',
    })
    remainingWeeks -= stabilityWeeks
  } else {
    // General strength progression
    const buildWeeks = remainingWeeks - 1
    phases.push({
      name: 'Progressiv Styrka',
      duration: buildWeeks,
      focus: 'Gradvis ökad belastning med fokus på huvudlyft',
      phase: 'BUILD',
    })
    remainingWeeks -= buildWeeks
  }

  // Taper/Maintenance (last 1-2 weeks)
  if (remainingWeeks > 0) {
    phases.push({
      name: 'Underhåll/Taper',
      duration: remainingWeeks,
      focus: 'Behåll styrka med reducerad volym',
      phase: 'TAPER',
    })
  }

  return phases
}

/**
 * Get the phase configuration for a specific week
 */
function getStrengthPhaseForWeek(
  weekNum: number,
  phases: { name: string; duration: number; focus: string; phase: 'BASE' | 'BUILD' | 'PEAK' | 'TAPER' }[]
) {
  let cumulativeWeeks = 0

  for (const phase of phases) {
    cumulativeWeeks += phase.duration
    if (weekNum <= cumulativeWeeks) {
      return phase
    }
  }

  // Default to last phase if somehow we exceed
  return phases[phases.length - 1]
}
