// lib/program-generator/templates/swimming.ts
// Swimming training program templates with CSS-based zones

import { PeriodPhase } from '@/types'

export interface SwimmingTemplateWorkout {
  type: 'endurance' | 'threshold' | 'vo2max' | 'sprint' | 'recovery' | 'technique' | 'openwater'
  name: string
  description: string
  duration: number // minutes
  distance: number // meters
  swimZone: number // Primary zone (1-5)
  structure?: string // Set structure like "8x100m @CSS"
  strokeFocus?: 'freestyle' | 'backstroke' | 'breaststroke' | 'butterfly' | 'im' | 'mixed'
}

export interface SwimmingTemplateWeek {
  week: number
  phase: PeriodPhase
  focus: string
  weeklyDistance: number // meters
  weeklyHours: number
  keyWorkouts: SwimmingTemplateWorkout[]
}

/**
 * 8-Week CSS Improvement Program
 * Designed to increase Critical Swim Speed
 * Based on classic periodization with 3:1 load:recovery ratio
 */
export function get8WeekCssBuilder(
  currentCss: number, // seconds per 100m
  weeklyDistance: 10000 | 15000 | 20000 | 25000
): SwimmingTemplateWeek[] {
  const distanceMultiplier = weeklyDistance / 15000 // Normalize to 15km base

  return [
    // PHASE 1: Base Building (Weeks 1-2)
    {
      week: 1,
      phase: 'BASE',
      focus: 'Bygg aerob grund och testa utgångspunkt',
      weeklyDistance: Math.round(weeklyDistance * 0.8),
      weeklyHours: Math.round((weeklyDistance / 15000) * 5),
      keyWorkouts: getBaseSwimWorkouts(1, distanceMultiplier),
    },
    {
      week: 2,
      phase: 'BASE',
      focus: 'Fortsätt aerob utveckling med längre pass',
      weeklyDistance: Math.round(weeklyDistance * 0.9),
      weeklyHours: Math.round((weeklyDistance / 15000) * 5.5),
      keyWorkouts: getBaseSwimWorkouts(2, distanceMultiplier),
    },

    // PHASE 2: Threshold Development (Weeks 3-4)
    {
      week: 3,
      phase: 'BUILD',
      focus: 'Introducera CSS-intervaller',
      weeklyDistance: weeklyDistance,
      weeklyHours: Math.round((weeklyDistance / 15000) * 6),
      keyWorkouts: getThresholdSwimWorkouts(3, distanceMultiplier),
    },
    {
      week: 4,
      phase: 'RECOVERY',
      focus: 'Återhämtningsvecka - minska volym 40%',
      weeklyDistance: Math.round(weeklyDistance * 0.6),
      weeklyHours: Math.round((weeklyDistance / 15000) * 3.5),
      keyWorkouts: getRecoverySwimWorkouts(distanceMultiplier),
    },

    // PHASE 3: Intensive Threshold (Weeks 5-6)
    {
      week: 5,
      phase: 'BUILD',
      focus: 'Längre CSS-intervaller för tröskelhöjning',
      weeklyDistance: Math.round(weeklyDistance * 1.1),
      weeklyHours: Math.round((weeklyDistance / 15000) * 6.5),
      keyWorkouts: getIntensiveThresholdWorkouts(5, distanceMultiplier),
    },
    {
      week: 6,
      phase: 'BUILD',
      focus: 'Peak tröskelvecka - max adaptation',
      weeklyDistance: Math.round(weeklyDistance * 1.15),
      weeklyHours: Math.round((weeklyDistance / 15000) * 7),
      keyWorkouts: getIntensiveThresholdWorkouts(6, distanceMultiplier),
    },

    // PHASE 4: Peak & Test (Weeks 7-8)
    {
      week: 7,
      phase: 'PEAK',
      focus: 'VO2max-intervaller och fartlek',
      weeklyDistance: weeklyDistance,
      weeklyHours: Math.round((weeklyDistance / 15000) * 6),
      keyWorkouts: getPeakSwimWorkouts(distanceMultiplier),
    },
    {
      week: 8,
      phase: 'RECOVERY',
      focus: 'Taper och CSS-retest',
      weeklyDistance: Math.round(weeklyDistance * 0.5),
      weeklyHours: Math.round((weeklyDistance / 15000) * 3),
      keyWorkouts: getTestWeekSwimWorkouts(distanceMultiplier),
    },
  ]
}

/**
 * 12-Week Distance Swimmer Program
 * Focus on endurance swimming for 1500m-5000m events
 */
