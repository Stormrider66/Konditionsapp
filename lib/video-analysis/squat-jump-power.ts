import type { CameraAngle, PoseFrame, PoseLandmark } from '@/components/coach/video-analysis/pose-analyzer/utils'

const GRAVITY = 9.80665

const LANDMARKS = {
  NOSE: 0,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32,
} as const

export type SquatJumpPowerStatus = 'ready' | 'insufficient_data'
export type SquatJumpPowerConfidence = 'low' | 'moderate' | 'high'

export type SquatJumpPowerWarningCode =
  | 'no_frames'
  | 'no_airborne_phase'
  | 'short_airborne_phase'
  | 'body_mass_missing'
  | 'height_missing'
  | 'non_sagittal_view'
  | 'low_frame_rate'
  | 'low_visibility'
  | 'multiple_jumps'
  | 'missing_concentric_phase'
  | 'mean_power_regression'
  | 'loaded_jump_proxy'

export interface SquatJumpPowerWarning {
  code: SquatJumpPowerWarningCode
  message: string
}

export interface SquatJumpPowerMetrics {
  flightTimeMs: number
  jumpHeightCm: number
  takeoffVelocityMps: number
  concentricDurationMs: number | null
  concentricDisplacementCm: number | null
  meanConcentricVelocityMps: number | null
  estimatedMeanPowerW: number | null
  estimatedPeakPowerW: number | null
  relativeMeanPowerWPerKg: number | null
  relativePeakPowerWPerKg: number | null
  powerMethod: 'sayers_mean_power' | null
  bodyMassKg: number | null
  externalLoadKg: number
  systemMassKg: number | null
}

export interface SquatJumpPowerCurvePoint {
  externalLoadKg: number
  jumpHeightCm: number
  estimatedMeanPowerW: number
  relativePowerWPerKg: number | null
  systemMassKg: number | null
}

export interface SquatJumpPowerEstimate {
  kind: 'squat_jump_power'
  status: SquatJumpPowerStatus
  movement: 'SQUAT_JUMP' | 'LOADED_JUMP_SQUAT'
  confidence: SquatJumpPowerConfidence
  confidenceScore: number
  metrics: SquatJumpPowerMetrics | null
  phase: {
    bottomFrameIndex: number | null
    takeoffFrameIndex: number | null
    landingFrameIndex: number | null
    repetitionsDetected: number
  }
  inputs: {
    bodyMassKg: number | null
    externalLoadKg: number
    athleteHeightCm: number | null
    cameraAngle: CameraAngle
  }
  diagnostics: {
    framesAnalyzed: number
    detectedFrameRateFps: number | null
    airborneFrameCount: number
    footVisibilityRatio: number
    footLiftThreshold: number | null
  }
  powerCurve?: SquatJumpPowerCurvePoint[]
  warnings: SquatJumpPowerWarning[]
}

interface SquatJumpPowerInput {
  frames: PoseFrame[]
  bodyMassKg?: number | null
  externalLoadKg?: number | null
  athleteHeightCm?: number | null
  cameraAngle?: CameraAngle
}

interface FrameSample {
  index: number
  timestamp: number
  landmarks: PoseLandmark[]
  centerY: number | null
  footY: number | null
}

interface AirborneSegment {
  startIndex: number
  endIndex: number
}

