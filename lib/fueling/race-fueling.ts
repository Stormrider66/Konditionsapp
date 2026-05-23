import type { FuelingAthleteProfile, FuelingRaceGoal, FuelingScenario, FuelingTestStage, RaceFuelingEstimate, SubstrateOxidationEstimate } from './types'

const GLYCOGEN_PRESERVATION_BUFFER = 0.55

const DISTANCE_PRESETS_KM: Record<string, number> = {
  '5K': 5,
  '10K': 10,
  HALF_MARATHON: 21.0975,
  HALF: 21.0975,
  MARATHON: 42.195,
}

export function estimateSubstrateOxidationFromStage(
  stage: FuelingTestStage,
  weightKg?: number | null,
  locale: string = 'en'
): SubstrateOxidationEstimate | null {
  if (stage.vco2 != null && stage.rer != null && stage.rer > 0) {
    const vco2LMin = normalizeGasLitersPerMinute(stage.vco2)
    const derivedVo2LMin = vco2LMin / stage.rer
    const measuredVo2LMin = stage.vo2 != null ? normalizeVo2LitersPerMinute(stage.vo2, weightKg) : null
    const vo2LMin = measuredVo2LMin != null && relativeDifference(measuredVo2LMin, derivedVo2LMin) <= 0.1
      ? measuredVo2LMin
      : derivedVo2LMin

    if (vco2LMin > 0 && vo2LMin > 0) {
      const carbohydrateGramsPerMinute = Math.max(0, (4.585 * vco2LMin) - (3.2255 * vo2LMin))
      const fatGramsPerMinute = Math.max(0, (1.6946 * vo2LMin) - (1.7012 * vco2LMin))
      const isPhysiologicallyReliable = stage.rer >= 0.7 && stage.rer <= 1.0
      const warning = !isPhysiologicallyReliable
        ? text(locale, 'RER ligger utanför stabilt beräkningsområde.', 'RER is outside the stable calculation range.')
        : measuredVo2LMin != null && vo2LMin === derivedVo2LMin
          ? text(locale, 'VO2 och VCO2/RER skiljer sig åt; VCO2/RER används för substratberäkningen.', 'VO2 and VCO2/RER differ; VCO2/RER is used for substrate calculation.')
          : undefined

      return {
        carbohydrateGramsPerMinute,
        carbohydrateGramsPerHour: Math.round(carbohydrateGramsPerMinute * 60),
        fatGramsPerMinute,
        fatGramsPerHour: Math.round(fatGramsPerMinute * 60),
        energyKcalPerHour: Math.round((carbohydrateGramsPerMinute * 4 + fatGramsPerMinute * 9) * 60),
        method: 'VO2_VCO2',
        isPhysiologicallyReliable,
        warning,
      }
    }
  }

  if (stage.choPercent != null && stage.vo2 != null) {
    const vo2LMin = normalizeVo2LitersPerMinute(stage.vo2, weightKg)
    const energyKcalPerMinute = vo2LMin * 5
    const carbohydrateGramsPerMinute = Math.max(0, (energyKcalPerMinute * (stage.choPercent / 100)) / 4)
    const fatPercent = stage.fatPercent ?? Math.max(0, 100 - stage.choPercent)
    const fatGramsPerMinute = Math.max(0, (energyKcalPerMinute * (fatPercent / 100)) / 9)

    return {
      carbohydrateGramsPerMinute,
      carbohydrateGramsPerHour: Math.round(carbohydrateGramsPerMinute * 60),
      fatGramsPerMinute,
      fatGramsPerHour: Math.round(fatGramsPerMinute * 60),
      energyKcalPerHour: Math.round(energyKcalPerMinute * 60),
      method: 'RER_PERCENT',
      isPhysiologicallyReliable: true,
    }
  }

  return null
}

