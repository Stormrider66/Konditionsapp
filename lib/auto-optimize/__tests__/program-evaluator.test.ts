import { describe, it, expect } from 'vitest'
import { evaluateProgram } from '../program-evaluator'
import type { EvaluationContext } from '../types'
import type { ParsedProgram } from '@/lib/ai/program-parser'

// ── Test Data ───────────────────────────────────────────────────────

const GOOD_PROGRAM: ParsedProgram = {
  name: 'Löpprogram 12 veckor - Polarized',
  description: 'Ett 12-veckors löpprogram med polariserad träning (80/20)',
  totalWeeks: 12,
  methodology: 'POLARIZED',
  weeklySchedule: { sessionsPerWeek: 4, restDays: [3, 7] },
  phases: [
    {
      name: 'Basperiod',
      weeks: '1-4',
      focus: 'Bygga aerob bas med lätt löpning och grundstyrka',
      volumeGuidance: 'Gradvis ökning från 30 till 40 km/vecka',
      keyWorkouts: [
        'Långpass (90 min, Zon 1-2)',
        'Tempopass (20 min i Zon 3)',
        'Lätt löpning med steg',
      ],
      weeklyTemplate: {
        monday: {
          type: 'RUNNING',
          name: 'Lätt löpning',
          description: 'Lätt löpning i Zon 1-2, samtalstempo',
          intensity: 'easy',
          duration: 45,
          zone: 1,
          segments: [
            { order: 1, type: 'warmup', duration: 10, zone: 1, description: 'Uppvärmning' },
            { order: 2, type: 'work', duration: 30, zone: 2, description: 'Huvudpass zon 2' },
            { order: 3, type: 'cooldown', duration: 5, zone: 1, description: 'Nedvarvning' },
          ],
        },
        tuesday: { type: 'REST', description: 'Vila', name: 'Vilodag' },
        wednesday: {
          type: 'RUNNING',
          name: 'Tempopass',
          description: 'Tempo i Zon 3, comfortably hard',
          intensity: 'moderate',
          duration: 50,
          zone: 3,
          segments: [
            { order: 1, type: 'warmup', duration: 15, zone: 1, description: 'Uppvärmning' },
            { order: 2, type: 'work', duration: 20, zone: 3, pace: '4:30/km', description: 'Tempoblock' },
            { order: 3, type: 'cooldown', duration: 15, zone: 1, description: 'Nedvarvning' },
          ],
        },
        thursday: { type: 'REST', description: 'Vila', name: 'Vilodag' },
        friday: {
          type: 'RUNNING',
          name: 'Lätt löpning + steg',
          description: 'Lätt löpning med 6x100m steg',
          intensity: 'easy',
          duration: 40,
          zone: 1,
          segments: [
            { order: 1, type: 'warmup', duration: 10, zone: 1, description: 'Uppvärmning' },
            { order: 2, type: 'work', duration: 25, zone: 1, description: 'Lätt löpning' },
            { order: 3, type: 'interval', duration: 5, zone: 5, description: '6x100m steg' },
          ],
        },
        saturday: {
          type: 'RUNNING',
          name: 'Långpass',
          description: 'Långpass i Zon 1-2 på varierad terräng',
          intensity: 'easy',
          duration: 90,
          zone: 2,
          segments: [
            { order: 1, type: 'warmup', duration: 15, zone: 1, description: 'Uppvärmning' },
            { order: 2, type: 'work', duration: 65, zone: 2, description: 'Huvudpass zon 2' },
            { order: 3, type: 'cooldown', duration: 10, zone: 1, description: 'Nedvarvning' },
          ],
        },
        sunday: { type: 'REST', description: 'Vila och återhämtning', name: 'Vilodag' },
      },
    },
    {
      name: 'Byggperiod',
      weeks: '5-8',
      focus: 'Öka intensitet med tröskelintervaller och fartlek',
      volumeGuidance: 'Ökning till 45-50 km/vecka',
      keyWorkouts: [
        'Tröskelintervaller (4x6 min Zon 4)',
        'Långpass med progressiv avslutning',
        'Fartlek 45 min',
      ],
      weeklyTemplate: {
        monday: {
          type: 'RUNNING',
          name: 'Lätt löpning',
          description: 'Återhämtningslöpning',
          intensity: 'recovery',
          duration: 40,
          zone: 1,
          segments: [
            { order: 1, type: 'warmup', duration: 10, zone: 1, description: 'Uppvärmning' },
            { order: 2, type: 'work', duration: 25, zone: 1, description: 'Lätt löpning' },
            { order: 3, type: 'cooldown', duration: 5, zone: 1, description: 'Nedvarvning' },
          ],
        },
        tuesday: { type: 'REST', description: 'Vila', name: 'Vilodag' },
        wednesday: {
          type: 'RUNNING',
          name: 'Tröskelintervaller',
          description: 'Intervaller i Zon 4, hög intensitet',
          intensity: 'interval',
          duration: 55,
          zone: 4,
          segments: [
            { order: 1, type: 'warmup', duration: 15, zone: 1, description: 'Uppvärmning' },
            { order: 2, type: 'interval', duration: 24, zone: 4, heartRate: '170-180', description: '4x6 min tröskel med 2 min vila' },
            { order: 3, type: 'cooldown', duration: 15, zone: 1, description: 'Nedvarvning' },
          ],
        },
        thursday: { type: 'REST', description: 'Vila', name: 'Vilodag' },
        friday: {
          type: 'RUNNING',
          name: 'Fartlek',
          description: 'Fartlek med varierad intensitet',
          intensity: 'moderate',
          duration: 45,
          zone: 3,
          segments: [
            { order: 1, type: 'warmup', duration: 10, zone: 1, description: 'Uppvärmning' },
            { order: 2, type: 'work', duration: 30, zone: 3, description: 'Fartlek varierat tempo' },
            { order: 3, type: 'cooldown', duration: 5, zone: 1, description: 'Nedvarvning' },
          ],
        },
        saturday: {
          type: 'RUNNING',
          name: 'Långpass progressiv',
          description: 'Långpass med progressiv avslutning i Zon 3',
          intensity: 'easy',
          duration: 100,
          zone: 2,
          segments: [
            { order: 1, type: 'warmup', duration: 15, zone: 1, description: 'Uppvärmning' },
            { order: 2, type: 'work', duration: 60, zone: 2, description: 'Grundtempo' },
            { order: 3, type: 'work', duration: 20, zone: 3, description: 'Progressiv avslutning' },
            { order: 4, type: 'cooldown', duration: 5, zone: 1, description: 'Nedvarvning' },
          ],
        },
        sunday: { type: 'REST', description: 'Vila och återhämtning', name: 'Vilodag' },
      },
    },
    {
      name: 'Toppperiod',
      weeks: '9-10',
      focus: 'Toppform med specifika tävlingspass',
      volumeGuidance: 'Maxvolym 50 km/vecka',
      keyWorkouts: [
        'VO2max-intervaller (5x4 min Zon 5)',
        'Tävlingstempo 30 min',
      ],
      weeklyTemplate: {
        monday: {
          type: 'RUNNING',
          name: 'Lätt löpning',
          description: 'Återhämtningslöpning',
          intensity: 'recovery',
          duration: 35,
          zone: 1,
          segments: [
            { order: 1, type: 'warmup', duration: 10, zone: 1, description: 'Uppvärmning' },
            { order: 2, type: 'work', duration: 20, zone: 1, description: 'Lätt löpning' },
            { order: 3, type: 'cooldown', duration: 5, zone: 1, description: 'Nedvarvning' },
          ],
        },
        tuesday: { type: 'REST', description: 'Vila', name: 'Vilodag' },
        wednesday: {
          type: 'RUNNING',
          name: 'VO2max-intervaller',
          description: 'Hög intensitet VO2max',
          intensity: 'max',
          duration: 50,
          zone: 5,
          segments: [
            { order: 1, type: 'warmup', duration: 15, zone: 1, description: 'Uppvärmning' },
            { order: 2, type: 'interval', duration: 20, zone: 5, heartRate: '180-190', description: '5x4 min VO2max' },
            { order: 3, type: 'cooldown', duration: 15, zone: 1, description: 'Nedvarvning' },
          ],
        },
        thursday: { type: 'REST', description: 'Vila', name: 'Vilodag' },
        friday: {
          type: 'RUNNING',
          name: 'Lätt löpning',
          description: 'Lätt löpning',
          intensity: 'easy',
          duration: 35,
          zone: 1,
          segments: [
            { order: 1, type: 'warmup', duration: 10, zone: 1, description: 'Uppvärmning' },
            { order: 2, type: 'work', duration: 20, zone: 1, description: 'Lätt löpning' },
            { order: 3, type: 'cooldown', duration: 5, zone: 1, description: 'Nedvarvning' },
          ],
        },
        saturday: {
          type: 'RUNNING',
          name: 'Långpass',
          description: 'Långpass med tävlingstempo',
          intensity: 'moderate',
          duration: 90,
          zone: 2,
          segments: [
            { order: 1, type: 'warmup', duration: 15, zone: 1, description: 'Uppvärmning' },
            { order: 2, type: 'work', duration: 50, zone: 2, description: 'Grundtempo' },
            { order: 3, type: 'work', duration: 20, zone: 3, description: 'Tävlingstempo' },
            { order: 4, type: 'cooldown', duration: 5, zone: 1, description: 'Nedvarvning' },
          ],
        },
        sunday: { type: 'REST', description: 'Vila och återhämtning', name: 'Vilodag' },
      },
    },
    {
      name: 'Nedtrappning',
      weeks: '11-12',
      focus: 'Nedtrappning mot tävling med reducerad volym och vila',
      volumeGuidance: 'Minskar till 25-30 km/vecka, behåll intensitet men reducera volym',
      keyWorkouts: [
        'Korta intervaller (6x2 min)',
        'Lätt löpning med steg',
      ],
      weeklyTemplate: {
        monday: {
          type: 'RUNNING',
          name: 'Lätt löpning',
          description: 'Lätt återhämtning',
          intensity: 'recovery',
          duration: 30,
          zone: 1,
          segments: [
            { order: 1, type: 'warmup', duration: 10, zone: 1, description: 'Uppvärmning' },
            { order: 2, type: 'work', duration: 15, zone: 1, description: 'Lätt löpning' },
            { order: 3, type: 'cooldown', duration: 5, zone: 1, description: 'Nedvarvning' },
          ],
        },
        tuesday: { type: 'REST', description: 'Vila', name: 'Vilodag' },
        wednesday: {
          type: 'RUNNING',
          name: 'Korta intervaller',
          description: 'Snabba korta intervaller för att hålla skärpa',
          intensity: 'hard',
          duration: 40,
          zone: 4,
          segments: [
            { order: 1, type: 'warmup', duration: 15, zone: 1, description: 'Uppvärmning' },
            { order: 2, type: 'interval', duration: 12, zone: 5, description: '6x2 min med 1 min vila' },
            { order: 3, type: 'cooldown', duration: 13, zone: 1, description: 'Nedvarvning' },
          ],
        },
        thursday: { type: 'REST', description: 'Vila', name: 'Vilodag' },
        friday: {
          type: 'RUNNING',
          name: 'Lätt löpning + steg',
          description: 'Lätt med steg för att aktivera',
          intensity: 'easy',
          duration: 30,
          zone: 1,
          segments: [
            { order: 1, type: 'warmup', duration: 10, zone: 1, description: 'Uppvärmning' },
            { order: 2, type: 'work', duration: 15, zone: 1, description: 'Lätt löpning' },
            { order: 3, type: 'interval', duration: 5, zone: 5, description: '4x100m steg' },
          ],
        },
        saturday: { type: 'REST', description: 'Vila inför tävling', name: 'Vilodag' },
        sunday: { type: 'REST', description: 'Tävlingsdag eller vila', name: 'Tävling/Vila' },
      },
    },
  ],
}