export function estimateSquatJumpPower(input: SquatJumpPowerInput): SquatJumpPowerEstimate {
  const cameraAngle = input.cameraAngle || 'UNKNOWN'
  const bodyMassKg = normalizePositiveNumber(input.bodyMassKg)
  const externalLoadKg = Math.max(0, normalizePositiveNumber(input.externalLoadKg) ?? 0)
  const athleteHeightCm = normalizePositiveNumber(input.athleteHeightCm)
  const movement = externalLoadKg > 0 ? 'LOADED_JUMP_SQUAT' : 'SQUAT_JUMP'
  const warnings: SquatJumpPowerWarning[] = []
  const samples = buildSamples(input.frames)
  const frameRate = estimateFrameRate(samples)

  if (samples.length < 6) {
    warnings.push(warning('no_frames'))
    if (!bodyMassKg) warnings.push(warning('body_mass_missing'))
    return emptyEstimate({
      movement,
      cameraAngle,
      bodyMassKg,
      externalLoadKg,
      athleteHeightCm,
      frameCount: samples.length,
      frameRate,
      warnings,
    })
  }

  if (!bodyMassKg) warnings.push(warning('body_mass_missing'))
  if (!athleteHeightCm) warnings.push(warning('height_missing'))
  if (cameraAngle !== 'SAGITTAL') warnings.push(warning('non_sagittal_view'))
  if (frameRate !== null && frameRate < 45) warnings.push(warning('low_frame_rate'))
  if (externalLoadKg > 0) warnings.push(warning('loaded_jump_proxy'))

  const footSamples = samples.filter((sample) => sample.footY !== null)
  const footVisibilityRatio = samples.length > 0 ? footSamples.length / samples.length : 0
  if (footVisibilityRatio < 0.75) warnings.push(warning('low_visibility'))

  const groundY = percentile(footSamples.map((sample) => sample.footY as number), 0.9)
  if (groundY === null) {
    warnings.push(warning('no_airborne_phase'))
    return emptyEstimate({
      movement,
      cameraAngle,
      bodyMassKg,
      externalLoadKg,
      athleteHeightCm,
      frameCount: samples.length,
      frameRate,
      footVisibilityRatio,
      warnings,
    })
  }

  const lifts = samples.map((sample) => (
    sample.footY === null ? 0 : Math.max(0, groundY - sample.footY)
  ))
  const maxLift = Math.max(...lifts)
  const footLiftThreshold = maxLift > 0 ? clamp(maxLift * 0.35, 0.012, 0.06) : null

  if (!footLiftThreshold || maxLift < 0.018) {
    warnings.push(warning('no_airborne_phase'))
    return emptyEstimate({
      movement,
      cameraAngle,
      bodyMassKg,
      externalLoadKg,
      athleteHeightCm,
      frameCount: samples.length,
      frameRate,
      footVisibilityRatio,
      footLiftThreshold,
      warnings,
    })
  }

  const minAirborneFrames = Math.max(2, Math.round((frameRate ?? 30) * 0.08))
  const airborneSegments = findAirborneSegments(lifts, footLiftThreshold, minAirborneFrames, samples.length)

  if (airborneSegments.length === 0) {
    warnings.push(warning('short_airborne_phase'))
    return emptyEstimate({
      movement,
      cameraAngle,
      bodyMassKg,
      externalLoadKg,
      athleteHeightCm,
      frameCount: samples.length,
      frameRate,
      footVisibilityRatio,
      footLiftThreshold,
      warnings,
    })
  }

  if (airborneSegments.length > 1) warnings.push(warning('multiple_jumps'))

  const segment = chooseAirborneSegment(airborneSegments, samples)
  const takeoffTime = interpolateThresholdTime(samples, lifts, segment.startIndex - 1, segment.startIndex, footLiftThreshold)
    ?? samples[segment.startIndex].timestamp
  const landingTime = interpolateThresholdTime(samples, lifts, segment.endIndex, segment.endIndex + 1, footLiftThreshold)
    ?? samples[segment.endIndex].timestamp
  const flightTimeSeconds = landingTime - takeoffTime

  if (flightTimeSeconds < 0.12) {
    warnings.push(warning('short_airborne_phase'))
  }

  const bottomFrameIndex = findBottomFrameIndex(samples, segment.startIndex, frameRate)
  const bottomSample = bottomFrameIndex !== null ? samples[bottomFrameIndex] : null
  const takeoffSample = samples[segment.startIndex]
  const concentricDurationSeconds = bottomSample
    ? Math.max(0, takeoffTime - bottomSample.timestamp)
    : null

  const scaleMetersPerNormalizedUnit = athleteHeightCm
    ? estimateMetersPerNormalizedUnit(samples, athleteHeightCm / 100)
    : null

  const concentricDisplacementMeters = scaleMetersPerNormalizedUnit && bottomSample?.centerY != null && takeoffSample.centerY !== null
    ? Math.max(0, (bottomSample.centerY - takeoffSample.centerY) * scaleMetersPerNormalizedUnit)
    : null

  const jumpHeightMeters = GRAVITY * flightTimeSeconds ** 2 / 8
  const takeoffVelocityMps = GRAVITY * flightTimeSeconds / 2
  const systemMassKg = bodyMassKg ? bodyMassKg + externalLoadKg : null
  const jumpHeightCm = jumpHeightMeters * 100
  const estimatedMeanPowerW = systemMassKg
    ? estimateMeanPowerFromJumpHeight(jumpHeightCm, systemMassKg)
    : null
  const estimatedPeakPowerW = null
  const relativeMeanPowerWPerKg = estimatedMeanPowerW !== null && bodyMassKg
    ? round(estimatedMeanPowerW / bodyMassKg, 1)
    : null

  if (estimatedMeanPowerW !== null) warnings.push(warning('mean_power_regression'))

  const metrics: SquatJumpPowerMetrics = {
    flightTimeMs: round(flightTimeSeconds * 1000, 0),
    jumpHeightCm: round(jumpHeightCm, 1),
    takeoffVelocityMps: round(takeoffVelocityMps, 2),
    concentricDurationMs: concentricDurationSeconds && concentricDurationSeconds >= 0.05
      ? round(concentricDurationSeconds * 1000, 0)
      : null,
    concentricDisplacementCm: concentricDisplacementMeters !== null
      ? round(concentricDisplacementMeters * 100, 1)
      : null,
    meanConcentricVelocityMps: concentricDisplacementMeters !== null && concentricDurationSeconds && concentricDurationSeconds >= 0.05
      ? round(concentricDisplacementMeters / concentricDurationSeconds, 2)
      : null,
    estimatedMeanPowerW: estimatedMeanPowerW !== null ? round(estimatedMeanPowerW, 0) : null,
    estimatedPeakPowerW,
    relativeMeanPowerWPerKg,
    relativePeakPowerWPerKg: relativeMeanPowerWPerKg,
    powerMethod: estimatedMeanPowerW !== null ? 'sayers_mean_power' : null,
    bodyMassKg,
    externalLoadKg,
    systemMassKg,
  }

  const confidenceScore = calculateConfidenceScore({
    warnings,
    frameRate,
    airborneFrameCount: segment.endIndex - segment.startIndex + 1,
    footVisibilityRatio,
    hasBodyMass: Boolean(bodyMassKg),
    hasHeight: Boolean(athleteHeightCm),
    cameraAngle,
  })

  return {
    kind: 'squat_jump_power',
    status: 'ready',
    movement,
    confidence: confidenceLabel(confidenceScore),
    confidenceScore,
    metrics,
    phase: {
      bottomFrameIndex,
      takeoffFrameIndex: segment.startIndex,
      landingFrameIndex: segment.endIndex + 1 < samples.length ? segment.endIndex + 1 : segment.endIndex,
      repetitionsDetected: airborneSegments.length,
    },
    inputs: {
      bodyMassKg,
      externalLoadKg,
      athleteHeightCm,
      cameraAngle,
    },
    diagnostics: {
      framesAnalyzed: samples.length,
      detectedFrameRateFps: frameRate ? round(frameRate, 1) : null,
      airborneFrameCount: segment.endIndex - segment.startIndex + 1,
      footVisibilityRatio: round(footVisibilityRatio, 2),
      footLiftThreshold: footLiftThreshold ? round(footLiftThreshold, 4) : null,
    },
    warnings,
  }
}

