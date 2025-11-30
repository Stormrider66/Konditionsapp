// lib/program-generator/templates/cycling.ts
// Cycling training program templates with power-based zones

import { PeriodPhase } from '@/types'

export interface CyclingTemplateWorkout {
  type: 'endurance' | 'tempo' | 'threshold' | 'vo2max' | 'sprint' | 'recovery' | 'sweetspot'
  name: string
  description: string
  duration: number // minutes
  tssTarget: number // Training Stress Score target
  powerZone: number // Primary zone (1-7)
  structure?: string // Interval structure like "3x10min @95% FTP"
}

export interface CyclingTemplateWeek {
  week: number
  phase: PeriodPhase
  focus: string
  weeklyTss: number
  weeklyHours: number
  keyWorkouts: CyclingTemplateWorkout[]
}

/**
 * 8-Week FTP Builder Program
 * Designed to increase Functional Threshold Power
 * Based on classic periodization with 3:1 load:recovery ratio
 */
export function get8WeekFtpBuilder(
  currentFtp: number,
  weeklyHours: 6 | 8 | 10 | 12
): CyclingTemplateWeek[] {
  const hourMultiplier = weeklyHours / 8 // Normalize to 8-hour base

  return [
    // PHASE 1: Base Building (Weeks 1-2)
    {
      week: 1,
      phase: 'BASE',
      focus: 'Bygg aerob grund och testa utgångspunkt',
      weeklyTss: Math.round(300 * hourMultiplier),
      weeklyHours: weeklyHours,
      keyWorkouts: getBaseWorkouts(1, hourMultiplier),
    },
    {
      week: 2,
      phase: 'BASE',
      focus: 'Fortsätt aerob utveckling med längre pass',
      weeklyTss: Math.round(330 * hourMultiplier),
      weeklyHours: weeklyHours,
      keyWorkouts: getBaseWorkouts(2, hourMultiplier),
    },

    // PHASE 2: Sweet Spot (Weeks 3-4)
    {
      week: 3,
      phase: 'BUILD',
      focus: 'Introducera sweet spot-intervaller (88-94% FTP)',
      weeklyTss: Math.round(380 * hourMultiplier),
      weeklyHours: weeklyHours,
      keyWorkouts: getSweetSpotWorkouts(3, hourMultiplier),
    },
    {
      week: 4,
      phase: 'RECOVERY',
      focus: 'Återhämtningsvecka - minska volym 40%',
      weeklyTss: Math.round(230 * hourMultiplier),
      weeklyHours: Math.round(weeklyHours * 0.6),
      keyWorkouts: getRecoveryWorkouts(hourMultiplier),
    },

    // PHASE 3: Threshold Development (Weeks 5-6)
    {
      week: 5,
      phase: 'BUILD',
      focus: 'Tröskelintervaller för FTP-höjning',
      weeklyTss: Math.round(420 * hourMultiplier),
      weeklyHours: weeklyHours,
      keyWorkouts: getThresholdWorkouts(5, hourMultiplier),
    },
    {
      week: 6,
      phase: 'BUILD',
      focus: 'Längre tröskelintervaller - max adaptation',
      weeklyTss: Math.round(450 * hourMultiplier),
      weeklyHours: weeklyHours,
      keyWorkouts: getThresholdWorkouts(6, hourMultiplier),
    },

    // PHASE 4: Peak & Test (Weeks 7-8)
    {
      week: 7,
      phase: 'PEAK',
      focus: 'Over-under intervaller och VO2max',
      weeklyTss: Math.round(400 * hourMultiplier),
      weeklyHours: weeklyHours,
      keyWorkouts: getPeakWorkouts(hourMultiplier),
    },
    {
      week: 8,
      phase: 'RECOVERY',
      focus: 'Taper och FTP-retest',
      weeklyTss: Math.round(200 * hourMultiplier),
      weeklyHours: Math.round(weeklyHours * 0.5),
      keyWorkouts: getTestWeekWorkouts(hourMultiplier),
    },
  ]
}

