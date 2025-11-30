// lib/program-generator/templates/skiing.ts
// Cross-country skiing training program templates with pace-based zones

import { PeriodPhase } from '@/types'

export interface SkiingTemplateWorkout {
  type: 'endurance' | 'tempo' | 'threshold' | 'vo2max' | 'sprint' | 'recovery' | 'technique' | 'distance'
  name: string
  description: string
  duration: number // minutes
  technique: 'classic' | 'skating' | 'both' | 'any'
  surface: 'snow' | 'roller_ski' | 'running' | 'any'
  paceZone: number // Primary zone (1-5)
  structure?: string // Interval structure like "4x8min @threshold"
}

export interface SkiingTemplateWeek {
  week: number
  phase: PeriodPhase
  focus: string
  weeklyHours: number
  keyWorkouts: SkiingTemplateWorkout[]
}

/**
 * 8-Week Threshold Builder Program (Competition Season)
 * Designed to improve lactate threshold pace for racing
 * Assumes athlete has snow access
 */
export function get8WeekThresholdBuilder(
  weeklyHours: 6 | 8 | 10 | 12
): SkiingTemplateWeek[] {
  const hourMultiplier = weeklyHours / 8 // Normalize to 8-hour base

  return [
    // PHASE 1: Base Building (Weeks 1-2)
    {
      week: 1,
      phase: 'BASE',
      focus: 'Bygg aerob grund och återvänd till snökänsla',
      weeklyHours: weeklyHours,
      keyWorkouts: getBaseSkiingWorkouts(1, hourMultiplier),
    },
    {
      week: 2,
      phase: 'BASE',
      focus: 'Fortsätt grundträning med tekniskt fokus',
      weeklyHours: weeklyHours,
      keyWorkouts: getBaseSkiingWorkouts(2, hourMultiplier),
    },

    // PHASE 2: Tempo Development (Weeks 3-4)
    {
      week: 3,
      phase: 'BUILD',
      focus: 'Introducera tempopass under tröskel',
      weeklyHours: weeklyHours,
      keyWorkouts: getTempoSkiingWorkouts(3, hourMultiplier),
    },
    {
      week: 4,
      phase: 'RECOVERY',
      focus: 'Återhämtningsvecka - teknikfokus',
      weeklyHours: Math.round(weeklyHours * 0.6),
      keyWorkouts: getRecoverySkiingWorkouts(hourMultiplier),
    },

    // PHASE 3: Threshold Development (Weeks 5-6)
    {
      week: 5,
      phase: 'BUILD',
      focus: 'Tröskelintervaller klassisk teknik',
      weeklyHours: weeklyHours,
      keyWorkouts: getThresholdSkiingWorkouts(5, 'classic', hourMultiplier),
    },
    {
      week: 6,
      phase: 'BUILD',
      focus: 'Tröskelintervaller skating',
      weeklyHours: weeklyHours,
      keyWorkouts: getThresholdSkiingWorkouts(6, 'skating', hourMultiplier),
    },

    // PHASE 4: Peak & Race Prep (Weeks 7-8)
    {
      week: 7,
      phase: 'PEAK',
      focus: 'VO2max-intervaller och fartlek',
      weeklyHours: weeklyHours,
      keyWorkouts: getPeakSkiingWorkouts(hourMultiplier),
    },
    {
      week: 8,
      phase: 'RECOVERY',
      focus: 'Taper inför tävling',
      weeklyHours: Math.round(weeklyHours * 0.5),
      keyWorkouts: getTaperSkiingWorkouts(hourMultiplier),
    },
  ]
}

/**
 * 12-Week Preparation Phase Program (Summer/Fall)
 * Focus on building base with roller skiing and cross-training
 */
