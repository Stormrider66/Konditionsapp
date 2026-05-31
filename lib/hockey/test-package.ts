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
  labelSv?: string | null
  unit: string
  unitSv?: string | null
  category: 'strength' | 'power' | 'jump' | 'endurance' | 'ice'
  lowerIsBetter?: boolean
  linkedExerciseId?: string | null
  linkedExerciseName?: string | null
  aliases: string[]
  enabled: boolean
  notes?: string | null
  notesSv?: string | null
}

export interface HockeyTestPackage {
  version: 1
  name: string
  nameSv?: string | null
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
  name: 'Hockey standard test',
  nameSv: 'Hockey standardtest',
  items: [
    {
      id: 'back-squat-1rm',
      metricKey: 'backSquat1RM',
      label: 'Back squat full-depth 1RM',
      labelSv: 'Knäböj full depth 1RM',
      unit: 'kg',
      category: 'strength',
      aliases: ['knäböj', 'benböj', 'back squat', 'squat', 'bs'],
      enabled: true,
      notes: 'Full depth according to powerlifting standards. Kept separate from quarter squat / jump squat.',
      notesSv: 'Full depth enligt styrkelyftsregler. Separeras från quarter squat / jump squat.',
    },
    {
      id: 'power-clean-1rm',
      metricKey: 'powerClean1RM',
      label: 'Power clean 1RM',
      labelSv: 'Power clean / frivändning 1RM',
      unit: 'kg',
      category: 'strength',
      aliases: ['frivändning', 'power clean', 'pc'],
      enabled: true,
      notes: 'Standard power clean. Hang clean should be a separate test if the team wants to use it.',
      notesSv: 'Standard power clean. Hang clean ska vara en egen test om laget vill använda det.',
    },
    {
      id: 'bench-press-1rm',
      metricKey: 'benchPress1RM',
      label: 'Bench press 1RM',
      labelSv: 'Bänkpress 1RM',
      unit: 'kg',
      category: 'strength',
      aliases: ['bänkpress', 'bench press', 'bench', 'bp'],
      enabled: true,
    },
    {
      id: 'pull-up-1rm',
      metricKey: 'pullUp1RM',
      label: 'Weighted pull-up 1RM',
      labelSv: 'Chins 1RM extra vikt',
      unit: 'kg',
      category: 'strength',
      aliases: ['chins', 'pull-up', 'pullup', 'pull ups', 'weighted pull-up'],
      enabled: true,
      notes: 'The value refers to extra load, not bodyweight plus extra load.',
      notesSv: 'Värdet avser extra vikt, inte kroppsvikt + extra vikt.',
    },
    {
      id: 'standing-long-jump',
      metricKey: 'standingLongJump',
      label: 'Standing long jump',
      labelSv: 'Stående längdhopp',
      unit: 'cm',
      category: 'jump',
      aliases: ['stående längdhopp', 'standing broad jump', 'standing long jump', 'slj'],
      enabled: true,
    },
    {
      id: 'three-jump-left',
      metricKey: 'threeJumpLeft',
      label: 'Triple jump left',
      labelSv: '3-steg vänster',
      unit: 'cm',
      category: 'jump',
      aliases: ['3-steg vänster', 'tresteg vänster', 'triple jump left'],
      enabled: true,
    },
    {
      id: 'three-jump-right',
      metricKey: 'threeJumpRight',
      label: 'Triple jump right',
      labelSv: '3-steg höger',
      unit: 'cm',
      category: 'jump',
      aliases: ['3-steg höger', 'tresteg höger', 'triple jump right'],
      enabled: true,
    },
    {
      id: 'beep-test',
      metricKey: 'beepTestLevel',
      label: 'Beep test',
      unit: 'level',
      unitSv: 'nivå',
      category: 'endurance',
      aliases: ['beep', 'beep test', 'bleep test', 'multi-stage fitness test', 'multistage fitness test'],
      enabled: true,
    },
    {
      id: 'wingate-30s-average-power',
      metricKey: 'wingate30sAveragePower',
      label: 'Wingate 30 sec',
      labelSv: 'Wingate 30 sek',
      unit: 'W',
      category: 'power',
      aliases: ['wingate', 'wingate 30s', 'wingate 30 sek', '30 second wingate', '30s sprint'],
      enabled: true,
      notes: 'Enter average power over 30 seconds.',
      notesSv: 'Ange snitteffekt över 30 sekunder.',
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
      label: '10 m on-ice sprint',
      labelSv: '10 m is',
      unit: 's',
      category: 'ice',
      lowerIsBetter: true,
      aliases: ['10m', '10 m', '10m is', 'sprint 10m'],
      enabled: true,
    },
    {
      id: 'sprint-20m-ice',
      metricKey: 'sprint20m',
      label: '20 m on-ice sprint',
      labelSv: '20 m is',
      unit: 's',
      category: 'ice',
      lowerIsBetter: true,
      aliases: ['20m', '20 m', '20m is', 'sprint 20m'],
      enabled: true,
    },
    {
      id: 'sprint-30m-ice',
      metricKey: 'sprint30m',
      label: '30 m on-ice sprint',
      labelSv: '30 m is',
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

function stringOrUndefined(value: unknown): string | undefined {
  return typeof value === 'string' && value ? value : undefined
}

function normalizeLocalizedValue(
  rawValue: unknown,
  rawValueSv: unknown,
  fallbackValue: string | undefined,
  fallbackValueSv: string | null | undefined
) {
  const value = stringOrUndefined(rawValue)
  const valueSv = stringOrUndefined(rawValueSv)
  const isLegacyDefaultSv = !!value && !!fallbackValueSv && value === fallbackValueSv
  const isDefaultEn = !!value && !!fallbackValue && value === fallbackValue

  return {
    value: isLegacyDefaultSv ? fallbackValue ?? value : value ?? fallbackValue ?? '',
    valueSv: valueSv ?? (
      isLegacyDefaultSv
        ? value
        : isDefaultEn || !value
          ? fallbackValueSv ?? null
          : null
    ),
  }
}

function normalizeItem(value: unknown): HockeyTestPackageItem | null {
  if (!isRecord(value)) return null
  const metricKey = typeof value.metricKey === 'string' && isHockeyTestMetricKey(value.metricKey)
    ? value.metricKey
    : null
  if (!metricKey) return null

  const fallback = DEFAULT_HOCKEY_TEST_PACKAGE.items.find((item) => item.metricKey === metricKey)
  const label = normalizeLocalizedValue(value.label, value.labelSv, fallback?.label, fallback?.labelSv)
  const unit = normalizeLocalizedValue(value.unit, value.unitSv, fallback?.unit, fallback?.unitSv)
  const notes = normalizeLocalizedValue(value.notes, value.notesSv, fallback?.notes ?? undefined, fallback?.notesSv)
  return {
    id: typeof value.id === 'string' && value.id ? value.id : fallback?.id ?? metricKey,
    metricKey,
    label: label.value || metricKey,
    labelSv: label.valueSv,
    unit: unit.value,
    unitSv: unit.valueSv,
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
    notes: notes.value || null,
    notesSv: notes.valueSv,
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
    name: normalizeLocalizedValue(value.name, value.nameSv, DEFAULT_HOCKEY_TEST_PACKAGE.name, DEFAULT_HOCKEY_TEST_PACKAGE.nameSv).value,
    nameSv: normalizeLocalizedValue(value.name, value.nameSv, DEFAULT_HOCKEY_TEST_PACKAGE.name, DEFAULT_HOCKEY_TEST_PACKAGE.nameSv).valueSv,
    items: itemsWithDefaults,
  }
}

export function hockeyTestPackageToJson(pkg: HockeyTestPackage): Prisma.InputJsonValue {
  return {
    version: 1,
    name: pkg.name,
    nameSv: pkg.nameSv ?? null,
    items: pkg.items.map((item) => ({
      ...item,
      linkedExerciseId: item.linkedExerciseId ?? null,
      linkedExerciseName: item.linkedExerciseName ?? null,
      notes: item.notes ?? null,
      notesSv: item.notesSv ?? null,
      labelSv: item.labelSv ?? null,
      unitSv: item.unitSv ?? null,
    })),
  }
}

export function localizeHockeyTestPackage(pkg: HockeyTestPackage, locale: 'en' | 'sv'): HockeyTestPackage {
  if (locale !== 'sv') return pkg
  return {
    ...pkg,
    name: pkg.nameSv ?? pkg.name,
    items: pkg.items.map((item) => ({
      ...item,
      label: item.labelSv ?? item.label,
      unit: item.unitSv ?? item.unit,
      notes: item.notesSv ?? item.notes ?? null,
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
    const candidates = [item.label, item.labelSv ?? '', item.metricKey, ...item.aliases]
    return candidates.some((candidate) => {
      const normalized = normalizeName(candidate)
      return normalized === target || normalized.startsWith(target) || target.startsWith(normalized)
    })
  }) ?? null
}