function emptyEstimate(params: {
  movement: SquatJumpPowerEstimate['movement']
  cameraAngle: CameraAngle
  bodyMassKg: number | null
  externalLoadKg: number
  athleteHeightCm: number | null
  frameCount: number
  frameRate: number | null
  footVisibilityRatio?: number
  footLiftThreshold?: number | null
  warnings: SquatJumpPowerWarning[]
}): SquatJumpPowerEstimate {
  const confidenceScore = calculateConfidenceScore({
    warnings: params.warnings,
    frameRate: params.frameRate,
    airborneFrameCount: 0,
    footVisibilityRatio: params.footVisibilityRatio ?? 0,
    hasBodyMass: Boolean(params.bodyMassKg),
    hasHeight: Boolean(params.athleteHeightCm),
    cameraAngle: params.cameraAngle,
  })

  return {
    kind: 'squat_jump_power',
    status: 'insufficient_data',
    movement: params.movement,
    confidence: confidenceLabel(confidenceScore),
    confidenceScore,
    metrics: null,
    phase: {
      bottomFrameIndex: null,
      takeoffFrameIndex: null,
      landingFrameIndex: null,
      repetitionsDetected: 0,
    },
    inputs: {
      bodyMassKg: params.bodyMassKg,
      externalLoadKg: params.externalLoadKg,
      athleteHeightCm: params.athleteHeightCm,
      cameraAngle: params.cameraAngle,
    },
    diagnostics: {
      framesAnalyzed: params.frameCount,
      detectedFrameRateFps: params.frameRate ? round(params.frameRate, 1) : null,
      airborneFrameCount: 0,
      footVisibilityRatio: round(params.footVisibilityRatio ?? 0, 2),
      footLiftThreshold: params.footLiftThreshold ? round(params.footLiftThreshold, 4) : null,
    },
    warnings: params.warnings,
  }
}