export function get12WeekPrepBuilder(
  weeklyHours: 6 | 8 | 10 | 12 | 15
): SkiingTemplateWeek[] {
  const hourMultiplier = weeklyHours / 10

  const weeks: SkiingTemplateWeek[] = []

  for (let week = 1; week <= 12; week++) {
    let phase: PeriodPhase = 'BASE'
    let focus = ''
    let workouts: SkiingTemplateWorkout[] = []

    if (week <= 3) {
      focus = 'Grundläggande aerob utveckling - rullskidor och löpning'
      workouts = getPrepBaseWorkouts(week, hourMultiplier)
    } else if (week === 4 || week === 8) {
      phase = 'RECOVERY'
      focus = 'Återhämtningsvecka - lätt träning'
      workouts = getRecoverySkiingWorkouts(hourMultiplier * 0.7)
    } else if (week <= 7) {
      focus = 'Bygg volym med rullskidor'
      workouts = getPrepVolumeWorkouts(week, hourMultiplier)
    } else if (week <= 11) {
      phase = 'BUILD'
      focus = 'Ökad intensitet - tempoträning'
      workouts = getPrepBuildWorkouts(week, hourMultiplier)
    } else {
      phase = 'RECOVERY'
      focus = 'Utvärdering inför säsongstart'
      workouts = getEvaluationWorkouts(hourMultiplier)
    }

    weeks.push({
      week,
      phase,
      focus,
      weeklyHours: phase === 'RECOVERY' ? Math.round(weeklyHours * 0.6) : weeklyHours,
      keyWorkouts: workouts,
    })
  }

  return weeks
}

/**
 * 16-Week Vasaloppet Preparation
 * Long-distance race preparation (90km classic)
 */
export function get16WeekVasaloppetPrep(
  weeklyHours: 8 | 10 | 12 | 15
): SkiingTemplateWeek[] {
  const hourMultiplier = weeklyHours / 12

  const weeks: SkiingTemplateWeek[] = []

  for (let week = 1; week <= 16; week++) {
    let phase: PeriodPhase = 'BASE'
    let focus = ''
    let workouts: SkiingTemplateWorkout[] = []

    if (week <= 4) {
      focus = 'Bygg grunduthållighet med långa pass'
      workouts = getDistanceBaseWorkouts(week, hourMultiplier)
    } else if (week === 5 || week === 9 || week === 13) {
      phase = 'RECOVERY'
      focus = 'Återhämtningsvecka'
      workouts = getRecoverySkiingWorkouts(hourMultiplier * 0.6)
    } else if (week <= 8) {
      focus = 'Ökad distans - backträning klassisk'
      workouts = getDistanceBuildWorkouts(week, 'classic', hourMultiplier)
    } else if (week <= 12) {
      phase = 'BUILD'
      focus = 'Race-specifik träning - långpass med tempo'
      workouts = getVasaloppetSpecificWorkouts(week, hourMultiplier)
    } else if (week <= 15) {
      phase = 'PEAK'
      focus = 'Finjusteringar och simuleringar'
      workouts = getRaceSimulationWorkouts(week, hourMultiplier)
    } else {
      phase = 'RECOVERY'
      focus = 'Taper inför Vasaloppet'
      workouts = getVasaloppetTaperWorkouts(hourMultiplier)
    }

    weeks.push({
      week,
      phase,
      focus,
      weeklyHours: phase === 'RECOVERY' ? Math.round(weeklyHours * 0.5) : weeklyHours,
      keyWorkouts: workouts,
    })
  }

  return weeks
}

// ============================================
// WORKOUT GENERATORS
// ============================================

function getBaseSkiingWorkouts(week: number, multiplier: number): SkiingTemplateWorkout[] {
  return [
    {
      type: 'endurance',
      name: 'Långt distanspass',
      description: 'Lugnt tempo i Z2. Fokus på avslappnad teknik.',
      duration: Math.round(90 * multiplier),
      technique: 'classic',
      surface: 'snow',
      paceZone: 2,
    },
    {
      type: 'endurance',
      name: 'Grundpass skating',
      description: 'Medellångt pass i Z2. Jobba med glidkänsla.',
      duration: Math.round(60 * multiplier),
      technique: 'skating',
      surface: 'snow',
      paceZone: 2,
    },
    {
      type: 'technique',
      name: 'Teknikpass',
      description: `Övningar och drills för ${week === 1 ? 'klassisk' : 'skating'} teknik.`,
      duration: Math.round(45 * multiplier),
      technique: week === 1 ? 'classic' : 'skating',
      surface: 'snow',
      paceZone: 1,
    },
    {
      type: 'recovery',
      name: 'Återhämtningspass',
      description: 'Mycket lätt tempo. Stretching efteråt.',
      duration: Math.round(30 * multiplier),
      technique: 'any',
      surface: 'any',
      paceZone: 1,
    },
  ]
}