export function get12WeekDistanceProgram(
  targetEvent: 1500 | 3000 | 5000,
  weeklyDistance: 15000 | 20000 | 25000 | 30000
): SwimmingTemplateWeek[] {
  const distanceMultiplier = weeklyDistance / 20000
  const eventMultiplier = targetEvent / 1500

  const weeks: SwimmingTemplateWeek[] = []

  for (let week = 1; week <= 12; week++) {
    let phase: PeriodPhase = 'BASE'
    let focus = ''
    let volumeMultiplier = 1

    if (week <= 3) {
      focus = 'Grundläggande aerob utveckling'
      volumeMultiplier = 0.7 + (week * 0.1)
    } else if (week === 4 || week === 8) {
      phase = 'RECOVERY'
      focus = 'Återhämtningsvecka'
      volumeMultiplier = 0.6
    } else if (week <= 7) {
      focus = 'Bygg volym och uthållighet'
      volumeMultiplier = 0.9 + ((week - 4) * 0.05)
    } else if (week <= 11) {
      phase = 'BUILD'
      focus = 'Tävlingsspecifik träning'
      volumeMultiplier = 1.0 + ((week - 8) * 0.05)
    } else {
      phase = 'RECOVERY'
      focus = 'Taper inför tävling'
      volumeMultiplier = 0.5
    }

    weeks.push({
      week,
      phase,
      focus,
      weeklyDistance: Math.round(weeklyDistance * volumeMultiplier),
      weeklyHours: Math.round((weeklyDistance / 20000) * 6 * volumeMultiplier),
      keyWorkouts: phase === 'RECOVERY'
        ? getRecoverySwimWorkouts(distanceMultiplier)
        : getDistanceWorkouts(week, distanceMultiplier, eventMultiplier),
    })
  }

  return weeks
}

/**
 * 8-Week Sprint Improvement Program
 * Focus on 50m-200m events
 */
export function get8WeekSprintProgram(
  targetEvent: 50 | 100 | 200,
  weeklyDistance: 10000 | 15000 | 20000
): SwimmingTemplateWeek[] {
  const distanceMultiplier = weeklyDistance / 15000

  return [
    // Weeks 1-2: Technique & Base
    {
      week: 1,
      phase: 'BASE',
      focus: 'Teknikfokus och aerob grund',
      weeklyDistance: Math.round(weeklyDistance * 0.8),
      weeklyHours: Math.round((weeklyDistance / 15000) * 4.5),
      keyWorkouts: getTechniqueWorkouts(distanceMultiplier),
    },
    {
      week: 2,
      phase: 'BASE',
      focus: 'Bygg grundfart och effektivitet',
      weeklyDistance: Math.round(weeklyDistance * 0.9),
      weeklyHours: Math.round((weeklyDistance / 15000) * 5),
      keyWorkouts: getSprintBaseWorkouts(distanceMultiplier),
    },

    // Weeks 3-4: Speed Development
    {
      week: 3,
      phase: 'BUILD',
      focus: 'Introducera sprintintervaller',
      weeklyDistance: weeklyDistance,
      weeklyHours: Math.round((weeklyDistance / 15000) * 5),
      keyWorkouts: getSprintDevelopmentWorkouts(3, distanceMultiplier, targetEvent),
    },
    {
      week: 4,
      phase: 'RECOVERY',
      focus: 'Återhämtningsvecka',
      weeklyDistance: Math.round(weeklyDistance * 0.6),
      weeklyHours: Math.round((weeklyDistance / 15000) * 3),
      keyWorkouts: getRecoverySwimWorkouts(distanceMultiplier),
    },

    // Weeks 5-6: Race Pace
    {
      week: 5,
      phase: 'BUILD',
      focus: 'Tävlingstempo och race pace-intervaller',
      weeklyDistance: weeklyDistance,
      weeklyHours: Math.round((weeklyDistance / 15000) * 5),
      keyWorkouts: getRacePaceWorkouts(5, distanceMultiplier, targetEvent),
    },
    {
      week: 6,
      phase: 'BUILD',
      focus: 'Peak sprintträning',
      weeklyDistance: Math.round(weeklyDistance * 1.1),
      weeklyHours: Math.round((weeklyDistance / 15000) * 5.5),
      keyWorkouts: getRacePaceWorkouts(6, distanceMultiplier, targetEvent),
    },

    // Weeks 7-8: Taper & Race
    {
      week: 7,
      phase: 'PEAK',
      focus: 'Skärpa och race starts',
      weeklyDistance: Math.round(weeklyDistance * 0.8),
      weeklyHours: Math.round((weeklyDistance / 15000) * 4),
      keyWorkouts: getSprintPeakWorkouts(distanceMultiplier, targetEvent),
    },
    {
      week: 8,
      phase: 'PEAK',
      focus: 'Tävlingsvecka!',
      weeklyDistance: Math.round(weeklyDistance * 0.4),
      weeklyHours: Math.round((weeklyDistance / 15000) * 2),
      keyWorkouts: getSprintTaperWorkouts(distanceMultiplier, targetEvent),
    },
  ]
}

