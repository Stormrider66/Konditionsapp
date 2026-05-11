import { describe, expect, it } from 'vitest'
import {
  calculateProgressiveCarbTarget,
  estimateDurationFromDistance,
  selectFuelingPlanForProgram,
  shouldPrescribeFueling,
} from './workout-prescriptions'

describe('workout fueling prescriptions', () => {
  it('selects long endurance workouts for fueling', () => {
    expect(shouldPrescribeFueling({
      name: 'Långpass lugnt',
      type: 'RUNNING',
      intensity: 'EASY',
      duration: 95,
      distance: null,
    })).toBe(true)
  })

  it('uses sport duration fallback when distance is available', () => {
    expect(estimateDurationFromDistance({
      type: 'CYCLING',
      distance: 56,
    })).toBe(120)
    expect(shouldPrescribeFueling({
      name: 'Cykel distans',
      type: 'CYCLING',
      intensity: 'MODERATE',
      duration: null,
      distance: 56,
    })).toBe(true)
  })

  it('does not prescribe fueling for recovery workouts just because the goal is endurance', () => {
    expect(shouldPrescribeFueling({
      name: 'Återhämtning jogg',
      type: 'RUNNING',
      intensity: 'RECOVERY',
      duration: 65,
      distance: null,
    }, 'marathon')).toBe(false)
  })

  it('ramps late race rehearsal workouts close to race target', () => {
    const target = calculateProgressiveCarbTarget(90, 10, 12, {
      name: 'Marathon race rehearsal',
      intensity: 'MODERATE',
    })

    expect(target).toBeGreaterThanOrEqual(80)
    expect(target).toBeLessThanOrEqual(90)
  })

  it('caps aggressive race targets at practical upper bounds', () => {
    expect(calculateProgressiveCarbTarget(150, 12, 12, {
      name: 'Race rehearsal',
      intensity: 'THRESHOLD',
    })).toBe(120)
  })

  it('prefers the fueling plan that matches the program goal sport', () => {
    const selected = selectFuelingPlanForProgram([
      { id: 'run-plan', sport: 'RUNNING', recommendedCarbsGPerHour: 85 },
      { id: 'bike-plan', sport: 'CYCLING', recommendedCarbsGPerHour: 95 },
    ], 'gravel cycling build')

    expect(selected?.id).toBe('bike-plan')
  })

  it('falls back to the first active fueling plan when the goal sport is unclear', () => {
    const selected = selectFuelingPlanForProgram([
      { id: 'first-plan', sport: 'RUNNING', recommendedCarbsGPerHour: 80 },
      { id: 'second-plan', sport: 'CYCLING', recommendedCarbsGPerHour: 90 },
    ], 'general base')

    expect(selected?.id).toBe('first-plan')
  })
})
