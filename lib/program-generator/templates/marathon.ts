// lib/program-generator/templates/marathon.ts
// Marathon training template (16-20 weeks)

import { PeriodPhase } from '@/types'

export interface MarathonTemplateWeek {
  week: number
  phase: PeriodPhase
  longRunKm: number
  weeklyVolumeKm: number
  keyWorkouts: {
    type: 'long' | 'tempo' | 'intervals' | 'easy' | 'strength' | 'race-pace'
    description: string
    details: string
  }[]
}

/**
 * Standard 16-week marathon training template
 * Based on proven periodization principles
 */
export function get16WeekMarathonTemplate(
  experienceLevel: 'beginner' | 'intermediate' | 'advanced'
): MarathonTemplateWeek[] {
  const baseVolumes = {
    beginner: { start: 30, peak: 55, longRun: 25 },
    intermediate: { start: 45, peak: 75, longRun: 32 },
    advanced: { start: 60, peak: 95, longRun: 35 },
  }

  const volumes = baseVolumes[experienceLevel]

  return [
    // BASE PHASE (Weeks 1-8)
    {
      week: 1,
      phase: 'BASE',
      longRunKm: volumes.longRun * 0.6,
      weeklyVolumeKm: volumes.start,
      keyWorkouts: [
        { type: 'long', description: 'Långpass', details: 'Zon 2, behagligt tempo' },
        { type: 'easy', description: 'Lugnt löppass', details: 'Zon 1-2' },
        { type: 'strength', description: 'Helkroppsstyrka', details: '3×12-15 reps' },
      ],
    },
    {
      week: 2,
      phase: 'BASE',
      longRunKm: volumes.longRun * 0.65,
      weeklyVolumeKm: volumes.start * 1.1,
      keyWorkouts: [
        { type: 'long', description: 'Långpass', details: 'Zon 2' },
        { type: 'easy', description: 'Lätt jogg', details: 'Zon 1-2' },
        { type: 'strength', description: 'Benstyrka', details: 'Fokus på knäböj och lunges' },
      ],
    },
    {
      week: 3,
      phase: 'BASE',
      longRunKm: volumes.longRun * 0.7,
      weeklyVolumeKm: volumes.start * 1.2,
      keyWorkouts: [
        { type: 'long', description: 'Långpass', details: 'Zon 2, lite Zon 3 sista 15 min' },
        { type: 'easy', description: 'Återhämtningslöpning', details: 'Zon 1-2' },
        { type: 'tempo', description: 'Lätt tempopass', details: '20 min i Zon 3' },
      ],
    },
    {
      week: 4,
      phase: 'BASE',
      longRunKm: volumes.longRun * 0.55, // Recovery week
      weeklyVolumeKm: volumes.start * 0.9,
      keyWorkouts: [
        { type: 'long', description: 'Måttligt långpass', details: 'Zon 2, nedtrappning' },
        { type: 'easy', description: 'Lätt jogg', details: 'Återhämtning' },
      ],
    },
    {
      week: 5,
      phase: 'BASE',
      longRunKm: volumes.longRun * 0.75,
      weeklyVolumeKm: volumes.start * 1.3,
      keyWorkouts: [
        { type: 'long', description: 'Långpass', details: 'Zon 2-3' },
        { type: 'tempo', description: 'Tempopass', details: '25 min i Zon 3-4' },
        { type: 'strength', description: 'Helkroppsstyrka', details: 'Öka vikterna' },
      ],
    },
    {
      week: 6,
      phase: 'BASE',
      longRunKm: volumes.longRun * 0.8,
      weeklyVolumeKm: volumes.start * 1.4,
      keyWorkouts: [
        { type: 'long', description: 'Långpass', details: 'Zon 2-3' },
        { type: 'intervals', description: 'Lätta intervaller', details: '6×4 min Zon 3-4' },
        { type: 'easy', description: 'Lugnt löppass', details: 'Zon 2' },
      ],
    },
    {
      week: 7,
      phase: 'BASE',
      longRunKm: volumes.longRun * 0.85,
      weeklyVolumeKm: volumes.start * 1.5,
      keyWorkouts: [
        { type: 'long', description: 'Långpass', details: 'Öka distansen' },
        { type: 'tempo', description: 'Tempopass', details: '30 min Zon 4' },
        { type: 'easy', description: 'Återhämtningslöpning', details: 'Zon 1-2' },
      ],
    },
    {
      week: 8,
      phase: 'BASE',
      longRunKm: volumes.longRun * 0.65, // Recovery week
      weeklyVolumeKm: volumes.start * 1.2,
      keyWorkouts: [
        { type: 'long', description: 'Måttligt långpass', details: 'Nedtrappning' },
        { type: 'easy', description: 'Lätt jogg', details: 'Återhämtning' },
      ],
    },

    // BUILD PHASE (Weeks 9-12)
    {
      week: 9,
      phase: 'BUILD',
      longRunKm: volumes.longRun * 0.9,
      weeklyVolumeKm: volumes.peak * 0.8,
      keyWorkouts: [
        { type: 'long', description: 'Långpass', details: 'Zon 2, sista 30 min maratontempo' },
        { type: 'tempo', description: 'Tröskellopp', details: '35 min Zon 4' },
        { type: 'intervals', description: 'VO2-intervaller', details: '8×3 min Zon 5' },
      ],
    },
    {
      week: 10,
      phase: 'BUILD',
      longRunKm: volumes.longRun * 0.95,
      weeklyVolumeKm: volumes.peak * 0.85,
      keyWorkouts: [
        { type: 'long', description: 'Långpass med tempo', details: 'Halvvägs öka till maratontempo' },
        { type: 'race-pace', description: 'Maratontempopass', details: '15 km i maratontempo' },
        { type: 'easy', description: 'Återhämtningslöpning', details: 'Zon 1-2' },
      ],
    },
    {
      week: 11,
      phase: 'BUILD',
      longRunKm: volumes.longRun,
      weeklyVolumeKm: volumes.peak * 0.9,
      keyWorkouts: [
        { type: 'long', description: 'Maximalt långpass', details: 'Zon 2-3' },
        { type: 'tempo', description: 'Tempopass', details: '40 min Zon 4' },
        { type: 'intervals', description: 'Snabba intervaller', details: '10×2 min Zon 5' },
      ],
    },
    {
      week: 12,
      phase: 'BUILD',
      longRunKm: volumes.longRun * 0.7, // Recovery week
      weeklyVolumeKm: volumes.peak * 0.7,
      keyWorkouts: [
        { type: 'long', description: 'Måttligt långpass', details: 'Nedtrappning' },
        { type: 'easy', description: 'Lätt jogg', details: 'Återhämtning' },
      ],
    },

    // PEAK PHASE (Weeks 13-14)
    {
      week: 13,
      phase: 'PEAK',
      longRunKm: volumes.longRun,
      weeklyVolumeKm: volumes.peak,
      keyWorkouts: [
        { type: 'long', description: 'Sista långa passet', details: 'Zon 2, sista 45 min maratontempo' },
        { type: 'race-pace', description: 'Maratontempopass', details: '18 km i maratontempo' },
        { type: 'intervals', description: 'Sista intervallerna', details: '6×5 min Zon 4-5' },
      ],
    },
    {
      week: 14,
      phase: 'PEAK',
      longRunKm: volumes.longRun * 0.6,
      weeklyVolumeKm: volumes.peak * 0.75,
      keyWorkouts: [
        { type: 'long', description: 'Måttligt långpass', details: 'Börja trappa ner' },
        { type: 'tempo', description: 'Tempopass', details: '30 min Zon 4' },
        { type: 'easy', description: 'Lätt jogg', details: 'Zon 1-2' },
      ],
    },

    // TAPER PHASE (Weeks 15-16)
    {
      week: 15,
      phase: 'TAPER',
      longRunKm: volumes.longRun * 0.45,
      weeklyVolumeKm: volumes.peak * 0.6,
      keyWorkouts: [
        { type: 'easy', description: 'Måttligt pass', details: 'Zon 2' },
        { type: 'intervals', description: 'Korta intervaller', details: '5×2 min Zon 5, håll skärpan' },
        { type: 'easy', description: 'Lätt jogg', details: 'Zon 1-2' },
      ],
    },
    {
      week: 16,
      phase: 'TAPER',
      longRunKm: volumes.longRun * 0.3,
      weeklyVolumeKm: volumes.peak * 0.4,
      keyWorkouts: [
        { type: 'easy', description: 'Kort och lätt', details: 'Zon 1-2' },
        { type: 'easy', description: 'Lugnt joggturer', details: 'Spara energi' },
        { type: 'race-pace', description: 'TÄVLINGSDAG!', details: 'Marathon - 42.2 km' },
      ],
    },
  ]
}

