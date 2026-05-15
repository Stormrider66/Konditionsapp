import type { Prisma } from '@prisma/client'

export type HockeyTestMetricKey =
  | 'backSquat1RM'
  | 'powerClean1RM'
  | 'benchPress1RM'
  | 'pullUp1RM'
  | 'gripStrengthLeft'
  | 'gripStrengthRight'
  | 'standingLongJump'
  | 'threeJumpLeft'
  | 'threeJumpRight'
  | 'beepTestLevel'
  | 'wingate30sAveragePower'
  | 'vo2Max'
  | 'lt1SpeedKmh'
  | 'lt1HeartRate'
  | 'lt1Lactate'
  | 'lt2SpeedKmh'
  | 'lt2HeartRate'
  | 'lt2Lactate'
  | 'maxLactate'
  | 'maxHeartRate'
  | 'rampTimeSeconds'
  | 'sprint5m'
  | 'sprint10m'
  | 'sprint20m'
  | 'sprint30m'
  | 'sprint20mFly'
  | 'sprint30mFly'
  | 'agility505Left'
  | 'agility505Right'

export interface HockeyTestPackageItem {
  id: string
  metricKey: HockeyTestMetricKey
  label: string
  unit: string
  category: 'strength' | 'power' | 'jump' | 'endurance' | 'ice'
  lowerIsBetter?: boolean
  linkedExerciseId?: string | null
  linkedExerciseName?: string | null
  aliases: string[]
  enabled: boolean
  notes?: string | null
}

export interface HockeyTestPackage {
  version: 1
  name: string
  items: HockeyTestPackageItem[]
}

export const HOCKEY_TEST_METRIC_KEYS = new Set<HockeyTestMetricKey>([
  'backSquat1RM',
  'powerClean1RM',
  'benchPress1RM',
  'pullUp1RM',
  'gripStrengthLeft',
  'gripStrengthRight',
  'standingLongJump',
  'threeJumpLeft',
  'threeJumpRight',
  'beepTestLevel',
  'wingate30sAveragePower',
  'vo2Max',
  'lt1SpeedKmh',
  'lt1HeartRate',
  'lt1Lactate',
  'lt2SpeedKmh',
  'lt2HeartRate',
  'lt2Lactate',
  'maxLactate',
  'maxHeartRate',
  'rampTimeSeconds',
  'sprint5m',
  'sprint10m',
  'sprint20m',
  'sprint30m',
  'sprint20mFly',
  'sprint30mFly',
  'agility505Left',
  'agility505Right',
])

export function isHockeyTestMetricKey(value: string): value is HockeyTestMetricKey {
  return HOCKEY_TEST_METRIC_KEYS.has(value as HockeyTestMetricKey)
}

export const HOCKEY_SCALAR_METRIC_KEYS: HockeyTestMetricKey[] = Array.from(HOCKEY_TEST_METRIC_KEYS)

