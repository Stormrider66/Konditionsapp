import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'
import { logger } from '@/lib/logger'
import { prisma } from '@/lib/prisma'
import { usdToSek } from '@/lib/ai/billing/allowance'
import {
  ATHLETE_AI_ALLOWANCE_SEK,
  ATHLETE_PLAN_PRICING,
  type AthletePlanTier,
} from '@/lib/subscription/athlete-plans'

interface CostBucket {
  key: string
  label: string
  calls: number
  inputTokens: number
  outputTokens: number
  costUsd: number
  costSek: number
  athleteLinkedCalls: number
  athleteLinkedCostUsd: number
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin()

    const { searchParams } = new URL(request.url)
    const days = clampNumber(readNumber(searchParams, 'days', readNumber(searchParams, 'range', 30)), 1, 180)
    const now = new Date()
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)

    const [logs, topUpPurchases] = await Promise.all([
      prisma.aIUsageLog.findMany({
        where: { createdAt: { gte: startDate } },
        select: {
          category: true,
          provider: true,
          model: true,
          inputTokens: true,
          outputTokens: true,
          estimatedCost: true,
          clientId: true,
          userId: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.aITopUpPurchase.findMany({
        where: { createdAt: { gte: startDate } },
        select: {
          clientId: true,
          amountPaidSek: true,
          creditsSek: true,
          creditsRemainingSek: true,
          status: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ])

    const categoryBuckets = new Map<string, CostBucket>()
    const providerBuckets = new Map<string, CostBucket>()
    const modelBuckets = new Map<string, CostBucket>()
    const dailyBuckets = new Map<string, { date: string; calls: number; costUsd: number; costSek: number }>()
    const clientBuckets = new Map<string, { calls: number; costUsd: number; inputTokens: number; outputTokens: number }>()

    let totalCostUsd = 0
    let totalInputTokens = 0
    let totalOutputTokens = 0
    let athleteLinkedCalls = 0
    let athleteLinkedCostUsd = 0
    let unattributedCalls = 0
    let unattributedCostUsd = 0

    for (const log of logs) {
      const costUsd = normalizeMoney(log.estimatedCost)
      const inputTokens = Math.max(0, log.inputTokens)
      const outputTokens = Math.max(0, log.outputTokens)
      const hasClient = Boolean(log.clientId)
      const hasUser = Boolean(log.userId)

      totalCostUsd += costUsd
      totalInputTokens += inputTokens
      totalOutputTokens += outputTokens

      if (hasClient) {
        athleteLinkedCalls += 1
        athleteLinkedCostUsd += costUsd
        const clientBucket = clientBuckets.get(log.clientId!) ?? {
          calls: 0,
          costUsd: 0,
          inputTokens: 0,
          outputTokens: 0,
        }
        clientBucket.calls += 1
        clientBucket.costUsd += costUsd
        clientBucket.inputTokens += inputTokens
        clientBucket.outputTokens += outputTokens
        clientBuckets.set(log.clientId!, clientBucket)
      }

      if (!hasUser && !hasClient) {
        unattributedCalls += 1
        unattributedCostUsd += costUsd
      }

      addToBucket(categoryBuckets, log.category || 'unknown', formatCategory(log.category), log, costUsd)
      addToBucket(providerBuckets, log.provider || 'unknown', formatProvider(log.provider), log, costUsd)
      addToBucket(modelBuckets, `${log.provider}:${log.model}`, `${formatProvider(log.provider)} / ${log.model}`, log, costUsd)

      const date = log.createdAt.toISOString().slice(0, 10)
      const daily = dailyBuckets.get(date) ?? { date, calls: 0, costUsd: 0, costSek: 0 }
      daily.calls += 1
      daily.costUsd += costUsd
      daily.costSek = usdToSek(daily.costUsd)
      dailyBuckets.set(date, daily)
    }

    const totalCostSek = usdToSek(totalCostUsd)
    const margin = await buildAthleteMarginOverview(clientBuckets)
    const topUps = buildTopUpOverview(topUpPurchases)
    const byCategory = sortBuckets(categoryBuckets).map(finalizeBucket)
    const featureMix = buildFeatureMixOverview(byCategory, logs.length, totalCostSek)

    const data = {
      period: {
        start: startDate.toISOString(),
        end: now.toISOString(),
        days,
      },
      totals: {
        calls: logs.length,
        costUsd: normalizeMoney(totalCostUsd),
        costSek: totalCostSek,
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
        athleteLinkedCalls,
        athleteLinkedCostUsd: normalizeMoney(athleteLinkedCostUsd),
        athleteLinkedCostSek: usdToSek(athleteLinkedCostUsd),
        unattributedCalls,
        unattributedCostUsd: normalizeMoney(unattributedCostUsd),
        unattributedCostSek: usdToSek(unattributedCostUsd),
        averageCostSek: logs.length > 0 ? roundSek(totalCostSek / logs.length) : 0,
      },
      featureMix,
      byCategory,
      byProvider: sortBuckets(providerBuckets).map(finalizeBucket),
      byModel: sortBuckets(modelBuckets).slice(0, 12).map(finalizeBucket),
      daily: Array.from(dailyBuckets.values()).map((day) => ({
        ...day,
        costUsd: normalizeMoney(day.costUsd),
        costSek: roundSek(day.costSek),
      })),
      margin,
      topUps,
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    logger.error('Error fetching admin AI costs', {}, error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch AI cost overview' },
      { status: 500 },
    )
  }
}

function buildTopUpOverview(purchases: Array<{
  clientId: string
  amountPaidSek: number
  creditsSek: number
  creditsRemainingSek: number
  status: string
  createdAt: Date
}>) {
  const activePurchases = purchases.filter((purchase) => purchase.status === 'ACTIVE')
  const activeBuyerIds = new Set(activePurchases.map((purchase) => purchase.clientId))
  const totalRevenueSek = activePurchases.reduce((sum, purchase) => sum + purchase.amountPaidSek, 0)
  const creditsSoldSek = activePurchases.reduce((sum, purchase) => sum + purchase.creditsSek, 0)
  const creditsRemainingSek = activePurchases.reduce((sum, purchase) => sum + purchase.creditsRemainingSek, 0)

  return {
    purchases: purchases.length,
    activePurchases: activePurchases.length,
    pendingPurchases: purchases.filter((purchase) => purchase.status === 'PENDING').length,
    refundedPurchases: purchases.filter((purchase) => purchase.status === 'REFUNDED').length,
    activeBuyers: activeBuyerIds.size,
    revenueSek: roundSek(totalRevenueSek),
    creditsSoldSek: roundSek(creditsSoldSek),
    creditsRemainingSek: roundSek(creditsRemainingSek),
    conversionPercent: purchases.length > 0
      ? Math.round((activePurchases.length / purchases.length) * 100)
      : 0,
    recent: purchases.slice(0, 8).map((purchase) => ({
      clientId: purchase.clientId,
      amountPaidSek: purchase.amountPaidSek,
      creditsSek: purchase.creditsSek,
      status: purchase.status,
      createdAt: purchase.createdAt.toISOString(),
    })),
  }
}

async function buildAthleteMarginOverview(
  clientBuckets: Map<string, { calls: number; costUsd: number; inputTokens: number; outputTokens: number }>,
) {
  const clientIds = Array.from(clientBuckets.keys())
  if (clientIds.length === 0) {
    return {
      byTier: [],
      riskUsers: [],
    }
  }

  const clients = await prisma.client.findMany({
    where: { id: { in: clientIds } },
    select: {
      id: true,
      name: true,
      email: true,
      athleteSubscription: {
        select: {
          tier: true,
          customAiAllowanceSek: true,
          business: {
            select: {
              name: true,
              elitePriceMonthly: true,
              eliteAiAllowanceSek: true,
            },
          },
        },
      },
    },
  })

  const clientMap = new Map(clients.map((client) => [client.id, client]))
  const tierBuckets = new Map<string, {
    tier: string
    athletes: Set<string>
    calls: number
    costSek: number
    monthlyRevenueSek: number
    includedAllowanceSek: number
  }>()

  const riskUsers = clientIds.map((clientId) => {
    const usage = clientBuckets.get(clientId)!
    const client = clientMap.get(clientId)
    const subscription = client?.athleteSubscription
    const tier = subscription?.tier ?? 'FREE'
    const monthlyRevenueSek = getMonthlyRevenueSek(tier as AthletePlanTier, subscription?.business?.elitePriceMonthly)
    const costSek = usdToSek(usage.costUsd)
    const allowanceSek = subscription?.customAiAllowanceSek
      ?? (tier === 'ELITE' ? subscription?.business?.eliteAiAllowanceSek : null)
      ?? getDefaultMonthlyAllowanceSek(tier as AthletePlanTier)
    const costToRevenuePercent = monthlyRevenueSek > 0
      ? Math.round((costSek / monthlyRevenueSek) * 100)
      : null
    const allowanceUsedPercent = allowanceSek > 0
      ? Math.round((costSek / allowanceSek) * 100)
      : null

    const tierBucket = tierBuckets.get(tier) ?? {
      tier,
      athletes: new Set<string>(),
      calls: 0,
      costSek: 0,
      monthlyRevenueSek: 0,
      includedAllowanceSek: 0,
    }
    tierBucket.athletes.add(clientId)
    tierBucket.calls += usage.calls
    tierBucket.costSek += costSek
    tierBucket.monthlyRevenueSek += monthlyRevenueSek
    tierBucket.includedAllowanceSek += allowanceSek
    tierBuckets.set(tier, tierBucket)

    return {
      clientId,
      name: client?.name ?? 'Unknown athlete',
      email: client?.email ?? null,
      tier,
      businessName: subscription?.business?.name ?? null,
      calls: usage.calls,
      costSek: roundSek(costSek),
      monthlyRevenueSek,
      includedAllowanceSek: roundSek(allowanceSek),
      costToRevenuePercent,
      allowanceUsedPercent,
    }
  })
    .sort((a, b) => {
      const aRisk = a.costToRevenuePercent ?? a.allowanceUsedPercent ?? 0
      const bRisk = b.costToRevenuePercent ?? b.allowanceUsedPercent ?? 0
      return bRisk - aRisk || b.costSek - a.costSek
    })
    .slice(0, 12)

  const byTier = Array.from(tierBuckets.values())
    .map((bucket) => ({
      tier: bucket.tier,
      athletes: bucket.athletes.size,
      calls: bucket.calls,
      costSek: roundSek(bucket.costSek),
      monthlyRevenueSek: roundSek(bucket.monthlyRevenueSek),
      includedAllowanceSek: roundSek(bucket.includedAllowanceSek),
      costToRevenuePercent: bucket.monthlyRevenueSek > 0
        ? Math.round((bucket.costSek / bucket.monthlyRevenueSek) * 100)
        : null,
      averageCostPerAthleteSek: bucket.athletes.size > 0
        ? roundSek(bucket.costSek / bucket.athletes.size)
        : 0,
    }))
    .sort((a, b) => b.costSek - a.costSek)

  return { byTier, riskUsers }
}

function buildFeatureMixOverview(
  byCategory: Array<ReturnType<typeof finalizeBucket>>,
  totalCalls: number,
  totalCostSek: number,
) {
  const foodScanner = summarizeCategories(byCategory, ['food_scan', 'food_scan_memory'])
  const heavyInteractive = summarizeCategories(byCategory, [
    'live_voice_coach',
    'voice_workout_summary',
    'video_analysis',
    'program_generation',
    'program_phase_generation',
    'deep_research',
    'report_generation',
  ])
  const topCategory = byCategory[0] ?? null

  return {
    foodScanner: {
      ...foodScanner,
      costSharePercent: percentage(foodScanner.costSek, totalCostSek),
      callSharePercent: percentage(foodScanner.calls, totalCalls),
    },
    heavyInteractive: {
      ...heavyInteractive,
      costSharePercent: percentage(heavyInteractive.costSek, totalCostSek),
      callSharePercent: percentage(heavyInteractive.calls, totalCalls),
    },
    topCategory: topCategory
      ? {
          key: topCategory.key,
          label: topCategory.label,
          calls: topCategory.calls,
          costSek: topCategory.costSek,
          costSharePercent: percentage(topCategory.costSek, totalCostSek),
          callSharePercent: percentage(topCategory.calls, totalCalls),
        }
      : null,
  }
}

function summarizeCategories(
  byCategory: Array<ReturnType<typeof finalizeBucket>>,
  categoryKeys: string[],
) {
  const keySet = new Set(categoryKeys)
  const buckets = byCategory.filter((bucket) => keySet.has(bucket.key))
  const calls = buckets.reduce((sum, bucket) => sum + bucket.calls, 0)
  const costSek = roundSek(buckets.reduce((sum, bucket) => sum + bucket.costSek, 0))
  const athleteLinkedCalls = buckets.reduce((sum, bucket) => sum + bucket.athleteLinkedCalls, 0)
  const athleteLinkedCostSek = roundSek(buckets.reduce((sum, bucket) => sum + bucket.athleteLinkedCostSek, 0))

  return {
    calls,
    costSek,
    athleteLinkedCalls,
    athleteLinkedCostSek,
    categories: buckets.map((bucket) => ({
      key: bucket.key,
      label: bucket.label,
      calls: bucket.calls,
      costSek: bucket.costSek,
    })),
  }
}

function getMonthlyRevenueSek(tier: AthletePlanTier, elitePriceMonthlyOre: number | null | undefined): number {
  if (tier === 'ELITE') return elitePriceMonthlyOre ? Math.round(elitePriceMonthlyOre / 100) : 0
  if (tier === 'FREE') return ATHLETE_PLAN_PRICING.FREE.monthlySek
  if (tier === 'STANDARD') return ATHLETE_PLAN_PRICING.STANDARD.monthlySek
  if (tier === 'PRO') return ATHLETE_PLAN_PRICING.PRO.monthlySek
  return 0
}

function getDefaultMonthlyAllowanceSek(tier: AthletePlanTier): number {
  return ATHLETE_AI_ALLOWANCE_SEK[tier] ?? 0
}

function addToBucket(
  buckets: Map<string, CostBucket>,
  key: string,
  label: string,
  log: {
    inputTokens: number
    outputTokens: number
    clientId: string | null
  },
  costUsd: number,
) {
  const bucket = buckets.get(key) ?? {
    key,
    label,
    calls: 0,
    inputTokens: 0,
    outputTokens: 0,
    costUsd: 0,
    costSek: 0,
    athleteLinkedCalls: 0,
    athleteLinkedCostUsd: 0,
  }

  bucket.calls += 1
  bucket.inputTokens += Math.max(0, log.inputTokens)
  bucket.outputTokens += Math.max(0, log.outputTokens)
  bucket.costUsd += costUsd
  bucket.costSek = usdToSek(bucket.costUsd)

  if (log.clientId) {
    bucket.athleteLinkedCalls += 1
    bucket.athleteLinkedCostUsd += costUsd
  }

  buckets.set(key, bucket)
}

function finalizeBucket(bucket: CostBucket) {
  const costSek = roundSek(bucket.costSek)
  return {
    ...bucket,
    costUsd: normalizeMoney(bucket.costUsd),
    costSek,
    athleteLinkedCostUsd: normalizeMoney(bucket.athleteLinkedCostUsd),
    athleteLinkedCostSek: usdToSek(bucket.athleteLinkedCostUsd),
    averageCostSek: bucket.calls > 0 ? roundSek(costSek / bucket.calls) : 0,
  }
}

function sortBuckets(buckets: Map<string, CostBucket>): CostBucket[] {
  return Array.from(buckets.values()).sort((a, b) => b.costUsd - a.costUsd)
}

function readNumber(searchParams: URLSearchParams, key: string, fallback: number): number {
  const value = searchParams.get(key)
  if (!value) return fallback

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.floor(value)))
}

function normalizeMoney(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000
}

function roundSek(value: number): number {
  return Math.round(value * 100) / 100
}

function percentage(part: number, total: number): number {
  if (total <= 0) return 0
  return Math.round((part / total) * 100)
}

function formatProvider(provider: string): string {
  if (!provider) return 'Unknown'
  return provider.charAt(0).toUpperCase() + provider.slice(1).toLowerCase()
}

function formatCategory(category: string): string {
  if (!category) return 'Unknown'

  const labels: Record<string, string> = {
    food_scan: 'Food scanner',
    food_scan_memory: 'Food scanner memory',
    live_voice_coach: 'Live voice coach',
    voice_workout_summary: 'Voice workout summary',
    video_analysis: 'Video analysis',
    nutrition_plan: 'Nutrition plan',
    daily_wod: 'Daily WOD',
    audio_journal: 'Audio journal',
    test_import: 'Test import',
    lactate_scan: 'Lactate scan',
    program_generation: 'Program generation',
    program_phase_generation: 'Program phase generation',
    deep_research: 'Deep research',
    report_generation: 'Report generation',
    menstrual_cycle_insights: 'Cycle insights',
    performance_analysis: 'Performance analysis',
    chat: 'AI chat',
    briefing: 'Briefing',
    mental_prep: 'Mental prep',
    pattern_detection: 'Pattern detection',
    preworkout_nudge: 'Pre-workout nudge',
    post_workout_checkin: 'Post-workout check-in',
  }

  return labels[category] ?? category
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}
