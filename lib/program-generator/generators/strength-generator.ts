// lib/program-generator/generators/strength-generator.ts
// Standalone strength training program generator

import { Client, CreateTrainingDayDTO, CreateTrainingProgramDTO, CreateWorkoutDTO, WorkoutIntensity } from '@/types'
import { getProgramStartDate, getProgramEndDate } from '../date-utils'
import { logger } from '@/lib/logger'

type AppLocale = 'en' | 'sv'

export interface StrengthProgramParams {
  clientId: string
  coachId: string
  goal: string
  durationWeeks: number
  sessionsPerWeek: number
  locale?: AppLocale
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
  const locale: AppLocale = params.locale === 'sv' ? 'sv' : 'en'

  const goalLabels: Record<string, { en: string; sv: string }> = {
    'injury-prevention': { en: 'Injury prevention', sv: 'Skadeprevention' },
    'power': { en: 'Power development', sv: 'Kraftutveckling' },
    'running-economy': { en: 'Running economy', sv: 'Löparekonomi' },
    'general': { en: 'General strength', sv: 'Allmän styrka' },
  }

  const goalDescriptions: Record<string, { en: string; sv: string }> = {
    'injury-prevention': { en: 'Focus on stability, balance, and weak links to reduce injury risk', sv: 'Fokus på stabilitet, balans och svaga punkter för att förebygga skador' },
    'power': { en: 'Explosiveness and maximum strength for performance gains', sv: 'Explosivitet och maximal styrka för prestationsökning' },
    'running-economy': { en: 'Strength training optimized for runners - leg strength and stability', sv: 'Styrketräning optimerad för löpare - benstyrka och stabilitet' },
    'general': { en: 'Balanced full-body strength training', sv: 'Balanserad styrketräning för hela kroppen' },
  }

  // Calculate phase distribution for strength periodization
  const phases = calculateStrengthPhases(params.durationWeeks, params.goal, locale)