/**
 * 8-Week Open Water Preparation
 * Build endurance for open water events (1.5km-10km)
 */
export function getOpenWaterPrep(
  eventDistanceKm: 1.5 | 3 | 5 | 10,
  weeklyDistance: 15000 | 20000 | 25000 | 30000
): SwimmingTemplateWeek[] {
  const distanceMultiplier = weeklyDistance / 20000
  const eventMultiplier = eventDistanceKm / 3

  return [
    // Weeks 1-2: Pool Base
    {
      week: 1,
      phase: 'BASE',
      focus: 'Bygg uthållighetsgrund i pool',
      weeklyDistance: Math.round(weeklyDistance * 0.8),
      weeklyHours: Math.round((weeklyDistance / 20000) * 5),
      keyWorkouts: [
        {
          type: 'endurance',
          name: 'Långpass',
          description: 'Uthållig simning i jämn fart',
          duration: 60,
          distance: Math.round(3000 * distanceMultiplier),
          swimZone: 2,
          structure: 'Kontinuerlig simning i Z2',
          strokeFocus: 'freestyle',
        },
        {
          type: 'threshold',
          name: 'CSS-intervaller',
          description: 'Bygg tröskelhållbarhet',
          duration: 50,
          distance: Math.round(2500 * distanceMultiplier),
          swimZone: 3,
          structure: '5x400m @CSS, 30s vila',
        },
        {
          type: 'technique',
          name: 'Simtagsteknik',
          description: 'Fokus på effektivitet',
          duration: 45,
          distance: Math.round(2000 * distanceMultiplier),
          swimZone: 2,
          structure: 'Catch-up, fingertip drag, fist drills',
        },
      ],
    },
    {
      week: 2,
      phase: 'BASE',
      focus: 'Öka distans och introducera öppet vatten-specifik träning',
      weeklyDistance: Math.round(weeklyDistance * 0.9),
      weeklyHours: Math.round((weeklyDistance / 20000) * 5.5),
      keyWorkouts: [
        {
          type: 'endurance',
          name: 'Långpass med temposkiften',
          description: 'Simulera öppet vatten-förhållanden',
          duration: 70,
          distance: Math.round(3500 * distanceMultiplier),
          swimZone: 2,
          structure: '5x(500m Z2 + 100m Z3)',
        },
        {
          type: 'openwater',
          name: 'Siktning & navigering',
          description: 'Lär dig sikta under simning',
          duration: 45,
          distance: Math.round(2000 * distanceMultiplier),
          swimZone: 2,
          structure: 'Inkludera siktning var 6:e simtag',
        },
        {
          type: 'threshold',
          name: 'Pyramidpass',
          description: 'Varierande distans-intervaller',
          duration: 55,
          distance: Math.round(2800 * distanceMultiplier),
          swimZone: 3,
          structure: '200-400-600-400-200m @CSS',
        },
      ],
    },
    {
      week: 3,
      phase: 'BUILD',
      focus: 'Öka intensitet och simulera tävling',
      weeklyDistance: weeklyDistance,
      weeklyHours: Math.round((weeklyDistance / 20000) * 6),
      keyWorkouts: [
        {
          type: 'endurance',
          name: 'Ultralångpass',
          description: `${Math.round(eventDistanceKm * 0.7)}km kontinuerlig`,
          duration: Math.round(45 * eventMultiplier),
          distance: Math.round(eventDistanceKm * 700),
          swimZone: 2,
          structure: 'Inkludera tempo-block',
        },
        {
          type: 'openwater',
          name: 'Massstart-simulering',
          description: 'Öva start och positionering',
          duration: 50,
          distance: Math.round(2500 * distanceMultiplier),
          swimZone: 3,
          structure: '10x100m race pace start + 150m steady',
        },
        {
          type: 'threshold',
          name: 'Race pace-block',
          description: 'Tävlingstempo med korta viloperioder',
          duration: 55,
          distance: Math.round(3000 * distanceMultiplier),
          swimZone: 3,
          structure: '3x800m @target race pace, 45s vila',
        },
      ],
    },
    {
      week: 4,
      phase: 'RECOVERY',
      focus: 'Återhämtning och supercompensation',
      weeklyDistance: Math.round(weeklyDistance * 0.6),
      weeklyHours: Math.round((weeklyDistance / 20000) * 3.5),
      keyWorkouts: getRecoverySwimWorkouts(distanceMultiplier),
    },
    {
      week: 5,
      phase: 'BUILD',
      focus: 'Peak volym - längsta passet',
      weeklyDistance: Math.round(weeklyDistance * 1.1),
      weeklyHours: Math.round((weeklyDistance / 20000) * 6.5),
      keyWorkouts: [
        {
          type: 'openwater',
          name: 'Tävlingssimulering',
          description: `Full ${eventDistanceKm}km simulering`,
          duration: Math.round(60 * eventMultiplier),
          distance: Math.round(eventDistanceKm * 1000),
          swimZone: 3,
          structure: 'Inkludera siktning, temposkiften, final sprint',
        },
        {
          type: 'vo2max',
          name: 'VO2max-intervaller',
          description: 'Bygger topkapacitet',
          duration: 45,
          distance: Math.round(2000 * distanceMultiplier),
          swimZone: 4,
          structure: '8x100m @90% effort, 30s vila',
        },
        {
          type: 'technique',
          name: 'Bilateral andning',
          description: 'Öva andning åt båda håll för öppet vatten',
          duration: 40,
          distance: Math.round(1800 * distanceMultiplier),
          swimZone: 2,
          structure: 'Alternera: 3-andning, höger, vänster',
        },
      ],
    },
    {
      week: 6,
      phase: 'BUILD',
      focus: 'Specifik tävlingsförberedelse',
      weeklyDistance: weeklyDistance,
      weeklyHours: Math.round((weeklyDistance / 20000) * 6),
      keyWorkouts: [
        {
          type: 'openwater',
          name: 'Öppet vatten-pass',
          description: 'Träna i öppen vattenomgivning om möjligt',
          duration: 60,
          distance: Math.round(3000 * distanceMultiplier),
          swimZone: 2,
          structure: 'Inkludera navigation och tempokontroll',
        },
        {
          type: 'threshold',
          name: 'Negative split-övning',
          description: 'Lär dig fördela kraften rätt',
          duration: 55,
          distance: Math.round(2800 * distanceMultiplier),
          swimZone: 3,
          structure: '2x1000m med andra 500m snabbare',
        },
        {
          type: 'sprint',
          name: 'Spurtar',
          description: 'Öva målspurt',
          duration: 40,
          distance: Math.round(1500 * distanceMultiplier),
          swimZone: 5,
          structure: '10x50m all-out, 45s vila',
        },
      ],
    },
    {
      week: 7,
      phase: 'PEAK',
      focus: 'Skärpa utan trötthet',
      weeklyDistance: Math.round(weeklyDistance * 0.75),
      weeklyHours: Math.round((weeklyDistance / 20000) * 4.5),
      keyWorkouts: [
        {
          type: 'endurance',
          name: 'Steady-pass',
          description: 'Håll simkänslan',
          duration: 50,
          distance: Math.round(2500 * distanceMultiplier),
          swimZone: 2,
        },
        {
          type: 'openwater',
          name: 'Opener',
          description: 'Race-tempo-block',
          duration: 40,
          distance: Math.round(1800 * distanceMultiplier),
          swimZone: 3,
          structure: '3x400m @race pace',
        },
        {
          type: 'recovery',
          name: 'Lätt simning',
          description: 'Aktiv vila',
          duration: 30,
          distance: Math.round(1200 * distanceMultiplier),
          swimZone: 1,
        },
      ],
    },
    {
      week: 8,
      phase: 'PEAK',
      focus: 'Tävlingsvecka!',
      weeklyDistance: Math.round(weeklyDistance * 0.4),
      weeklyHours: Math.round((weeklyDistance / 20000) * 2.5),
      keyWorkouts: [
        {
          type: 'recovery',
          name: 'Lätt simning',
          description: 'Håll benen fräscha',
          duration: 30,
          distance: 1500,
          swimZone: 1,
        },
        {
          type: 'threshold',
          name: 'Aktivering',
          description: 'Kort race-tempo dagen före',
          duration: 25,
          distance: 1000,
          swimZone: 3,
          structure: '4x100m @race pace med full vila',
        },
        {
          type: 'openwater',
          name: 'TÄVLINGSDAG!',
          description: `Öppet vatten ${eventDistanceKm} km`,
          duration: Math.round(eventDistanceKm * 20),
          distance: eventDistanceKm * 1000,
          swimZone: 3,
        },
      ],
    },
  ]
}