const BAD_PROGRAM: ParsedProgram = {
  name: 'P',
  description: '',
  totalWeeks: 12,
  phases: [
    {
      name: 'Period 1',
      weeks: '1-12',
      focus: 'Löpning',
      weeklyTemplate: {
        monday: { type: 'RUNNING', description: 'Löpning', name: 'Löpning' },
        tuesday: { type: 'RUNNING', description: 'Löpning', name: 'Löpning' },
        wednesday: { type: 'RUNNING', description: 'Löpning', name: 'Löpning' },
        thursday: { type: 'RUNNING', description: 'Löpning', name: 'Löpning' },
        friday: { type: 'RUNNING', description: 'Löpning', name: 'Löpning' },
        saturday: { type: 'RUNNING', description: 'Löpning', name: 'Löpning' },
        sunday: { type: 'RUNNING', description: 'Löpning', name: 'Löpning' },
      },
    },
  ],
}

const PARTIAL_PROGRAM: ParsedProgram = {
  name: 'Halvbra program',
  description: 'Ett program med blandad kvalitet',
  totalWeeks: 8,
  methodology: 'POLARIZED',
  phases: [
    {
      name: 'Basperiod',
      weeks: '1-4',
      focus: 'Aerob bas',
      weeklyTemplate: {
        monday: {
          type: 'RUNNING',
          name: 'Löpning',
          description: 'Lätt löpning zon 2',
          intensity: 'easy',
          zone: 2,
        },
        tuesday: { type: 'REST', description: 'Vila', name: 'Vila' },
        wednesday: {
          type: 'RUNNING',
          name: 'Tempo',
          description: 'Tempopass',
          intensity: 'moderate',
          zone: 3,
        },
        thursday: { type: 'REST', description: 'Vila', name: 'Vila' },
        friday: {
          type: 'RUNNING',
          name: 'Löpning',
          description: 'Lätt löpning',
          intensity: 'easy',
          zone: 1,
        },
        saturday: {
          type: 'RUNNING',
          name: 'Långpass',
          description: 'Långpass',
          intensity: 'easy',
          zone: 2,
          duration: 90,
        },
        sunday: { type: 'REST', description: 'Vila', name: 'Vila' },
      },
    },
    {
      name: 'Byggperiod',
      weeks: '5-8',
      focus: 'Bygg intensitet',
      volumeGuidance: 'Öka volym',
      weeklyTemplate: {
        monday: {
          type: 'RUNNING',
          name: 'Löpning',
          description: 'Lätt löpning',
          intensity: 'easy',
          zone: 1,
        },
        tuesday: { type: 'REST', description: 'Vila', name: 'Vila' },
        wednesday: {
          type: 'RUNNING',
          name: 'Intervall',
          description: 'Tröskelintervaller',
          intensity: 'interval',
          zone: 4,
        },
        thursday: { type: 'REST', description: 'Vila', name: 'Vila' },
        friday: {
          type: 'RUNNING',
          name: 'Löpning',
          description: 'Fartlek',
          intensity: 'moderate',
          zone: 3,
        },
        saturday: {
          type: 'RUNNING',
          name: 'Långpass',
          description: 'Långpass med fart',
          intensity: 'easy',
          zone: 2,
          duration: 100,
        },
        sunday: { type: 'REST', description: 'Vila', name: 'Vila' },
      },
    },
  ],
}

