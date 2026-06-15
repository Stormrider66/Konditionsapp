export interface PhoneRunRawSample {
  elapsedSec: number
  timestamp?: string
  latitude: number
  longitude: number
  accuracy?: number
  altitude?: number
  speed?: number
  heading?: number
  heartRate?: number
}

export interface PhoneRunSample extends PhoneRunRawSample {
  distanceMeters: number
  segmentDistanceMeters?: number
  segmentSpeedMps?: number
}

export interface PhoneRunSplit {
  kilometer: number
  elapsedSec: number
  splitSec: number
  avgHeartRate?: number
}

export interface PhoneRunSummary {
  durationSec: number
  movingDurationSec: number
  distanceMeters: number
  avgPaceSecPerKm?: number
  avgSpeedMps?: number
  maxSpeedMps?: number
  avgHeartRate?: number
  maxHeartRate?: number
  elevationGainMeters?: number
  sampleCount: number
}

export interface PhoneRunAnalysis {
  samples: PhoneRunSample[]
  summary: PhoneRunSummary
  splits: PhoneRunSplit[]
  routePolyline?: string
}

export interface BuildPhoneRunAnalysisOptions {
  maxAccuracyMeters?: number
  maxSegmentSpeedMps?: number
}

const DEFAULT_MAX_ACCURACY_METERS = 75
const DEFAULT_MAX_SEGMENT_SPEED_MPS = 12
const MIN_MOVING_SPEED_MPS = 0.5
const MAX_SAMPLE_GAP_SEC = 300
const EARTH_RADIUS_METERS = 6_371_000

export function buildPhoneRunSessionAnalysis(
  rawSamples: PhoneRunRawSample[],
  options: BuildPhoneRunAnalysisOptions = {}
): PhoneRunAnalysis {
  const maxAccuracyMeters = options.maxAccuracyMeters ?? DEFAULT_MAX_ACCURACY_METERS
  const maxSegmentSpeedMps = options.maxSegmentSpeedMps ?? DEFAULT_MAX_SEGMENT_SPEED_MPS
  const sorted = sanitizePhoneRunSamples(rawSamples, maxAccuracyMeters)

  const samples: PhoneRunSample[] = []
  let totalDistance = 0
  let movingDurationSec = 0
  let maxSpeedMps = 0
  let elevationGainMeters = 0
  let previous: PhoneRunRawSample | null = null
  let previousAltitude: number | null = null

  for (const sample of sorted) {
    let segmentDistanceMeters = 0
    let segmentSpeedMps: number | undefined

    if (previous) {
      const elapsedDelta = sample.elapsedSec - previous.elapsedSec
      if (elapsedDelta > 0 && elapsedDelta <= MAX_SAMPLE_GAP_SEC) {
        const distance = haversineDistanceMeters(previous, sample)
        const speed = distance / elapsedDelta

        if (distance <= 2 || speed <= maxSegmentSpeedMps) {
          segmentDistanceMeters = distance
          segmentSpeedMps = speed
          totalDistance += distance

          if (speed >= MIN_MOVING_SPEED_MPS) {
            movingDurationSec += elapsedDelta
          }

          maxSpeedMps = Math.max(maxSpeedMps, speed, sample.speed ?? 0)
        }
      }
    }

    if (typeof sample.altitude === 'number' && Number.isFinite(sample.altitude)) {
      if (previousAltitude !== null) {
        const gain = sample.altitude - previousAltitude
        if (gain > 1 && gain < 30) {
          elevationGainMeters += gain
        }
      }
      previousAltitude = sample.altitude
    }

    samples.push({
      ...sample,
      distanceMeters: Math.round(totalDistance * 10) / 10,
      segmentDistanceMeters: roundFinite(segmentDistanceMeters, 1),
      segmentSpeedMps: roundFinite(segmentSpeedMps, 2),
    })
    previous = sample
  }

  const durationSec = samples.length > 0 ? samples[samples.length - 1].elapsedSec - samples[0].elapsedSec : 0
  const heartRates = samples
    .map((sample) => sample.heartRate)
    .filter((value): value is number => typeof value === 'number' && value > 0 && value < 250)
  const avgHeartRate = averageRounded(heartRates)
  const maxHeartRate = heartRates.length > 0 ? Math.max(...heartRates) : undefined
  const paceDuration = movingDurationSec > 0 ? movingDurationSec : durationSec
  const avgPaceSecPerKm = totalDistance >= 50 && paceDuration > 0
    ? Math.round(paceDuration / (totalDistance / 1000))
    : undefined
  const avgSpeedMps = paceDuration > 0 && totalDistance > 0
    ? totalDistance / paceDuration
    : undefined

  return {
    samples,
    summary: {
      durationSec: Math.max(0, Math.round(durationSec)),
      movingDurationSec: Math.max(0, Math.round(movingDurationSec)),
      distanceMeters: Math.round(totalDistance * 10) / 10,
      avgPaceSecPerKm,
      avgSpeedMps: roundFinite(avgSpeedMps, 2),
      maxSpeedMps: roundFinite(maxSpeedMps > 0 ? maxSpeedMps : undefined, 2),
      avgHeartRate,
      maxHeartRate,
      elevationGainMeters: elevationGainMeters > 0 ? Math.round(elevationGainMeters) : undefined,
      sampleCount: samples.length,
    },
    splits: buildKilometerSplits(samples),
    routePolyline: samples.length >= 2 ? encodePolyline(samples) : undefined,
  }
}