// Helper functions for workout generation

function getBaseSwimWorkouts(week: number, multiplier: number): SwimmingTemplateWorkout[] {
  return [
    {
      type: 'endurance',
      name: 'Långpass',
      description: 'Bygg aerob grund med jämn simning',
      duration: Math.round((45 + week * 10) * multiplier),
      distance: Math.round((2500 + week * 500) * multiplier),
      swimZone: 2,
      strokeFocus: 'freestyle',
    },
    {
      type: 'technique',
      name: 'Teknikpass',
      description: 'Fokus på simeffektivitet och SWOLF',
      duration: Math.round(40 * multiplier),
      distance: Math.round(2000 * multiplier),
      swimZone: 2,
      structure: 'Drills: Catch-up, fingertip, 6-kick switch',
      strokeFocus: 'mixed',
    },
    {
      type: 'endurance',
      name: 'Intervaller med vila',
      description: 'Bygg aerob kapacitet med korta viloperioder',
      duration: Math.round(45 * multiplier),
      distance: Math.round(2500 * multiplier),
      swimZone: 2,
      structure: '10x200m @Z2, 15s vila',
    },
    {
      type: 'recovery',
      name: 'Aktiv återhämtning',
      description: 'Lätt simning, blanda simtag',
      duration: 30,
      distance: 1500,
      swimZone: 1,
      strokeFocus: 'mixed',
    },
  ]
}

