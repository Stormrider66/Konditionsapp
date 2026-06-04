import { prisma } from '@/lib/prisma'

export type ExternalAthleteTestKind = 'lab' | 'field' | 'ergometer' | 'hockey' | 'custom'

export interface ExternalAthleteTestMetric {
  label: string
  value: string
}

export interface ExternalAthleteTestSection {
  title: string
  metrics: ExternalAthleteTestMetric[]
}

export interface ExternalAthleteTestItem {
  id: string
  kind: ExternalAthleteTestKind
  title: string
  subtitle: string | null
  date: Date
  status: string | null
  summary: ExternalAthleteTestMetric[]
  sections: ExternalAthleteTestSection[]
  notes: string | null
}

type Locale = 'en' | 'sv'
type LooseRecord = Record<string, unknown>

const TEST_LIMIT_PER_SOURCE = 20
const TEST_ITEM_LIMIT = 40

function text(locale: Locale, en: string, sv: string) {
  return locale === 'sv' ? sv : en
}

function isRecord(value: unknown): value is LooseRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function recordArray(value: unknown): LooseRecord[] {
  return Array.isArray(value) ? value.filter(isRecord) : []
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function numberValue(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function metric(label: string, value: string | number | null | undefined, unit?: string): ExternalAthleteTestMetric | null {
  if (value == null) return null
  const formatted = typeof value === 'number' ? formatNumber(value) : value
  if (!formatted) return null
  return { label, value: unit ? `${formatted} ${unit}` : formatted }
}

function compactMetrics(metrics: Array<ExternalAthleteTestMetric | null | undefined>) {
  return metrics.filter((item): item is ExternalAthleteTestMetric => !!item)
}

function formatNumber(value: number, decimals = Math.abs(value) >= 100 ? 0 : 1) {
  return Number.isInteger(value) ? String(value) : value.toFixed(decimals)
}

function formatPace(secondsPerKm: number | null, locale: Locale) {
  if (secondsPerKm == null || secondsPerKm <= 0) return null
  const minutes = Math.floor(secondsPerKm / 60)
  const seconds = Math.round(secondsPerKm % 60)
  return `${minutes}:${String(seconds).padStart(2, '0')} ${text(locale, 'min/km', 'min/km')}`
}

function formatSeconds(seconds: number | null) {
  if (seconds == null || seconds <= 0) return null
  if (seconds < 60) return `${formatNumber(seconds, 2)} s`
  const minutes = Math.floor(seconds / 60)
  const remainder = Math.round(seconds % 60)
  return `${minutes}:${String(remainder).padStart(2, '0')}`
}

function formatThreshold(value: unknown, locale: Locale) {
  if (!isRecord(value)) return null
  const intensity = numberValue(value.value)
  const hr = numberValue(value.hr)
  const unit = stringValue(value.unit)
  const parts = [
    intensity != null ? `${formatNumber(intensity)}${unit ? ` ${unit}` : ''}` : null,
    hr != null ? `${formatNumber(hr, 0)} ${text(locale, 'bpm', 'slag/min')}` : null,
  ].filter(Boolean)
  return parts.length ? parts.join(' · ') : null
}

function scalarEntries(value: unknown, limit = 6): ExternalAthleteTestMetric[] {
  if (!isRecord(value)) return []
  return Object.entries(value)
    .flatMap(([key, raw]) => {
      const formatted = formatUnknownValue(raw)
      return formatted ? [{ label: humanizeKey(key), value: formatted }] : []
    })
    .slice(0, limit)
}

function formatUnknownValue(value: unknown): string | null {
  if (typeof value === 'number' && Number.isFinite(value)) return formatNumber(value)
  if (typeof value === 'string' && value.trim()) return value.trim()
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (Array.isArray(value)) return value.length ? `${value.length} values` : null
  if (isRecord(value)) return Object.keys(value).length ? `${Object.keys(value).length} values` : null
  return null
}

function humanizeKey(key: string) {
  return key
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function protocolMetricMap(metrics: unknown) {
  return recordArray(metrics).reduce<Map<string, { name: string; unit: string | null }>>((acc, item) => {
    const id = stringValue(item.id)
    if (!id) return acc
    acc.set(id, {
      name: stringValue(item.name) ?? humanizeKey(id),
      unit: stringValue(item.unit),
    })
    return acc
  }, new Map())
}

function numberFromRecord(value: unknown, key: string) {
  return isRecord(value) ? numberValue(value[key]) : null
}

function labTestTitle(testType: string, locale: Locale) {
  if (testType === 'RUNNING') return text(locale, 'Running lab test', 'Labbtest löpning')
  if (testType === 'CYCLING') return text(locale, 'Cycling lab test', 'Labbtest cykel')
  if (testType === 'SKIING') return text(locale, 'Ski lab test', 'Labbtest skidor')
  return text(locale, 'Lab test', 'Labbtest')
}

function buildLabTestItem(test: Awaited<ReturnType<typeof fetchLabTests>>[number], locale: Locale): ExternalAthleteTestItem {
  const summary = compactMetrics([
    metric('VO2max', test.vo2max, 'ml/kg/min'),
    metric(text(locale, 'Max HR', 'Maxpuls'), test.maxHR, text(locale, 'bpm', 'slag/min')),
    metric(text(locale, 'Max lactate', 'Maxlaktat'), test.maxLactate, 'mmol/L'),
    metric('LT1', formatThreshold(test.aerobicThreshold, locale)),
    metric('LT2', formatThreshold(test.anaerobicThreshold, locale)),
  ]).slice(0, 5)

  const baseline = compactMetrics([
    metric(text(locale, 'Resting lactate', 'Vilolaktat'), test.restingLactate, 'mmol/L'),
    metric(text(locale, 'Resting HR', 'Vilopuls'), test.restingHeartRate, text(locale, 'bpm', 'slag/min')),
    metric(text(locale, 'Manual LT1 lactate', 'Manuell LT1-laktat'), test.manualLT1Lactate, 'mmol/L'),
    metric(text(locale, 'Manual LT1 intensity', 'Manuell LT1-intensitet'), test.manualLT1Intensity),
    metric(text(locale, 'Manual LT2 lactate', 'Manuell LT2-laktat'), test.manualLT2Lactate, 'mmol/L'),
    metric(text(locale, 'Manual LT2 intensity', 'Manuell LT2-intensitet'), test.manualLT2Intensity),
  ])

  const stages = test.testStages.slice(0, 8).map((stage) => ({
    label: `${text(locale, 'Stage', 'Steg')} ${stage.sequence}`,
    value: [
      stage.speed != null ? `${formatNumber(stage.speed)} km/h` : null,
      stage.power != null ? `${formatNumber(stage.power, 0)} W` : null,
      stage.pace != null ? `${formatNumber(stage.pace)} min/km` : null,
      `${stage.heartRate} ${text(locale, 'bpm', 'slag/min')}`,
      `${formatNumber(stage.lactate)} mmol/L`,
      stage.vo2 != null ? `VO2 ${formatNumber(stage.vo2)}` : null,
    ].filter(Boolean).join(' · '),
  }))

  return {
    id: `lab:${test.id}`,
    kind: 'lab',
    title: labTestTitle(test.testType, locale),
    subtitle: test.testLocation?.name ?? test.location ?? test.tester?.name ?? test.testLeader ?? null,
    date: test.testDate,
    status: test.status,
    summary,
    sections: [
      { title: text(locale, 'Key values', 'Nyckelvärden'), metrics: summary },
      { title: text(locale, 'Baseline and overrides', 'Baslinje och manuella värden'), metrics: baseline },
      { title: text(locale, 'Stages', 'Steg'), metrics: stages },
    ].filter((section) => section.metrics.length > 0),
    notes: test.notes,
  }
}

function buildFieldTestItem(test: Awaited<ReturnType<typeof fetchFieldTests>>[number], locale: Locale): ExternalAthleteTestItem {
  const summary = compactMetrics([
    metric('LT1', formatPace(test.lt1Pace, locale)),
    metric(text(locale, 'LT1 HR', 'LT1 puls'), test.lt1HR, text(locale, 'bpm', 'slag/min')),
    metric('LT2', formatPace(test.lt2Pace, locale)),
    metric(text(locale, 'LT2 HR', 'LT2 puls'), test.lt2HR, text(locale, 'bpm', 'slag/min')),
    metric(text(locale, 'Confidence', 'Säkerhet'), test.confidence),
  ])

  return {
    id: `field:${test.id}`,
    kind: 'field',
    title: humanizeKey(test.testType),
    subtitle: text(locale, 'Field test', 'Fälttest'),
    date: test.date,
    status: test.valid ? text(locale, 'Valid', 'Giltigt') : text(locale, 'Invalid', 'Ogiltigt'),
    summary,
    sections: [
      { title: text(locale, 'Thresholds', 'Trösklar'), metrics: summary },
      { title: text(locale, 'Result details', 'Resultatdetaljer'), metrics: scalarEntries(test.results) },
    ].filter((section) => section.metrics.length > 0),
    notes: test.notes,
  }
}

function buildErgometerItem(test: Awaited<ReturnType<typeof fetchErgometerTests>>[number], locale: Locale): ExternalAthleteTestItem {
  const summary = compactMetrics([
    metric(text(locale, 'Peak power', 'Peak power'), test.peakPower, 'W'),
    metric(text(locale, 'Average power', 'Snitteffekt'), test.avgPower, 'W'),
    metric(text(locale, 'Critical power', 'Critical power'), test.criticalPower, 'W'),
    metric("W'", test.wPrimeKJ, 'kJ'),
    metric(text(locale, 'Average pace', 'Snittpace'), test.avgPace != null ? `${formatNumber(test.avgPace)} s/500m` : null),
    metric(text(locale, 'Max HR', 'Maxpuls'), test.maxHR, text(locale, 'bpm', 'slag/min')),
  ])

  const details = compactMetrics([
    metric(text(locale, 'Total distance', 'Total distans'), test.totalDistance, 'm'),
    metric(text(locale, 'Total time', 'Total tid'), formatSeconds(test.totalTime)),
    metric(text(locale, 'Calories', 'Kalorier'), test.totalCalories, 'cal'),
    metric(text(locale, 'Stroke rate', 'Frekvens'), test.strokeRate),
    metric(text(locale, 'Model fit', 'Modellpassning'), test.modelFit),
    metric(text(locale, 'Confidence', 'Säkerhet'), test.confidence),
    metric('RPE', test.rpe),
  ])

  return {
    id: `ergometer:${test.id}`,
    kind: 'ergometer',
    title: `${humanizeKey(test.ergometerType)} · ${humanizeKey(test.testProtocol)}`,
    subtitle: text(locale, 'Ergometer test', 'Ergometertest'),
    date: test.testDate,
    status: test.valid ? text(locale, 'Valid', 'Giltigt') : text(locale, 'Invalid', 'Ogiltigt'),
    summary,
    sections: [
      { title: text(locale, 'Power and threshold', 'Effekt och tröskel'), metrics: summary },
      { title: text(locale, 'Execution', 'Genomförande'), metrics: details },
    ].filter((section) => section.metrics.length > 0),
    notes: test.notes,
  }
}

function buildHockeyItem(test: Awaited<ReturnType<typeof fetchHockeyTests>>[number], locale: Locale): ExternalAthleteTestItem {
  const speed = compactMetrics([
    metric('5 m', test.sprint5m, 's'),
    metric('10 m', test.sprint10m, 's'),
    metric('20 m', test.sprint20m, 's'),
    metric('30 m', test.sprint30m, 's'),
    metric('505 left', test.agility505Left, 's'),
    metric('505 right', test.agility505Right, 's'),
  ])
  const strength = compactMetrics([
    metric(text(locale, 'Back squat', 'Knäböj'), test.backSquat1RM, 'kg'),
    metric(text(locale, 'Power clean', 'Power clean'), test.powerClean1RM, 'kg'),
    metric(text(locale, 'Bench press', 'Bänkpress'), test.benchPress1RM, 'kg'),
    metric(text(locale, 'Pull-up', 'Chins'), test.pullUp1RM, 'kg'),
  ])
  const endurancePower = compactMetrics([
    metric('VO2max', test.vo2Max, 'ml/kg/min'),
    metric('LT1', test.lt1SpeedKmh, 'km/h'),
    metric(text(locale, 'LT1 HR', 'LT1 puls'), test.lt1HeartRate, text(locale, 'bpm', 'slag/min')),
    metric('LT2', test.lt2SpeedKmh, 'km/h'),
    metric(text(locale, 'LT2 HR', 'LT2 puls'), test.lt2HeartRate, text(locale, 'bpm', 'slag/min')),
    metric(text(locale, 'Wingate average', 'Wingate snitt'), test.wingate30sAveragePower, 'W'),
    metric('MuscleLab W/kg', numberFromRecord(test.muscleLabMaxima, 'maxAveragePowerPerBodyMass'), 'W/kg'),
  ])
  const jumpGrip = compactMetrics([
    metric(text(locale, 'Standing long jump', 'Stående längdhopp'), test.standingLongJump, 'cm'),
    metric(text(locale, 'Three jump left', 'Tre hopp vänster'), test.threeJumpLeft, 'cm'),
    metric(text(locale, 'Three jump right', 'Tre hopp höger'), test.threeJumpRight, 'cm'),
    metric(text(locale, 'Grip left', 'Grip vänster'), test.gripStrengthLeft, 'kg'),
    metric(text(locale, 'Grip right', 'Grip höger'), test.gripStrengthRight, 'kg'),
  ])
  const summary = [...speed.slice(0, 2), ...strength.slice(0, 2), ...endurancePower.slice(0, 2)].slice(0, 6)

  return {
    id: `hockey:${test.id}`,
    kind: 'hockey',
    title: text(locale, 'Hockey physical test', 'Hockey fysprov'),
    subtitle: test.team?.name ?? test.sourceType,
    date: test.testDate,
    status: null,
    summary,
    sections: [
      { title: text(locale, 'Speed and agility', 'Sprint och agility'), metrics: speed },
      { title: text(locale, 'Strength', 'Styrka'), metrics: strength },
      { title: text(locale, 'Aerobic and power', 'Kondition och power'), metrics: endurancePower },
      { title: text(locale, 'Jump and grip', 'Hopp och grip'), metrics: jumpGrip },
    ].filter((section) => section.metrics.length > 0),
    notes: test.notes,
  }
}

function buildCustomItem(test: Awaited<ReturnType<typeof fetchCustomTests>>[number], locale: Locale): ExternalAthleteTestItem {
  const metricDefinitions = protocolMetricMap(test.protocol.metrics)
  const values = isRecord(test.values)
    ? Object.entries(test.values).flatMap(([key, raw]) => {
        const formatted = formatUnknownValue(raw)
        if (!formatted) return []
        const definition = metricDefinitions.get(key)
        return [{
          label: definition?.name ?? humanizeKey(key),
          value: definition?.unit ? `${formatted} ${definition.unit}` : formatted,
        }]
      })
    : []

  return {
    id: `custom:${test.id}`,
    kind: 'custom',
    title: test.protocol.name,
    subtitle: test.protocol.sportType ?? text(locale, 'Custom test', 'Anpassat test'),
    date: test.testDate,
    status: null,
    summary: values.slice(0, 6),
    sections: [{ title: text(locale, 'Values', 'Värden'), metrics: values }],
    notes: test.notes,
  }
}

async function fetchLabTests(clientId: string) {
  return prisma.test.findMany({
    where: { clientId, status: { not: 'DRAFT' } },
    take: TEST_LIMIT_PER_SOURCE,
    orderBy: { testDate: 'desc' },
    select: {
      id: true,
      testDate: true,
      testType: true,
      status: true,
      location: true,
      testLeader: true,
      restingLactate: true,
      restingHeartRate: true,
      maxHR: true,
      maxLactate: true,
      vo2max: true,
      aerobicThreshold: true,
      anaerobicThreshold: true,
      manualLT1Lactate: true,
      manualLT1Intensity: true,
      manualLT2Lactate: true,
      manualLT2Intensity: true,
      notes: true,
      tester: { select: { name: true } },
      testLocation: { select: { name: true } },
      testStages: {
        orderBy: { sequence: 'asc' },
        select: {
          sequence: true,
          duration: true,
          heartRate: true,
          lactate: true,
          vo2: true,
          speed: true,
          power: true,
          pace: true,
        },
      },
    },
  })
}

async function fetchFieldTests(clientId: string) {
  return prisma.fieldTest.findMany({
    where: { clientId },
    take: TEST_LIMIT_PER_SOURCE,
    orderBy: { date: 'desc' },
    select: {
      id: true,
      testType: true,
      date: true,
      results: true,
      lt1Pace: true,
      lt1HR: true,
      lt2Pace: true,
      lt2HR: true,
      confidence: true,
      valid: true,
      notes: true,
    },
  })
}

async function fetchErgometerTests(clientId: string) {
  return prisma.ergometerFieldTest.findMany({
    where: { clientId },
    take: TEST_LIMIT_PER_SOURCE,
    orderBy: { testDate: 'desc' },
    select: {
      id: true,
      ergometerType: true,
      testProtocol: true,
      testDate: true,
      peakPower: true,
      avgPower: true,
      criticalPower: true,
      wPrimeKJ: true,
      avgPace: true,
      totalDistance: true,
      totalTime: true,
      totalCalories: true,
      strokeRate: true,
      maxHR: true,
      confidence: true,
      modelFit: true,
      valid: true,
      notes: true,
      rpe: true,
    },
  })
}

async function fetchHockeyTests(clientId: string) {
  return prisma.hockeyPhysicalTest.findMany({
    where: { clientId },
    take: TEST_LIMIT_PER_SOURCE,
    orderBy: { testDate: 'desc' },
    select: {
      id: true,
      testDate: true,
      notes: true,
      sourceType: true,
      team: { select: { name: true } },
      agility505Left: true,
      agility505Right: true,
      sprint5m: true,
      sprint10m: true,
      sprint20m: true,
      sprint30m: true,
      gripStrengthLeft: true,
      gripStrengthRight: true,
      standingLongJump: true,
      threeJumpLeft: true,
      threeJumpRight: true,
      beepTestLevel: true,
      beepTestShuttle: true,
      wingate30sAveragePower: true,
      vo2Max: true,
      lt1SpeedKmh: true,
      lt1HeartRate: true,
      lt2SpeedKmh: true,
      lt2HeartRate: true,
      backSquat1RM: true,
      powerClean1RM: true,
      benchPress1RM: true,
      pullUp1RM: true,
      muscleLabMaxima: true,
    },
  })
}

async function fetchCustomTests(clientId: string) {
  return prisma.customTestResult.findMany({
    where: { clientId },
    take: TEST_LIMIT_PER_SOURCE,
    orderBy: { testDate: 'desc' },
    select: {
      id: true,
      testDate: true,
      values: true,
      notes: true,
      protocol: {
        select: {
          name: true,
          sportType: true,
          metrics: true,
        },
      },
    },
  })
}

export async function getExternalAthleteTestItems({
  athleteClientId,
  locale,
}: {
  athleteClientId: string
  locale: Locale
}) {
  const [labTests, fieldTests, ergometerTests, hockeyTests, customTests] = await Promise.all([
    fetchLabTests(athleteClientId),
    fetchFieldTests(athleteClientId),
    fetchErgometerTests(athleteClientId),
    fetchHockeyTests(athleteClientId),
    fetchCustomTests(athleteClientId),
  ])

  return [
    ...labTests.map((test) => buildLabTestItem(test, locale)),
    ...fieldTests.map((test) => buildFieldTestItem(test, locale)),
    ...ergometerTests.map((test) => buildErgometerItem(test, locale)),
    ...hockeyTests.map((test) => buildHockeyItem(test, locale)),
    ...customTests.map((test) => buildCustomItem(test, locale)),
  ]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, TEST_ITEM_LIMIT)
}
