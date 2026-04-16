import type { Client, CreateTrainingProgramDTO } from '@/types'
import { getHyroxFocus, getHyroxPhase } from './mappers'
import type { HyroxProgramParams } from './types'

/** Skeleton program that the coach fills in themselves (`goal === 'custom'`). */
export function createEmptyHyroxProgram(
  params: HyroxProgramParams,
  client: Client,
  startDate: Date,
  endDate: Date
): CreateTrainingProgramDTO {
  const weeks = Array.from({ length: params.durationWeeks }).map((_, i) => ({
    weekNumber: i + 1,
    startDate: new Date(startDate.getTime() + i * 7 * 24 * 60 * 60 * 1000),
    phase: getHyroxPhase(i + 1, params.durationWeeks),
    volume: 0,
    focus: getHyroxFocus(params.goal, i + 1, params.durationWeeks),
    days: Array.from({ length: 7 }).map((_, j) => ({
      dayNumber: j + 1,
      notes: '',
      workouts: [],
    })),
  }))

  return {
    clientId: params.clientId,
    coachId: params.coachId,
    testId: undefined,
    name: `HYROX - ${client.name}`,
    goalType: params.goal,
    startDate,
    endDate,
    notes: params.notes || 'HYROX-träningsprogram med löpning och funktionella stationer',
    weeks,
  }
}