function getThresholdSwimWorkouts(week: number, multiplier: number): SwimmingTemplateWorkout[] {
  return [
    {
      type: 'threshold',
      name: 'CSS-intervaller',
      description: 'Huvudpass för tröskelhöjning',
      duration: Math.round(50 * multiplier),
      distance: Math.round(2800 * multiplier),
      swimZone: 3,
      structure: week === 3 ? '6x300m @CSS, 20s vila' : '8x300m @CSS, 20s vila',
    },
    {
      type: 'endurance',
      name: 'Långpass',
      description: 'Steady aerob simning',
      duration: Math.round(60 * multiplier),
      distance: Math.round(3200 * multiplier),
      swimZone: 2,
    },
    {
      type: 'threshold',
      name: 'Broken 1000',
      description: 'Tävlingsliknande intensitet med korta pauser',
      duration: Math.round(45 * multiplier),
      distance: Math.round(2500 * multiplier),
      swimZone: 3,
      structure: '2x(5x200m @CSS, 10s vila) med 60s mellan block',
    },
    {
      type: 'recovery',
      name: 'Teknik & vila',
      description: 'Lätt simning med fokus på teknik',
      duration: 35,
      distance: 1800,
      swimZone: 1,
      structure: 'Drills och lätt simning',
    },
  ]
}

function getIntensiveThresholdWorkouts(week: number, multiplier: number): SwimmingTemplateWorkout[] {
  const intervalLength = week === 5 ? 300 : 400

  return [
    {
      type: 'threshold',
      name: 'Långa CSS-intervaller',
      description: 'Maximera tiden vid tröskel',
      duration: Math.round(55 * multiplier),
      distance: Math.round(3000 * multiplier),
      swimZone: 3,
      structure: `6x${intervalLength}m @CSS, 20-30s vila`,
    },
    {
      type: 'vo2max',
      name: 'VO2max-set',
      description: 'Höj maximal syreupptagning',
      duration: Math.round(45 * multiplier),
      distance: Math.round(2200 * multiplier),
      swimZone: 4,
      structure: '8x100m @90-95% max, 20s vila',
    },
    {
      type: 'endurance',
      name: 'Pyramid',
      description: 'Varierande distans för mental uthållighet',
      duration: Math.round(60 * multiplier),
      distance: Math.round(3500 * multiplier),
      swimZone: 2,
      structure: '100-200-300-400-500-400-300-200-100m @Z2-3',
    },
    {
      type: 'recovery',
      name: 'Recovery swim',
      description: 'Aktiv återhämtning',
      duration: 30,
      distance: 1500,
      swimZone: 1,
    },
  ]
}