function getTempoSkiingWorkouts(week: number, multiplier: number): SkiingTemplateWorkout[] {
  return [
    {
      type: 'tempo',
      name: 'Tempopass klassisk',
      description: 'Kontrollerat tempo i Z3. Håll jämn rytm.',
      duration: Math.round(75 * multiplier),
      technique: 'classic',
      surface: 'snow',
      paceZone: 3,
      structure: '30 min uppvärmning + 30 min Z3 + 15 min nedvarvning',
    },
    {
      type: 'endurance',
      name: 'Långpass',
      description: 'Distanspass i varierad terräng.',
      duration: Math.round(100 * multiplier),
      technique: 'both',
      surface: 'snow',
      paceZone: 2,
    },
    {
      type: 'threshold',
      name: 'Korta tröskelintervaller',
      description: 'Introduktion till tröskelarbete.',
      duration: Math.round(60 * multiplier),
      technique: 'skating',
      surface: 'snow',
      paceZone: 4,
      structure: '4x4 min @Z4 med 3 min vila',
    },
    {
      type: 'recovery',
      name: 'Lätt pass',
      description: 'Aktiv återhämtning.',
      duration: Math.round(40 * multiplier),
      technique: 'any',
      surface: 'snow',
      paceZone: 1,
    },
  ]
}

function getThresholdSkiingWorkouts(
  week: number,
  technique: 'classic' | 'skating',
  multiplier: number
): SkiingTemplateWorkout[] {
  return [
    {
      type: 'threshold',
      name: `Tröskelintervaller ${technique === 'classic' ? 'klassisk' : 'skating'}`,
      description: `Intervaller vid laktattröskel i ${technique === 'classic' ? 'klassisk' : 'skating'} teknik.`,
      duration: Math.round(75 * multiplier),
      technique,
      surface: 'snow',
      paceZone: 4,
      structure: week === 5 ? '4x8 min @Z4 med 4 min vila' : '3x12 min @Z4 med 5 min vila',
    },
    {
      type: 'endurance',
      name: 'Distanspass',
      description: 'Långt pass i kuperad terräng.',
      duration: Math.round(120 * multiplier),
      technique: 'both',
      surface: 'snow',
      paceZone: 2,
    },
    {
      type: 'tempo',
      name: 'Fartlek',
      description: 'Lekfullt tempo med naturliga variationer.',
      duration: Math.round(60 * multiplier),
      technique: technique === 'classic' ? 'skating' : 'classic',
      surface: 'snow',
      paceZone: 3,
      structure: 'Variera tempo efter terräng, 1-3 min snabbare i backar',
    },
    {
      type: 'recovery',
      name: 'Återhämtning',
      description: 'Lätt pass med teknikfokus.',
      duration: Math.round(40 * multiplier),
      technique: 'any',
      surface: 'snow',
      paceZone: 1,
    },
  ]
}

function getPeakSkiingWorkouts(multiplier: number): SkiingTemplateWorkout[] {
  return [
    {
      type: 'vo2max',
      name: 'VO2max-intervaller',
      description: 'Hög intensitet för maximal syreupptagning.',
      duration: Math.round(60 * multiplier),
      technique: 'skating',
      surface: 'snow',
      paceZone: 5,
      structure: '5x3 min @Z5 med 3 min vila',
    },
    {
      type: 'threshold',
      name: 'Over/under intervaller',
      description: 'Växla mellan strax över och under tröskel.',
      duration: Math.round(70 * multiplier),
      technique: 'classic',
      surface: 'snow',
      paceZone: 4,
      structure: '4x(2 min @Z5 + 4 min @Z3) med 4 min vila',
    },
    {
      type: 'distance',
      name: 'Långpass med inslag',
      description: 'Distanspass med tempoökningar.',
      duration: Math.round(100 * multiplier),
      technique: 'both',
      surface: 'snow',
      paceZone: 2,
      structure: '20 min Z2 + 10 min Z3 + 40 min Z2 + 10 min Z3 + 20 min Z2',
    },
    {
      type: 'recovery',
      name: 'Lätt pass',
      description: 'Aktiv vila.',
      duration: Math.round(30 * multiplier),
      technique: 'any',
      surface: 'snow',
      paceZone: 1,
    },
  ]
}