function buildSamples(frames: PoseFrame[]): FrameSample[] {
  return [...frames]
    .filter((frame) => Number.isFinite(frame.timestamp) && Array.isArray(frame.landmarks))
    .sort((a, b) => a.timestamp - b.timestamp)
    .reduce<FrameSample[]>((samples, frame, index) => {
      const previous = samples[samples.length - 1]
      if (previous && Math.abs(previous.timestamp - frame.timestamp) < 0.001) return samples

      samples.push({
        index,
        timestamp: frame.timestamp,
        landmarks: frame.landmarks,
        centerY: estimateBodyCenterY(frame.landmarks),
        footY: estimateFootContactY(frame.landmarks),
      })
      return samples
    }, [])
}

function estimateBodyCenterY(landmarks: PoseLandmark[]): number | null {
  const shoulderY = averageLandmarkY(landmarks, [LANDMARKS.LEFT_SHOULDER, LANDMARKS.RIGHT_SHOULDER])
  const hipY = averageLandmarkY(landmarks, [LANDMARKS.LEFT_HIP, LANDMARKS.RIGHT_HIP])
  const kneeY = averageLandmarkY(landmarks, [LANDMARKS.LEFT_KNEE, LANDMARKS.RIGHT_KNEE])

  if (shoulderY !== null && hipY !== null && kneeY !== null) {
    return shoulderY * 0.3 + hipY * 0.5 + kneeY * 0.2
  }
  if (shoulderY !== null && hipY !== null) {
    return shoulderY * 0.35 + hipY * 0.65
  }
  return hipY ?? shoulderY
}

function estimateFootContactY(landmarks: PoseLandmark[]): number | null {
  const footPoints = [
    LANDMARKS.LEFT_ANKLE,
    LANDMARKS.RIGHT_ANKLE,
    LANDMARKS.LEFT_HEEL,
    LANDMARKS.RIGHT_HEEL,
    LANDMARKS.LEFT_FOOT_INDEX,
    LANDMARKS.RIGHT_FOOT_INDEX,
  ]
    .map((index) => landmarks[index])
    .filter(isVisibleLandmark)

  if (footPoints.length === 0) return null
  return Math.max(...footPoints.map((point) => point.y))
}

function averageLandmarkY(landmarks: PoseLandmark[], indices: number[]): number | null {
  const visible = indices
    .map((index) => landmarks[index])
    .filter(isVisibleLandmark)

  if (visible.length === 0) return null
  return visible.reduce((sum, landmark) => sum + landmark.y, 0) / visible.length
}