/**
 * 12-Week Base Building Program
 * Focus on aerobic development for endurance cycling
 */
export function get12WeekBaseBuilder(
  weeklyHours: 6 | 8 | 10 | 12 | 15
): CyclingTemplateWeek[] {
  const hourMultiplier = weeklyHours / 10

  const weeks: CyclingTemplateWeek[] = []

  for (let week = 1; week <= 12; week++) {
    let phase: PeriodPhase = 'BASE'
    let focus = ''
    let tssMultiplier = 1

    if (week <= 3) {
      focus = 'Grundläggande aerob utveckling'
      tssMultiplier = 0.7 + (week * 0.1)
    } else if (week === 4 || week === 8) {
      phase = 'RECOVERY'
      focus = 'Återhämtningsvecka'
      tssMultiplier = 0.6
    } else if (week <= 7) {
      focus = 'Bygg volym och uthållighet'
      tssMultiplier = 0.9 + ((week - 4) * 0.05)
    } else if (week <= 11) {
      phase = 'BUILD'
      focus = 'Ökad intensitet med tempo'
      tssMultiplier = 1.0 + ((week - 8) * 0.05)
    } else {
      phase = 'RECOVERY'
      focus = 'Utvärdering och vila'
      tssMultiplier = 0.5
    }

    weeks.push({
      week,
      phase,
      focus,
      weeklyTss: Math.round(350 * hourMultiplier * tssMultiplier),
      weeklyHours: phase === 'RECOVERY' ? Math.round(weeklyHours * 0.6) : weeklyHours,
      keyWorkouts: phase === 'RECOVERY'
        ? getRecoveryWorkouts(hourMultiplier)
        : getEnduranceWorkouts(week, hourMultiplier),
    })
  }

  return weeks
}

/**
 * 8-Week Gran Fondo Preparation
 * Build endurance for long events (100-200km)
 */