function getPeakSwimWorkouts(multiplier: number): SwimmingTemplateWorkout[] {
  return [
    {
      type: 'vo2max',
      name: 'VO2max-intervaller',
      description: 'Toppa din kapacitet',
      duration: Math.round(45 * multiplier),
      distance: Math.round(2200 * multiplier),
      swimZone: 4,
      structure: '5x200m @95% max, 30s vila',
    },
    {
      type: 'threshold',
      name: 'Over-Under',
      description: 'Lär dig hantera temposkiften',
      duration: Math.round(50 * multiplier),
      distance: Math.round(2800 * multiplier),
      swimZone: 3,
      structure: '4x(200m @105% CSS + 200m @90% CSS)',
    },
    {
      type: 'endurance',
      name: 'Steady längdpass',
      description: 'Återhämtning mellan hårda pass',
      duration: Math.round(50 * multiplier),
      distance: Math.round(2800 * multiplier),
      swimZone: 2,
    },
    {
      type: 'sprint',
      name: 'Sprintintervaller',
      description: 'Neuromuskulär aktivering',
      duration: Math.round(35 * multiplier),
      distance: Math.round(1500 * multiplier),
      swimZone: 5,
      structure: '10x50m all-out, 45s vila',
    },
  ]
}

function getRecoverySwimWorkouts(multiplier: number): SwimmingTemplateWorkout[] {
  return [
    {
      type: 'recovery',
      name: 'Aktiv återhämtning',
      description: 'Lätt simning, blanda simtag',
      duration: 40,
      distance: 2000,
      swimZone: 1,
      strokeFocus: 'mixed',
    },
    {
      type: 'technique',
      name: 'Teknikpass',
      description: 'Fokus på effektivitet',
      duration: 35,
      distance: 1800,
      swimZone: 1,
      structure: 'Drills och lätt simning',
    },
    {
      type: 'endurance',
      name: 'Lätt uthållighet',
      description: 'Steady Z2, njut av simningen',
      duration: Math.round(45 * multiplier),
      distance: Math.round(2500 * multiplier),
      swimZone: 2,
    },
  ]
}

function getTestWeekSwimWorkouts(multiplier: number): SwimmingTemplateWorkout[] {
  return [
    {
      type: 'recovery',
      name: 'Lätt simning',
      description: 'Vila inför test',
      duration: 30,
      distance: 1500,
      swimZone: 1,
    },
    {
      type: 'threshold',
      name: 'CSS-TEST!',
      description: '400m + 200m tidstest för CSS-beräkning',
      duration: 45,
      distance: 1800,
      swimZone: 3,
      structure: '400m TT, 10 min vila, 200m TT',
    },
    {
      type: 'recovery',
      name: 'Recovery',
      description: 'Vila och fira din nya CSS!',
      duration: 25,
      distance: 1200,
      swimZone: 1,
    },
  ]
}

function getDistanceWorkouts(week: number, multiplier: number, eventMultiplier: number): SwimmingTemplateWorkout[] {
  const baseDuration = 50 + Math.min(week * 5, 30)
  const baseDistance = 2500 + Math.min(week * 250, 1500)

  return [
    {
      type: 'endurance',
      name: 'Långpass',
      description: 'Huvudpass för aerob utveckling',
      duration: Math.round(baseDuration * multiplier * eventMultiplier),
      distance: Math.round(baseDistance * multiplier * eventMultiplier),
      swimZone: 2,
    },
    {
      type: 'threshold',
      name: 'CSS-intervaller',
      description: 'Tröskelhöjande pass',
      duration: Math.round(50 * multiplier),
      distance: Math.round(2800 * multiplier),
      swimZone: 3,
      structure: '6x400m @CSS, 20s vila',
    },
    {
      type: 'technique',
      name: 'Teknik & effektivitet',
      description: 'Bygg bättre SWOLF',
      duration: 40,
      distance: 2000,
      swimZone: 2,
      structure: 'Fokuera på simtagslängd och kadans',
    },
    {
      type: 'recovery',
      name: 'Aktiv vila',
      description: 'Lätt simning',
      duration: 30,
      distance: 1500,
      swimZone: 1,
    },
  ]
}

