// lib/program-generator/templates/5k-10k.ts
// 5K and 10K training templates

import { PeriodPhase } from '@/types'

export interface ShortRaceTemplateWeek {
  week: number
  phase: PeriodPhase
  longRunKm: number
  weeklyVolumeKm: number
  keyWorkouts: {
    type: 'long' | 'tempo' | 'intervals' | 'easy' | 'vo2max' | 'race-pace' | 'strength'
    description: string
    details: string
  }[]
}

/**
 * 8-week 10K training template
 * Focus on threshold and VO2max development
 */
export function get8Week10KTemplate(
  experienceLevel: 'beginner' | 'intermediate' | 'advanced'
): ShortRaceTemplateWeek[] {
  const baseVolumes = {
    beginner: { start: 20, peak: 40, longRun: 12 },
    intermediate: { start: 30, peak: 55, longRun: 16 },
    advanced: { start: 40, peak: 70, longRun: 20 },
  }

  const volumes = baseVolumes[experienceLevel]

  return [
    // BASE PHASE (Weeks 1-3)
    {
      week: 1,
      phase: 'BASE',
      longRunKm: volumes.longRun * 0.7,
      weeklyVolumeKm: volumes.start,
      keyWorkouts: [
        { type: 'long', description: 'Långpass', details: 'Zon 2-3' },
        { type: 'easy', description: 'Lugnt löppass', details: 'Zon 1-2' },
        { type: 'tempo', description: 'Tempopass', details: '20 min Zon 3-4' },
      ],
    },
    {
      week: 2,
      phase: 'BASE',
      longRunKm: volumes.longRun * 0.8,
      weeklyVolumeKm: volumes.start * 1.15,
      keyWorkouts: [
        { type: 'long', description: 'Långpass', details: 'Zon 2-3' },
        { type: 'intervals', description: 'Tröskell-intervaller', details: '6×4 min Zon 4' },
        { type: 'easy', description: 'Återhämtningslöpning', details: 'Zon 1-2' },
      ],
    },
    {
      week: 3,
      phase: 'BASE',
      longRunKm: volumes.longRun * 0.9,
      weeklyVolumeKm: volumes.start * 1.25,
      keyWorkouts: [
        { type: 'long', description: 'Långpass', details: 'Zon 2-3' },
        { type: 'tempo', description: 'Tempopass', details: '25 min Zon 4' },
        { type: 'vo2max', description: 'VO2max-intervaller', details: '8×2 min Zon 5' },
      ],
    },

    // BUILD PHASE (Weeks 4-6)
    {
      week: 4,
      phase: 'BUILD',
      longRunKm: volumes.longRun * 0.65, // Recovery week
      weeklyVolumeKm: volumes.start * 1.0,
      keyWorkouts: [
        { type: 'long', description: 'Måttligt långpass', details: 'Nedtrappning' },
        { type: 'easy', description: 'Lätt jogg', details: 'Återhämtning' },
      ],
    },
    {
      week: 5,
      phase: 'BUILD',
      longRunKm: volumes.longRun,
      weeklyVolumeKm: volumes.peak * 0.85,
      keyWorkouts: [
        { type: 'long', description: 'Långpass med tempo', details: 'Sista 5 km i 10K-tempo' },
        { type: 'vo2max', description: 'VO2max-intervaller', details: '10×3 min Zon 5' },
        { type: 'race-pace', description: '10K-tempopass', details: '5 km i 10K-tempo' },
      ],
    },
    {
      week: 6,
      phase: 'BUILD',
      longRunKm: volumes.longRun,
      weeklyVolumeKm: volumes.peak,
      keyWorkouts: [
        { type: 'long', description: 'Långpass', details: 'Zon 2-3' },
        { type: 'intervals', description: '1 km-intervaller', details: '5×1 km i 10K-tempo' },
        { type: 'tempo', description: 'Tempopass', details: '30 min Zon 4' },
      ],
    },

    // PEAK & TAPER (Weeks 7-8)
    {
      week: 7,
      phase: 'TAPER',
      longRunKm: volumes.longRun * 0.6,
      weeklyVolumeKm: volumes.peak * 0.7,
      keyWorkouts: [
        { type: 'easy', description: 'Måttligt pass', details: 'Zon 2' },
        { type: 'vo2max', description: 'Korta intervaller', details: '6×2 min Zon 5' },
        { type: 'easy', description: 'Lätt jogg', details: 'Zon 1-2' },
      ],
    },
    {
      week: 8,
      phase: 'TAPER',
      longRunKm: volumes.longRun * 0.4,
      weeklyVolumeKm: volumes.peak * 0.5,
      keyWorkouts: [
        { type: 'easy', description: 'Kort och lätt', details: 'Zon 1-2' },
        { type: 'race-pace', description: 'Kort 10K-tempo', details: '2 km i tävlingstempo + stegringar' },
        { type: 'race-pace', description: 'TÄVLINGSDAG!', details: '10K-lopp' },
      ],
    },
  ]
}