function getRecoverySkiingWorkouts(multiplier: number): SkiingTemplateWorkout[] {
  return [
    {
      type: 'technique',
      name: 'Teknikpass klassisk',
      description: 'Fokus på diagonalgång och dubbelstakning.',
      duration: Math.round(45 * multiplier),
      technique: 'classic',
      surface: 'snow',
      paceZone: 1,
    },
    {
      type: 'technique',
      name: 'Teknikpass skating',
      description: 'Fokus på V1, V2 och paddling.',
      duration: Math.round(45 * multiplier),
      technique: 'skating',
      surface: 'snow',
      paceZone: 1,
    },
    {
      type: 'recovery',
      name: 'Lätt distans',
      description: 'Avslappnad åkning i vacker terräng.',
      duration: Math.round(50 * multiplier),
      technique: 'any',
      surface: 'snow',
      paceZone: 1,
    },
  ]
}

function getTaperSkiingWorkouts(multiplier: number): SkiingTemplateWorkout[] {
  return [
    {
      type: 'threshold',
      name: 'Korta öppnare',
      description: 'Några korta intervaller för att hålla skärpan.',
      duration: Math.round(40 * multiplier),
      technique: 'skating',
      surface: 'snow',
      paceZone: 4,
      structure: '3x3 min @Z4 med 3 min vila',
    },
    {
      type: 'endurance',
      name: 'Lätt distans',
      description: 'Håll benen i gång utan att trötta ut dig.',
      duration: Math.round(45 * multiplier),
      technique: 'both',
      surface: 'snow',
      paceZone: 2,
    },
    {
      type: 'recovery',
      name: 'Aktivering',
      description: 'Kort pass dagen före tävling.',
      duration: Math.round(25 * multiplier),
      technique: 'any',
      surface: 'snow',
      paceZone: 1,
      structure: 'Inkludera 4x30 sek snabbt',
    },
  ]
}

// Preparation phase workouts (roller skiing)
function getPrepBaseWorkouts(week: number, multiplier: number): SkiingTemplateWorkout[] {
  return [
    {
      type: 'endurance',
      name: 'Rullskidor distans',
      description: 'Långt pass på asfalt eller grusväg.',
      duration: Math.round(80 * multiplier),
      technique: 'classic',
      surface: 'roller_ski',
      paceZone: 2,
    },
    {
      type: 'endurance',
      name: 'Löpning kuperat',
      description: 'Löppass i kuperad terräng.',
      duration: Math.round(60 * multiplier),
      technique: 'any',
      surface: 'running',
      paceZone: 2,
    },
    {
      type: 'technique',
      name: 'Teknikpass rullskidor',
      description: 'Drills och övningar för att förbättra tekniken.',
      duration: Math.round(45 * multiplier),
      technique: 'both',
      surface: 'roller_ski',
      paceZone: 1,
    },
    {
      type: 'recovery',
      name: 'Lätt cykling/löpning',
      description: 'Aktiv återhämtning.',
      duration: Math.round(40 * multiplier),
      technique: 'any',
      surface: 'any',
      paceZone: 1,
    },
  ]
}

function getPrepVolumeWorkouts(week: number, multiplier: number): SkiingTemplateWorkout[] {
  return [
    {
      type: 'endurance',
      name: 'Långt rullskidspass',
      description: 'Bygg volym med längre pass.',
      duration: Math.round(100 * multiplier),
      technique: 'classic',
      surface: 'roller_ski',
      paceZone: 2,
    },
    {
      type: 'endurance',
      name: 'Skating rullskidor',
      description: 'Fokus på skating-teknik.',
      duration: Math.round(70 * multiplier),
      technique: 'skating',
      surface: 'roller_ski',
      paceZone: 2,
    },
    {
      type: 'tempo',
      name: 'Backrepetitioner',
      description: 'Intervaller i backe för kraft och teknik.',
      duration: Math.round(60 * multiplier),
      technique: 'classic',
      surface: 'roller_ski',
      paceZone: 3,
      structure: '8-10x2 min backe med vila ner',
    },
    {
      type: 'recovery',
      name: 'Lätt löpning',
      description: 'Avslappnad löpning.',
      duration: Math.round(40 * multiplier),
      technique: 'any',
      surface: 'running',
      paceZone: 1,
    },
  ]
}

