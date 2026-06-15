import type { MachineKind, WattbikeSample } from '@/lib/integrations/wattbike/types'

export type QuickErgMachineType =
  | 'CONCEPT2_ROW'
  | 'CONCEPT2_SKIERG'
  | 'CONCEPT2_BIKEERG'
  | 'WATTBIKE'
  | 'ASSAULT_BIKE'
  | 'FTMS_BIKE'
  | 'FTMS_AIRBIKE'
  | 'UNKNOWN'

export type QuickErgSource =
  | 'BLUETOOTH_FTMS'
  | 'BLUETOOTH_PM5'
  | 'BLUETOOTH_CPS'
  | 'MANUAL_IMPORT'

export interface QuickErgSample {
  elapsedSec: number
  power?: number
  cadence?: number
  speed?: number
  distanceMeters?: number
  heartRate?: number
  pace500m?: number
  strokeRate?: number
  strokeCount?: number
  calories?: number
}

export interface QuickErgBestEffort {
  type: 'power' | 'pace'
  label: string
  value: number
  unit: 'W' | 'sec'
  startSec: number
  endSec: number
  durationSec?: number
  distanceMeters?: number
}

export interface QuickErgDetectedInterval {
  index: number
  startSec: number
  endSec: number
  durationSec: number
  avgPower?: number
  maxPower?: number
  distanceMeters?: number
  calories?: number
  restAfterSec?: number
}

export interface QuickErgSessionSummary {
  durationSec: number
  distanceMeters?: number
  calories?: number
  avgPower?: number
  maxPower?: number
  normalizedPower?: number
  avgHeartRate?: number
  maxHeartRate?: number
  avgCadence?: number
  maxCadence?: number
  avgStrokeRate?: number
  maxStrokeRate?: number
  avgPace500m?: number
  avgSpeed?: number
  movingSec: number
  sampleCount: number
}

export interface QuickErgSessionAnalysis {
  samples: QuickErgSample[]
  summary: QuickErgSessionSummary
  bestEfforts: QuickErgBestEffort[]
  detectedIntervals: QuickErgDetectedInterval[]
}

const POWER_WINDOWS = [6, 30, 60, 180, 300, 600, 1200]
const DISTANCE_TARGETS = [500, 1000, 2000, 5000]