// ── Contexts ────────────────────────────────────────────────────────

const RUNNING_CONTEXT: EvaluationContext = {
  sport: 'RUNNING',
  methodology: 'POLARIZED',
  totalWeeks: 12,
  sessionsPerWeek: 4,
  experienceLevel: 'intermediate',
  goal: '10 km under 50 minuter',
}

const RUNNING_8W_CONTEXT: EvaluationContext = {
  sport: 'RUNNING',
  methodology: 'POLARIZED',
  totalWeeks: 8,
  sessionsPerWeek: 4,
  experienceLevel: 'intermediate',
  goal: 'Förbättra kondition',
}

const INJURY_CONTEXT: EvaluationContext = {
  sport: 'RUNNING',
  methodology: 'POLARIZED',
  totalWeeks: 12,
  sessionsPerWeek: 4,
  injuries: [
    {
      type: 'knee_pain',
      painLevel: 5,
      bodyPart: 'knä',
      status: 'recovering',
    },
  ],
}

const STRENGTH_CONTEXT: EvaluationContext = {
  sport: 'STRENGTH',
  methodology: 'PYRAMIDAL',
  totalWeeks: 12,
  sessionsPerWeek: 4,
  experienceLevel: 'intermediate',
  goal: 'Bygga muskelmassa',
}