function getTechniqueWorkouts(multiplier: number): SwimmingTemplateWorkout[] {
  return [
    {
      type: 'technique',
      name: 'Grundteknik',
      description: 'Fokus på vattenkänsla och simtagsteknik',
      duration: 45,
      distance: Math.round(2000 * multiplier),
      swimZone: 2,
      structure: 'Catch-up, fingertip drag, one-arm drills',
      strokeFocus: 'freestyle',
    },
    {
      type: 'endurance',
      name: 'Aerob bas',
      description: 'Steady simning',
      duration: Math.round(45 * multiplier),
      distance: Math.round(2500 * multiplier),
      swimZone: 2,
    },
    {
      type: 'technique',
      name: 'Vändningar & starter',
      description: 'Förbättra turn-teknik',
      duration: 40,
      distance: Math.round(1800 * multiplier),
      swimZone: 2,
      structure: '16x50m med fokus på vändning',
    },
    {
      type: 'recovery',
      name: 'Aktiv vila',
      description: 'Lätt simning, alla simtag',
      duration: 30,
      distance: 1500,
      swimZone: 1,
      strokeFocus: 'mixed',
    },
  ]
}

function getSprintBaseWorkouts(multiplier: number): SwimmingTemplateWorkout[] {
  return [
    {
      type: 'endurance',
      name: 'Aerob grund',
      description: 'Bygg baskapacitet',
      duration: Math.round(45 * multiplier),
      distance: Math.round(2500 * multiplier),
      swimZone: 2,
    },
    {
      type: 'threshold',
      name: 'Fartleksimning',
      description: 'Varierande tempo',
      duration: Math.round(40 * multiplier),
      distance: Math.round(2200 * multiplier),
      swimZone: 3,
      structure: '16x100m (snabb/lugn)',
    },
    {
      type: 'technique',
      name: 'Startteknik',
      description: 'Poolstart och undervattensarbete',
      duration: 35,
      distance: 1500,
      swimZone: 2,
      structure: 'Starter, streamline, dolphin kicks',
    },
    {
      type: 'recovery',
      name: 'Lätt simning',
      description: 'Aktiv återhämtning',
      duration: 30,
      distance: 1500,
      swimZone: 1,
    },
  ]
}

function getSprintDevelopmentWorkouts(week: number, multiplier: number, targetEvent: number): SwimmingTemplateWorkout[] {
  const intervalDistance = targetEvent <= 100 ? 50 : 100

  return [
    {
      type: 'sprint',
      name: 'Sprintintervaller',
      description: 'Bygg maxfart',
      duration: Math.round(40 * multiplier),
      distance: Math.round(1800 * multiplier),
      swimZone: 5,
      structure: `12x${intervalDistance}m @95%, 45s vila`,
    },
    {
      type: 'threshold',
      name: 'Lactate tolerance',
      description: 'Lär dig tolerera mjölksyra',
      duration: Math.round(45 * multiplier),
      distance: Math.round(2200 * multiplier),
      swimZone: 4,
      structure: '8x100m @85-90%, 20s vila',
    },
    {
      type: 'technique',
      name: 'Raceteknik',
      description: 'Vändningar och finisher',
      duration: 35,
      distance: 1500,
      swimZone: 2,
      structure: 'Fokus på effektiva vändningar och finish-touch',
    },
    {
      type: 'endurance',
      name: 'Aerob bas',
      description: 'Återhämtning och volym',
      duration: Math.round(40 * multiplier),
      distance: Math.round(2300 * multiplier),
      swimZone: 2,
    },
  ]
}

function getRacePaceWorkouts(week: number, multiplier: number, targetEvent: number): SwimmingTemplateWorkout[] {
  return [
    {
      type: 'sprint',
      name: 'Race pace-intervaller',
      description: 'Simulera tävlingstempo',
      duration: Math.round(45 * multiplier),
      distance: Math.round(2000 * multiplier),
      swimZone: 5,
      structure: `6x${targetEvent}m @race pace, full vila`,
    },
    {
      type: 'vo2max',
      name: 'VO2max-set',
      description: 'Höj syreupptagningsförmåga',
      duration: Math.round(40 * multiplier),
      distance: Math.round(1800 * multiplier),
      swimZone: 4,
      structure: '8x75m @max effort, 30s vila',
    },
    {
      type: 'threshold',
      name: 'Descending set',
      description: 'Negative split-övning',
      duration: Math.round(45 * multiplier),
      distance: Math.round(2400 * multiplier),
      swimZone: 3,
      structure: '4x300m descending (varje snabbare än förra)',
    },
    {
      type: 'recovery',
      name: 'Lätt simning',
      description: 'Aktiv vila',
      duration: 30,
      distance: 1500,
      swimZone: 1,
    },
  ]
}

