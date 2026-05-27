import { prisma } from '@/lib/prisma'
import {
  DEFAULT_HOCKEY_TEST_PACKAGE,
  normalizeHockeyTestPackage,
  type HockeyTestMetricKey,
  type HockeyTestPackage,
  type HockeyTestPackageItem,
} from '@/lib/hockey/test-package'

const STRENGTH_METRICS = new Set<HockeyTestMetricKey>([
  'backSquat1RM',
  'powerClean1RM',
  'benchPress1RM',
  'pullUp1RM',
])

type AppLocale = 'en' | 'sv'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

function exerciseNameForLocale(
  exercise: { name: string; nameSv: string | null; nameEn: string | null },
  locale: AppLocale
): string {
  return locale === 'sv'
    ? exercise.nameSv || exercise.nameEn || exercise.name
    : exercise.nameEn || exercise.name || exercise.nameSv || 'Exercise'
}

function normalizeName(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export async function hydrateHockeyPackageLinkedExercises(pkg: HockeyTestPackage, locale: AppLocale = 'en') {
  const exercises = await prisma.exercise.findMany({
    select: { id: true, name: true, nameSv: true, nameEn: true },
  })
  const candidates = exercises.map((exercise) => ({
    ...exercise,
    names: [exercise.name, exercise.nameSv ?? ''].filter(Boolean).map(normalizeName),
  }))

  return {
    ...pkg,
    items: pkg.items.map((item): HockeyTestPackageItem => {
      if (item.linkedExerciseId || item.category !== 'strength') return item
      const aliases = [item.label, ...item.aliases].map(normalizeName)
      const match = candidates.find((exercise) => (
        exercise.names.some((name) => aliases.some((alias) => name === alias))
      )) ?? candidates.find((exercise) => (
        exercise.names.some((name) => aliases.some((alias) => name.includes(alias) || alias.includes(name)))
      ))
      return match
        ? {
            ...item,
            linkedExerciseId: match.id,
            linkedExerciseName: exerciseNameForLocale(match, locale),
          }
        : item
    }),
  }
}

export async function loadHockeyPackageForClient(clientId: string, locale: AppLocale = 'en') {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: {
      id: true,
      teamId: true,
      businessId: true,
      team: { select: { hockeyTestPackage: true } },
      business: { select: { hockeyTestPackage: true } },
    },
  })

  if (!client) return null

  const rawPackage = client.team?.hockeyTestPackage
    ?? client.business?.hockeyTestPackage
    ?? DEFAULT_HOCKEY_TEST_PACKAGE

  return hydrateHockeyPackageLinkedExercises(normalizeHockeyTestPackage(rawPackage), locale)
}

export async function syncHockeyStrengthPrsFromTest(params: {
  clientId: string
  testDate: Date
  values: Partial<Record<HockeyTestMetricKey, number | null | undefined>>
  locale?: AppLocale
}) {
  const locale = params.locale ?? 'en'
  const testPackage = await loadHockeyPackageForClient(params.clientId, locale)
  if (!testPackage) {
    return {
      prCreated: 0,
      prUpdated: 0,
      warnings: [
        t(
          locale,
          'The athlete could not be found, so PR history was not synced.',
          'Atleten kunde inte hittas, så PR-historik synkades inte.',
        ),
      ],
    }
  }

  let prCreated = 0
  let prUpdated = 0
  const unlinkedStrengthItems = new Set<string>()

  for (const item of testPackage.items) {
    if (!item.enabled || item.category !== 'strength' || !STRENGTH_METRICS.has(item.metricKey)) continue
    const value = params.values[item.metricKey]
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) continue

    if (!item.linkedExerciseId) {
      unlinkedStrengthItems.add(item.label)
      continue
    }

    const upsertResult = await prisma.oneRepMaxHistory.upsert({
      where: {
        clientId_exerciseId_date: {
          clientId: params.clientId,
          exerciseId: item.linkedExerciseId,
          date: params.testDate,
        },
      },
      update: {
        oneRepMax: value,
        source: 'TESTED',
        unit: item.unit.toUpperCase() || 'KG',
            notes: `${t(locale, 'Hockey test', 'Hockeytest')}: ${item.label}`,
      },
      create: {
        clientId: params.clientId,
        exerciseId: item.linkedExerciseId,
        date: params.testDate,
        oneRepMax: value,
        source: 'TESTED',
        unit: item.unit.toUpperCase() || 'KG',
            notes: `${t(locale, 'Hockey test', 'Hockeytest')}: ${item.label}`,
      },
      select: { createdAt: true },
    })
    const ageMs = Date.now() - upsertResult.createdAt.getTime()
    if (ageMs < 1000) prCreated++
    else prUpdated++
  }

  return {
    prCreated,
    prUpdated,
    warnings: Array.from(unlinkedStrengthItems).map((label) => (
      t(
        locale,
        `${label} is missing a linked exercise and was therefore saved only as a hockey test.`,
        `${label} saknar kopplad övning och sparades därför bara som hockeytest.`,
      )
    )),
  }
}