export function estimateRaceFueling(
  goal: FuelingRaceGoal,
  stages: FuelingTestStage[],
  athlete: FuelingAthleteProfile = {},
  locale: string = 'en'
): RaceFuelingEstimate {
  const sortedStages = [...stages].sort((a, b) => a.sequence - b.sequence)
  const estimatedDurationMinutes = estimateDurationMinutes(goal)
  const target = getTargetIntensity(goal, locale)
  const assumptionsSv: string[] = []
  const warningsSv: string[] = []

  const stageEstimate = target.kind === 'duration'
      ? interpolateOxidationAtIntensity(sortedStages, 0, target.kind, athlete.weightKg, locale)
    : target.value != null
      ? interpolateOxidationAtIntensity(sortedStages, target.value, target.kind, athlete.weightKg, locale)
      : null

  if (!stageEstimate && sortedStages.length > 0) {
    warningsSv.push(text(locale, 'Ingen exakt matchning mot testets intensitet hittades, så rekommendationen blir mer generell.', 'No exact match was found for the test intensity, so the recommendation is more general.'))
  }

  if (stageEstimate?.oxidation.warning) {
    warningsSv.push(stageEstimate.oxidation.warning)
  }

  const demandPerHour = stageEstimate?.oxidation.carbohydrateGramsPerHour ?? estimateFallbackDemand(goal, estimatedDurationMinutes)
  const demandTotal = demandPerHour != null && estimatedDurationMinutes != null
    ? Math.round(demandPerHour * (estimatedDurationMinutes / 60))
    : null

  const baseRecommended = demandPerHour != null
    ? Math.min(demandPerHour * GLYCOGEN_PRESERVATION_BUFFER, 90)
    : recommendationFromDuration(estimatedDurationMinutes)

  const gutTolerance = athlete.currentGutToleranceCarbsPerHour ?? null
  const recommendedCarbsPerHour = baseRecommended != null
    ? Math.round(Math.max(30, gutTolerance != null ? Math.min(baseRecommended, gutTolerance + 15) : baseRecommended))
    : null

  if (athlete.weightKg) assumptionsSv.push(text(locale, `Kroppsvikt ${Math.round(athlete.weightKg)} kg används för att tolka VO2-data.`, `Body weight ${Math.round(athlete.weightKg)} kg is used to interpret VO2 data.`))
  if (gutTolerance) assumptionsSv.push(text(locale, `Nuvarande magtolerans antas vara cirka ${Math.round(gutTolerance)} g kolhydrater/timme.`, `Current gut tolerance is assumed to be about ${Math.round(gutTolerance)} g carbohydrates/hour.`))
  if (demandPerHour != null) assumptionsSv.push(text(locale, 'Intaget begränsas av praktisk absorption och magtolerans, inte av hela beräknade förbrukningen.', 'Intake is limited by practical absorption and gut tolerance, not the full calculated expenditure.'))

  const confidence = getConfidence(Boolean(stageEstimate), stageEstimate?.oxidation.isPhysiologicallyReliable ?? false, estimatedDurationMinutes)

  return {
    sport: String(goal.sport),
    estimatedDurationMinutes,
    targetIntensity: target.value,
    targetIntensityUnit: target.unit,
    carbohydrateDemandPerHour: demandPerHour,
    carbohydrateDemandTotal: demandTotal,
    recommendedCarbsPerHour,
    confidence,
    scenarios: buildFuelingScenarios(recommendedCarbsPerHour, estimatedDurationMinutes, gutTolerance, locale),
    assumptionsSv,
    warningsSv,
    sourceStage: stageEstimate?.stage,
    sourceOxidation: stageEstimate?.oxidation,
  }
}

export function buildFuelingScenarios(
  recommendedCarbsPerHour: number | null,
  durationMinutes: number | null,
  gutToleranceCarbsPerHour?: number | null,
  locale: string = 'en'
): FuelingScenario[] {
  const recommended = recommendedCarbsPerHour ?? recommendationFromDuration(durationMinutes) ?? 60
  const conservative = Math.max(30, Math.min(60, recommended - 15))
  const ambitious = Math.min(120, Math.max(recommended + 15, recommended * 1.15))

  return [
    scenario('CONSERVATIVE', text(locale, 'Försiktig', 'Conservative'), conservative, durationMinutes, gutToleranceCarbsPerHour, text(locale, 'Lägre risk för magbesvär. Passar om atleten inte har tränat intaget ännu.', 'Lower risk of gut issues. Best if the athlete has not trained the intake yet.')),
    scenario('RECOMMENDED', text(locale, 'Rekommenderad', 'Recommended'), recommended, durationMinutes, gutToleranceCarbsPerHour, text(locale, 'Bästa startpunkt utifrån testdata, tävlingstid och praktisk absorption.', 'Best starting point based on test data, race duration, and practical absorption.')),
    scenario('AMBITIOUS', text(locale, 'Ambitiös', 'Ambitious'), ambitious, durationMinutes, gutToleranceCarbsPerHour, text(locale, 'Endast om detta har tränats på långpass eller tävlingslika pass.', 'Only use this if it has been trained during long or race-like sessions.')),
  ]
}