export const DEFAULT_HOCKEY_TEST_PACKAGE: HockeyTestPackage = {
  version: 1,
  name: 'Hockey standardtest',
  items: [
    {
      id: 'back-squat-1rm',
      metricKey: 'backSquat1RM',
      label: 'Knäböj full depth 1RM',
      unit: 'kg',
      category: 'strength',
      aliases: ['knäböj', 'benböj', 'back squat', 'squat', 'bs'],
      enabled: true,
      notes: 'Full depth enligt styrkelyftsregler. Separeras från quarter squat / jump squat.',
    },
    {
      id: 'power-clean-1rm',
      metricKey: 'powerClean1RM',
      label: 'Power clean / frivändning 1RM',
      unit: 'kg',
      category: 'strength',
      aliases: ['frivändning', 'power clean', 'pc'],
      enabled: true,
      notes: 'Standard power clean. Hang clean ska vara en egen test om laget vill använda det.',
    },
    {
      id: 'bench-press-1rm',
      metricKey: 'benchPress1RM',
      label: 'Bänkpress 1RM',
      unit: 'kg',
      category: 'strength',
      aliases: ['bänkpress', 'bench press', 'bench', 'bp'],
      enabled: true,
    },
    {
      id: 'pull-up-1rm',
      metricKey: 'pullUp1RM',
      label: 'Chins 1RM extra vikt',
      unit: 'kg',
      category: 'strength',
      aliases: ['chins', 'pull-up', 'pullup', 'pull ups', 'weighted pull-up'],
      enabled: true,
      notes: 'Värdet avser extra vikt, inte kroppsvikt + extra vikt.',
    },
    {
      id: 'standing-long-jump',
      metricKey: 'standingLongJump',
      label: 'Stående längdhopp',
      unit: 'cm',
      category: 'jump',
      aliases: ['stående längdhopp', 'standing broad jump', 'standing long jump', 'slj'],
      enabled: true,
    },
    {
      id: 'three-jump-left',
      metricKey: 'threeJumpLeft',
      label: '3-steg vänster',
      unit: 'cm',
      category: 'jump',
      aliases: ['3-steg vänster', 'tresteg vänster', 'triple jump left'],
      enabled: true,
    },
    {
      id: 'three-jump-right',
      metricKey: 'threeJumpRight',
      label: '3-steg höger',
      unit: 'cm',
      category: 'jump',
      aliases: ['3-steg höger', 'tresteg höger', 'triple jump right'],
      enabled: true,
    },
    {
      id: 'beep-test',
      metricKey: 'beepTestLevel',
      label: 'Beep test',
      unit: 'nivå',
      category: 'endurance',
      aliases: ['beep', 'beep test', 'bleep test', 'multi-stage fitness test', 'multistage fitness test'],
      enabled: true,
    },
    {
      id: 'wingate-30s-average-power',
      metricKey: 'wingate30sAveragePower',
      label: 'Wingate 30 sek',
      unit: 'W',
      category: 'power',
      aliases: ['wingate', 'wingate 30s', 'wingate 30 sek', '30 second wingate', '30s sprint'],
      enabled: true,
      notes: 'Ange snitteffekt över 30 sekunder.',
    },
    {
      id: 'vo2max',
      metricKey: 'vo2Max',
      label: 'VO2max',
      unit: 'ml/kg/min',
      category: 'endurance',
      aliases: ['vo2max', 'vo2 max', 'max syreupptagning'],
      enabled: true,
    },
    {
      id: 'sprint-10m-ice',
      metricKey: 'sprint10m',
      label: '10 m is',
      unit: 's',
      category: 'ice',
      lowerIsBetter: true,
      aliases: ['10m', '10 m', '10m is', 'sprint 10m'],
      enabled: true,
    },
    {
      id: 'sprint-20m-ice',
      metricKey: 'sprint20m',
      label: '20 m is',
      unit: 's',
      category: 'ice',
      lowerIsBetter: true,
      aliases: ['20m', '20 m', '20m is', 'sprint 20m'],
      enabled: true,
    },
    {
      id: 'sprint-30m-ice',
      metricKey: 'sprint30m',
      label: '30 m is',
      unit: 's',
      category: 'ice',
      lowerIsBetter: true,
      aliases: ['30m', '30 m', '30m is', 'sprint 30m'],
      enabled: true,
    },
  ],
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeItem(value: unknown): HockeyTestPackageItem | null {
  if (!isRecord(value)) return null
  const metricKey = typeof value.metricKey === 'string' && isHockeyTestMetricKey(value.metricKey)
    ? value.metricKey
    : null
  if (!metricKey) return null

  const fallback = DEFAULT_HOCKEY_TEST_PACKAGE.items.find((item) => item.metricKey === metricKey)
  return {
    id: typeof value.id === 'string' && value.id ? value.id : fallback?.id ?? metricKey,
    metricKey,
    label: typeof value.label === 'string' && value.label ? value.label : fallback?.label ?? metricKey,
    unit: typeof value.unit === 'string' && value.unit ? value.unit : fallback?.unit ?? '',
    category: ['strength', 'power', 'jump', 'endurance', 'ice'].includes(String(value.category))
      ? value.category as HockeyTestPackageItem['category']
      : fallback?.category ?? 'strength',
    lowerIsBetter: typeof value.lowerIsBetter === 'boolean' ? value.lowerIsBetter : fallback?.lowerIsBetter,
    linkedExerciseId: typeof value.linkedExerciseId === 'string' ? value.linkedExerciseId : null,
    linkedExerciseName: typeof value.linkedExerciseName === 'string' ? value.linkedExerciseName : null,
    aliases: Array.isArray(value.aliases)
      ? value.aliases.filter((alias): alias is string => typeof alias === 'string')
      : fallback?.aliases ?? [],
    enabled: typeof value.enabled === 'boolean' ? value.enabled : true,
    notes: typeof value.notes === 'string' ? value.notes : fallback?.notes ?? null,
  }
}

function addMissingDefaultItems(items: HockeyTestPackageItem[]) {
  if (items.length === 0) return DEFAULT_HOCKEY_TEST_PACKAGE.items
  const existingMetricKeys = new Set(items.map((item) => item.metricKey))
  const existingIds = new Set(items.map((item) => item.id))
  const missingDefaults = DEFAULT_HOCKEY_TEST_PACKAGE.items.filter((item) => (
    !existingMetricKeys.has(item.metricKey) && !existingIds.has(item.id)
  ))
  return [...items, ...missingDefaults]
}

export function normalizeHockeyTestPackage(value: unknown): HockeyTestPackage {
  if (!isRecord(value)) return DEFAULT_HOCKEY_TEST_PACKAGE
  const items = Array.isArray(value.items)
    ? value.items.map(normalizeItem).filter((item): item is HockeyTestPackageItem => item !== null)
    : []
  const itemsWithDefaults = addMissingDefaultItems(items)

  return {
    version: 1,
    name: typeof value.name === 'string' && value.name ? value.name : DEFAULT_HOCKEY_TEST_PACKAGE.name,
    items: itemsWithDefaults,
  }
}

export function hockeyTestPackageToJson(pkg: HockeyTestPackage): Prisma.InputJsonValue {
  return {
    version: 1,
    name: pkg.name,
    items: pkg.items.map((item) => ({
      ...item,
      linkedExerciseId: item.linkedExerciseId ?? null,
      linkedExerciseName: item.linkedExerciseName ?? null,
      notes: item.notes ?? null,
    })),
  }
}

function normalizeName(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9åäö]+/gi, ' ')
    .trim()
}

export function findPackageItemByInput(pkg: HockeyTestPackage, input: string) {
  const target = normalizeName(input)
  if (!target) return null
  return pkg.items.find((item) => {
    const candidates = [item.label, item.metricKey, ...item.aliases]
    return candidates.some((candidate) => {
      const normalized = normalizeName(candidate)
      return normalized === target || normalized.startsWith(target) || target.startsWith(normalized)
    })
  }) ?? null
}
