import { describe, expect, it } from 'vitest'
import {
  buildCreateCardioWorkoutPreview,
  buildCreateCardioWorkoutRealtimeTool,
  CREATE_CARDIO_WORKOUT_TOOL_NAME,
  createCardioWorkoutInputSchema,
  estimateCreateCardioWorkoutDurationSeconds,
  getCreateCardioWorkoutClarification,
} from './cardio-workout-action'

describe('cardio workout live voice action', () => {
  const wattbikeIntervals = {
    name: '10 x 3 min Wattbike intervals',
    sport: 'CYCLING',
    date: '2026-06-23',
    rounds: 10,
    restBetweenRoundsSeconds: 60,
    stations: [
      {
        equipment: 'WATTBIKE',
        durationSeconds: 180,
        zone: 4,
        notes: 'Threshold effort',
      },
    ],
  } as const

  it('validates a 10 x 3 min Wattbike interval request', () => {
    const parsed = createCardioWorkoutInputSchema.safeParse(wattbikeIntervals)

    expect(parsed.success).toBe(true)
    if (!parsed.success) return
    expect(parsed.data.sport).toBe('CYCLING')
    expect(parsed.data.stations[0]?.equipment).toBe('WATTBIKE')
    expect(getCreateCardioWorkoutClarification(parsed.data, 'en')).toBeNull()
  })

  it('asks for rest and intensity before drafting repeated timed intervals', () => {
    const parsed = createCardioWorkoutInputSchema.parse({
      name: '10 x 3 min bike intervals',
      sport: 'CYCLING',
      rounds: 10,
      stations: [{ equipment: 'BIKE', durationSeconds: 180 }],
    })

    expect(getCreateCardioWorkoutClarification(parsed, 'en')).toContain('rest duration and intensity')
  })

  it('builds a confirmation preview with the key workout details', () => {
    const parsed = createCardioWorkoutInputSchema.parse({
      ...wattbikeIntervals,
      pushToGarmin: true,
    })
    const preview = buildCreateCardioWorkoutPreview(parsed, 'en')

    expect(preview.title).toBe('10 x 3 min Wattbike intervals')
    expect(preview.targetLabel).toContain('10 x Wattbike')
    expect(preview.details).toContain('Date: 2026-06-23')
    expect(preview.details).toContain('Rest between rounds: 1 min')
    expect(preview.details).toContain('Intensity: zone 4 · Threshold effort')
    expect(preview.details).toContain('Estimated total time: 39 min')
    expect(preview.details).toContain('Garmin: send to watch')
    expect(preview.confirmLabel).toBe('Create and send to Garmin')
    expect(estimateCreateCardioWorkoutDurationSeconds(parsed)).toBe(2340)
  })

  it('rejects malformed station values', () => {
    const parsed = createCardioWorkoutInputSchema.safeParse({
      name: 'Bad session',
      stations: [{ equipment: 'SPIN_BIKE', durationSeconds: 180 }],
    })

    expect(parsed.success).toBe(false)
  })

  it('rejects stations without a duration, calorie, or distance target', () => {
    const parsed = createCardioWorkoutInputSchema.safeParse({
      name: 'Empty bike station',
      sport: 'CYCLING',
      stations: [{ equipment: 'BIKE', zone: 3 }],
    })

    expect(parsed.success).toBe(false)
  })

  it('exposes one OpenAI Realtime function schema', () => {
    const tool = buildCreateCardioWorkoutRealtimeTool('en')

    expect(tool.name).toBe(CREATE_CARDIO_WORKOUT_TOOL_NAME)
    expect(tool.type).toBe('function')
    expect(tool.parameters.required).toEqual(['name', 'stations'])
  })
})