const GYM_PROGRAM: ParsedProgram = {
  name: 'Styrkeprogram 12 veckor',
  description: 'Hypertrofiprogram med upper/lower split',
  totalWeeks: 12,
  methodology: 'PYRAMIDAL',
  weeklySchedule: { sessionsPerWeek: 4, restDays: [3, 6, 7] },
  phases: [
    {
      name: 'Anatomisk Anpassning',
      weeks: '1-3',
      focus: 'Lär in rörelsemönster, anatomisk anpassning med lätt belastning',
      volumeGuidance: '2-3 set per övning, RPE 6, deload vecka 3',
      keyWorkouts: ['Helkropp A: Knäböj, Bänkpress, Rodd', 'Helkropp B: Marklyft, Press, Chins'],
      weeklyTemplate: {
        monday: {
          type: 'STRENGTH',
          name: 'Helkropp A',
          description: 'Knäböj 3x12 @ RPE 6, Bänkpress 3x12 @ RPE 6, Rodd 3x12, vila 90s',
          intensity: 'moderate',
          duration: 60,
          segments: [
            { order: 1, type: 'warmup', duration: 10, description: 'RAMP: lätt cykel + dynamisk rörlighet' },
            { order: 2, type: 'work', duration: 40, description: 'Knäböj 3x12 @ RPE 6 tempo 2-0-2, Bänkpress 3x12, Rodd 3x12' },
            { order: 3, type: 'cooldown', duration: 10, description: 'Stretching' },
          ],
        },
        tuesday: { type: 'REST', description: 'Vila', name: 'Vila' },
        wednesday: {
          type: 'STRENGTH',
          name: 'Helkropp B',
          description: 'Marklyft 3x10, Press 3x10, Chins 3xmax, Bulgarian Split Squat 3x10',
          intensity: 'moderate',
          duration: 60,
          segments: [
            { order: 1, type: 'warmup', duration: 10, description: 'RAMP uppvärmning' },
            { order: 2, type: 'work', duration: 40, description: 'Marklyft 3x10, Press 3x10, Chins 3xmax' },
            { order: 3, type: 'cooldown', duration: 10, description: 'Stretching' },
          ],
        },
        thursday: { type: 'REST', description: 'Vila', name: 'Vila' },
        friday: {
          type: 'STRENGTH',
          name: 'Överkropp',
          description: 'Bänkpress 3x10, Rodd 3x10, Axelpress 3x10, Biceps curl 3x12',
          intensity: 'moderate',
          duration: 60,
          segments: [
            { order: 1, type: 'warmup', duration: 10, description: 'Uppvärmning' },
            { order: 2, type: 'work', duration: 40, description: 'Bänkpress 3x10, Rodd 3x10, Axelpress 3x10' },
            { order: 3, type: 'cooldown', duration: 10, description: 'Stretching' },
          ],
        },
        saturday: {
          type: 'STRENGTH',
          name: 'Underkropp',
          description: 'Knäböj 3x10, RDL 3x10, Hip Thrust 3x12, Utfallssteg 3x10',
          intensity: 'heavy',
          duration: 60,
          segments: [
            { order: 1, type: 'warmup', duration: 10, description: 'Uppvärmning' },
            { order: 2, type: 'work', duration: 40, description: 'Knäböj 3x10, RDL 3x10, Hip Thrust 3x12' },
            { order: 3, type: 'cooldown', duration: 10, description: 'Stretching' },
          ],
        },
        sunday: { type: 'REST', description: 'Vila och återhämtning', name: 'Vila' },
      },
    },
    {
      name: 'Hypertrofifas',
      weeks: '4-9',
      focus: 'Hypertrofi med progressiv volymökning, RPE 7-8.5',
      volumeGuidance: '3-4 set, öka volym varje vecka, deload vecka 7',
      keyWorkouts: ['Upper A: Bänkpress, Rodd, Pull-ups', 'Lower A: Knäböj, RDL, Hip Thrust'],
      weeklyTemplate: {
        monday: {
          type: 'STRENGTH',
          name: 'Upper A',
          description: 'Bänkpress 4x8 @ RPE 8, Rodd 4x8 @ RPE 8, Axelpress 3x10, Biceps 3x12',
          intensity: 'heavy',
          duration: 60,
          segments: [
            { order: 1, type: 'warmup', duration: 10, description: 'RAMP uppvärmning' },
            { order: 2, type: 'work', duration: 40, description: 'Bänkpress 4x8 RPE 8, Rodd 4x8, Axelpress 3x10' },
            { order: 3, type: 'cooldown', duration: 10, description: 'Stretching' },
          ],
        },
        tuesday: { type: 'REST', description: 'Vila', name: 'Vila' },
        wednesday: {
          type: 'STRENGTH',
          name: 'Lower A',
          description: 'Knäböj 4x8 @ RPE 8, RDL 3x10, Hip Thrust 3x12, Vadpress 4x15',
          intensity: 'heavy',
          duration: 60,
          segments: [
            { order: 1, type: 'warmup', duration: 10, description: 'RAMP uppvärmning' },
            { order: 2, type: 'work', duration: 40, description: 'Knäböj 4x8 RPE 8, RDL 3x10, Hip Thrust 3x12' },
            { order: 3, type: 'cooldown', duration: 10, description: 'Stretching' },
          ],
        },
        thursday: { type: 'REST', description: 'Vila', name: 'Vila' },
        friday: {
          type: 'STRENGTH',
          name: 'Upper B',
          description: 'Axelpress 4x8, Chins 4x8, Incline bänk 3x10, Laterals 4x15',
          intensity: 'moderate',
          duration: 60,
          segments: [
            { order: 1, type: 'warmup', duration: 10, description: 'Uppvärmning' },
            { order: 2, type: 'work', duration: 40, description: 'Axelpress 4x8, Chins 4x8, Incline bänk 3x10' },
            { order: 3, type: 'cooldown', duration: 10, description: 'Stretching' },
          ],
        },
        saturday: {
          type: 'STRENGTH',
          name: 'Lower B',
          description: 'Marklyft 4x6 tungt @ RPE 8, Front squat 3x8, Walking lunges 3x12',
          intensity: 'heavy',
          duration: 60,
          segments: [
            { order: 1, type: 'warmup', duration: 10, description: 'Uppvärmning' },
            { order: 2, type: 'work', duration: 40, description: 'Marklyft 4x6 RPE 8, Front squat 3x8, Walking lunges 3x12' },
            { order: 3, type: 'cooldown', duration: 10, description: 'Stretching' },
          ],
        },
        sunday: { type: 'REST', description: 'Vila', name: 'Vila' },
      },
    },
    {
      name: 'Avlastning',
      weeks: '10',
      focus: 'Deload — minska volym 50%, behåll intensitet',
      volumeGuidance: 'Halvera antal set, lätt vecka för återhämtning',
      weeklyTemplate: {
        monday: {
          type: 'STRENGTH',
          name: 'Lätt helkropp',
          description: 'Knäböj 2x8, Bänkpress 2x8, Rodd 2x8 — deload',
          intensity: 'easy',
          duration: 45,
          segments: [
            { order: 1, type: 'warmup', duration: 10, description: 'Lätt uppvärmning' },
            { order: 2, type: 'work', duration: 25, description: 'Knäböj 2x8 lätt, Bänkpress 2x8, Rodd 2x8' },
            { order: 3, type: 'cooldown', duration: 10, description: 'Stretching + rörlighet' },
          ],
        },
        tuesday: { type: 'REST', description: 'Vila', name: 'Vila' },
        wednesday: {
          type: 'STRENGTH',
          name: 'Lätt helkropp',
          description: 'Marklyft 2x6, Press 2x8, Chins 2x6 — avlastning',
          intensity: 'easy',
          duration: 45,
          segments: [
            { order: 1, type: 'warmup', duration: 10, description: 'Uppvärmning' },
            { order: 2, type: 'work', duration: 25, description: 'Marklyft 2x6, Press 2x8, Chins 2x6' },
            { order: 3, type: 'cooldown', duration: 10, description: 'Stretching' },
          ],
        },
        thursday: { type: 'REST', description: 'Vila', name: 'Vila' },
        friday: { type: 'REST', description: 'Vila', name: 'Vila' },
        saturday: { type: 'REST', description: 'Vila', name: 'Vila' },
        sunday: { type: 'REST', description: 'Vila', name: 'Vila' },
      },
    },
    {
      name: 'Toppfas',
      weeks: '11-12',
      focus: 'Toppning med tung styrka, RPE 9',
      volumeGuidance: 'Minska volym, öka intensitet till RPE 9',
      keyWorkouts: ['Tunga singlar/dubbletter i baslyft'],
      weeklyTemplate: {
        monday: {
          type: 'STRENGTH',
          name: 'Max Styrka Överkropp',
          description: 'Bänkpress 5x3 @ RPE 9, Tung rodd 4x5',
          intensity: 'max',
          duration: 60,
          segments: [
            { order: 1, type: 'warmup', duration: 10, description: 'Specifik uppvärmning' },
            { order: 2, type: 'work', duration: 40, description: 'Bänkpress 5x3 RPE 9, Tung rodd 4x5' },
            { order: 3, type: 'cooldown', duration: 10, description: 'Nedvarvning' },
          ],
        },
        tuesday: { type: 'REST', description: 'Vila', name: 'Vila' },
        wednesday: {
          type: 'STRENGTH',
          name: 'Max Styrka Underkropp',
          description: 'Knäböj 5x3 @ RPE 9, Marklyft 4x3 tungt',
          intensity: 'max',
          duration: 60,
          segments: [
            { order: 1, type: 'warmup', duration: 10, description: 'Specifik uppvärmning' },
            { order: 2, type: 'work', duration: 40, description: 'Knäböj 5x3 RPE 9, Marklyft 4x3' },
            { order: 3, type: 'cooldown', duration: 10, description: 'Nedvarvning' },
          ],
        },
        thursday: { type: 'REST', description: 'Vila', name: 'Vila' },
        friday: {
          type: 'STRENGTH',
          name: 'Accessories',
          description: 'Lätta accessories, rörlighet, core',
          intensity: 'easy',
          duration: 45,
          segments: [
            { order: 1, type: 'warmup', duration: 10, description: 'Uppvärmning' },
            { order: 2, type: 'work', duration: 25, description: 'Core, rörlighet, lätta accessories' },
            { order: 3, type: 'cooldown', duration: 10, description: 'Stretching' },
          ],
        },
        saturday: { type: 'REST', description: 'Vila', name: 'Vila' },
        sunday: { type: 'REST', description: 'Vila', name: 'Vila' },
      },
    },
  ],
}