function getSprintPeakWorkouts(multiplier: number, targetEvent: number): SwimmingTemplateWorkout[] {
  return [
    {
      type: 'sprint',
      name: 'Race-starts',
      description: 'Öva tävlingsstart',
      duration: 35,
      distance: Math.round(1200 * multiplier),
      swimZone: 5,
      structure: `8x${targetEvent <= 100 ? 25 : 50}m race start, full vila`,
    },
    {
      type: 'threshold',
      name: 'Opener-pass',
      description: 'Aktivera systemen',
      duration: 40,
      distance: Math.round(1800 * multiplier),
      swimZone: 3,
      structure: '4x200m @85% med full vila',
    },
    {
      type: 'technique',
      name: 'Race prep',
      description: 'Mental och fysisk förberedelse',
      duration: 30,
      distance: 1200,
      swimZone: 2,
      structure: 'Visualisering + lätta drill',
    },
  ]
}

function getSprintTaperWorkouts(multiplier: number, targetEvent: number): SwimmingTemplateWorkout[] {
  return [
    {
      type: 'recovery',
      name: 'Lätt simning',
      description: 'Håll simkänslan',
      duration: 25,
      distance: 1200,
      swimZone: 1,
    },
    {
      type: 'sprint',
      name: 'Aktivering',
      description: 'Kort race-tempo',
      duration: 25,
      distance: 800,
      swimZone: 5,
      structure: `4x${targetEvent <= 100 ? 25 : 50}m @race pace, full vila`,
    },
    {
      type: 'sprint',
      name: 'TÄVLINGSDAG!',
      description: `${targetEvent}m sprint`,
      duration: Math.round(targetEvent / 25),
      distance: targetEvent,
      swimZone: 5,
    },
  ]
}

/**
 * Get swimming workout type descriptions in Swedish
 */
export function getSwimmingWorkoutTypeDescriptions(): Record<SwimmingTemplateWorkout['type'], { name: string; description: string; zoneRange: string }> {
  return {
    endurance: {
      name: 'Uthållighet',
      description: 'Låg intensitet för aerob bas. Bekväm simning med jämnt tempo.',
      zoneRange: 'Zon 2 (83-93% CSS)',
    },
    threshold: {
      name: 'Tröskel (CSS)',
      description: 'Vid eller strax under CSS. Maximal hållbar fart i ~30 min.',
      zoneRange: 'Zon 3 (93-102% CSS)',
    },
    vo2max: {
      name: 'VO2max',
      description: 'Hög intensitet intervaller. Andningen blir tung.',
      zoneRange: 'Zon 4 (102-111% CSS)',
    },
    sprint: {
      name: 'Sprint',
      description: 'Maximal ansträngning, korta intervaller. Full återhämtning mellan.',
      zoneRange: 'Zon 5 (111%+ CSS)',
    },
    recovery: {
      name: 'Återhämtning',
      description: 'Mycket lätt simning för aktiv vila.',
      zoneRange: 'Zon 1 (74-83% CSS)',
    },
    technique: {
      name: 'Teknik',
      description: 'Fokus på simeffektivitet, drills och SWOLF-förbättring.',
      zoneRange: 'Zon 1-2',
    },
    openwater: {
      name: 'Öppet vatten',
      description: 'Specifik träning för öppet vatten-simning.',
      zoneRange: 'Varierar',
    },
  }
}

/**
 * Calculate recommended weekly distance based on experience and goals
 */
export function getRecommendedWeeklyDistance(
  fitnessLevel: 'beginner' | 'intermediate' | 'advanced' | 'elite',
  goal: 'maintenance' | 'building' | 'racing'
): { minDistance: number; maxDistance: number; description: string } {
  const distanceRanges = {
    beginner: { maintenance: { min: 6000, max: 10000 }, building: { min: 10000, max: 15000 }, racing: { min: 12000, max: 18000 } },
    intermediate: { maintenance: { min: 12000, max: 18000 }, building: { min: 18000, max: 25000 }, racing: { min: 20000, max: 30000 } },
    advanced: { maintenance: { min: 20000, max: 30000 }, building: { min: 30000, max: 40000 }, racing: { min: 35000, max: 50000 } },
    elite: { maintenance: { min: 35000, max: 50000 }, building: { min: 50000, max: 70000 }, racing: { min: 60000, max: 80000 } },
  }

  const range = distanceRanges[fitnessLevel][goal]

  const descriptions = {
    beginner: 'Bygg försiktigt och fokusera på teknik',
    intermediate: 'Balansera volym med kvalitet (3:1 ratio)',
    advanced: 'Kan hantera högre volymer med rätt periodisering',
    elite: 'Maximala anpassningar kräver maximal belastning och vila',
  }

  return {
    minDistance: range.min,
    maxDistance: range.max,
    description: descriptions[fitnessLevel],
  }
}