function isNum(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function mean(values: number[]): number | undefined {
  return values.length > 0
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : undefined
}

function roundedMean(values: number[]): number | undefined {
  const value = mean(values)
  return value === undefined ? undefined : Math.round(value)
}

function roundedMeanOneDecimal(values: number[]): number | undefined {
  const value = mean(values)
  return value === undefined ? undefined : Math.round(value * 10) / 10
}

function max(values: number[]): number | undefined {
  return values.length > 0 ? Math.max(...values) : undefined
}

function lastDefined<T>(values: Array<T | undefined>): T | undefined {
  for (let i = values.length - 1; i >= 0; i--) {
    if (values[i] !== undefined) return values[i]
  }
  return undefined
}

function bestAverageWindow(values: number[], windowSec: number): { value: number; startSec: number } | null {
  if (values.length < windowSec) return null

  let sum = 0
  for (let i = 0; i < windowSec; i++) sum += values[i]

  let best = sum
  let bestStart = 0

  for (let i = windowSec; i < values.length; i++) {
    sum += values[i] - values[i - windowSec]
    if (sum > best) {
      best = sum
      bestStart = i - windowSec + 1
    }
  }

  return {
    value: Math.round(best / windowSec),
    startSec: bestStart,
  }
}

function normalizedPower(power: number[]): number | undefined {
  if (power.length < 30) return undefined

  const rolling: number[] = []
  let sum = 0

  for (let i = 0; i < power.length; i++) {
    sum += power[i]
    if (i >= 30) sum -= power[i - 30]
    if (i >= 29) rolling.push(sum / 30)
  }

  const meanFourthPower = mean(rolling.map((value) => value ** 4))
  return meanFourthPower === undefined ? undefined : Math.round(meanFourthPower ** 0.25)
}

function sampleIsMoving(sample: QuickErgSample, previous?: QuickErgSample): boolean {
  if ((sample.power ?? 0) >= 20) return true
  if ((sample.cadence ?? 0) >= 5) return true
  if ((sample.strokeRate ?? 0) >= 5) return true
  if ((sample.speed ?? 0) >= 1) return true

  if (isNum(sample.distanceMeters) && isNum(previous?.distanceMeters)) {
    return sample.distanceMeters - previous.distanceMeters > 0.5
  }

  return false
}

function summarizeInterval(samples: QuickErgSample[], index: number): QuickErgDetectedInterval {
  const first = samples[0]
  const last = samples[samples.length - 1]
  const power = samples.map((sample) => sample.power).filter(isNum)
  const caloriesStart = first.calories
  const caloriesEnd = last.calories
  const distanceStart = first.distanceMeters
  const distanceEnd = last.distanceMeters

  return {
    index,
    startSec: first.elapsedSec,
    endSec: last.elapsedSec,
    durationSec: Math.max(1, last.elapsedSec - first.elapsedSec + 1),
    avgPower: roundedMean(power),
    maxPower: max(power),
    distanceMeters:
      isNum(distanceStart) && isNum(distanceEnd)
        ? Math.max(0, Math.round(distanceEnd - distanceStart))
        : undefined,
    calories:
      isNum(caloriesStart) && isNum(caloriesEnd)
        ? Math.max(0, caloriesEnd - caloriesStart)
        : undefined,
  }
}

export function compactBluetoothSamples(samples: WattbikeSample[]): QuickErgSample[] {
  if (samples.length === 0) return []

  const sorted = [...samples].sort((a, b) => a.t - b.t)
  const t0 = sorted[0].t
  const seconds = Math.floor((sorted[sorted.length - 1].t - t0) / 1000) + 1

  const bySecond: WattbikeSample[][] = Array.from({ length: seconds }, () => [])
  for (const sample of sorted) {
    const index = Math.max(0, Math.min(seconds - 1, Math.floor((sample.t - t0) / 1000)))
    bySecond[index].push(sample)
  }

  const state: Omit<QuickErgSample, 'elapsedSec'> = {}
  const compact: QuickErgSample[] = []

  bySecond.forEach((bucket, elapsedSec) => {
    for (const sample of bucket) {
      if (isNum(sample.power)) state.power = Math.round(sample.power)
      if (isNum(sample.cadence)) state.cadence = Math.round(sample.cadence)
      if (isNum(sample.speed)) state.speed = Math.round(sample.speed * 10) / 10
      if (isNum(sample.distance)) state.distanceMeters = Math.round(sample.distance)
      if (isNum(sample.heartRate)) state.heartRate = Math.round(sample.heartRate)
      if (isNum(sample.pace)) state.pace500m = Math.round(sample.pace)
      if (isNum(sample.strokeRate)) state.strokeRate = Math.round(sample.strokeRate)
      if (isNum(sample.strokeCount)) state.strokeCount = Math.round(sample.strokeCount)
      if (isNum(sample.calories)) state.calories = Math.round(sample.calories)
    }

    compact.push({ elapsedSec, ...state })
  })

  return compact
}

function findBestDistanceEffort(samples: QuickErgSample[], targetMeters: number): QuickErgBestEffort | null {
  const withDistance = samples.filter((sample) => isNum(sample.distanceMeters))
  if (withDistance.length < 2) return null

  let best: QuickErgBestEffort | null = null

  for (let startIndex = 0; startIndex < withDistance.length; startIndex++) {
    const start = withDistance[startIndex]
    const startDistance = start.distanceMeters
    if (!isNum(startDistance)) continue

    const target = startDistance + targetMeters
    for (let endIndex = startIndex + 1; endIndex < withDistance.length; endIndex++) {
      const end = withDistance[endIndex]
      if (!isNum(end.distanceMeters) || end.distanceMeters < target) continue

      const durationSec = Math.max(1, end.elapsedSec - start.elapsedSec)
      if (!best || durationSec < best.value) {
        best = {
          type: 'pace',
          label: `${targetMeters}m`,
          value: durationSec,
          unit: 'sec',
          startSec: start.elapsedSec,
          endSec: end.elapsedSec,
          distanceMeters: targetMeters,
        }
      }
      break
    }
  }

  return best
}

function detectIntervals(samples: QuickErgSample[]): QuickErgDetectedInterval[] {
  const intervals: QuickErgDetectedInterval[] = []
  let current: QuickErgSample[] = []
  let restStart: number | null = null

  samples.forEach((sample, index) => {
    const moving = sampleIsMoving(sample, samples[index - 1])

    if (moving) {
      if (current.length === 0 && restStart !== null && intervals.length > 0) {
        const previous = intervals[intervals.length - 1]
        previous.restAfterSec = Math.max(0, sample.elapsedSec - restStart)
      }
      restStart = null
      current.push(sample)
      return
    }

    if (current.length >= 10) {
      intervals.push(summarizeInterval(current, intervals.length + 1))
      restStart = sample.elapsedSec
    }
    current = []
  })

  if (current.length >= 10) {
    intervals.push(summarizeInterval(current, intervals.length + 1))
  }

  return intervals
}

export function buildQuickErgSessionAnalysis(samples: QuickErgSample[]): QuickErgSessionAnalysis {
  const sorted = [...samples].sort((a, b) => a.elapsedSec - b.elapsedSec)
  const power = sorted.map((sample) => sample.power).filter(isNum)
  const heartRate = sorted.map((sample) => sample.heartRate).filter(isNum)
  const cadence = sorted.map((sample) => sample.cadence).filter(isNum)
  const strokeRate = sorted.map((sample) => sample.strokeRate).filter(isNum)
  const pace = sorted.map((sample) => sample.pace500m).filter((value): value is number => isNum(value) && value > 0)
  const speed = sorted.map((sample) => sample.speed).filter(isNum)
  const distanceMeters = lastDefined(sorted.map((sample) => sample.distanceMeters))
  const calories = lastDefined(sorted.map((sample) => sample.calories))
  const durationSec = sorted.length > 0 ? sorted[sorted.length - 1].elapsedSec + 1 : 0
  const movingSec = sorted.filter((sample, index) => sampleIsMoving(sample, sorted[index - 1])).length

  const summary: QuickErgSessionSummary = {
    durationSec,
    distanceMeters,
    calories,
    avgPower: roundedMean(power),
    maxPower: max(power),
    normalizedPower: normalizedPower(power),
    avgHeartRate: roundedMean(heartRate),
    maxHeartRate: max(heartRate),
    avgCadence: roundedMeanOneDecimal(cadence),
    maxCadence: max(cadence),
    avgStrokeRate: roundedMeanOneDecimal(strokeRate),
    maxStrokeRate: max(strokeRate),
    avgPace500m:
      isNum(distanceMeters) && distanceMeters > 0 && durationSec > 0
        ? Math.round((durationSec / distanceMeters) * 500)
        : roundedMean(pace),
    avgSpeed: roundedMeanOneDecimal(speed),
    movingSec,
    sampleCount: sorted.length,
  }

  const bestEfforts: QuickErgBestEffort[] = []
  for (const windowSec of POWER_WINDOWS) {
    const best = bestAverageWindow(power, windowSec)
    if (!best) continue
    bestEfforts.push({
      type: 'power',
      label: `${windowSec}s`,
      value: best.value,
      unit: 'W',
      startSec: best.startSec,
      endSec: best.startSec + windowSec - 1,
      durationSec: windowSec,
    })
  }

  for (const targetMeters of DISTANCE_TARGETS) {
    const best = findBestDistanceEffort(sorted, targetMeters)
    if (best) bestEfforts.push(best)
  }

  return {
    samples: sorted,
    summary,
    bestEfforts,
    detectedIntervals: detectIntervals(sorted),
  }
}

export function buildQuickErgAnalysisFromBluetooth(samples: WattbikeSample[]): QuickErgSessionAnalysis {
  return buildQuickErgSessionAnalysis(compactBluetoothSamples(samples))
}

export function inferQuickErgSource(samples: WattbikeSample[]): QuickErgSource {
  if (samples.some((sample) => sample.source === 'pm5')) return 'BLUETOOTH_PM5'
  if (samples.some((sample) => sample.source === 'cps')) return 'BLUETOOTH_CPS'
  return 'BLUETOOTH_FTMS'
}

export function inferActivityType(machineType: QuickErgMachineType): string {
  switch (machineType) {
    case 'CONCEPT2_ROW':
      return 'ROWING'
    case 'CONCEPT2_SKIERG':
      return 'SKIING'
    case 'CONCEPT2_BIKEERG':
    case 'WATTBIKE':
    case 'ASSAULT_BIKE':
    case 'FTMS_BIKE':
    case 'FTMS_AIRBIKE':
      return 'CYCLING'
    default:
      return 'OTHER'
  }
}

export function inferQuickErgMachineTypeFromDevice(params: {
  currentMachineType?: QuickErgMachineType
  machineKind?: MachineKind | null
  deviceName?: string | null
}): QuickErgMachineType | null {
  const current = params.currentMachineType
  const deviceName = (params.deviceName ?? '').toLowerCase()

  if (params.machineKind === 'bike') {
    if (
      deviceName.includes('pm5') ||
      deviceName.includes('bikeerg') ||
      deviceName.includes('concept2')
    ) {
      return 'CONCEPT2_BIKEERG'
    }

    if (deviceName.includes('wattbike')) return 'WATTBIKE'
    if (deviceName.includes('air') || deviceName.includes('assault') || deviceName.includes('echo')) {
      return 'FTMS_AIRBIKE'
    }

    if (
      current === 'CONCEPT2_BIKEERG' ||
      current === 'WATTBIKE' ||
      current === 'ASSAULT_BIKE' ||
      current === 'FTMS_BIKE' ||
      current === 'FTMS_AIRBIKE'
    ) {
      return current
    }

    return 'FTMS_BIKE'
  }

  if (params.machineKind === 'rower') {
    if (deviceName.includes('skierg')) return 'CONCEPT2_SKIERG'

    if (current === 'CONCEPT2_ROW' || current === 'CONCEPT2_SKIERG') {
      return current
    }

    return 'CONCEPT2_ROW'
  }

  return null
}

export function formatMachineName(machineType: QuickErgMachineType): string {
  switch (machineType) {
    case 'CONCEPT2_ROW':
      return 'RowErg'
    case 'CONCEPT2_SKIERG':
      return 'SkiErg'
    case 'CONCEPT2_BIKEERG':
      return 'BikeErg'
    case 'WATTBIKE':
      return 'Wattbike'
    case 'ASSAULT_BIKE':
      return 'AirBike'
    case 'FTMS_BIKE':
      return 'Bluetooth bike'
    case 'FTMS_AIRBIKE':
      return 'Bluetooth airbike'
    default:
      return 'Erg session'
  }
}

export function estimateQuickErgTrainingLoad(summary: QuickErgSessionSummary, rpe?: number): number {
  const durationMinutes = summary.durationSec / 60
  const rpeValue = rpe ?? 6
  return Math.max(1, Math.round(durationMinutes * (rpeValue / 10)))
}

export function mapRpeToIntensity(rpe?: number): string {
  const value = rpe ?? 6
  if (value <= 3) return 'EASY'
  if (value <= 5) return 'MODERATE'
  if (value <= 7) return 'HARD'
  return 'VERY_HARD'
}

export function buildQuickErgDedupeKey(params: {
  clientId: string
  machineType: QuickErgMachineType
  startedAt: Date
  summary: Pick<QuickErgSessionSummary, 'durationSec' | 'distanceMeters'>
}): string {
  const startSecond = Math.round(params.startedAt.getTime() / 1000)
  const distanceBucket = params.summary.distanceMeters
    ? Math.round(params.summary.distanceMeters / 10) * 10
    : 0

  return [
    'quickerg',
    params.clientId,
    params.machineType,
    startSecond,
    params.summary.durationSec,
    distanceBucket,
  ].join(':')
}