function scenario(
  key: FuelingScenario['key'],
  labelSv: string,
  carbsPerHourRaw: number,
  durationMinutes: number | null,
  gutToleranceCarbsPerHour: number | null | undefined,
  noteSv: string
): FuelingScenario {
  const carbsPerHour = Math.round(carbsPerHourRaw / 5) * 5
  const hours = durationMinutes != null ? durationMinutes / 60 : 0
  return {
    key,
    labelSv,
    carbsPerHour,
    totalCarbs: hours > 0 ? Math.round(carbsPerHour * hours) : 0,
    intakeEvery20Min: Math.round(carbsPerHour / 3),
    requiresGutTraining: gutToleranceCarbsPerHour != null ? carbsPerHour > gutToleranceCarbsPerHour + 5 : carbsPerHour > 75,
    noteSv,
  }
}

function interpolateOxidationAtIntensity(
  stages: FuelingTestStage[],
  target: number,
  kind: 'speed' | 'power' | 'pace' | 'duration',
  weightKg?: number | null,
  locale: string = 'en'
): { stage: FuelingTestStage; oxidation: SubstrateOxidationEstimate } | null {
  if (kind === 'duration') return nearestUsableStage(stages, weightKg, locale)

  const intensityStages = stages
    .map((stage) => ({ stage, value: getStageIntensity(stage, kind), oxidation: estimateSubstrateOxidationFromStage(stage, weightKg, locale) }))
    .filter((item): item is { stage: FuelingTestStage; value: number; oxidation: SubstrateOxidationEstimate } => item.value != null && item.oxidation != null)
    .sort((a, b) => a.value - b.value)

  if (intensityStages.length === 0) return null
  if (target <= intensityStages[0].value) return intensityStages[0]
  if (target >= intensityStages[intensityStages.length - 1].value) return intensityStages[intensityStages.length - 1]

  for (let i = 0; i < intensityStages.length - 1; i += 1) {
    const lower = intensityStages[i]
    const upper = intensityStages[i + 1]
    if (target >= lower.value && target <= upper.value) {
      const ratio = (target - lower.value) / (upper.value - lower.value)
      return {
        stage: ratio < 0.5 ? lower.stage : upper.stage,
        oxidation: interpolateOxidation(lower.oxidation, upper.oxidation, ratio),
      }
    }
  }

  return null
}

function nearestUsableStage(stages: FuelingTestStage[], weightKg?: number | null, locale: string = 'en') {
  for (const stage of stages) {
    const oxidation = estimateSubstrateOxidationFromStage(stage, weightKg, locale)
    if (oxidation?.isPhysiologicallyReliable) return { stage, oxidation }
  }
  return null
}

function interpolateOxidation(lower: SubstrateOxidationEstimate, upper: SubstrateOxidationEstimate, ratio: number): SubstrateOxidationEstimate {
  const carbohydrateGramsPerHour = Math.round(lerp(lower.carbohydrateGramsPerHour, upper.carbohydrateGramsPerHour, ratio))
  const fatGramsPerHour = Math.round(lerp(lower.fatGramsPerHour, upper.fatGramsPerHour, ratio))
  return {
    carbohydrateGramsPerMinute: carbohydrateGramsPerHour / 60,
    carbohydrateGramsPerHour,
    fatGramsPerMinute: fatGramsPerHour / 60,
    fatGramsPerHour,
    energyKcalPerHour: Math.round(lerp(lower.energyKcalPerHour, upper.energyKcalPerHour, ratio)),
    method: lower.method === upper.method ? lower.method : 'VO2_VCO2',
    isPhysiologicallyReliable: lower.isPhysiologicallyReliable && upper.isPhysiologicallyReliable,
    warning: lower.warning ?? upper.warning,
  }
}