export function getGranFondoPrep(
  eventDistanceKm: 100 | 150 | 200,
  weeklyHours: 8 | 10 | 12 | 15
): CyclingTemplateWeek[] {
  const hourMultiplier = weeklyHours / 10
  const distanceMultiplier = eventDistanceKm / 150

  return [
    // Weeks 1-2: Volume building
    {
      week: 1,
      phase: 'BASE',
      focus: 'Bygg distanskapacitet',
      weeklyTss: Math.round(350 * hourMultiplier),
      weeklyHours: weeklyHours,
      keyWorkouts: [
        {
          type: 'endurance',
          name: 'Långpass',
          description: `Uthållighetspass ${Math.round(60 * distanceMultiplier)} km i Z2`,
          duration: Math.round(180 * distanceMultiplier),
          tssTarget: Math.round(150 * distanceMultiplier),
          powerZone: 2,
        },
        {
          type: 'tempo',
          name: 'Tempo-intervaller',
          description: 'Bygger effektivitet vid tävlingstempo',
          duration: 90,
          tssTarget: 85,
          powerZone: 3,
          structure: '3x15min @80-85% FTP',
        },
        {
          type: 'endurance',
          name: 'Medeldistans',
          description: 'Steady Z2-träning',
          duration: 120,
          tssTarget: 90,
          powerZone: 2,
        },
      ],
    },
    {
      week: 2,
      phase: 'BASE',
      focus: 'Öka långpassets längd',
      weeklyTss: Math.round(400 * hourMultiplier),
      weeklyHours: weeklyHours,
      keyWorkouts: [
        {
          type: 'endurance',
          name: 'Långpass',
          description: `Uthållighetspass ${Math.round(80 * distanceMultiplier)} km`,
          duration: Math.round(210 * distanceMultiplier),
          tssTarget: Math.round(180 * distanceMultiplier),
          powerZone: 2,
        },
        {
          type: 'sweetspot',
          name: 'Sweet Spot',
          description: 'Effektiv träning nära tröskel',
          duration: 90,
          tssTarget: 95,
          powerZone: 4,
          structure: '2x20min @88-94% FTP',
        },
        {
          type: 'endurance',
          name: 'Recovery ride',
          description: 'Aktiv återhämtning',
          duration: 60,
          tssTarget: 35,
          powerZone: 1,
        },
      ],
    },
    {
      week: 3,
      phase: 'BUILD',
      focus: 'Simulera tävlingsförhållanden',
      weeklyTss: Math.round(450 * hourMultiplier),
      weeklyHours: weeklyHours,
      keyWorkouts: [
        {
          type: 'endurance',
          name: 'Långpass med tempo',
          description: `${Math.round(100 * distanceMultiplier)} km med tempo-block`,
          duration: Math.round(240 * distanceMultiplier),
          tssTarget: Math.round(220 * distanceMultiplier),
          powerZone: 2,
          structure: 'Z2 med 4x10min @tempo',
        },
        {
          type: 'threshold',
          name: 'FTP-intervaller',
          description: 'Höj tröskelkapacitet',
          duration: 75,
          tssTarget: 90,
          powerZone: 4,
          structure: '3x12min @95-100% FTP',
        },
        {
          type: 'endurance',
          name: 'Medeldistans',
          description: 'Steady aerob träning',
          duration: 90,
          tssTarget: 70,
          powerZone: 2,
        },
      ],
    },
    {
      week: 4,
      phase: 'RECOVERY',
      focus: 'Återhämtning och supercompensation',
      weeklyTss: Math.round(250 * hourMultiplier),
      weeklyHours: Math.round(weeklyHours * 0.6),
      keyWorkouts: getRecoveryWorkouts(hourMultiplier),
    },
    {
      week: 5,
      phase: 'BUILD',
      focus: 'Peak volym - längsta passet',
      weeklyTss: Math.round(500 * hourMultiplier),
      weeklyHours: weeklyHours + 2,
      keyWorkouts: [
        {
          type: 'endurance',
          name: 'Peak långpass',
          description: `${Math.round(120 * distanceMultiplier)} km - simulerar tävling`,
          duration: Math.round(300 * distanceMultiplier),
          tssTarget: Math.round(270 * distanceMultiplier),
          powerZone: 2,
          structure: 'Inkludera klättring och tempo-block',
        },
        {
          type: 'vo2max',
          name: 'VO2max-intervaller',
          description: 'Bygger topkapacitet',
          duration: 60,
          tssTarget: 85,
          powerZone: 5,
          structure: '5x4min @105-115% FTP',
        },
        {
          type: 'recovery',
          name: 'Aktiv vila',
          description: 'Lätt spinning',
          duration: 45,
          tssTarget: 25,
          powerZone: 1,
        },
      ],
    },
    {
      week: 6,
      phase: 'BUILD',
      focus: 'Specifik tävlingsförberedelse',
      weeklyTss: Math.round(450 * hourMultiplier),
      weeklyHours: weeklyHours,
      keyWorkouts: [
        {
          type: 'endurance',
          name: 'Långpass med klättring',
          description: 'Fokus på kuperad terräng',
          duration: 180,
          tssTarget: 180,
          powerZone: 2,
          structure: 'Inkludera 1500+ höjdmeter',
        },
        {
          type: 'sweetspot',
          name: 'Sweet Spot-intervaller',
          description: 'Effektiv intensitet',
          duration: 90,
          tssTarget: 100,
          powerZone: 4,
          structure: '3x15min @90% FTP',
        },
        {
          type: 'tempo',
          name: 'Grupptempo',
          description: 'Simulera tävlingssituation',
          duration: 90,
          tssTarget: 90,
          powerZone: 3,
        },
      ],
    },
    {
      week: 7,
      phase: 'PEAK',
      focus: 'Skärpa utan trötthet',
      weeklyTss: Math.round(350 * hourMultiplier),
      weeklyHours: weeklyHours - 2,
      keyWorkouts: [
        {
          type: 'endurance',
          name: 'Medeldistans',
          description: 'Håll benen igång',
          duration: 120,
          tssTarget: 90,
          powerZone: 2,
        },
        {
          type: 'threshold',
          name: 'Opener-intervaller',
          description: 'Aktivera systemen',
          duration: 60,
          tssTarget: 70,
          powerZone: 4,
          structure: '2x8min @100% FTP',
        },
        {
          type: 'recovery',
          name: 'Lätt spinning',
          description: 'Aktiv vila',
          duration: 45,
          tssTarget: 25,
          powerZone: 1,
        },
      ],
    },
    {
      week: 8,
      phase: 'PEAK',
      focus: 'Tävlingsvecka!',
      weeklyTss: Math.round(200 * hourMultiplier),
      weeklyHours: Math.round(weeklyHours * 0.4),
      keyWorkouts: [
        {
          type: 'recovery',
          name: 'Lätt spinning',
          description: 'Håll benen fräscha',
          duration: 40,
          tssTarget: 20,
          powerZone: 1,
        },
        {
          type: 'threshold',
          name: 'Opener',
          description: 'Kort aktivering dagen före',
          duration: 30,
          tssTarget: 25,
          powerZone: 4,
          structure: '2x5min @95% FTP med full vila',
        },
        {
          type: 'endurance',
          name: 'TÄVLINGSDAG!',
          description: `Gran Fondo ${eventDistanceKm} km`,
          duration: Math.round(eventDistanceKm * 2.5),
          tssTarget: Math.round(eventDistanceKm * 1.5),
          powerZone: 3,
        },
      ],
    },
  ]
}