function estimateMetersPerNormalizedUnit(samples: FrameSample[], athleteHeightM: number): number | null {
  const bodyHeights = samples
    .map((sample) => {
      const visiblePoints = [
        LANDMARKS.NOSE,
        LANDMARKS.LEFT_SHOULDER,
        LANDMARKS.RIGHT_SHOULDER,
        LANDMARKS.LEFT_HIP,
        LANDMARKS.RIGHT_HIP,
        LANDMARKS.LEFT_KNEE,
        LANDMARKS.RIGHT_KNEE,
        LANDMARKS.LEFT_ANKLE,
        LANDMARKS.RIGHT_ANKLE,
        LANDMARKS.LEFT_HEEL,
        LANDMARKS.RIGHT_HEEL,
        LANDMARKS.LEFT_FOOT_INDEX,
        LANDMARKS.RIGHT_FOOT_INDEX,
      ]
        .map((index) => sample.landmarks[index])
        .filter(isVisibleLandmark)

      if (visiblePoints.length < 8) return null
      const ys = visiblePoints.map((point) => point.y)
      return Math.max(...ys) - Math.min(...ys)
    })
    .filter((height): height is number => height !== null && height > 0.2)

  const normalizedHeight = percentile(bodyHeights, 0.75)
  if (!normalizedHeight) return null
  return athleteHeightM / normalizedHeight
}

function findAirborneSegments(
  lifts: number[],
  threshold: number,
  minAirborneFrames: number,
  frameCount: number
): AirborneSegment[] {
  const segments: AirborneSegment[] = []
  let startIndex: number | null = null

  lifts.forEach((lift, index) => {
    const isAirborne = lift > threshold
    if (isAirborne && startIndex === null) {
      startIndex = index
    }
    if ((!isAirborne || index === lifts.length - 1) && startIndex !== null) {
      const endIndex = isAirborne && index === lifts.length - 1 ? index : index - 1
      const length = endIndex - startIndex + 1
      if (length >= minAirborneFrames && startIndex > 0 && endIndex < frameCount - 1) {
        segments.push({ startIndex, endIndex })
      }
      startIndex = null
    }
  })

  return segments
}

function chooseAirborneSegment(segments: AirborneSegment[], samples: FrameSample[]): AirborneSegment {
  return [...segments].sort((a, b) => {
    const durationA = samples[a.endIndex].timestamp - samples[a.startIndex].timestamp
    const durationB = samples[b.endIndex].timestamp - samples[b.startIndex].timestamp
    return durationB - durationA
  })[0]
}

function interpolateThresholdTime(
  samples: FrameSample[],
  lifts: number[],
  fromIndex: number,
  toIndex: number,
  threshold: number
): number | null {
  const from = samples[fromIndex]
  const to = samples[toIndex]
  if (!from || !to) return null

  const fromLift = lifts[fromIndex]
  const toLift = lifts[toIndex]
  const delta = toLift - fromLift
  if (Math.abs(delta) < 0.0001) return null

  const ratio = clamp((threshold - fromLift) / delta, 0, 1)
  return from.timestamp + (to.timestamp - from.timestamp) * ratio
}

function findBottomFrameIndex(samples: FrameSample[], takeoffIndex: number, frameRate: number | null): number | null {
  const lookbackFrames = Math.max(6, Math.round((frameRate ?? 30) * 1.5))
  const startIndex = Math.max(0, takeoffIndex - lookbackFrames)
  const candidates = samples
    .slice(startIndex, takeoffIndex + 1)
    .filter((sample) => sample.centerY !== null)

  if (candidates.length === 0) return null
  return candidates.reduce((lowest, sample) => (
    (sample.centerY as number) > (lowest.centerY as number) ? sample : lowest
  )).index
}

function estimateFrameRate(samples: FrameSample[]): number | null {
  const deltas = samples
    .slice(1)
    .map((sample, index) => sample.timestamp - samples[index].timestamp)
    .filter((delta) => delta > 0.001 && delta < 1)

  const medianDelta = percentile(deltas, 0.5)
  if (!medianDelta) return null
  return 1 / medianDelta
}

