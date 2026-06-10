import { calculateDailyTargets, generateDailyGuidance } from '@/lib/nutrition-timing'
import type { GuidanceGeneratorInput, WorkoutContext } from '@/lib/nutrition-timing'

function createInput(todaysWorkouts: WorkoutContext[]): GuidanceGeneratorInput {
  return {
    client: {
      id: 'client-1',
      weightKg: 70,
      heightCm: 175,
    },
    preferences: null,
    goal: null,
    sportProfile: null,
    todaysWorkouts,
    tomorrowsWorkouts: [],
    currentTime: new Date('2026-03-17T09:00:00.000Z'),
    bodyComposition: {
      bmrKcal: 1600,
    },
  }
}

function createWorkout(overrides: Partial<WorkoutContext> = {}): WorkoutContext {
  return {
    id: 'workout-1',
    name: 'Threshold Run',
    type: 'RUNNING',
    intensity: 'THRESHOLD',
    duration: 60,
    distance: 10,
    scheduledTime: new Date('2026-03-17T18:00:00.000Z'),
    source: 'PROGRAM',
    status: 'PLANNED',
    isToday: true,
    isTomorrow: false,
    daysUntil: 0,
    ...overrides,
  }
}

describe('generateDailyGuidance', () => {
  it('raises macro targets for planned workouts (so athletes can plan meals ahead)', () => {
    const restGuidance = generateDailyGuidance(createInput([]))
    const plannedGuidance = generateDailyGuidance(createInput([createWorkout()]))

    expect(plannedGuidance.targets.caloriesKcal).toBeGreaterThan(restGuidance.targets.caloriesKcal)
    expect(plannedGuidance.targets.carbsG).toBeGreaterThan(restGuidance.targets.carbsG)
    expect(plannedGuidance.targets.workoutAdjustmentKcal).toBeGreaterThan(0)
    expect(plannedGuidance.preWorkoutGuidance).toHaveLength(1)
    expect(plannedGuidance.postWorkoutGuidance).toHaveLength(0)
  })

  it('exposes baseline and adjustment breakdown on the targets object', () => {
    const guidance = generateDailyGuidance(createInput([createWorkout()]))
    const t = guidance.targets

    expect(t.baselineKcal).toBeGreaterThan(0)
    expect(t.baselineCarbsG + t.workoutAdjustmentCarbsG).toBeGreaterThanOrEqual(t.carbsG - 5) // rounding tolerance
    expect(t.baselineProteinG).toBeGreaterThan(0)
    expect(t.workoutAdjustmentFatG).toBeGreaterThanOrEqual(0)
    expect(t.workoutEnergyKcal + t.fuelingAdjustmentKcal).toBe(t.workoutAdjustmentKcal)
  })

  it('keeps measured synced calories separate from carb-floor fueling adjustments', () => {
    const guidance = generateDailyGuidance(
      createInput([
        createWorkout({
          type: 'RUNNING',
          intensity: 'MODERATE',
          duration: 39,
          source: 'SYNCED',
          status: 'COMPLETED',
          estimatedCaloriesKcal: 522,
        }),
      ])
    )
    const t = guidance.targets

    expect(t.workoutEnergyKcal).toBe(522)
    expect(t.workoutAdjustmentKcal).toBeGreaterThan(0)
    expect(t.fuelingAdjustmentKcal).toBe(t.workoutAdjustmentKcal - t.workoutEnergyKcal)
  })

  it('distributes strength-workout adjustment toward protein more than endurance', () => {
    const strengthGuidance = generateDailyGuidance(
      createInput([createWorkout({ type: 'STRENGTH', intensity: 'MODERATE', duration: 60 })])
    )
    const enduranceGuidance = generateDailyGuidance(
      createInput([createWorkout({ type: 'RUNNING', intensity: 'MODERATE', duration: 60 })])
    )

    expect(strengthGuidance.targets.workoutAdjustmentProteinG).toBeGreaterThan(
      enduranceGuidance.targets.workoutAdjustmentProteinG
    )
  })

  it('shows post-workout guidance only once the workout is completed', () => {
    const guidance = generateDailyGuidance(
      createInput([
        createWorkout({
          status: 'COMPLETED',
          scheduledTime: new Date('2026-03-17T07:30:00.000Z'),
        }),
      ])
    )

    expect(guidance.targets.caloriesKcal).toBeGreaterThan(2000)
    expect(guidance.preWorkoutGuidance).toHaveLength(0)
    expect(guidance.postWorkoutGuidance).toHaveLength(1)
  })

  describe('breakdown invariant: baseline + lifestyle + workout = total', () => {
    it('holds on a rest day (sedentary)', () => {
      const t = generateDailyGuidance(createInput([])).targets
      expect(t.baselineKcal + t.lifestyleAdjustmentKcal + t.workoutAdjustmentKcal).toBe(t.caloriesKcal)
    })

    it('holds on a hard double-training day where the carb floor kicks in', () => {
      const t = generateDailyGuidance(
        createInput([
          createWorkout({ id: 'w-1', intensity: 'INTERVAL', duration: 90 }),
          createWorkout({ id: 'w-2', intensity: 'THRESHOLD', duration: 60 }),
        ])
      ).targets
      expect(t.baselineKcal + t.lifestyleAdjustmentKcal + t.workoutAdjustmentKcal).toBe(t.caloriesKcal)
    })

    it('holds on a very-active lifestyle with training', () => {
      const input = createInput([createWorkout()])
      input.sportProfile = { lifestyleActivity: 'VERY_ACTIVE' }
      const t = generateDailyGuidance(input).targets
      expect(t.baselineKcal + t.lifestyleAdjustmentKcal + t.workoutAdjustmentKcal).toBe(t.caloriesKcal)
    })
  })

  describe('lifestyle / NEAT adjustment', () => {
    it('SEDENTARY default produces no lifestyle bump (regression guard)', () => {
      const t = generateDailyGuidance(createInput([])).targets
      expect(t.lifestyleActivity).toBe('SEDENTARY')
      expect(t.lifestyleAdjustmentKcal).toBe(0)
      expect(t.lifestyleAdjustmentCarbsG).toBe(0)
      expect(t.lifestyleAdjustmentFatG).toBe(0)
      expect(t.lifestyleAdjustmentProteinG).toBe(0)
    })

    it('VERY_ACTIVE bumps energy macros (carbs + fat) but not protein', () => {
      const sedentary = generateDailyGuidance(createInput([])).targets
      const veryActiveInput = createInput([])
      veryActiveInput.sportProfile = { lifestyleActivity: 'VERY_ACTIVE' }
      const veryActive = generateDailyGuidance(veryActiveInput).targets

      expect(veryActive.lifestyleActivity).toBe('VERY_ACTIVE')
      expect(veryActive.lifestyleAdjustmentKcal).toBeGreaterThan(0)
      expect(veryActive.carbsG).toBeGreaterThan(sedentary.carbsG)
      expect(veryActive.fatG).toBeGreaterThan(sedentary.fatG)
      expect(veryActive.proteinG).toBe(sedentary.proteinG) // protein is structural, not energy
    })

    it('lifestyle factor scales with activity level', () => {
      const inputs = (['SEDENTARY', 'LIGHTLY_ACTIVE', 'MODERATELY_ACTIVE', 'VERY_ACTIVE'] as const).map((level) => {
        const i = createInput([])
        i.sportProfile = { lifestyleActivity: level }
        return generateDailyGuidance(i).targets.caloriesKcal
      })
      expect(inputs[0]).toBeLessThan(inputs[1])
      expect(inputs[1]).toBeLessThan(inputs[2])
      expect(inputs[2]).toBeLessThan(inputs[3])
    })
  })

  describe('macro profile baseline', () => {
    it('uses bodyweight-based balanced rest-day targets instead of percentage-first protein', () => {
      const t = calculateDailyTargets(
        70,
        [],
        {
          goalType: 'MAINTAIN',
          macroProfile: 'BALANCED',
          activityLevel: 'ACTIVE',
        },
        1600
      )

      expect(t.proteinGPerKg).toBe(1.6)
      expect(t.proteinG).toBe(112)
      expect(t.carbsGPerKg).toBe(3.2)
      expect(t.carbsG).toBeLessThan(230)
      expect(t.baselineKcal + t.lifestyleAdjustmentKcal + t.workoutAdjustmentKcal).toBe(t.caloriesKcal)
    })

    it('keeps workout fueling as a visible carb-heavy adjustment on top of the baseline profile', () => {
      const rest = calculateDailyTargets(70, [], { goalType: 'MAINTAIN', macroProfile: 'BALANCED' }, 1600)
      const training = calculateDailyTargets(
        70,
        [createWorkout({ intensity: 'THRESHOLD', duration: 60 })],
        { goalType: 'MAINTAIN', macroProfile: 'BALANCED' },
        1600
      )

      expect(training.baselineCarbsG).toBe(rest.baselineCarbsG)
      expect(training.baselineProteinG).toBe(rest.baselineProteinG)
      expect(training.workoutAdjustmentCarbsG).toBeGreaterThan(training.workoutAdjustmentProteinG)
      expect(training.carbsG).toBeGreaterThan(rest.carbsG)
    })
  })

  describe('conservative macro guardrails', () => {
    it('keeps a 57 kg regular active athlete in a reasonable normal-day range', () => {
      const t = calculateDailyTargets(
        57,
        [createWorkout({ intensity: 'MODERATE', duration: 60 })],
        { goalType: 'MAINTAIN', macroProfile: 'BALANCED', activityLevel: 'ACTIVE' },
        1300
      )

      expect(t.proteinG).toBeGreaterThanOrEqual(85)
      expect(t.proteinG).toBeLessThanOrEqual(110)
      expect(t.carbsGPerKg).toBeLessThanOrEqual(6.5)
      expect(t.highCarbReason).toBeUndefined()
    })

    it('does not reproduce Cornelia-style high targets without an elite/double/very-long trigger', () => {
      const t = calculateDailyTargets(
        57,
        [createWorkout({ intensity: 'MODERATE', duration: 60 })],
        { goalType: 'MAINTAIN', macroProfile: 'ENDURANCE', activityLevel: 'ACTIVE' }
      )

      expect(t.carbsG).toBeLessThan(422)
      expect(t.proteinG).toBeLessThan(174)
      expect(t.carbsGPerKg).toBeLessThanOrEqual(6.5)
    })

    it('treats two recovery walks as daily movement instead of a high-carb double day', () => {
      const guidance = generateDailyGuidance(
        createInput([
          createWorkout({
            id: 'walk-1',
            name: 'Promenad',
            type: 'OTHER',
            intensity: 'RECOVERY',
            duration: null,
            distance: 7.5,
            source: 'AD_HOC',
            status: 'COMPLETED',
          }),
          createWorkout({
            id: 'walk-2',
            name: 'Promenad efter jobbet',
            type: 'OTHER',
            intensity: 'RECOVERY',
            duration: 63,
            distance: 5.3,
            source: 'AD_HOC',
            status: 'COMPLETED',
            estimatedCaloriesKcal: 239,
          }),
        ])
      )
      const t = guidance.targets

      expect(guidance.isRestDay).toBe(true)
      expect(guidance.isDoubleDay).toBe(false)
      expect(guidance.preWorkoutGuidance).toHaveLength(0)
      expect(guidance.postWorkoutGuidance).toHaveLength(0)
      expect(t.carbLoadCategory).toBe('LIGHT')
      expect(t.highCarbReason).toBeUndefined()
      expect(t.fuelingAdjustmentKcal).toBeLessThanOrEqual(5)
      expect(t.carbsGPerKg).toBeLessThan(5)
    })

    it('allows but caps a hard 90 minute threshold day below very-high carbohydrate range', () => {
      const t = calculateDailyTargets(
        57,
        [createWorkout({ intensity: 'THRESHOLD', duration: 90 })],
        { goalType: 'MAINTAIN', macroProfile: 'ENDURANCE', activityLevel: 'ACTIVE' }
      )

      expect(t.carbLoadCategory).toBe('HIGH')
      expect(t.carbsGPerKg).toBeLessThan(8)
      if (t.carbsGPerKg > 6.5) {
        expect(t.highCarbReason).toBeTruthy()
      }
    })

    it('allows high-carb metadata for elite double-session days', () => {
      const t = calculateDailyTargets(
        57,
        [
          createWorkout({ id: 'w-1', intensity: 'THRESHOLD', duration: 90 }),
          createWorkout({ id: 'w-2', intensity: 'MODERATE', duration: 75 }),
        ],
        { goalType: 'MAINTAIN', macroProfile: 'ENDURANCE', activityLevel: 'ATHLETE' }
      )

      expect(t.carbLoadCategory).toBe('VERY_HIGH')
      expect(t.carbsGPerKg).toBeGreaterThan(6.5)
      expect(t.highCarbReason).toBeTruthy()
    })

    it('caps excessive custom macro percentages and returns warnings', () => {
      const t = calculateDailyTargets(
        57,
        [],
        {
          goalType: 'MAINTAIN',
          macroProfile: 'CUSTOM',
          activityLevel: 'ACTIVE',
          customProteinPercent: 70,
          customCarbsPercent: 20,
          customFatPercent: 10,
        }
      )

      expect(t.proteinGPerKg).toBeLessThanOrEqual(2.2)
      expect(t.macroWarnings.length).toBeGreaterThan(0)
      expect(t.macroWarnings.join(' ')).toContain('Custom protein percentage adjusted')
    })
  })

  describe('race week', () => {
    it('flags race week when a race is within 7 days', () => {
      const input = createInput([])
      input.upcomingRaces = [
        { date: new Date('2026-03-21T10:00:00.000Z'), name: 'Spring 10K', distance: '10K', classification: 'A' },
      ]
      const guidance = generateDailyGuidance(input)
      expect(guidance.isRaceWeek).toBe(true)
    })

    it('stays false with no races or races beyond 7 days', () => {
      const noRaces = generateDailyGuidance(createInput([]))
      expect(noRaces.isRaceWeek).toBe(false)

      const farRace = createInput([])
      farRace.upcomingRaces = [
        { date: new Date('2026-04-15T10:00:00.000Z'), name: 'Marathon', distance: 'MARATHON' },
      ]
      expect(generateDailyGuidance(farRace).isRaceWeek).toBe(false)
    })

    it('triggers carb load within 48h of a half marathon or longer, not for short races', () => {
      const marathonEve = createInput([])
      marathonEve.upcomingRaces = [
        { date: new Date('2026-03-18T09:00:00.000Z'), name: 'Marathon', distance: 'MARATHON' },
      ]
      const loaded = generateDailyGuidance(marathonEve)
      expect(loaded.targets.carbLoadCategory).toBe('CARB_LOAD')

      const fiveKEve = createInput([])
      fiveKEve.upcomingRaces = [
        { date: new Date('2026-03-18T09:00:00.000Z'), name: 'Parkrun', distance: '5K' },
      ]
      const notLoaded = generateDailyGuidance(fiveKEve)
      expect(notLoaded.targets.carbLoadCategory).not.toBe('CARB_LOAD')
      expect(notLoaded.isRaceWeek).toBe(true)
    })
  })
})