// Helper functions for workout generation

function getBaseWorkouts(week: number, multiplier: number): CyclingTemplateWorkout[] {
  return [
    {
      type: 'endurance',
      name: 'Långpass',
      description: 'Bygg aerob grund med låg intensitet',
      duration: Math.round((90 + week * 15) * multiplier),
      tssTarget: Math.round((60 + week * 10) * multiplier),
      powerZone: 2,
    },
    {
      type: 'endurance',
      name: 'Medeldistans',
      description: 'Steady Z2-träning',
      duration: Math.round(75 * multiplier),
      tssTarget: Math.round(55 * multiplier),
      powerZone: 2,
    },
    {
      type: 'tempo',
      name: 'Tempo-introduktion',
      description: 'Första smaken av högre intensitet',
      duration: Math.round(60 * multiplier),
      tssTarget: Math.round(55 * multiplier),
      powerZone: 3,
      structure: '2x10min @75-85% FTP',
    },
    {
      type: 'recovery',
      name: 'Aktiv återhämtning',
      description: 'Lätt spinning, fokus på kadensarbete',
      duration: 45,
      tssTarget: 25,
      powerZone: 1,
    },
  ]
}

function getSweetSpotWorkouts(week: number, multiplier: number): CyclingTemplateWorkout[] {
  return [
    {
      type: 'sweetspot',
      name: 'Sweet Spot-intervaller',
      description: 'Effektiv träning strax under tröskel',
      duration: Math.round(75 * multiplier),
      tssTarget: Math.round(85 * multiplier),
      powerZone: 4,
      structure: week === 3 ? '3x12min @88-94% FTP' : '3x15min @88-94% FTP',
    },
    {
      type: 'endurance',
      name: 'Långpass',
      description: 'Aerob bas med tempo-stötar',
      duration: Math.round(120 * multiplier),
      tssTarget: Math.round(95 * multiplier),
      powerZone: 2,
    },
    {
      type: 'sweetspot',
      name: 'Over-under intro',
      description: 'Lär dig hantera tröskelfluktuationer',
      duration: Math.round(60 * multiplier),
      tssTarget: Math.round(75 * multiplier),
      powerZone: 4,
      structure: '3x(3min @105% + 3min @85%)',
    },
    {
      type: 'recovery',
      name: 'Recovery ride',
      description: 'Aktiv vila',
      duration: 45,
      tssTarget: 25,
      powerZone: 1,
    },
  ]
}