function calculateConfidenceScore(params: {
  warnings: SquatJumpPowerWarning[]
  frameRate: number | null
  airborneFrameCount: number
  footVisibilityRatio: number
  hasBodyMass: boolean
  hasHeight: boolean
  cameraAngle: CameraAngle
}): number {
  let score = 86
  if (!params.hasBodyMass) score -= 22
  if (!params.hasHeight) score -= 8
  if (params.cameraAngle !== 'SAGITTAL') score -= 14
  if (params.frameRate !== null && params.frameRate < 45) score -= 8
  if (params.airborneFrameCount > 0 && params.airborneFrameCount < 5) score -= 12
  if (params.footVisibilityRatio < 0.75) score -= 14
  if (params.warnings.some((item) => item.code === 'no_airborne_phase')) score -= 28
  return Math.max(10, Math.min(95, Math.round(score)))
}

function confidenceLabel(score: number): SquatJumpPowerConfidence {
  if (score >= 75) return 'high'
  if (score >= 55) return 'moderate'
  return 'low'
}

function warning(code: SquatJumpPowerWarningCode): SquatJumpPowerWarning {
  const messages: Record<SquatJumpPowerWarningCode, string> = {
    no_frames: 'Run pose analysis first so the estimator has frame data.',
    no_airborne_phase: 'No clear airborne phase was detected, so jump power cannot be estimated reliably.',
    short_airborne_phase: 'The airborne phase is very short; one frame can change the result noticeably.',
    body_mass_missing: 'Body mass is required before watts and W/kg can be estimated.',
    height_missing: 'Athlete height improves the push-off displacement estimate.',
    non_sagittal_view: 'Side-view video gives the most reliable jump power estimate.',
    low_frame_rate: 'Frame rate is low for power work; treat the result as a trend estimate.',
    low_visibility: 'Foot landmarks were not visible through enough of the clip.',
    multiple_jumps: 'Multiple jumps were detected; the estimate uses the longest airborne phase.',
    missing_concentric_phase: 'The bottom-to-takeoff phase was hard to isolate from the clip.',
    mean_power_regression: 'Power uses a jump-height and mass regression, so compare trends rather than lab-grade watts.',
    loaded_jump_proxy: 'Loaded jump squat estimates assume the external load moves with the athlete.',
  }

  return { code, message: messages[code] }
}

function percentile(values: number[], percentileValue: number): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const index = (sorted.length - 1) * percentileValue
  const lower = Math.floor(index)
  const upper = Math.ceil(index)
  if (lower === upper) return sorted[lower]
  const weight = index - lower
  return sorted[lower] * (1 - weight) + sorted[upper] * weight
}

function normalizePositiveNumber(value: number | null | undefined): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return null
  return value
}

export function estimateMeanPowerFromJumpHeight(jumpHeightCm: number, systemMassKg: number): number {
  return Math.max(0, 21.2 * jumpHeightCm + 23 * systemMassKg - 1393)
}

export function buildSquatJumpPowerCurve(
  points: Array<{ externalLoadKg: number | null; jumpHeightCm: number | null }>,
  bodyMassKg: number | null
): SquatJumpPowerCurvePoint[] {
  if (!bodyMassKg) return []

  return points
    .filter((point) => point.externalLoadKg !== null && point.jumpHeightCm !== null)
    .map((point) => {
      const externalLoadKg = Math.max(0, point.externalLoadKg as number)
      const jumpHeightCm = point.jumpHeightCm as number
      const systemMassKg = bodyMassKg + externalLoadKg
      const estimatedMeanPowerW = round(estimateMeanPowerFromJumpHeight(jumpHeightCm, systemMassKg), 0)

      return {
        externalLoadKg,
        jumpHeightCm: round(jumpHeightCm, 1),
        estimatedMeanPowerW,
        relativePowerWPerKg: round(estimatedMeanPowerW / bodyMassKg, 1),
        systemMassKg,
      }
    })
    .sort((a, b) => a.externalLoadKg - b.externalLoadKg)
}

function isVisibleLandmark(landmark: PoseLandmark | undefined): landmark is PoseLandmark {
  return Boolean(landmark && Number.isFinite(landmark.x) && Number.isFinite(landmark.y) && (landmark.visibility ?? 1) >= 0.35)
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}