function getPrepBuildWorkouts(week: number, multiplier: number): SkiingTemplateWorkout[] {
  return [
    {
      type: 'threshold',
      name: 'Tröskelpass rullskidor',
      description: 'Intervaller vid laktattröskel.',
      duration: Math.round(75 * multiplier),
      technique: 'skating',
      surface: 'roller_ski',
      paceZone: 4,
      structure: '4x8 min @Z4 med 4 min vila',
    },
    {
      type: 'endurance',
      name: 'Långpass varierat',
      description: 'Växla mellan klassisk och skating.',
      duration: Math.round(120 * multiplier),
      technique: 'both',
      surface: 'roller_ski',
      paceZone: 2,
    },
    {
      type: 'tempo',
      name: 'Fartlek löpning',
      description: 'Varierat tempo i terräng.',
      duration: Math.round(50 * multiplier),
      technique: 'any',
      surface: 'running',
      paceZone: 3,
    },
    {
      type: 'recovery',
      name: 'Lätt pass',
      description: 'Aktiv återhämtning.',
      duration: Math.round(40 * multiplier),
      technique: 'any',
      surface: 'any',
      paceZone: 1,
    },
  ]
}

function getEvaluationWorkouts(multiplier: number): SkiingTemplateWorkout[] {
  return [
    {
      type: 'threshold',
      name: 'Tröskeltest',
      description: '30-min maxtest för att utvärdera framsteg.',
      duration: Math.round(60 * multiplier),
      technique: 'classic',
      surface: 'roller_ski',
      paceZone: 4,
      structure: 'Uppvärmning 20 min + 30 min all-out + nedvarvning',
    },
    {
      type: 'endurance',
      name: 'Avslutande distans',
      description: 'Sista långpasset före säsongsstart.',
      duration: Math.round(90 * multiplier),
      technique: 'both',
      surface: 'roller_ski',
      paceZone: 2,
    },
  ]
}

// Vasaloppet-specific workouts
function getDistanceBaseWorkouts(week: number, multiplier: number): SkiingTemplateWorkout[] {
  return [
    {
      type: 'distance',
      name: 'Superslangt distanspass',
      description: 'Bygg uthållighet för Vasaloppet.',
      duration: Math.round(150 * multiplier),
      technique: 'classic',
      surface: 'snow',
      paceZone: 2,
    },
    {
      type: 'endurance',
      name: 'Medeldistans',
      description: 'Standard långpass.',
      duration: Math.round(90 * multiplier),
      technique: 'classic',
      surface: 'snow',
      paceZone: 2,
    },
    {
      type: 'technique',
      name: 'Dubbelstakning',
      description: 'Fokus på dubbelstakningsteknik.',
      duration: Math.round(60 * multiplier),
      technique: 'classic',
      surface: 'snow',
      paceZone: 2,
    },
    {
      type: 'recovery',
      name: 'Lätt pass',
      description: 'Aktiv vila.',
      duration: Math.round(40 * multiplier),
      technique: 'any',
      surface: 'any',
      paceZone: 1,
    },
  ]
}

function getDistanceBuildWorkouts(week: number, technique: 'classic' | 'skating', multiplier: number): SkiingTemplateWorkout[] {
  return [
    {
      type: 'distance',
      name: 'Långpass med backar',
      description: 'Kuperad bana för att bygga backstyrka.',
      duration: Math.round(180 * multiplier),
      technique,
      surface: 'snow',
      paceZone: 2,
    },
    {
      type: 'tempo',
      name: 'Tempopass i backe',
      description: 'Specifik backträning.',
      duration: Math.round(70 * multiplier),
      technique,
      surface: 'snow',
      paceZone: 3,
      structure: '10x3 min backe med vila ner',
    },
    {
      type: 'endurance',
      name: 'Medelpass',
      description: 'Standard uthållighetspass.',
      duration: Math.round(90 * multiplier),
      technique,
      surface: 'snow',
      paceZone: 2,
    },
    {
      type: 'recovery',
      name: 'Återhämtning',
      description: 'Lätt pass.',
      duration: Math.round(45 * multiplier),
      technique: 'any',
      surface: 'snow',
      paceZone: 1,
    },
  ]
}