function getThresholdWorkouts(week: number, multiplier: number): CyclingTemplateWorkout[] {
  const intervalLength = week === 5 ? 10 : 15

  return [
    {
      type: 'threshold',
      name: 'FTP-intervaller',
      description: 'Huvudpass för FTP-utveckling',
      duration: Math.round(75 * multiplier),
      tssTarget: Math.round(90 * multiplier),
      powerZone: 4,
      structure: `3x${intervalLength}min @95-100% FTP`,
    },
    {
      type: 'endurance',
      name: 'Långpass',
      description: 'Volym och återhämtning',
      duration: Math.round(150 * multiplier),
      tssTarget: Math.round(120 * multiplier),
      powerZone: 2,
    },
    {
      type: 'threshold',
      name: 'Tempo + Threshold',
      description: 'Blandad intensitet',
      duration: Math.round(90 * multiplier),
      tssTarget: Math.round(100 * multiplier),
      powerZone: 4,
      structure: '20min tempo + 2x10min @FTP',
    },
    {
      type: 'recovery',
      name: 'Aktiv vila',
      description: 'Lätt spinning',
      duration: 45,
      tssTarget: 25,
      powerZone: 1,
    },
  ]
}

function getPeakWorkouts(multiplier: number): CyclingTemplateWorkout[] {
  return [
    {
      type: 'vo2max',
      name: 'VO2max-intervaller',
      description: 'Toppa din kapacitet',
      duration: Math.round(60 * multiplier),
      tssTarget: Math.round(90 * multiplier),
      powerZone: 5,
      structure: '5x4min @105-120% FTP',
    },
    {
      type: 'threshold',
      name: 'Over-Under intervaller',
      description: 'Klassisk FTP-höjare',
      duration: Math.round(75 * multiplier),
      tssTarget: Math.round(95 * multiplier),
      powerZone: 4,
      structure: '3x(5min @105% + 5min @95%)',
    },
    {
      type: 'endurance',
      name: 'Medellångt pass',
      description: 'Återhämtning mellan hårda pass',
      duration: Math.round(90 * multiplier),
      tssTarget: Math.round(70 * multiplier),
      powerZone: 2,
    },
    {
      type: 'sprint',
      name: 'Sprintintervaller',
      description: 'Neuromuskulär aktivering',
      duration: Math.round(45 * multiplier),
      tssTarget: Math.round(50 * multiplier),
      powerZone: 7,
      structure: '6x30s all-out med full vila',
    },
  ]
}

function getRecoveryWorkouts(multiplier: number): CyclingTemplateWorkout[] {
  return [
    {
      type: 'recovery',
      name: 'Aktiv återhämtning',
      description: 'Lätt spinning, hög kadans',
      duration: 60,
      tssTarget: 30,
      powerZone: 1,
    },
    {
      type: 'endurance',
      name: 'Lätt uthållighet',
      description: 'Steady Z2, njut av cyklingen',
      duration: Math.round(75 * multiplier),
      tssTarget: Math.round(50 * multiplier),
      powerZone: 2,
    },
    {
      type: 'recovery',
      name: 'Teknikpass',
      description: 'Fokusera på trampning och kadans',
      duration: 45,
      tssTarget: 25,
      powerZone: 1,
      structure: 'Single-leg drills, high cadence intervals',
    },
  ]
}

function getTestWeekWorkouts(multiplier: number): CyclingTemplateWorkout[] {
  return [
    {
      type: 'recovery',
      name: 'Lätt spinning',
      description: 'Vila inför test',
      duration: 40,
      tssTarget: 20,
      powerZone: 1,
    },
    {
      type: 'threshold',
      name: 'FTP-TEST!',
      description: '20-min FTP-test (x0.95 = FTP)',
      duration: 60,
      tssTarget: 65,
      powerZone: 4,
      structure: '20min all-out efter uppvärmning',
    },
    {
      type: 'recovery',
      name: 'Recovery',
      description: 'Vila och fira din nya FTP!',
      duration: 30,
      tssTarget: 15,
      powerZone: 1,
    },
  ]
}

