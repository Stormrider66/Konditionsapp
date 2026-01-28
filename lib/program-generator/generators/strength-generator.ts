// lib/program-generator/generators/strength-generator.ts
// Standalone strength training program generator

import { Client, CreateTrainingProgramDTO } from '@/types'
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

    return {
      weekNumber: weekNum,
      startDate: new Date(startDate.getTime() + i * 7 * 24 * 60 * 60 * 1000),
      phase: phase.phase,
      volume: 0,
      focus: phase.focus,
      days: Array.from({ length: 7 }).map((_, j) => ({
        dayNumber: j + 1,
        notes: '',
        workouts: [],
      })),
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