/**
 * 6-week 5K training template
 * High intensity focus with VO2max and speed work
 */
export function get6Week5KTemplate(
  experienceLevel: 'beginner' | 'intermediate' | 'advanced'
): ShortRaceTemplateWeek[] {
  const baseVolumes = {
    beginner: { start: 15, peak: 30, longRun: 10 },
    intermediate: { start: 25, peak: 45, longRun: 13 },
    advanced: { start: 35, peak: 60, longRun: 16 },
  }

  const volumes = baseVolumes[experienceLevel]

  return [
    // BASE PHASE (Weeks 1-2)
    {
      week: 1,
      phase: 'BASE',
      longRunKm: volumes.longRun * 0.7,
      weeklyVolumeKm: volumes.start,
      keyWorkouts: [
        { type: 'long', description: 'Långpass', details: 'Zon 2-3' },
        { type: 'tempo', description: 'Tempopass', details: '20 min Zon 4' },
        { type: 'vo2max', description: 'VO2max-intervaller', details: '6×2 min Zon 5' },
      ],
    },
    {
      week: 2,
      phase: 'BASE',
      longRunKm: volumes.longRun * 0.85,
      weeklyVolumeKm: volumes.start * 1.2,
      keyWorkouts: [
        { type: 'long', description: 'Långpass', details: 'Zon 2-3' },
        { type: 'intervals', description: 'Snabba intervaller', details: '8×400m i 5K-tempo' },
        { type: 'easy', description: 'Återhämtningslöpning', details: 'Zon 1-2' },
      ],
    },

    // BUILD PHASE (Weeks 3-4)
    {
      week: 3,
      phase: 'BUILD',
      longRunKm: volumes.longRun,
      weeklyVolumeKm: volumes.peak * 0.85,
      keyWorkouts: [
        { type: 'long', description: 'Långpass med tempo', details: 'Sista 2 km i 5K-tempo' },
        { type: 'vo2max', description: 'VO2max-intervaller', details: '10×1 min Zon 5' },
        { type: 'race-pace', description: '5K-tempopass', details: '3 km i 5K-tempo' },
      ],
    },
    {
      week: 4,
      phase: 'BUILD',
      longRunKm: volumes.longRun * 0.6, // Recovery week
      weeklyVolumeKm: volumes.peak * 0.65,
      keyWorkouts: [
        { type: 'easy', description: 'Måttligt pass', details: 'Nedtrappning' },
        { type: 'tempo', description: 'Lätt tempo', details: '15 min Zon 3-4' },
      ],
    },

    // PEAK & TAPER (Weeks 5-6)
    {
      week: 5,
      phase: 'PEAK',
      longRunKm: volumes.longRun,
      weeklyVolumeKm: volumes.peak,
      keyWorkouts: [
        { type: 'long', description: 'Sista långa', details: 'Zon 2-3' },
        { type: 'intervals', description: '1 km-intervaller', details: '4×1 km i 5K-tempo' },
        { type: 'vo2max', description: 'Maxintervaller', details: '12×1 min Zon 5' },
      ],
    },
    {
      week: 6,
      phase: 'TAPER',
      longRunKm: volumes.longRun * 0.4,
      weeklyVolumeKm: volumes.peak * 0.5,
      keyWorkouts: [
        { type: 'easy', description: 'Kort och lätt', details: 'Zon 1-2' },
        { type: 'race-pace', description: 'Korta stegringar', details: '1 km + 6×100m stegringar' },
        { type: 'race-pace', description: 'TÄVLINGSDAG!', details: '5K-lopp' },
      ],
    },
  ]
}