function getVasaloppetSpecificWorkouts(week: number, multiplier: number): SkiingTemplateWorkout[] {
  return [
    {
      type: 'distance',
      name: 'Race-simulering',
      description: 'Simulera tävlingsdistans och tempo.',
      duration: Math.round(210 * multiplier),
      technique: 'classic',
      surface: 'snow',
      paceZone: 2,
      structure: 'Tänk dig in i tävling, öva dryck/mat',
    },
    {
      type: 'threshold',
      name: 'Tempoväxlingar',
      description: 'Öva tempohöjningar som i tävling.',
      duration: Math.round(90 * multiplier),
      technique: 'classic',
      surface: 'snow',
      paceZone: 3,
      structure: 'Varje 20 min: öka tempo i 5 min',
    },
    {
      type: 'endurance',
      name: 'Långpass dubbelstakningsfokus',
      description: 'Mycket dubbelstakning för Vasaloppet.',
      duration: Math.round(120 * multiplier),
      technique: 'classic',
      surface: 'snow',
      paceZone: 2,
    },
    {
      type: 'recovery',
      name: 'Lätt pass',
      description: 'Återhämtning.',
      duration: Math.round(40 * multiplier),
      technique: 'any',
      surface: 'snow',
      paceZone: 1,
    },
  ]
}

function getRaceSimulationWorkouts(week: number, multiplier: number): SkiingTemplateWorkout[] {
  return [
    {
      type: 'distance',
      name: 'Sista långa passet',
      description: 'Sista riktigt långa passet innan tävling.',
      duration: Math.round(180 * multiplier),
      technique: 'classic',
      surface: 'snow',
      paceZone: 2,
    },
    {
      type: 'tempo',
      name: 'Shakeout',
      description: 'Behåll känslan utan att trötta.',
      duration: Math.round(60 * multiplier),
      technique: 'classic',
      surface: 'snow',
      paceZone: 2,
      structure: 'Inkludera 4-5x1 min i tävlingstempo',
    },
    {
      type: 'recovery',
      name: 'Lätt pass',
      description: 'Vila inför tävling.',
      duration: Math.round(40 * multiplier),
      technique: 'any',
      surface: 'snow',
      paceZone: 1,
    },
  ]
}

function getVasaloppetTaperWorkouts(multiplier: number): SkiingTemplateWorkout[] {
  return [
    {
      type: 'endurance',
      name: 'Medellångt pass',
      description: 'Behåll baskondition.',
      duration: Math.round(60 * multiplier),
      technique: 'classic',
      surface: 'snow',
      paceZone: 2,
    },
    {
      type: 'tempo',
      name: 'Öppnare',
      description: 'Korta tempoökningar.',
      duration: Math.round(40 * multiplier),
      technique: 'classic',
      surface: 'snow',
      paceZone: 3,
      structure: '5x1 min race-tempo med full vila',
    },
    {
      type: 'recovery',
      name: 'Aktivering',
      description: 'Dagen före Vasaloppet.',
      duration: Math.round(20 * multiplier),
      technique: 'classic',
      surface: 'snow',
      paceZone: 1,
      structure: '15 min lätt + 4x30 sek snabbt',
    },
  ]
}

// Export all skiing templates
export const SKIING_TEMPLATES = {
  'threshold-builder-8week': {
    name: 'Tröskeltempo-byggare (8 veckor)',
    description: 'Utveckla ditt tröskeltempo för tävlingssäsongen.',
    duration: 8,
    generator: get8WeekThresholdBuilder,
  },
  'prep-phase-12week': {
    name: 'Förberedelsefas (12 veckor)',
    description: 'Sommar/höst-program med rullskidor och löpning.',
    duration: 12,
    generator: get12WeekPrepBuilder,
  },
  'vasaloppet-16week': {
    name: 'Vasaloppet-förberedelse (16 veckor)',
    description: 'Komplett förberedelse för Vasaloppet eller annan långlopp.',
    duration: 16,
    generator: get16WeekVasaloppetPrep,
  },
}