// ── Tests ───────────────────────────────────────────────────────────

describe('evaluateProgram', () => {
  it('scores a well-structured program above 80', () => {
    const result = evaluateProgram(GOOD_PROGRAM, RUNNING_CONTEXT)

    expect(result.parseSuccess).toBe(true)
    expect(result.overallScore).toBeGreaterThanOrEqual(80)
    expect(result.criteria.structuralCompleteness.score).toBeGreaterThanOrEqual(70)
    expect(result.criteria.progressiveOverload.score).toBeGreaterThanOrEqual(70)
    expect(result.criteria.segmentDetail.score).toBeGreaterThanOrEqual(70)
  })

  it('scores a poor program significantly lower than a good one', () => {
    const result = evaluateProgram(BAD_PROGRAM, RUNNING_CONTEXT)
    const goodResult = evaluateProgram(GOOD_PROGRAM, RUNNING_CONTEXT)

    expect(result.parseSuccess).toBe(true)
    expect(result.overallScore).toBeLessThan(goodResult.overallScore)
    expect(goodResult.overallScore - result.overallScore).toBeGreaterThanOrEqual(15)

    // Should have warnings
    expect(result.warnings.length).toBeGreaterThan(0)

    // No rest days → structural penalty
    expect(result.criteria.structuralCompleteness.score).toBeLessThan(80)

    // Only one phase for 12-week program → periodization penalty
    expect(result.criteria.periodizationQuality.score).toBeLessThan(90)

    // No segments → segment detail penalty
    expect(result.criteria.segmentDetail.score).toBeLessThan(70)
  })

  it('scores a partial program between good and bad', () => {
    const partialResult = evaluateProgram(PARTIAL_PROGRAM, RUNNING_8W_CONTEXT)
    const badResult = evaluateProgram(BAD_PROGRAM, RUNNING_CONTEXT)

    expect(partialResult.parseSuccess).toBe(true)
    expect(partialResult.overallScore).toBeGreaterThanOrEqual(40)
    // Partial should score higher than bad due to rest days and phases
    expect(partialResult.overallScore).toBeGreaterThan(badResult.overallScore)
    // But segment detail should be lower since partial has no segments
    expect(partialResult.criteria.segmentDetail.score).toBeLessThan(80)
  })

  it('penalizes missing injury awareness', () => {
    const result = evaluateProgram(GOOD_PROGRAM, INJURY_CONTEXT)

    // Good program doesn't mention injuries → should get penalty
    expect(result.criteria.injuryAwareness.score).toBeLessThan(80)
  })

  it('gives full calendar score when no constraints', () => {
    const result = evaluateProgram(GOOD_PROGRAM, RUNNING_CONTEXT)
    expect(result.criteria.calendarCompliance.score).toBe(100)
  })

  it('returns all 8 criteria', () => {
    const result = evaluateProgram(GOOD_PROGRAM, RUNNING_CONTEXT)

    const expectedCriteria = [
      'structuralCompleteness',
      'progressiveOverload',
      'zoneDistribution',
      'sportSpecificCorrectness',
      'calendarCompliance',
      'injuryAwareness',
      'periodizationQuality',
      'segmentDetail',
    ]

    for (const criterion of expectedCriteria) {
      expect(result.criteria).toHaveProperty(criterion)
      expect(result.criteria[criterion as keyof typeof result.criteria].score).toBeGreaterThanOrEqual(0)
      expect(result.criteria[criterion as keyof typeof result.criteria].score).toBeLessThanOrEqual(100)
    }
  })

  it('applies custom weights when provided', () => {
    const heavySegmentWeights = { segmentDetail: 0.50, structuralCompleteness: 0.50 }

    // Good program: high segments + high structure → should score well
    const goodResult = evaluateProgram(GOOD_PROGRAM, RUNNING_CONTEXT, heavySegmentWeights)

    // Bad program: no segments + weak structure → should score poorly
    const badResult = evaluateProgram(BAD_PROGRAM, RUNNING_CONTEXT, heavySegmentWeights)

    // The gap should be large with these weights since bad program has no segments
    expect(goodResult.overallScore - badResult.overallScore).toBeGreaterThan(30)
  })

  it('detects zone distribution for Polarized methodology', () => {
    const result = evaluateProgram(GOOD_PROGRAM, RUNNING_CONTEXT)

    // Good program has proper 80/20 mix
    expect(result.criteria.zoneDistribution.score).toBeGreaterThanOrEqual(50)
    expect(result.criteria.zoneDistribution.details.length).toBeGreaterThan(0)
  })

  // ── Gym-specific tests ──────────────────────────────────────────

  it('applies gym weight overrides for STRENGTH sport', () => {
    const result = evaluateProgram(GYM_PROGRAM, STRENGTH_CONTEXT)

    // Gym sports should have higher weight on progressiveOverload and sportSpecific
    expect(result.criteria.progressiveOverload.weight).toBe(0.20)
    expect(result.criteria.zoneDistribution.weight).toBe(0.05)
    expect(result.criteria.sportSpecificCorrectness.weight).toBe(0.20)
    expect(result.criteria.periodizationQuality.weight).toBe(0.15)
  })

  it('uses endurance weights for RUNNING sport', () => {
    const result = evaluateProgram(GOOD_PROGRAM, RUNNING_CONTEXT)

    expect(result.criteria.progressiveOverload.weight).toBe(0.15)
    expect(result.criteria.zoneDistribution.weight).toBe(0.15)
    expect(result.criteria.sportSpecificCorrectness.weight).toBe(0.15)
    expect(result.criteria.periodizationQuality.weight).toBe(0.10)
  })

  it('scores a well-structured gym program above 70', () => {
    const result = evaluateProgram(GYM_PROGRAM, STRENGTH_CONTEXT)

    expect(result.parseSuccess).toBe(true)
    expect(result.overallScore).toBeGreaterThanOrEqual(70)
    expect(result.criteria.structuralCompleteness.score).toBeGreaterThanOrEqual(60)
    expect(result.criteria.segmentDetail.score).toBeGreaterThanOrEqual(60)
  })

  it('does not penalize gym programs for lacking HR zone distribution', () => {
    const result = evaluateProgram(GYM_PROGRAM, STRENGTH_CONTEXT)

    // Gym programs should use intensity variety scoring instead of zone distribution
    // The details should mention intensity mix, not HR zone percentages
    const zoneDetails = result.criteria.zoneDistribution.details.join(' ')
    expect(zoneDetails).toContain('heavy')
    expect(zoneDetails).not.toContain('Polarized')
  })

  it('detects gym-specific keywords in sport correctness', () => {
    const result = evaluateProgram(GYM_PROGRAM, STRENGTH_CONTEXT)

    const sportDetails = result.criteria.sportSpecificCorrectness.details.join(' ')
    // Should detect set/rep patterns and compound exercises
    expect(sportDetails).toMatch(/set|rep|compound|Knäböj|Bänkpress/i)
  })
})