/**
 * Get VO2max workout recommendations for 5K/10K
 */
export function getVO2maxWorkouts(): {
  name: string
  description: string
  workout: string
  purpose: string
}[] {
  return [
    {
      name: '400m-repetitioner',
      description: 'Klassiska kortintervaller',
      workout: '12-16×400m i 5K-tempo, 200m jogg-vila',
      purpose: 'Utvecklar VO2max och snabbuthållighet',
    },
    {
      name: '1000m-intervaller',
      description: 'Längre VO2max-arbete',
      workout: '5-6×1000m i 5K-10K-tempo, 2 min vila',
      purpose: 'Ökar syreupptagningsförmågan',
    },
    {
      name: 'Pyramid-intervaller',
      description: 'Varierad intervalltränning',
      workout: '400-800-1200-1600-1200-800-400m, jogg-vila',
      purpose: 'Allsidig utveckling av aerob kraft',
    },
    {
      name: 'Fartlek',
      description: 'Fri intervallträning',
      workout: '45 min med 2-4 min hårda partier (Zon 5), 2 min vila',
      purpose: 'Rolig och varierad VO2max-träning',
    },
  ]
}

/**
 * Get race-week protocol for 5K/10K
 */
export function getShortRaceWeekProtocol(distance: '5k' | '10k'): {
  day: number
  activity: string
  notes: string
}[] {
  if (distance === '5k') {
    return [
      { day: 1, activity: 'Lätt jogg 25 min', notes: 'Zon 1-2' },
      { day: 2, activity: 'Korta intervaller', notes: '5×1 min Zon 5, behåll skärpan' },
      { day: 3, activity: 'Vila eller promenad', notes: 'Aktiv återhämtning' },
      { day: 4, activity: 'Kort jogg 15 min + stegringar', notes: '4-6×100m stegringar' },
      { day: 5, activity: 'Vila', notes: 'Total vila' },
      { day: 6, activity: 'Kort jogg 10 min', notes: 'Bara hålla igång' },
      { day: 7, activity: 'TÄVLINGSDAG', notes: '5K-lopp - kör på!' },
    ]
  } else {
    return [
      { day: 1, activity: 'Lätt jogg 30 min', notes: 'Zon 1-2' },
      { day: 2, activity: 'Korta intervaller', notes: '6×1 min Zon 5' },
      { day: 3, activity: 'Lätt jogg 25 min', notes: 'Zon 2' },
      { day: 4, activity: 'Vila eller promenad', notes: 'Aktiv återhämtning' },
      { day: 5, activity: 'Kort jogg 20 min + stegringar', notes: '4×100m stegringar' },
      { day: 6, activity: 'Vila eller kort jogg', notes: 'Kort 10 min jogg om du vill' },
      { day: 7, activity: 'TÄVLINGSDAG', notes: '10K-lopp - lycka till!' },
    ]
  }
}

/**
 * Pace guidance for 5K/10K racing
 */
export function getRacePaceStrategy(distance: '5k' | '10k'): {
  segment: string
  strategy: string
  pacing: string
}[] {
  if (distance === '5k') {
    return [
      { segment: 'Första kilometern', strategy: 'Starta kontrollerat', pacing: '2-3 sek/km långsammare än måltempo' },
      { segment: 'Kilometer 2-4', strategy: 'Hitta rytmen', pacing: 'Måltempo, jämnt och stabilt' },
      { segment: 'Sista kilometern', strategy: 'Ge allt!', pacing: 'Öka tempot, sprint sista 400m' },
    ]
  } else {
    return [
      { segment: 'Första 2 km', strategy: 'Starta kontrollerat', pacing: '2-3 sek/km långsammare än måltempo' },
      { segment: 'Kilometer 3-7', strategy: 'Håll jämnt tempo', pacing: 'Måltempo, fokusera på form' },
      { segment: 'Kilometer 8-9', strategy: 'Öka gradvis', pacing: 'Börja öka tempot lite' },
      { segment: 'Sista kilometern', strategy: 'Sprint!', pacing: 'Ge allt du har kvar' },
    ]
  }
}
