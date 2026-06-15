import {
  formatMachineName,
  type QuickErgBestEffort,
  type QuickErgMachineType,
} from '@/lib/quick-erg/session-summary'

export type QuickErgRecordCategory = 'power' | 'pace' | 'session' | 'milestone'
export type QuickErgRecordUnit = 'W' | 'sec' | 'm' | 'score'
export type QuickErgRecordCompare = 'higher' | 'lower'

export interface QuickErgProgressSession {
  id: string
  machineType: QuickErgMachineType
  startedAt: Date | string
  durationSec: number
  distanceMeters?: number | null
  avgPower?: number | null
  maxPower?: number | null
  normalizedPower?: number | null
  bestEfforts?: QuickErgBestEffort[] | null
}

export interface QuickErgRecordDefinition {
  key: string
  label: string
  category: QuickErgRecordCategory
  unit: QuickErgRecordUnit
  compare: QuickErgRecordCompare
  priority: number
}

export interface QuickErgPersonalBest extends QuickErgRecordDefinition {
  value: number
  machineType: QuickErgMachineType
  machineName: string
  sessionId: string
  startedAt: string
  previousValue?: number
}

const POWER_PR_TARGETS = [30, 60, 300, 600, 1200] as const
const DISTANCE_PR_TARGETS = [500, 1000, 2000, 5000] as const

const SESSION_RECORD_DEFINITIONS: QuickErgRecordDefinition[] = [
  {
    key: 'avg_power',
    label: 'Avg power',
    category: 'session',
    unit: 'W',
    compare: 'higher',
    priority: 30,
  },
  {
    key: 'normalized_power',
    label: 'Normalized power',
    category: 'session',
    unit: 'W',
    compare: 'higher',
    priority: 31,
  },
  {
    key: 'max_power',
    label: 'Max power',
    category: 'session',
    unit: 'W',
    compare: 'higher',
    priority: 32,
  },
  {
    key: 'longest_duration',
    label: 'Longest session',
    category: 'session',
    unit: 'sec',
    compare: 'higher',
    priority: 40,
  },
  {
    key: 'longest_distance',
    label: 'Longest distance',
    category: 'session',
    unit: 'm',
    compare: 'higher',
    priority: 41,
  },
]

export const QUICK_ERG_RECORD_DEFINITIONS: QuickErgRecordDefinition[] = [
  ...POWER_PR_TARGETS.map((durationSec, index) => ({
    key: powerRecordKey(durationSec),
    label: powerRecordLabel(durationSec),
    category: 'power' as const,
    unit: 'W' as const,
    compare: 'higher' as const,
    priority: 10 + index,
  })),
  ...DISTANCE_PR_TARGETS.map((distanceMeters, index) => ({
    key: paceRecordKey(distanceMeters),
    label: paceRecordLabel(distanceMeters),
    category: 'pace' as const,
    unit: 'sec' as const,
    compare: 'lower' as const,
    priority: 20 + index,
  })),
  ...SESSION_RECORD_DEFINITIONS,
]

const RECORD_DEFINITION_BY_KEY = new Map(
  QUICK_ERG_RECORD_DEFINITIONS.map((definition) => [definition.key, definition])
)

const MACHINE_ORDER: QuickErgMachineType[] = [
  'CONCEPT2_ROW',
  'CONCEPT2_SKIERG',
  'CONCEPT2_BIKEERG',
  'WATTBIKE',
  'ASSAULT_BIKE',
  'FTMS_BIKE',
  'FTMS_AIRBIKE',
  'UNKNOWN',
]

function powerRecordKey(durationSec: number): string {
  return `power_${durationSec}s`
}

function paceRecordKey(distanceMeters: number): string {
  return `pace_${distanceMeters}m`
}

function powerRecordLabel(durationSec: number): string {
  if (durationSec < 60) return `${durationSec} sec power`
  return `${Math.round(durationSec / 60)} min power`
}

function paceRecordLabel(distanceMeters: number): string {
  if (distanceMeters >= 1000) return `${distanceMeters / 1000}k pace`
  return `${distanceMeters}m pace`
}

function isNum(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value
}

function startedAtTime(value: Date | string): number {
  return new Date(value).getTime()
}

function effortDurationSec(effort: QuickErgBestEffort): number | null {
  if (isNum(effort.durationSec)) return effort.durationSec
  const match = effort.label.match(/^(\d+)s$/)
  return match ? Number(match[1]) : null
}

function effortDistanceMeters(effort: QuickErgBestEffort): number | null {
  if (isNum(effort.distanceMeters)) return effort.distanceMeters
  const match = effort.label.match(/^(\d+)m$/)
  return match ? Number(match[1]) : null
}

function makeRecord(
  session: QuickErgProgressSession,
  definition: QuickErgRecordDefinition,
  value: number,
  previousValue?: number
): QuickErgPersonalBest {
  return {
    ...definition,
    value,
    machineType: session.machineType,
    machineName: formatMachineName(session.machineType),
    sessionId: session.id,
    startedAt: toIsoString(session.startedAt),
    previousValue,
  }
}

export function isBetterQuickErgRecord(
  candidate: Pick<QuickErgPersonalBest, 'value' | 'compare'>,
  current: Pick<QuickErgPersonalBest, 'value' | 'compare'>
): boolean {
  if (candidate.compare === 'lower') return candidate.value < current.value
  return candidate.value > current.value
}

export function getQuickErgRecordDefinition(key: string): QuickErgRecordDefinition | undefined {
  return RECORD_DEFINITION_BY_KEY.get(key)
}