export function estimatePhoneRunTrainingLoad(summary: PhoneRunSummary, rpe?: number): number {
  const durationMin = Math.max(1, summary.durationSec / 60)
  const perceivedEffort = typeof rpe === 'number' && rpe >= 1 && rpe <= 10 ? rpe : 6
  const intensityFactor = perceivedEffort / 10
  return Math.max(1, Math.round((durationMin * Math.pow(intensityFactor, 2) * 100) / 60))
}

export function mapRunRpeToIntensity(rpe?: number): string {
  if (!rpe) return 'MODERATE'
  if (rpe <= 2) return 'RECOVERY'
  if (rpe <= 4) return 'EASY'
  if (rpe <= 6) return 'MODERATE'
  if (rpe <= 8) return 'HARD'
  return 'VERY_HARD'
}

export function buildPhoneRunDedupeKey(input: {
  clientId: string
  startedAt: Date
  summary: Pick<PhoneRunSummary, 'durationSec' | 'distanceMeters'>
}): string {
  const startedMinute = input.startedAt.toISOString().slice(0, 16)
  const durationBucket = Math.round(input.summary.durationSec / 10) * 10
  const distanceBucket = Math.round(input.summary.distanceMeters / 10) * 10
  return [input.clientId, startedMinute, durationBucket, distanceBucket].join(':')
}

