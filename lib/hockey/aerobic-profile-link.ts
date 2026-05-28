import { prisma } from '@/lib/prisma'

export interface HockeyAerobicFields {
  clientId: string
  vo2Max?: number | null
  lt1SpeedKmh?: number | null
  lt1HeartRate?: number | null
  lt1Lactate?: number | null
  lt2SpeedKmh?: number | null
  lt2HeartRate?: number | null
  lt2Lactate?: number | null
  maxLactate?: number | null
  maxHeartRate?: number | null
  rampTimeSeconds?: number | null
}

export interface LinkedHockeyAerobicProfile extends Omit<HockeyAerobicFields, 'clientId'> {
  source: 'manual-profile' | 'athlete-profile' | 'lab-test'
  sourceDate: Date | null
}

export interface LabTestForHockeyAerobicFields {
  vo2max?: number | null
  maxHR?: number | null
  maxLactate?: number | null
  postTestMeasurements?: unknown
  aerobicThreshold?: unknown
  anaerobicThreshold?: unknown
  thresholdCalculation?: {
    lt1Intensity: number | null
    lt1Hr: number | null
    lt1Lactate: number | null
    lt2Intensity: number | null
    lt2Hr: number | null
    lt2Lactate: number | null
  } | null
  testStages?: Array<{
    vo2?: number | null
    lactate?: number | null
    heartRate?: number | null
  }>
}

type ThresholdJson = {
  value?: unknown
  speed?: unknown
  speedKmh?: unknown
  hr?: unknown
  heartRate?: unknown
  lactate?: unknown
  unit?: unknown
}

function numberOrNull(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value.replace(',', '.'))
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function intOrNull(value: unknown): number | null {
  const parsed = numberOrNull(value)
  return parsed == null ? null : Math.round(parsed)
}

function thresholdSpeedKmh(threshold: unknown): number | null {
  if (!threshold || typeof threshold !== 'object') return null
  const data = threshold as ThresholdJson
  const unit = typeof data.unit === 'string' ? data.unit.toLowerCase() : ''
  const direct = numberOrNull(data.speedKmh ?? data.speed)
  if (direct != null) return direct
  const value = numberOrNull(data.value)
  if (value == null) return null
  if (!unit || unit.includes('km/h') || unit.includes('kmh')) return value
  return null
}

function thresholdHeartRate(threshold: unknown): number | null {
  if (!threshold || typeof threshold !== 'object') return null
  const data = threshold as ThresholdJson
  return intOrNull(data.heartRate ?? data.hr)
}

function thresholdLactate(threshold: unknown): number | null {
  if (!threshold || typeof threshold !== 'object') return null
  const data = threshold as ThresholdJson
  return numberOrNull(data.lactate)
}

function maxPostTestLactate(measurements: unknown): number | null {
  if (!Array.isArray(measurements)) return null
  const values = measurements
    .map((entry) => entry && typeof entry === 'object' ? numberOrNull((entry as { lactate?: unknown }).lactate) : null)
    .filter((value): value is number => value != null)
  return values.length > 0 ? Math.max(...values) : null
}

function maxNumber(values: Array<number | null | undefined> | undefined): number | null {
  if (!values) return null
  const valid = values.filter((value): value is number => value != null && Number.isFinite(value))
  return valid.length > 0 ? Math.max(...valid) : null
}

export function buildHockeyAerobicFieldsFromLabTest(
  test: LabTestForHockeyAerobicFields
): Omit<HockeyAerobicFields, 'clientId'> {
  const calculation = test.thresholdCalculation
  const lt1 = test.aerobicThreshold
  const lt2 = test.anaerobicThreshold

  return {
    vo2Max: test.vo2max ?? maxNumber(test.testStages?.map((stage) => stage.vo2)) ?? null,
    lt1SpeedKmh: calculation?.lt1Intensity ?? thresholdSpeedKmh(lt1),
    lt1HeartRate: calculation?.lt1Hr != null ? Math.round(calculation.lt1Hr) : thresholdHeartRate(lt1),
    lt1Lactate: calculation?.lt1Lactate ?? thresholdLactate(lt1),
    lt2SpeedKmh: calculation?.lt2Intensity ?? thresholdSpeedKmh(lt2),
    lt2HeartRate: calculation?.lt2Hr != null ? Math.round(calculation.lt2Hr) : thresholdHeartRate(lt2),
    lt2Lactate: calculation?.lt2Lactate ?? thresholdLactate(lt2),
    maxLactate: test.maxLactate
      ?? maxPostTestLactate(test.postTestMeasurements)
      ?? maxNumber(test.testStages?.map((stage) => stage.lactate))
      ?? null,
    maxHeartRate: test.maxHR ?? maxNumber(test.testStages?.map((stage) => stage.heartRate)) ?? null,
    rampTimeSeconds: null,
  }
}