  const weeks = Array.from({ length: params.durationWeeks }).map((_, i) => {
    const weekNum = i + 1
    const phase = getStrengthPhaseForWeek(weekNum, phases)
    const days = buildStrengthWeekDays(params.goal, phase, weekNum, params.durationWeeks, params.sessionsPerWeek, locale)

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
    name: `${goalLabels[params.goal]?.[locale] || t(locale, 'Strength program', 'Styrkeprogram')} - ${client.name}`,
    goalType: params.goal,
    startDate,
    endDate,
    notes: params.notes || goalDescriptions[params.goal]?.[locale] || t(locale, 'Periodized strength training program', 'Periodiserat styrketräningsprogram'),
    weeks,
  }
}

function buildStrengthWeekDays(
  goal: string,
  phase: { name: string; duration: number; focus: string; phase: 'BASE' | 'BUILD' | 'PEAK' | 'TAPER' },
  weekNumber: number,
  totalWeeks: number,
  sessionsPerWeek: number,
  locale: AppLocale
): CreateTrainingDayDTO[] {
  const sessions = Math.min(6, Math.max(2, sessionsPerWeek))
  const load = getStrengthLoad(phase.phase, weekNumber, totalWeeks)
  const planned = getStrengthWorkoutPlan(goal, phase.phase, load, locale)
  const priorityDays = sessions <= 2 ? [1, 4] : sessions === 3 ? [1, 3, 5] : sessions === 4 ? [1, 2, 4, 6] : [1, 2, 3, 5, 6, 7]

  const keep = new Map(priorityDays.slice(0, sessions).map((day, index) => [day, planned[index % planned.length]]))
  return Array.from({ length: 7 }).map((_, index) => ({
    dayNumber: index + 1,
    notes: keep.has(index + 1) ? phase.focus : t(locale, 'Rest day', 'Vilodag'),
    workouts: keep.get(index + 1) ? [keep.get(index + 1)!] : [],
  }))
}

function getStrengthWorkoutPlan(
  goal: string,
  phase: 'BASE' | 'BUILD' | 'PEAK' | 'TAPER',
  load: StrengthLoad,
  locale: AppLocale
): CreateWorkoutDTO[] {
  if (goal === 'injury-prevention') {
    return [
      strengthWorkout(t(locale, 'Stability and unilateral control', 'Stabilitet och unilateral kontroll'), 'MODERATE', load, locale, [
        exercise('Split squat', load.sets, load.reps, t(locale, 'Controlled eccentric phase and stable knee tracking', 'Kontrollerad excentrisk fas och stabil knälinje')),
        exercise(t(locale, 'Single-leg RDL', 'Enbens RDL'), load.sets, load.reps, t(locale, 'Hip control, posterior chain, and balance', 'Höftkontroll, baksida och balans')),
        exercise(t(locale, 'Side plank with leg lift', 'Sidoplanka med benlyft'), 3, t(locale, '30-45 sec', '30-45 sek'), t(locale, 'Trunk and hip stability', 'Bål och höftstabilitet')),
      ]),
      strengthWorkout(t(locale, 'Full-body prehab', 'Prehab helkropp'), 'EASY', load, locale, [
        exercise('Copenhagen plank', 3, t(locale, '20-30 sec/side', '20-30 sek/sida'), t(locale, 'Groin and adductors', 'Ljumske och adduktorer')),
        exercise(t(locale, 'Eccentric calf raises', 'Excentriska vadpressar'), 3, '10-12', t(locale, 'Ankle and calf capacity', 'Fotled och vadkapacitet')),
        exercise(t(locale, 'Face pull / external rotation', 'Face pull / utåtrotation'), 3, '12-15', t(locale, 'Shoulder control', 'Axelkontroll')),
      ]),
      strengthWorkout(t(locale, 'Mobility and robustness', 'Rörlighet och robusthet'), 'EASY', load, locale, [
        exercise('Goblet squat', 3, '8-10', t(locale, 'Depth, control, and mobility', 'Djup, kontroll och rörlighet')),
        exercise('Dead bug', 3, '8/side', t(locale, 'Trunk pressure and control', 'Båltryck och kontroll')),
        exercise('Lateral lunge', 3, '8/side', t(locale, 'Lateral strength and hip mobility', 'Sidledsstyrka och höftmobilitet')),
      ]),
    ]
  }

  if (goal === 'power') {
    return [
      strengthWorkout(t(locale, 'Lower-body maximum strength', 'Maxstyrka underkropp'), phase === 'PEAK' ? 'THRESHOLD' : 'MODERATE', load, locale, [
        exercise(t(locale, 'Back squat or trap bar deadlift', 'Back squat eller trap bar deadlift'), load.sets, load.reps, t(locale, 'Heavy but technically clean main lift', 'Tung men tekniskt ren huvudövning')),
        exercise('Bulgarian split squat', 3, t(locale, '6-8/leg', '6-8/ben'), t(locale, 'Unilateral power', 'Unilateral kraft')),
        exercise('Nordic hamstring', 3, '4-6', t(locale, 'Eccentric posterior chain', 'Excentrisk baksida')),
      ]),
      strengthWorkout(t(locale, 'Explosive power', 'Explosiv power'), 'INTERVAL', load, locale, [
        exercise('Box jump', 4, '3-5', t(locale, 'Full recovery and maximum quality', 'Full vila och maximal kvalitet')),
        exercise('Kettlebell swing', 4, '6-8', t(locale, 'Explosive hip extension', 'Explosiv höftsträckning')),
        exercise('Medicine ball throw', 4, '4-6', t(locale, 'Rotational power', 'Rotationskraft')),
      ]),
      strengthWorkout(t(locale, 'Upper body and trunk strength', 'Överkropp och bålstyrka'), 'MODERATE', load, locale, [
        exercise(t(locale, 'Bench press or push press', 'Bench press eller push press'), load.sets, load.reps, t(locale, 'Pressing strength', 'Pressstyrka')),
        exercise(t(locale, 'Pull-up or row', 'Pull-up eller rodd'), load.sets, load.reps, t(locale, 'Pulling strength', 'Dragstyrka')),
        exercise('Pallof press', 3, '10/side', 'Antirotation'),
      ]),
    ]
  }

  if (goal === 'running-economy') {
    return [
      strengthWorkout(t(locale, 'Running economy - heavy base', 'Löpekonomi - tung bas'), 'MODERATE', load, locale, [
        exercise('Trap bar deadlift', load.sets, load.reps, t(locale, 'High force with neutral spine', 'Hög kraft med neutral rygg')),
        exercise('Step-up', 3, t(locale, '6-8/leg', '6-8/ben'), t(locale, 'Hip extension and knee control', 'Höftsträckning och knäkontroll')),
        exercise('Soleus raise', 3, '10-12', t(locale, 'Specific calf strength', 'Specifik vadstyrka')),
      ]),
      strengthWorkout(t(locale, 'Plyometrics and stiffness', 'Plyometrik och stiffness'), 'INTERVAL', load, locale, [
        exercise('Pogo jumps', 4, t(locale, '15-20 sec', '15-20 sek'), t(locale, 'Short ground contact', 'Kort markkontakt')),
        exercise('Bounds', 4, '20-30 m', t(locale, 'Elastic power', 'Elastisk kraft')),
        exercise(t(locale, 'Hip/trunk circuit', 'Höft/bål-circuit'), 3, '8-10', t(locale, 'Control in the running stride', 'Kontroll i löpsteget')),
      ]),
      strengthWorkout(t(locale, 'Runner prehab', 'Prehab för löpare'), 'EASY', load, locale, [
        exercise('Monster walk', 3, '10/side', t(locale, 'Hip abductors', 'Höftabduktorer')),
        exercise('Hamstring slider', 3, '8-10', t(locale, 'Hamstrings', 'Baksida lår')),
        exercise('Tibialis raise', 3, '12-15', t(locale, 'Lower leg and ankle', 'Underben och fotled')),
      ]),
    ]
  }

  return [
    strengthWorkout(t(locale, 'Full body A', 'Helkropp A'), 'MODERATE', load, locale, [
      exercise(t(locale, 'Squat or leg press', 'Squat eller benpress'), load.sets, load.reps, t(locale, 'Leg strength', 'Benstyrka')),
      exercise(t(locale, 'Dumbbell press or push-up', 'Hantelpress eller armhävning'), load.sets, load.reps, t(locale, 'Press', 'Press')),
      exercise(t(locale, 'Row', 'Rodd'), load.sets, load.reps, t(locale, 'Pull', 'Drag')),
    ]),
    strengthWorkout(t(locale, 'Full body B', 'Helkropp B'), 'MODERATE', load, locale, [
      exercise(t(locale, 'Deadlift/RDL', 'Marklyft/RDL'), load.sets, load.reps, t(locale, 'Hip-dominant strength', 'Höftdominant styrka')),
      exercise(t(locale, 'Lunge', 'Utfall'), 3, t(locale, '8/leg', '8/ben'), t(locale, 'Unilateral strength', 'Unilateral styrka')),
      exercise(t(locale, 'Plank + side plank', 'Planka + sidoplanka'), 3, t(locale, '30-45 sec', '30-45 sek'), t(locale, 'Trunk', 'Bål')),
    ]),
    strengthWorkout(t(locale, 'Conditioning strength circuit', 'Konditionell styrkecirkel'), 'THRESHOLD', load, locale, [
      exercise('Goblet squat', 3, '10-12', t(locale, 'Controlled full-body loading', 'Kontrollerad helkroppsbelastning')),
      exercise('Farmer carry', 3, '30-40 m', t(locale, 'Grip and trunk', 'Grepp och bål')),
      exercise(t(locale, 'Sled push or step-up', 'Sled push eller step-up'), 3, t(locale, '30 sec', '30 sek'), t(locale, 'Work capacity', 'Arbetskapacitet')),
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
  locale: AppLocale,
  exercises: Array<{ name: string; sets: number; reps: string; note: string }>
): CreateWorkoutDTO {
  return {
    type: name.toLowerCase().includes('plyometrik') || name.toLowerCase().includes('power') ? 'PLYOMETRIC' : 'STRENGTH',
    name,
    intensity,
    duration: intensity === 'EASY' ? 40 : 50,
    instructions: exercises.map((item) => `${item.name}: ${item.sets} x ${item.reps} (${item.note})`).join('. '),
    segments: [
      { order: 1, type: 'warmup', duration: 10, description: t(locale, 'Dynamic warm-up, activation, and ramp-up sets', 'Dynamisk uppvärmning, aktivering och ramp-up set') },
      ...exercises.map((item, index) => ({
        order: index + 2,
        type: 'exercise' as const,
        duration: 10,
        sets: item.sets,
        repsCount: item.reps,
        rest: load.rest,
        description: `${item.name}: ${item.note}`,
      })),
      { order: exercises.length + 2, type: 'cooldown', duration: 5, description: t(locale, 'Light mobility and breathing', 'Lätt rörlighet och andning') },
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
function calculateStrengthPhases(durationWeeks: number, goal: string, locale: AppLocale) {
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
    name: t(locale, 'Anatomical adaptation', 'Anatomisk Adaptation'),
    duration: aaWeeks,
    focus: t(locale, 'Build foundational strength with moderate load and higher volume', 'Bygg grundstyrka med måttlig belastning och hög volym'),
    phase: 'BASE',
  })
  remainingWeeks -= aaWeeks

  // Goal-specific middle phases
  if (goal === 'power' && remainingWeeks > 4) {
    // Max Strength then Power
    const msWeeks = Math.min(6, Math.ceil(remainingWeeks * 0.5))
    phases.push({
      name: t(locale, 'Maximum strength', 'Maxstyrka'),
      duration: msWeeks,
      focus: t(locale, 'Increase maximum strength with heavy loading', 'Höjning av maximal styrka med tung belastning'),
      phase: 'BUILD',
    })
    remainingWeeks -= msWeeks

    const powerWeeks = Math.max(3, remainingWeeks - 1)
    phases.push({
      name: t(locale, 'Power/explosiveness', 'Kraft/Explosivitet'),
      duration: powerWeeks,
      focus: t(locale, 'Convert strength into explosive power and reactive strength', 'Konvertering till explosiv kraft och reaktiv styrka'),
      phase: 'PEAK',
    })
    remainingWeeks -= powerWeeks
  } else if (goal === 'injury-prevention') {
    // Focus on stability throughout
    const stabilityWeeks = remainingWeeks - 1
    phases.push({
      name: t(locale, 'Stability & balance', 'Stabilitet & Balans'),
      duration: stabilityWeeks,
      focus: t(locale, 'Unilateral exercises, trunk strength, and functional stability', 'Unilaterala övningar, core-styrka och funktionell stabilitet'),
      phase: 'BUILD',
    })
    remainingWeeks -= stabilityWeeks
  } else {
    // General strength progression
    const buildWeeks = remainingWeeks - 1
    phases.push({
      name: t(locale, 'Progressive strength', 'Progressiv Styrka'),
      duration: buildWeeks,
      focus: t(locale, 'Gradually increase load with focus on main lifts', 'Gradvis ökad belastning med fokus på huvudlyft'),
      phase: 'BUILD',
    })
    remainingWeeks -= buildWeeks
  }

  // Taper/Maintenance (last 1-2 weeks)
  if (remainingWeeks > 0) {
    phases.push({
      name: t(locale, 'Maintenance/taper', 'Underhåll/Taper'),
      duration: remainingWeeks,
      focus: t(locale, 'Maintain strength with reduced volume', 'Behåll styrka med reducerad volym'),
      phase: 'TAPER',
    })
  }

  return phases
}

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
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
