import { normalizeRaceFuelingProductItems, summarizeRaceFuelingProductItems } from './product-plan'

export type FuelingCoachingRecommendationStatus =
  | 'NO_DATA'
  | 'REDUCE'
  | 'HOLD'
  | 'PROGRESS'
  | 'RACE_READY'
  | 'ON_TRACK'

export interface FuelingRecommendationLog {
  plannedCarbsGPerHour: number | null
  actualCarbsGPerHour: number | null
  actualCarbsTotalG?: number | null
  stomachRating: number | null
  energyRating: number | null
  productsUsed?: unknown
}

export interface FuelingCoachingRecommendation {
  status: FuelingCoachingRecommendationStatus
  labelSv: string
  actionSv: string
  reasonSv: string
  nextTargetGPerHour: number | null
  productSv: string | null
}

export function buildFuelingCoachingRecommendation({
  logs,
  raceTargetGPerHour,
}: {
  logs: FuelingRecommendationLog[]
  raceTargetGPerHour?: number | null
}): FuelingCoachingRecommendation {
  const sorted = logs.filter(hasFuelingSignal)
  const latest = sorted[0] ?? null

  if (!latest) {
    return {
      status: 'NO_DATA',
      labelSv: 'Ingen tydlig rekommendation än',
      actionSv: 'Logga kolhydrater, mage och energi efter nästa långpass.',
      reasonSv: 'Coachrekommendationen behöver minst en fuelinglogg.',
      nextTargetGPerHour: null,
      productSv: null,
    }
  }

  const actual = normalizeNumber(latest.actualCarbsGPerHour)
  const planned = normalizeNumber(latest.plannedCarbsGPerHour)
  const stomach = normalizeNumber(latest.stomachRating)
  const energy = normalizeNumber(latest.energyRating)
  const raceTarget = normalizeNumber(raceTargetGPerHour)
  const anchor = actual ?? planned ?? raceTarget ?? 60
  const stableLogs = sorted.filter((log) => (log.stomachRating ?? 0) >= 4 && (log.energyRating ?? 0) >= 4)
  const bestTolerated = stableLogs
    .map((log) => log.actualCarbsGPerHour)
    .filter(isNumber)
    .reduce<number | null>((best, value) => best == null ? value : Math.max(best, value), null)
  const productSv = buildProductRecommendation(latest)

  if (stomach != null && stomach <= 2) {
    const nextTarget = roundToFive(Math.max(30, anchor - 10))
    return {
      status: 'REDUCE',
      labelSv: 'Backa nästa pass',
      actionSv: `Nästa långpass: sikta på ${nextTarget} g/h och fördela intaget jämnare.`,
      reasonSv: 'Magresponsen var låg, så målet bör säkras innan nästa höjning.',
      nextTargetGPerHour: nextTarget,
      productSv,
    }
  }

  if (stomach === 3) {
    const nextTarget = roundToFive(anchor)
    return {
      status: 'HOLD',
      labelSv: 'Behåll nivån',
      actionSv: `Nästa långpass: upprepa ${nextTarget} g/h innan du höjer.`,
      reasonSv: 'Magen var okej men inte stabil nog för en tydlig progression.',
      nextTargetGPerHour: nextTarget,
      productSv,
    }
  }

  if (planned != null && actual != null && actual < planned - 15) {
    const nextTarget = roundToFive(Math.max(30, actual + 5))
    return {
      status: 'HOLD',
      labelSv: 'Bygg upp till planen',
      actionSv: `Nästa långpass: sikta på ${nextTarget} g/h innan planen höjs igen.`,
      reasonSv: `Senaste intaget låg tydligt under planerade ${Math.round(planned)} g/h.`,
      nextTargetGPerHour: nextTarget,
      productSv,
    }
  }

  if (raceTarget != null && bestTolerated != null && bestTolerated >= raceTarget - 5 && stableLogs.length >= 2) {
    return {
      status: 'RACE_READY',
      labelSv: 'Redo för racemålet',
      actionSv: `Behåll racemålet ${Math.round(raceTarget)} g/h och repetera med tävlingsprodukterna.`,
      reasonSv: 'Flera pass visar stabil mage och energi nära målintaget.',
      nextTargetGPerHour: roundToFive(raceTarget),
      productSv,
    }
  }

  if ((stomach ?? 0) >= 4 && (energy ?? 0) >= 4 && actual != null) {
    const ceiling = raceTarget ?? 120
    const nextTarget = roundToFive(Math.min(ceiling, actual + 5))
    return {
      status: 'PROGRESS',
      labelSv: 'Höj försiktigt',
      actionSv: `Nästa långpass: testa ${nextTarget} g/h om passet är tävlingslikt.`,
      reasonSv: 'Senaste loggen visar stabil mage och energi.',
      nextTargetGPerHour: nextTarget,
      productSv,
    }
  }

  const nextTarget = roundToFive(anchor)
  return {
    status: 'ON_TRACK',
    labelSv: 'Följ upp',
    actionSv: `Nästa långpass: fortsätt med ${nextTarget} g/h och logga responsen.`,
    reasonSv: 'Det finns data, men inte en tillräckligt tydlig signal för att höja eller sänka.',
    nextTargetGPerHour: nextTarget,
    productSv,
  }
}

function buildProductRecommendation(log: FuelingRecommendationLog): string | null {
  const products = normalizeRaceFuelingProductItems(log.productsUsed)
  const summary = summarizeRaceFuelingProductItems(products)
  if (!summary) return null

  const stomach = normalizeNumber(log.stomachRating)
  if (stomach != null && stomach <= 2) {
    return `Produkt/timing att justera: ${summary}.`
  }

  if (stomach != null && stomach >= 4) {
    return `Fungerande produkter att repetera: ${summary}.`
  }

  return `Produkter från senaste logg: ${summary}.`
}

function hasFuelingSignal(log: FuelingRecommendationLog): boolean {
  return [
    log.plannedCarbsGPerHour,
    log.actualCarbsGPerHour,
    log.stomachRating,
    log.energyRating,
  ].some((value) => value !== null && value !== undefined)
}

function normalizeNumber(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function roundToFive(value: number): number {
  return Math.round(value / 5) * 5
}
