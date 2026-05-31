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
  labelEn: string
  labelSv: string
  actionEn: string
  actionSv: string
  reasonEn: string
  reasonSv: string
  nextTargetGPerHour: number | null
  productEn: string | null
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
      labelEn: 'No clear recommendation yet',
      labelSv: 'Ingen tydlig rekommendation än',
      actionEn: 'Log carbohydrates, gut feel, and energy after the next long session.',
      actionSv: 'Logga kolhydrater, mage och energi efter nästa långpass.',
      reasonEn: 'The coaching recommendation needs at least one fueling log.',
      reasonSv: 'Coachrekommendationen behöver minst en fuelinglogg.',
      nextTargetGPerHour: null,
      productEn: null,
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
  const product = buildProductRecommendation(latest)

  if (stomach != null && stomach <= 2) {
    const nextTarget = roundToFive(Math.max(30, anchor - 10))
    return {
      status: 'REDUCE',
      labelEn: 'Back off next session',
      labelSv: 'Backa nästa pass',
      actionEn: `Next long session: aim for ${nextTarget} g/h and spread intake more evenly.`,
      actionSv: `Nästa långpass: sikta på ${nextTarget} g/h och fördela intaget jämnare.`,
      reasonEn: 'Gut response was low, so the target should be stabilized before increasing again.',
      reasonSv: 'Magresponsen var låg, så målet bör säkras innan nästa höjning.',
      nextTargetGPerHour: nextTarget,
      productEn: product?.en ?? null,
      productSv: product?.sv ?? null,
    }
  }

  if (stomach === 3) {
    const nextTarget = roundToFive(anchor)
    return {
      status: 'HOLD',
      labelEn: 'Hold level',
      labelSv: 'Behåll nivån',
      actionEn: `Next long session: repeat ${nextTarget} g/h before increasing.`,
      actionSv: `Nästa långpass: upprepa ${nextTarget} g/h innan du höjer.`,
      reasonEn: 'Gut response was acceptable but not stable enough for a clear progression.',
      reasonSv: 'Magen var okej men inte stabil nog för en tydlig progression.',
      nextTargetGPerHour: nextTarget,
      productEn: product?.en ?? null,
      productSv: product?.sv ?? null,
    }
  }

  if (planned != null && actual != null && actual < planned - 15) {
    const nextTarget = roundToFive(Math.max(30, actual + 5))
    return {
      status: 'HOLD',
      labelEn: 'Build up to the plan',
      labelSv: 'Bygg upp till planen',
      actionEn: `Next long session: aim for ${nextTarget} g/h before the plan is raised again.`,
      actionSv: `Nästa långpass: sikta på ${nextTarget} g/h innan planen höjs igen.`,
      reasonEn: `Latest intake was clearly below the planned ${Math.round(planned)} g/h.`,
      reasonSv: `Senaste intaget låg tydligt under planerade ${Math.round(planned)} g/h.`,
      nextTargetGPerHour: nextTarget,
      productEn: product?.en ?? null,
      productSv: product?.sv ?? null,
    }
  }

  if (raceTarget != null && bestTolerated != null && bestTolerated >= raceTarget - 5 && stableLogs.length >= 2) {
    return {
      status: 'RACE_READY',
      labelEn: 'Ready for race target',
      labelSv: 'Redo för racemålet',
      actionEn: `Keep the race target at ${Math.round(raceTarget)} g/h and repeat with race products.`,
      actionSv: `Behåll racemålet ${Math.round(raceTarget)} g/h och repetera med tävlingsprodukterna.`,
      reasonEn: 'Multiple sessions show stable gut feel and energy close to target intake.',
      reasonSv: 'Flera pass visar stabil mage och energi nära målintaget.',
      nextTargetGPerHour: roundToFive(raceTarget),
      productEn: product?.en ?? null,
      productSv: product?.sv ?? null,
    }
  }

  if ((stomach ?? 0) >= 4 && (energy ?? 0) >= 4 && actual != null) {
    const ceiling = raceTarget ?? 120
    const nextTarget = roundToFive(Math.min(ceiling, actual + 5))
    return {
      status: 'PROGRESS',
      labelEn: 'Increase carefully',
      labelSv: 'Höj försiktigt',
      actionEn: `Next long session: test ${nextTarget} g/h if the session is race-like.`,
      actionSv: `Nästa långpass: testa ${nextTarget} g/h om passet är tävlingslikt.`,
      reasonEn: 'The latest log shows stable gut feel and energy.',
      reasonSv: 'Senaste loggen visar stabil mage och energi.',
      nextTargetGPerHour: nextTarget,
      productEn: product?.en ?? null,
      productSv: product?.sv ?? null,
    }
  }

  const nextTarget = roundToFive(anchor)
  return {
    status: 'ON_TRACK',
    labelEn: 'Follow up',
    labelSv: 'Följ upp',
    actionEn: `Next long session: continue with ${nextTarget} g/h and log the response.`,
    actionSv: `Nästa långpass: fortsätt med ${nextTarget} g/h och logga responsen.`,
    reasonEn: 'There is data, but not a clear enough signal to increase or reduce.',
    reasonSv: 'Det finns data, men inte en tillräckligt tydlig signal för att höja eller sänka.',
    nextTargetGPerHour: nextTarget,
    productEn: product?.en ?? null,
    productSv: product?.sv ?? null,
  }
}

function buildProductRecommendation(log: FuelingRecommendationLog): { en: string; sv: string } | null {
  const products = normalizeRaceFuelingProductItems(log.productsUsed)
  const summarySv = summarizeRaceFuelingProductItems(products, 'sv')
  const summaryEn = summarizeRaceFuelingProductItems(products, 'en')
  if (!summarySv || !summaryEn) return null

  const stomach = normalizeNumber(log.stomachRating)
  if (stomach != null && stomach <= 2) {
    return {
      en: `Product/timing to adjust: ${summaryEn}.`,
      sv: `Produkt/timing att justera: ${summarySv}.`,
    }
  }

  if (stomach != null && stomach >= 4) {
    return {
      en: `Working products to repeat: ${summaryEn}.`,
      sv: `Fungerande produkter att repetera: ${summarySv}.`,
    }
  }

  return {
    en: `Products from latest log: ${summaryEn}.`,
    sv: `Produkter från senaste logg: ${summarySv}.`,
  }
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
