import { describe, expect, it } from 'vitest'
import {
  classifyPerformanceDay,
  estimateWeeklyWeightChangeKg,
  goalTypeForPerformanceDay,
  resolveNutritionBodyMetrics,
  scorePlannedMealMatch,
} from '../logic'
import { buildPlannedMealsForDay } from '../templates'
import type { DayPlanningContext } from '../types'

function context(overrides: Partial<DayPlanningContext>): DayPlanningContext {
  return {
    dateKey: '2026-06-24',
    date: new Date('2026-06-24T00:00:00.000Z'),
    workouts: [],
    scheduleSignals: [],
    ...overrides,
  }
}

describe('performance meal guide logic', () => {
  it('prefers latest BIA weight and BMR over profile weight', () => {
    const metrics = resolveNutritionBodyMetrics({
      profileWeightKg: 90,
      latestBia: {
        id: 'bia-1',
        measurementDate: new Date('2026-06-20T00:00:00.000Z'),
        weightKg: 85.6,
        bodyFatPercent: 11,
        muscleMassKg: 43,
        bmrKcal: 2050,
        deviceBrand: 'inbody',
      },
    })

    expect(metrics.weightKg).toBe(85.6)
    expect(metrics.bmrKcal).toBe(2050)
    expect(metrics.source).toBe('BIA')
  })

  it('classifies games before travel and practice', () => {
    const dayType = classifyPerformanceDay(context({
      scheduleSignals: [
        {
          id: 'travel-1',
          source: 'CALENDAR',
          type: 'TRAVEL',
          title: 'Away trip',
          startDate: '2026-06-24T00:00:00.000Z',
        },
        {
          id: 'game-1',
          source: 'TEAM_EVENT',
          type: 'GAME',
          title: 'Game',
          startDate: '2026-06-24T18:00:00.000Z',
        },
      ],
    }))

    expect(dayType).toBe('GAME')
  })

  it('classifies the day after a hard day as recovery when no new load exists', () => {
    expect(classifyPerformanceDay(context({}), 'HARD_PRACTICE')).toBe('RECOVERY')
  })

  it('protects game and hard practice days from weight-loss targets', () => {
    expect(goalTypeForPerformanceDay({ dayType: 'GAME', baseGoalType: 'WEIGHT_LOSS' })).toBe('MAINTAIN')
    expect(goalTypeForPerformanceDay({ dayType: 'HARD_PRACTICE', baseGoalType: 'WEIGHT_LOSS' })).toBe('MAINTAIN')
  })

  it('softens targets when weight is dropping too fast', () => {
    expect(goalTypeForPerformanceDay({
      dayType: 'REST',
      baseGoalType: 'WEIGHT_LOSS',
      fastWeightLossRisk: true,
    })).toBe('BODY_RECOMP')
  })

  it('scores planned meal matches by meal type and time proximity', () => {
    expect(scorePlannedMealMatch({
      mealType: 'LUNCH',
      time: '12:20',
      plannedMeal: { mealType: 'LUNCH', time: '12:30' },
    })).toBeGreaterThanOrEqual(0.9)

    expect(scorePlannedMealMatch({
      mealType: 'DINNER',
      time: '19:00',
      plannedMeal: { mealType: 'BREAKFAST', time: '08:00' },
    })).toBe(0)
  })

  it('estimates weekly weight trend from BIA measurements', () => {
    const trend = estimateWeeklyWeightChangeKg([
      { measurementDate: new Date('2026-06-01T00:00:00.000Z'), weightKg: 86 },
      { measurementDate: new Date('2026-06-15T00:00:00.000Z'), weightKg: 85 },
    ])

    expect(trend).toBe(-0.5)
  })

  it('builds Swedish deterministic meal text when locale is Swedish', () => {
    const meals = buildPlannedMealsForDay({
      dayType: 'REST',
      targets: {
        caloriesKcal: 2100,
        proteinG: 140,
        carbsG: 250,
        fatG: 60,
        hydrationMl: 2500,
        proteinGPerKg: 1.8,
        carbsGPerKg: 3,
        carbLoadCategory: 'REST',
        macroWarnings: [],
        baselineKcal: 2100,
        baselineProteinG: 140,
        baselineCarbsG: 250,
        baselineFatG: 60,
        lifestyleAdjustmentKcal: 0,
        lifestyleAdjustmentProteinG: 0,
        lifestyleAdjustmentCarbsG: 0,
        lifestyleAdjustmentFatG: 0,
        lifestyleActivity: 'SEDENTARY',
        workoutAdjustmentKcal: 0,
        workoutEnergyKcal: 0,
        fuelingAdjustmentKcal: 0,
        workoutAdjustmentProteinG: 0,
        workoutAdjustmentCarbsG: 0,
        workoutAdjustmentFatG: 0,
      },
      scheduleSignals: [],
      locale: 'sv',
    })

    expect(meals[0].title).toBe('Proteinfrukost')
    expect(meals[0].description).toContain('kolhydrater')
    expect(meals[0].portionSummary.items?.[1].amount).toContain('kolhydrater')
    expect(meals[0].options[0].description).toBe('Likvärdigt makrobyte för den här måltiden.')
  })
})