export function hasHockeyAerobicData(fields: Partial<Omit<HockeyAerobicFields, 'clientId'>>): boolean {
  return Object.values(fields).some((value) => value != null)
}

export function applyLinkedHockeyAerobicProfile<T extends HockeyAerobicFields>(
  test: T,
  linked: LinkedHockeyAerobicProfile | null | undefined
): T & { aerobicAutoLinked?: boolean; aerobicAutoLinkSource?: string; aerobicAutoLinkDate?: string | null } {
  if (!linked) return test

  let changed = false
  const output = { ...test } as T & {
    aerobicAutoLinked?: boolean
    aerobicAutoLinkSource?: string
    aerobicAutoLinkDate?: string | null
  }

  const fill = <K extends keyof HockeyAerobicFields>(key: K, value: HockeyAerobicFields[K]) => {
    if (output[key] == null && value != null) {
      output[key] = value as T[K]
      changed = true
    }
  }

  fill('vo2Max', linked.vo2Max)
  fill('lt1SpeedKmh', linked.lt1SpeedKmh)
  fill('lt1HeartRate', linked.lt1HeartRate)
  fill('lt1Lactate', linked.lt1Lactate)
  fill('lt2SpeedKmh', linked.lt2SpeedKmh)
  fill('lt2HeartRate', linked.lt2HeartRate)
  fill('lt2Lactate', linked.lt2Lactate)
  fill('maxLactate', linked.maxLactate)
  fill('maxHeartRate', linked.maxHeartRate)
  fill('rampTimeSeconds', linked.rampTimeSeconds)

  if (changed) {
    output.aerobicAutoLinked = true
    output.aerobicAutoLinkSource = linked.source
    output.aerobicAutoLinkDate = linked.sourceDate?.toISOString().slice(0, 10) ?? null
  }

  return output
}

export async function getLinkedHockeyAerobicProfiles(clientIds: string[]): Promise<Map<string, LinkedHockeyAerobicProfile>> {
  const uniqueIds = [...new Set(clientIds)].filter(Boolean)
  if (uniqueIds.length === 0) return new Map()

  const clients = await prisma.client.findMany({
    where: { id: { in: uniqueIds } },
    select: {
      id: true,
      manualVo2max: true,
      manualMaxHR: true,
      athleteProfile: {
        select: {
          maxLactate: true,
          lt2Speed: true,
          lt2HeartRate: true,
          lactateTestDate: true,
        },
      },
      tests: {
        orderBy: { testDate: 'desc' },
        take: 8,
        select: {
          testDate: true,
          vo2max: true,
          maxHR: true,
          maxLactate: true,
          postTestMeasurements: true,
          aerobicThreshold: true,
          anaerobicThreshold: true,
          thresholdCalculation: {
            select: {
              lt1Intensity: true,
              lt1Hr: true,
              lt1Lactate: true,
              lt2Intensity: true,
              lt2Hr: true,
              lt2Lactate: true,
            },
          },
        },
      },
    },
  })

  const profiles = new Map<string, LinkedHockeyAerobicProfile>()

  for (const client of clients) {
    const latestTest = client.tests.find((test) => (
      test.vo2max != null ||
      test.maxHR != null ||
      test.maxLactate != null ||
      test.aerobicThreshold != null ||
      test.anaerobicThreshold != null ||
      test.thresholdCalculation != null
    ))

    const profile = client.athleteProfile
    const latestTestFields = latestTest
      ? buildHockeyAerobicFieldsFromLabTest(latestTest)
      : null
    const maxLactate = latestTestFields?.maxLactate
      ?? profile?.maxLactate
      ?? null

    const linked: LinkedHockeyAerobicProfile = {
      source: latestTest ? 'lab-test' : profile ? 'athlete-profile' : 'manual-profile',
      sourceDate: latestTest?.testDate ?? profile?.lactateTestDate ?? null,
      vo2Max: latestTestFields?.vo2Max ?? client.manualVo2max ?? null,
      lt1SpeedKmh: latestTestFields?.lt1SpeedKmh ?? null,
      lt1HeartRate: latestTestFields?.lt1HeartRate ?? null,
      lt1Lactate: latestTestFields?.lt1Lactate ?? null,
      lt2SpeedKmh: profile?.lt2Speed ?? latestTestFields?.lt2SpeedKmh ?? null,
      lt2HeartRate: profile?.lt2HeartRate ?? latestTestFields?.lt2HeartRate ?? null,
      lt2Lactate: latestTestFields?.lt2Lactate ?? null,
      maxLactate,
      maxHeartRate: latestTestFields?.maxHeartRate ?? client.manualMaxHR ?? null,
      rampTimeSeconds: null,
    }

    if (Object.entries(linked).some(([key, value]) => key !== 'source' && key !== 'sourceDate' && value != null)) {
      profiles.set(client.id, linked)
    }
  }

  return profiles
}