export function formatRunPace(sec?: number): string {
  if (!sec || !Number.isFinite(sec) || sec <= 0) return '--'
  const minutes = Math.floor(sec / 60)
  const seconds = Math.round(sec % 60)
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

function sanitizePhoneRunSamples(samples: PhoneRunRawSample[], maxAccuracyMeters: number): PhoneRunRawSample[] {
  const bySecond = new Map<number, PhoneRunRawSample>()

  for (const sample of samples) {
    if (!isValidCoordinate(sample.latitude, sample.longitude)) continue
    if (typeof sample.accuracy === 'number' && sample.accuracy > maxAccuracyMeters) continue

    const elapsedSec = Math.max(0, Math.round(sample.elapsedSec))
    bySecond.set(elapsedSec, {
      elapsedSec,
      timestamp: sample.timestamp,
      latitude: roundFinite(sample.latitude, 7) ?? sample.latitude,
      longitude: roundFinite(sample.longitude, 7) ?? sample.longitude,
      accuracy: roundFinite(sample.accuracy, 1),
      altitude: roundFinite(sample.altitude, 1),
      speed: roundFinite(sample.speed, 2),
      heading: roundFinite(sample.heading, 1),
      heartRate: typeof sample.heartRate === 'number' && sample.heartRate > 0 && sample.heartRate < 250
        ? Math.round(sample.heartRate)
        : undefined,
    })
  }

  return [...bySecond.values()].sort((a, b) => a.elapsedSec - b.elapsedSec)
}

function buildKilometerSplits(samples: PhoneRunSample[]): PhoneRunSplit[] {
  const splits: PhoneRunSplit[] = []
  let nextKm = 1000
  let previousDistance = 0
  let previousElapsed = 0
  let lastSplitElapsed = 0

  for (const sample of samples) {
    while (sample.distanceMeters >= nextKm) {
      const segmentDistance = sample.distanceMeters - previousDistance
      const segmentElapsed = sample.elapsedSec - previousElapsed
      const fraction = segmentDistance > 0 ? (nextKm - previousDistance) / segmentDistance : 0
      const elapsedAtSplit = previousElapsed + Math.round(segmentElapsed * fraction)
      const splitStart = nextKm - 1000
      const hrSamples = samples.filter(
        (item) => item.distanceMeters > splitStart && item.distanceMeters <= nextKm && item.heartRate
      )

      splits.push({
        kilometer: nextKm / 1000,
        elapsedSec: elapsedAtSplit,
        splitSec: elapsedAtSplit - lastSplitElapsed,
        avgHeartRate: averageRounded(hrSamples.map((item) => item.heartRate).filter((value): value is number => Boolean(value))),
      })

      lastSplitElapsed = elapsedAtSplit
      nextKm += 1000
    }

    previousDistance = sample.distanceMeters
    previousElapsed = sample.elapsedSec
  }

  return splits
}

function haversineDistanceMeters(
  a: Pick<PhoneRunRawSample, 'latitude' | 'longitude'>,
  b: Pick<PhoneRunRawSample, 'latitude' | 'longitude'>
): number {
  const lat1 = degreesToRadians(a.latitude)
  const lat2 = degreesToRadians(b.latitude)
  const deltaLat = degreesToRadians(b.latitude - a.latitude)
  const deltaLon = degreesToRadians(b.longitude - a.longitude)
  const sinLat = Math.sin(deltaLat / 2)
  const sinLon = Math.sin(deltaLon / 2)
  const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon
  return 2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}

function encodePolyline(points: Array<Pick<PhoneRunRawSample, 'latitude' | 'longitude'>>): string {
  let previousLat = 0
  let previousLng = 0
  let result = ''

  for (const point of points) {
    const lat = Math.round(point.latitude * 1e5)
    const lng = Math.round(point.longitude * 1e5)
    result += encodeSignedNumber(lat - previousLat)
    result += encodeSignedNumber(lng - previousLng)
    previousLat = lat
    previousLng = lng
  }

  return result
}

function encodeSignedNumber(value: number): string {
  let sgnNum = value << 1
  if (value < 0) sgnNum = ~sgnNum

  let encoded = ''
  while (sgnNum >= 0x20) {
    encoded += String.fromCharCode((0x20 | (sgnNum & 0x1f)) + 63)
    sgnNum >>= 5
  }
  encoded += String.fromCharCode(sgnNum + 63)
  return encoded
}

function isValidCoordinate(latitude: number, longitude: number): boolean {
  return Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
}

function degreesToRadians(value: number): number {
  return (value * Math.PI) / 180
}

function averageRounded(values: number[]): number | undefined {
  if (values.length === 0) return undefined
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
}

function roundFinite(value: number | undefined, digits: number): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined
  const factor = Math.pow(10, digits)
  return Math.round(value * factor) / factor
}
