import { describe, expect, it } from 'vitest'
import {
  classifyPerformanceDay,
  estimateWeeklyWeightChangeKg,
  goalTypeForPerformanceDay,
  resolveNutritionBodyMetrics,
  scorePlannedMealMatch,
} from '../logic'
import { buildConcreteRecipeForMeal, buildPlannedMealsForDay } from '../templates'
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

  it('rejects an implausible scan weight and falls back to profile weight', () => {
    // 64.93 kg reading on a 77 kg athlete (a real junk Garmin scale value).
    const metrics = resolveNutritionBodyMetrics({
      profileWeightKg: 77,
      latestBia: {
        id: 'bia-junk',
        measurementDate: new Date('2026-06-02T00:00:00.000Z'),
        weightKg: 64.93,
        bodyFatPercent: 43,
        muscleMassKg: 21.7,
        bmrKcal: null,
        deviceBrand: 'Garmin',
      },
    })

    expect(metrics.weightKg).toBe(77)
    expect(metrics.source).toBe('PROFILE')
    // The snapshot is still surfaced for display, but it did not drive the weight.
    expect(metrics.biaSnapshot?.weightKg).toBe(64.93)
  })

  it('still trusts a scan that is a plausible distance from profile weight', () => {
    const metrics = resolveNutritionBodyMetrics({
      profileWeightKg: 77,
      latestBia: {
        id: 'bia-ok',
        measurementDate: new Date('2026-06-02T00:00:00.000Z'),
        weightKg: 74.5,
        bodyFatPercent: 12,
        muscleMassKg: 36,
        bmrKcal: 1900,
        deviceBrand: 'inbody',
      },
    })

    expect(metrics.weightKg).toBe(74.5)
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

  it('ignores stale points outside the recent window when an asOf date is given', () => {
    // Henrik's real data: three sparse Garmin scans spanning 76 days. As of the
    // planning day, only the most recent falls inside the 28-day window, so there
    // is no usable two-point trend — the safeguard must NOT fire on a stale slope.
    const trend = estimateWeeklyWeightChangeKg(
      [
        { measurementDate: new Date('2026-03-18T00:00:00.000Z'), weightKg: 91.82 },
        { measurementDate: new Date('2026-04-19T00:00:00.000Z'), weightKg: 77 },
        { measurementDate: new Date('2026-06-02T00:00:00.000Z'), weightKg: 64.93 },
      ],
      { asOf: new Date('2026-06-25T00:00:00.000Z') }
    )

    expect(trend).toBeNull()
  })

  it('returns null when the weigh-ins span too few days to extrapolate', () => {
    const trend = estimateWeeklyWeightChangeKg([
      { measurementDate: new Date('2026-06-14T00:00:00.000Z'), weightKg: 78 },
      { measurementDate: new Date('2026-06-15T00:00:00.000Z'), weightKg: 77 },
    ])

    expect(trend).toBeNull()
  })

  it('resists a single outlier weigh-in via the regression slope', () => {
    // A steady ~77 kg with one bad 70 kg reading in the middle. First-vs-last
    // would over/under-shoot; the least-squares slope stays near flat.
    const trend = estimateWeeklyWeightChangeKg([
      { measurementDate: new Date('2026-06-01T00:00:00.000Z'), weightKg: 77 },
      { measurementDate: new Date('2026-06-08T00:00:00.000Z'), weightKg: 70 },
      { measurementDate: new Date('2026-06-15T00:00:00.000Z'), weightKg: 77 },
    ])

    expect(trend).not.toBeNull()
    expect(Math.abs(trend as number)).toBeLessThan(0.6)
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

  it('adds concrete recipes to planned meals and honors chicken preference', () => {
    const recipe = buildConcreteRecipeForMeal({
      mealType: 'LUNCH',
      timingRole: 'REGULAR',
      dayType: 'PRACTICE',
      locale: 'sv',
      preference: 'Jag vill äta kyckling idag',
      macros: {
        caloriesKcal: 650,
        proteinG: 45,
        carbsG: 80,
        fatG: 18,
      },
    })

    expect(recipe.title).toContain('Kyckling')
    expect(recipe.ingredients.length).toBeGreaterThan(2)
    expect(recipe.steps.length).toBeGreaterThan(1)
    expect(recipe.source).toBe('TEMPLATE')
  })

  it('varies lunch and dinner defaults and keeps snacks snack-sized', () => {
    const base = {
      timingRole: 'REGULAR' as const,
      dayType: 'REST' as const,
      locale: 'sv' as const,
      macros: { caloriesKcal: 540, proteinG: 38, carbsG: 61, fatG: 13 },
    }

    const lunch = buildConcreteRecipeForMeal({ ...base, mealType: 'LUNCH' })
    const dinner = buildConcreteRecipeForMeal({ ...base, mealType: 'DINNER' })

    // Lunch and dinner must not be identical recipes.
    expect(lunch.title).not.toBe(dinner.title)
    expect(lunch.title).toContain('Kyckling')
    expect(dinner.title).toContain('Lax')

    // A light snack must get a snack-sized recipe, never a full salmon meal.
    const snack = buildConcreteRecipeForMeal({
      ...base,
      mealType: 'MORNING_SNACK',
      macros: { caloriesKcal: 208, proteinG: 16, carbsG: 20, fatG: 5 },
    })
    expect(snack.title).toContain('Kvarg')
    expect(snack.title).not.toContain('Lax')
  })
})