function estimateDurationMinutes(goal: FuelingRaceGoal): number | null {
  if (goal.durationMinutes && goal.durationMinutes > 0) return goal.durationMinutes
  const distanceKm = goal.distanceKm ?? DISTANCE_PRESETS_KM[String(goal.distanceKm)]
  if (!distanceKm || distanceKm <= 0) return null
  if (goal.targetSpeedKmh && goal.targetSpeedKmh > 0) return (distanceKm / goal.targetSpeedKmh) * 60
  if (goal.targetPaceMinPerKm && goal.targetPaceMinPerKm > 0) return distanceKm * goal.targetPaceMinPerKm
  return null
}

function getTargetIntensity(goal: FuelingRaceGoal, locale: string): { value: number | null; unit: string; kind: 'speed' | 'power' | 'pace' | 'duration' } {
  if (goal.targetSpeedKmh) return { value: goal.targetSpeedKmh, unit: 'km/h', kind: 'speed' }
  if (goal.targetPowerWatts) return { value: goal.targetPowerWatts, unit: 'W', kind: 'power' }
  if (goal.targetPaceMinPerKm) return { value: goal.targetPaceMinPerKm, unit: 'min/km', kind: 'pace' }
  return { value: null, unit: text(locale, 'tävlingstid', 'race duration'), kind: 'duration' }
}

function getStageIntensity(stage: FuelingTestStage, kind: 'speed' | 'power' | 'pace'): number | null {
  if (kind === 'speed') return stage.speed ?? null
  if (kind === 'power') return stage.power ?? null
  return stage.pace ?? null
}

function estimateFallbackDemand(goal: FuelingRaceGoal, durationMinutes: number | null): number | null {
  const sport = String(goal.sport)
  if (durationMinutes == null) return null
  const baseDemand = fallbackDemandForSport(sport)
  if (durationMinutes < 60) return Math.min(baseDemand, 60)
  if (durationMinutes < 75) return Math.min(baseDemand, 75)
  return baseDemand
}

function fallbackDemandForSport(sport: string): number {
  if (sport === 'CYCLING') return 110
  if (sport === 'TRIATHLON') return 100
  if (sport === 'SKIING') return 95
  if (sport === 'RUNNING' || sport === 'SWIMMING') return 90
  if (sport === 'HYROX' || sport === 'FUNCTIONAL_FITNESS') return 75
  if (sport.startsWith('TEAM_')) return 70
  if (sport === 'TENNIS' || sport === 'PADEL') return 65
  if (sport === 'GENERAL_FITNESS' || sport === 'STRENGTH') return 55
  return 75
}

function recommendationFromDuration(durationMinutes: number | null): number | null {
  if (durationMinutes == null) return null
  if (durationMinutes < 60) return 30
  if (durationMinutes < 120) return 45
  if (durationMinutes < 180) return 60
  return 75
}

function getConfidence(hasMetabolicEstimate: boolean, reliable: boolean, durationMinutes: number | null) {
  if (hasMetabolicEstimate && reliable && durationMinutes != null) return 'HIGH'
  if (hasMetabolicEstimate || durationMinutes != null) return 'MEDIUM'
  return 'LOW'
}

function normalizeGasLitersPerMinute(value: number): number {
  return value > 100 ? value / 1000 : value
}

function normalizeVo2LitersPerMinute(value: number, weightKg?: number | null): number {
  if (value > 15 && weightKg) return (value * weightKg) / 1000
  return value > 100 ? value / 1000 : value
}

function text(locale: string, svText: string, enText: string): string {
  return locale.startsWith('sv') ? svText : enText
}

function lerp(a: number, b: number, ratio: number): number {
  return a + (b - a) * ratio
}

function relativeDifference(a: number, b: number): number {
  const denominator = Math.max(Math.abs(a), Math.abs(b), 1)
  return Math.abs(a - b) / denominator
}
