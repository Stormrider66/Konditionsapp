import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'
import { logger } from '@/lib/logger'
import { prisma } from '@/lib/prisma'
import { usdToSek } from '@/lib/ai/billing/allowance'

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

    const logs = await prisma.aIUsageLog.findMany({
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
    })

    const categoryBuckets = new Map<string, CostBucket>()
    const providerBuckets = new Map<string, CostBucket>()
    const modelBuckets = new Map<string, CostBucket>()
    const dailyBuckets = new Map<string, { date: string; calls: number; costUsd: number; costSek: number }>()

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
      byCategory: sortBuckets(categoryBuckets).map(finalizeBucket),
      byProvider: sortBuckets(providerBuckets).map(finalizeBucket),
      byModel: sortBuckets(modelBuckets).slice(0, 12).map(finalizeBucket),
      daily: Array.from(dailyBuckets.values()).map((day) => ({
        ...day,
        costUsd: normalizeMoney(day.costUsd),
        costSek: roundSek(day.costSek),
      })),
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