export function extractQuickErgRecordsFromSession(session: QuickErgProgressSession): QuickErgPersonalBest[] {
  const records: QuickErgPersonalBest[] = []
  const efforts = session.bestEfforts ?? []

  for (const durationSec of POWER_PR_TARGETS) {
    const definition = RECORD_DEFINITION_BY_KEY.get(powerRecordKey(durationSec))
    if (!definition) continue

    const bestPower = efforts
      .filter((effort) => effort.type === 'power' && effort.unit === 'W' && effortDurationSec(effort) === durationSec)
      .map((effort) => effort.value)
      .filter(isNum)
      .reduce<number | null>((best, value) => best === null || value > best ? value : best, null)

    if (bestPower !== null) records.push(makeRecord(session, definition, bestPower))
  }

  for (const distanceMeters of DISTANCE_PR_TARGETS) {
    const definition = RECORD_DEFINITION_BY_KEY.get(paceRecordKey(distanceMeters))
    if (!definition) continue

    const bestPace = efforts
      .filter((effort) => effort.type === 'pace' && effort.unit === 'sec' && effortDistanceMeters(effort) === distanceMeters)
      .map((effort) => effort.value)
      .filter(isNum)
      .reduce<number | null>((best, value) => best === null || value < best ? value : best, null)

    if (bestPace !== null) records.push(makeRecord(session, definition, bestPace))
  }

  const avgPowerDefinition = RECORD_DEFINITION_BY_KEY.get('avg_power')
  if (avgPowerDefinition && isNum(session.avgPower)) {
    records.push(makeRecord(session, avgPowerDefinition, session.avgPower))
  }

  const normalizedPowerDefinition = RECORD_DEFINITION_BY_KEY.get('normalized_power')
  if (normalizedPowerDefinition && isNum(session.normalizedPower)) {
    records.push(makeRecord(session, normalizedPowerDefinition, session.normalizedPower))
  }

  const maxPowerDefinition = RECORD_DEFINITION_BY_KEY.get('max_power')
  if (maxPowerDefinition && isNum(session.maxPower)) {
    records.push(makeRecord(session, maxPowerDefinition, session.maxPower))
  }

  const durationDefinition = RECORD_DEFINITION_BY_KEY.get('longest_duration')
  if (durationDefinition && session.durationSec > 0) {
    records.push(makeRecord(session, durationDefinition, session.durationSec))
  }

  const distanceDefinition = RECORD_DEFINITION_BY_KEY.get('longest_distance')
  if (distanceDefinition && isNum(session.distanceMeters) && session.distanceMeters > 0) {
    records.push(makeRecord(session, distanceDefinition, session.distanceMeters))
  }

  return records.sort((a, b) => a.priority - b.priority)
}

export function buildQuickErgPersonalBests(sessions: QuickErgProgressSession[]): QuickErgPersonalBest[] {
  const bestByMachineAndKey = new Map<string, QuickErgPersonalBest>()

  for (const session of sessions) {
    for (const record of extractQuickErgRecordsFromSession(session)) {
      const key = `${record.machineType}:${record.key}`
      const current = bestByMachineAndKey.get(key)

      if (!current || isBetterQuickErgRecord(record, current)) {
        bestByMachineAndKey.set(key, record)
      }
    }
  }

  return [...bestByMachineAndKey.values()].sort(sortRecordsForDisplay)
}

export function findQuickErgSessionPrBadges(
  currentSession: QuickErgProgressSession,
  previousSessions: QuickErgProgressSession[],
  limit = 6
): QuickErgPersonalBest[] {
  const previousSameMachine = previousSessions.filter(
    (session) =>
      session.machineType === currentSession.machineType &&
      startedAtTime(session.startedAt) < startedAtTime(currentSession.startedAt)
  )

  if (previousSameMachine.length === 0) {
    return [
      makeRecord(
        currentSession,
        {
          key: 'first_session',
          label: `First ${formatMachineName(currentSession.machineType)} session`,
          category: 'milestone',
          unit: 'score',
          compare: 'higher',
          priority: 0,
        },
        1
      ),
    ]
  }

  const previousBestByKey = new Map(
    buildQuickErgPersonalBests(previousSameMachine).map((record) => [record.key, record])
  )

  const newRecords: QuickErgPersonalBest[] = []

  for (const record of extractQuickErgRecordsFromSession(currentSession)) {
    const previous = previousBestByKey.get(record.key)
    if (!previous || isBetterQuickErgRecord(record, previous)) {
      newRecords.push({
        ...record,
        previousValue: previous?.value,
      })
    }
  }

  return newRecords
    .sort(sortPrBadges)
    .slice(0, limit)
}

function sortRecordsForDisplay(a: QuickErgPersonalBest, b: QuickErgPersonalBest): number {
  const machineDiff = MACHINE_ORDER.indexOf(a.machineType) - MACHINE_ORDER.indexOf(b.machineType)
  if (machineDiff !== 0) return machineDiff
  return a.priority - b.priority
}

function improvementScore(record: QuickErgPersonalBest): number {
  if (!record.previousValue || record.previousValue <= 0) return 0
  if (record.compare === 'lower') return (record.previousValue - record.value) / record.previousValue
  return (record.value - record.previousValue) / record.previousValue
}

function sortPrBadges(a: QuickErgPersonalBest, b: QuickErgPersonalBest): number {
  const priorityDiff = a.priority - b.priority
  if (priorityDiff !== 0) return priorityDiff
  return improvementScore(b) - improvementScore(a)
}