/**
 * Get weekly mileage progression for marathon
 */
export function getMarathonMilestones(weeks: number): {
  week: number
  milestone: string
  advice: string
}[] {
  const milestones = [
    { week: 4, milestone: 'Första återhämtningsveckan', advice: 'Låt kroppen anpassa sig' },
    { week: 8, milestone: 'Bas-fasen klar', advice: 'Grundkondition byggd, nu ökar vi intensiteten' },
    { week: 10, milestone: 'Första långa maratontempopasset', advice: 'Lär känna ditt ras-tempo' },
    { week: 12, milestone: 'Andra återhämtningsveckan', advice: 'Viktig nedtrappning innan peak-fasen' },
    { week: 13, milestone: 'Peak-vecka', advice: 'Max volym, sista tuffa veckan' },
    { week: 14, milestone: 'Börja taper', advice: 'Minska volym, behåll intensitet' },
    { week: 15, milestone: 'Taper-vecka 1', advice: 'Mindre volym, kroppen återhämtar' },
    { week: 16, milestone: 'Tävlingsvecka!', advice: 'Minimal träning, maximal vila' },
  ]

  return milestones.filter(m => m.week <= weeks)
}

/**
 * Get race-week taper protocol
 */
export function getRaceWeekProtocol(): {
  day: number
  activity: string
  notes: string
}[] {
  return [
    { day: 1, activity: 'Lätt jogg 30 min', notes: 'Zon 1-2, bara hålla igång' },
    { day: 2, activity: 'Vila eller lätt promenad', notes: 'Aktiv återhämtning' },
    { day: 3, activity: 'Kort jogg 20 min + stegringar', notes: 'Behåll skärpan' },
    { day: 4, activity: 'Vila', notes: 'Total vila, stretcha lätt' },
    { day: 5, activity: 'Kort jogg 15 min', notes: 'Sista lilla passet' },
    { day: 6, activity: 'Vila', notes: 'Förberedelser, karboladda' },
    { day: 7, activity: 'TÄVLINGSDAG', notes: 'Marathon! Kör på din plan!' },
  ]
}