function getEnduranceWorkouts(week: number, multiplier: number): CyclingTemplateWorkout[] {
  const baseDuration = 90 + Math.min(week * 10, 60)

  return [
    {
      type: 'endurance',
      name: 'Långpass',
      description: 'Huvudpass för aerob utveckling',
      duration: Math.round(baseDuration * multiplier),
      tssTarget: Math.round((baseDuration * 0.65) * multiplier),
      powerZone: 2,
    },
    {
      type: 'endurance',
      name: 'Medeldistans',
      description: 'Steady Z2',
      duration: Math.round(75 * multiplier),
      tssTarget: Math.round(55 * multiplier),
      powerZone: 2,
    },
    {
      type: 'tempo',
      name: 'Tempo-pass',
      description: 'Bygg effektivitet',
      duration: Math.round(60 * multiplier),
      tssTarget: Math.round(55 * multiplier),
      powerZone: 3,
      structure: '2x15min @75-85% FTP',
    },
    {
      type: 'recovery',
      name: 'Aktiv vila',
      description: 'Lätt spinning',
      duration: 45,
      tssTarget: 25,
      powerZone: 1,
    },
  ]
}

/**
 * Get cycling workout type descriptions in Swedish
 */
export function getCyclingWorkoutTypeDescriptions(): Record<CyclingTemplateWorkout['type'], { name: string; description: string; zoneRange: string }> {
  return {
    endurance: {
      name: 'Uthållighet',
      description: 'Låg intensitet för aerob bas. Känslan ska vara bekväm.',
      zoneRange: 'Zon 2 (56-75% FTP)',
    },
    tempo: {
      name: 'Tempo',
      description: 'Måttlig intensitet, "comfortably hard". Kan prata korta meningar.',
      zoneRange: 'Zon 3 (76-90% FTP)',
    },
    sweetspot: {
      name: 'Sweet Spot',
      description: 'Hög effektivitet strax under tröskel. Utmanande men hanterbart.',
      zoneRange: 'Zon 4 low (88-94% FTP)',
    },
    threshold: {
      name: 'Tröskel',
      description: 'Vid eller strax över FTP. Maximalt hållbart i ~60 min.',
      zoneRange: 'Zon 4 (95-105% FTP)',
    },
    vo2max: {
      name: 'VO2max',
      description: 'Hög intensitet intervaller. Andningen blir tung.',
      zoneRange: 'Zon 5 (106-120% FTP)',
    },
    sprint: {
      name: 'Sprint/Neuromuskulär',
      description: 'Maximal ansträngning, korta intervaller. Full återhämtning mellan.',
      zoneRange: 'Zon 6-7 (121%+ FTP)',
    },
    recovery: {
      name: 'Återhämtning',
      description: 'Mycket lätt cykling för aktiv vila.',
      zoneRange: 'Zon 1 (0-55% FTP)',
    },
  }
}

/**
 * Calculate recommended weekly TSS based on experience and goals
 */
export function getRecommendedWeeklyTss(
  fitnessLevel: 'beginner' | 'intermediate' | 'advanced' | 'elite',
  goal: 'maintenance' | 'building' | 'racing'
): { minTss: number; maxTss: number; description: string } {
  const tssRanges = {
    beginner: { maintenance: { min: 200, max: 300 }, building: { min: 300, max: 400 }, racing: { min: 350, max: 450 } },
    intermediate: { maintenance: { min: 350, max: 450 }, building: { min: 450, max: 600 }, racing: { min: 500, max: 700 } },
    advanced: { maintenance: { min: 500, max: 650 }, building: { min: 650, max: 850 }, racing: { min: 700, max: 900 } },
    elite: { maintenance: { min: 700, max: 900 }, building: { min: 900, max: 1200 }, racing: { min: 1000, max: 1400 } },
  }

  const range = tssRanges[fitnessLevel][goal]

  const descriptions = {
    beginner: 'Bygg försiktigt och låt kroppen anpassa sig',
    intermediate: 'Balansera belastning med återhämtning (3:1 ratio)',
    advanced: 'Kan hantera högre volymer med rätt periodisering',
    elite: 'Maximala anpassningar kräver maximal belastning och vila',
  }

  return {
    minTss: range.min,
    maxTss: range.max,
    description: descriptions[fitnessLevel],
  }
}
