import type { FuelingAthleteProfile, FuelingRaceGoal, FuelingScenario, FuelingTestStage, RaceFuelingEstimate, SubstrateOxidationEstimate } from './types'

const GLYCOGEN_PRESERVATION_BUFFER = 0.55

const DISTANCE_PRESETS_KM: Record<string, number> = {
  '5K': 5,
  '10K': 10,
  HALF_MARATHON: 21.0975,
  HALF: 21.0975,
  MARATHON: 42.195,
}

export function estimateSubstrateOxidationFromStage(stage: FuelingTestStage, weightKg?: number | null): SubstrateOxidationEstimate | null {
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
        ? 'RER ligger utanför stabilt beräkningsområde.'
        : measuredVo2LMin != null && vo2LMin === derivedVo2LMin
          ? 'VO2 och VCO2/RER skiljer sig åt; VCO2/RER används för substratberäkningen.'
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
  athlete: FuelingAthleteProfile = {}
): RaceFuelingEstimate {
  const sortedStages = [...stages].sort((a, b) => a.sequence - b.sequence)
  const estimatedDurationMinutes = estimateDurationMinutes(goal)
  const target = getTargetIntensity(goal)
  const assumptionsSv: string[] = []
  const warningsSv: string[] = []

  const stageEstimate = target.value != null
    ? interpolateOxidationAtIntensity(sortedStages, target.value, target.kind, athlete.weightKg)
    : null

  if (!stageEstimate && sortedStages.length > 0) {
    warningsSv.push('Ingen exakt matchning mot testets intensitet hittades, så rekommendationen blir mer generell.')
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

  if (athlete.weightKg) assumptionsSv.push(`Kroppsvikt ${Math.round(athlete.weightKg)} kg används för att tolka VO2-data.`)
  if (gutTolerance) assumptionsSv.push(`Nuvarande magtolerans antas vara cirka ${Math.round(gutTolerance)} g kolhydrater/timme.`)
  if (demandPerHour != null) assumptionsSv.push('Intaget begränsas av praktisk absorption och magtolerans, inte av hela beräknade förbrukningen.')

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
    scenarios: buildFuelingScenarios(recommendedCarbsPerHour, estimatedDurationMinutes, gutTolerance),
    assumptionsSv,
    warningsSv,
    sourceStage: stageEstimate?.stage,
    sourceOxidation: stageEstimate?.oxidation,
  }
}

export function buildFuelingScenarios(
  recommendedCarbsPerHour: number | null,
  durationMinutes: number | null,
  gutToleranceCarbsPerHour?: number | null
): FuelingScenario[] {
  const recommended = recommendedCarbsPerHour ?? recommendationFromDuration(durationMinutes) ?? 60
  const conservative = Math.max(30, Math.min(60, recommended - 15))
  const ambitious = Math.min(120, Math.max(recommended + 15, recommended * 1.15))

  return [
    scenario('CONSERVATIVE', 'Försiktig', conservative, durationMinutes, gutToleranceCarbsPerHour, 'Lägre risk för magbesvär. Passar om atleten inte har tränat intaget ännu.'),
    scenario('RECOMMENDED', 'Rekommenderad', recommended, durationMinutes, gutToleranceCarbsPerHour, 'Bästa startpunkt utifrån testdata, tävlingstid och praktisk absorption.'),
    scenario('AMBITIOUS', 'Ambitiös', ambitious, durationMinutes, gutToleranceCarbsPerHour, 'Endast om detta har tränats på långpass eller tävlingslika pass.'),
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
  weightKg?: number | null
): { stage: FuelingTestStage; oxidation: SubstrateOxidationEstimate } | null {
  if (kind === 'duration') return nearestUsableStage(stages, weightKg)

  const intensityStages = stages
    .map((stage) => ({ stage, value: getStageIntensity(stage, kind), oxidation: estimateSubstrateOxidationFromStage(stage, weightKg) }))
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

function nearestUsableStage(stages: FuelingTestStage[], weightKg?: number | null) {
  for (const stage of stages) {
    const oxidation = estimateSubstrateOxidationFromStage(stage, weightKg)
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

function getTargetIntensity(goal: FuelingRaceGoal): { value: number | null; unit: string; kind: 'speed' | 'power' | 'pace' | 'duration' } {
  if (goal.targetSpeedKmh) return { value: goal.targetSpeedKmh, unit: 'km/h', kind: 'speed' }
  if (goal.targetPowerWatts) return { value: goal.targetPowerWatts, unit: 'W', kind: 'power' }
  if (goal.targetPaceMinPerKm) return { value: goal.targetPaceMinPerKm, unit: 'min/km', kind: 'pace' }
  return { value: null, unit: 'tävlingstid', kind: 'duration' }
}

function getStageIntensity(stage: FuelingTestStage, kind: 'speed' | 'power' | 'pace'): number | null {
  if (kind === 'speed') return stage.speed ?? null
  if (kind === 'power') return stage.power ?? null
  return stage.pace ?? null
}

function estimateFallbackDemand(goal: FuelingRaceGoal, durationMinutes: number | null): number | null {
  const sport = String(goal.sport)
  if (durationMinutes == null) return null
  if (durationMinutes < 75) return 75
  if (sport === 'CYCLING') return 110
  if (sport === 'TRIATHLON') return 100
  if (sport === 'SKIING') return 95
  return 90
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

function lerp(a: number, b: number, ratio: number): number {
  return a + (b - a) * ratio
}

function relativeDifference(a: number, b: number): number {
  const denominator = Math.max(Math.abs(a), Math.abs(b), 1)
  return Math.abs(a - b) / denominator
}
