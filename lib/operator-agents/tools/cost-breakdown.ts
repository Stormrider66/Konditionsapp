import { prisma } from '@/lib/prisma'
import type { OperatorToolResult } from '../types'

type MarginStatus = 'PROFITABLE' | 'THIN_MARGIN' | 'LOSS' | 'FREE_LOSS' | 'PLATFORM_OVERHEAD'

type RevenueEntityType = 'CLIENT' | 'USER_OVERHEAD' | 'UNATTRIBUTED'

function roundUsd(value: number, digits = 3): number {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

export async function getCostBreakdownByEntity(days: number = 30): Promise<OperatorToolResult> {
  try {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    // Get all logs in period with user role
    const logs = await prisma.aIUsageLog.findMany({
      where: { createdAt: { gte: since } },
      select: {
        estimatedCost: true,
        inputTokens: true,
        outputTokens: true,
        userId: true,
        user: { select: { role: true, adminRole: true } },
      },
    })

    // Aggregate by role
    const byRole: Record<string, { count: number; cost: number; tokens: number }> = {
      ATHLETE: { count: 0, cost: 0, tokens: 0 },
      COACH: { count: 0, cost: 0, tokens: 0 },
      PHYSIO: { count: 0, cost: 0, tokens: 0 },
      ADMIN: { count: 0, cost: 0, tokens: 0 },
      UNKNOWN: { count: 0, cost: 0, tokens: 0 },
    }

    for (const log of logs) {
      const role = log.user?.adminRole ? 'ADMIN' : (log.user?.role || 'UNKNOWN')
      const bucket = byRole[role] || byRole.UNKNOWN
      bucket.count++
      bucket.cost += log.estimatedCost
      bucket.tokens += log.inputTokens + log.outputTokens
    }

    // Round costs
    for (const key of Object.keys(byRole)) {
      byRole[key].cost = Math.round(byRole[key].cost * 1000) / 1000
    }

    const totalCost = logs.reduce((s, l) => s + l.estimatedCost, 0)

    return {
      success: true,
      data: {
        days,
        totalRequests: logs.length,
        totalCostUsd: Math.round(totalCost * 1000) / 1000,
        byRole,
        platformOverheadUsd: byRole.ADMIN.cost,
        userDrivenUsd: byRole.ATHLETE.cost + byRole.COACH.cost + byRole.PHYSIO.cost,
      },
    }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

/**
 * Top-spending individual users with their role and subscription tier.
 */
export async function getTopSpendingUsers(days: number = 30, limit: number = 10): Promise<OperatorToolResult> {
  try {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    const grouped = await prisma.aIUsageLog.groupBy({
      by: ['userId'],
      where: { createdAt: { gte: since } },
      _sum: { estimatedCost: true, inputTokens: true, outputTokens: true },
      orderBy: { _sum: { estimatedCost: 'desc' } },
      take: limit,
    })

    // Enrich with user + client subscription data. A user can own many Client
    // rows (admin/coach impersonation and athlete mode), so never infer tier
    // from an arbitrary first client.
    const userIds = grouped.map(g => g.userId).filter((id): id is string => Boolean(id))
    const [users, linkedGroups] = await Promise.all([
      prisma.user.findMany({
        where: { id: { in: userIds } },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          adminRole: true,
        },
      }),
      prisma.aIUsageLog.groupBy({
        by: ['userId', 'clientId'],
        where: {
          createdAt: { gte: since },
          userId: { in: userIds },
          clientId: { not: null },
        },
        _sum: { estimatedCost: true },
      }),
    ])
    const userMap = new Map(users.map(u => [u.id, u]))
    const clientIds = Array.from(new Set(linkedGroups.map(l => l.clientId).filter((id): id is string => Boolean(id))))
    const clients = await prisma.client.findMany({
      where: { id: { in: clientIds } },
      select: {
        id: true,
        name: true,
        email: true,
        athleteSubscription: {
          select: { tier: true, status: true },
        },
        business: {
          select: { name: true },
        },
      },
    })
    const clientMap = new Map(clients.map(c => [c.id, c]))
    const clientSpendByUser = new Map<string, Map<string, number>>()

    for (const log of linkedGroups) {
      if (!log.userId || !log.clientId) continue
      const cost = log._sum.estimatedCost || 0
      const byClient = clientSpendByUser.get(log.userId) ?? new Map<string, number>()
      byClient.set(log.clientId, (byClient.get(log.clientId) ?? 0) + cost)
      clientSpendByUser.set(log.userId, byClient)
    }

    const topSpenders = grouped.map(g => {
      const user = g.userId ? userMap.get(g.userId) : null
      const cost = g._sum.estimatedCost || 0
      const byClient = g.userId ? clientSpendByUser.get(g.userId) : undefined
      const clientSpend = byClient
        ? Array.from(byClient.entries())
          .map(([clientId, clientCost]) => ({ clientId, clientCost, client: clientMap.get(clientId) }))
          .sort((a, b) => b.clientCost - a.clientCost)
        : []
      const topClient = clientSpend[0] ?? null
      const athleteLinkedCost = clientSpend.reduce((sum, row) => sum + row.clientCost, 0)

      return {
        userId: g.userId ?? 'unattributed',
        name: user?.name || (g.userId ? 'Unknown' : 'Unattributed'),
        email: user?.email,
        role: user?.adminRole ? 'ADMIN' : user?.role,
        tier: topClient?.client?.athleteSubscription?.tier || 'N/A',
        subscriptionStatus: topClient?.client?.athleteSubscription?.status || 'N/A',
        linkedClientCount: clientSpend.length,
        topClient: topClient
          ? {
              clientId: topClient.clientId,
              name: topClient.client?.name || 'Unknown athlete',
              email: topClient.client?.email,
              businessName: topClient.client?.business?.name ?? null,
              tier: topClient.client?.athleteSubscription?.tier || 'N/A',
              subscriptionStatus: topClient.client?.athleteSubscription?.status || 'N/A',
              costUsd: roundUsd(topClient.clientCost),
            }
          : null,
        athleteLinkedCostUsd: roundUsd(athleteLinkedCost),
        platformOrUnlinkedCostUsd: roundUsd(Math.max(0, cost - athleteLinkedCost)),
        totalCostUsd: roundUsd(cost),
        totalTokens: (g._sum.inputTokens || 0) + (g._sum.outputTokens || 0),
      }
    })

    return {
      success: true,
      data: { days, limit, topSpenders },
    }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

/**
 * Aggregate AI spend by business.
 * Joins client-linked spend through AIUsageLog.clientId first, then falls
 * back to the actor's business membership for unlinked coach/admin usage.
 */
export async function getCostBreakdownByBusiness(days: number = 30): Promise<OperatorToolResult> {
  try {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    const logs = await prisma.aIUsageLog.groupBy({
      by: ['userId', 'clientId'],
      where: { createdAt: { gte: since } },
      _sum: { estimatedCost: true, inputTokens: true, outputTokens: true },
    })

    const clientIds = Array.from(new Set(logs.map(l => l.clientId).filter((id): id is string => Boolean(id))))
    const unlinkedUserIds = Array.from(new Set(
      logs
        .filter(l => !l.clientId && l.userId)
        .map(l => l.userId)
        .filter((id): id is string => Boolean(id)),
    ))

    const [clients, memberships] = await Promise.all([
      prisma.client.findMany({
        where: { id: { in: clientIds } },
        select: { id: true, businessId: true },
      }),
      prisma.businessMember.findMany({
        where: { userId: { in: unlinkedUserIds }, isActive: true },
        select: { userId: true, businessId: true },
        orderBy: { createdAt: 'asc' },
      }),
    ])

    const clientToBusiness = new Map(clients.map(c => [c.id, c.businessId]))
    const userToBusiness = new Map<string, string>()
    for (const membership of memberships) {
      if (!userToBusiness.has(membership.userId)) {
        userToBusiness.set(membership.userId, membership.businessId)
      }
    }

    // Aggregate by business
    const byBusiness: Record<string, { cost: number; tokens: number; userCount: Set<string> }> = {}
    const noBusiness = { cost: 0, tokens: 0, userCount: new Set<string>() }

    for (const log of logs) {
      const businessId = log.clientId
        ? clientToBusiness.get(log.clientId)
        : log.userId ? userToBusiness.get(log.userId) : null
      const cost = log._sum.estimatedCost || 0
      const tokens = (log._sum.inputTokens || 0) + (log._sum.outputTokens || 0)
      const actorKey = log.clientId ? `client:${log.clientId}` : `user:${log.userId ?? 'unattributed'}`

      if (!businessId) {
        noBusiness.cost += cost
        noBusiness.tokens += tokens
        noBusiness.userCount.add(actorKey)
      } else {
        if (!byBusiness[businessId]) {
          byBusiness[businessId] = { cost: 0, tokens: 0, userCount: new Set() }
        }
        byBusiness[businessId].cost += cost
        byBusiness[businessId].tokens += tokens
        byBusiness[businessId].userCount.add(actorKey)
      }
    }

    // Get business names
    const businessIds = Object.keys(byBusiness)
    const businesses = await prisma.business.findMany({
      where: { id: { in: businessIds } },
      select: { id: true, name: true },
    })
    const businessNames = new Map(businesses.map(b => [b.id, b.name]))

    const breakdown = businessIds
      .map(id => ({
        businessId: id,
        businessName: businessNames.get(id) || 'Unknown',
        costUsd: roundUsd(byBusiness[id].cost),
        tokens: byBusiness[id].tokens,
        userCount: byBusiness[id].userCount.size,
        costPerUserUsd: roundUsd(byBusiness[id].cost / byBusiness[id].userCount.size),
      }))
      .sort((a, b) => b.costUsd - a.costUsd)

    return {
      success: true,
      data: {
        days,
        businesses: breakdown,
        independent: {
          costUsd: roundUsd(noBusiness.cost),
          userCount: noBusiness.userCount.size,
          tokens: noBusiness.tokens,
        },
      },
    }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

// ============================================================================
// LIMIT TRACKING
// ============================================================================

/**
 * Find users who are at or approaching their AI chat message limit.
 * Reports both athletes (via AthleteSubscription) and tier limits.
 */
export async function getUsersNearLimits(thresholdPercent: number = 80): Promise<OperatorToolResult> {
  try {
    const subs = await prisma.athleteSubscription.findMany({
      where: {
        status: { in: ['ACTIVE', 'TRIAL'] },
        aiChatMessagesLimit: { gt: 0 }, // Ignore unlimited (-1) and disabled (0)
      },
      select: {
        clientId: true,
        tier: true,
        aiChatMessagesUsed: true,
        aiChatMessagesLimit: true,
        client: { select: { name: true, userId: true } },
      },
    })

    const nearLimit = subs
      .map(s => {
        const percent = s.aiChatMessagesLimit > 0
          ? (s.aiChatMessagesUsed / s.aiChatMessagesLimit) * 100
          : 0
        return {
          clientId: s.clientId,
          userId: s.client.userId,
          name: s.client.name,
          tier: s.tier,
          used: s.aiChatMessagesUsed,
          limit: s.aiChatMessagesLimit,
          percentUsed: Math.round(percent * 10) / 10,
          status: percent >= 100 ? 'EXCEEDED' : percent >= 95 ? 'CRITICAL' : percent >= 80 ? 'WARNING' : 'OK',
        }
      })
      .filter(u => u.percentUsed >= thresholdPercent)
      .sort((a, b) => b.percentUsed - a.percentUsed)

    const exceeded = nearLimit.filter(u => u.status === 'EXCEEDED').length
    const critical = nearLimit.filter(u => u.status === 'CRITICAL').length
    const warning = nearLimit.filter(u => u.status === 'WARNING').length

    return {
      success: true,
      data: {
        thresholdPercent,
        totalAtRisk: nearLimit.length,
        exceeded,
        critical,
        warning,
        users: nearLimit.slice(0, 20),
      },
    }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

// ============================================================================
// REVENUE vs COST MARGIN ANALYSIS
// ============================================================================

/**
 * Get the monthly revenue per tier from PricingTier config.
 * Converts SEK → USD using the FX rate from PlatformConfig / env var.
 */
async function getTierRevenueMap(): Promise<Map<string, number>> {
  const { getSekPerUsd } = await import('../fx-rates')

  // Fetch the rate ONCE for the batch
  const sekPerUsd = await getSekPerUsd()

  const tiers = await prisma.pricingTier.findMany({
    where: { tierType: 'ATHLETE', isActive: true },
    select: { tierName: true, monthlyPriceCents: true, currency: true },
  })

  const map = new Map<string, number>()
  for (const t of tiers) {
    // Convert öre (cents) to SEK, then SEK to USD using configured rate
    const monthlySek = t.monthlyPriceCents / 100
    const monthlyUsd = t.currency === 'USD' ? monthlySek : monthlySek / sekPerUsd
    map.set(t.tierName, monthlyUsd)
  }
  return map
}

/**
 * Calculate gross margin (revenue - cost) per billable athlete/client and by
 * tier. User-only rows are kept as platform overhead instead of being matched
 * to an arbitrary client owned by the same user.
 * Flags users where AI cost exceeds or approaches their subscription revenue.
 */
export async function getRevenueVsCost(days: number = 30): Promise<OperatorToolResult> {
  try {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    const logs = await prisma.aIUsageLog.groupBy({
      by: ['userId', 'clientId'],
      where: { createdAt: { gte: since } },
      _sum: { estimatedCost: true },
    })

    const costByClient = new Map<string, number>()
    const overheadByUser = new Map<string, { userId: string | null; cost: number }>()

    for (const log of logs) {
      const cost = log._sum.estimatedCost || 0
      if (log.clientId) {
        costByClient.set(log.clientId, (costByClient.get(log.clientId) ?? 0) + cost)
        continue
      }

      const key = log.userId ?? 'unattributed'
      const bucket = overheadByUser.get(key) ?? { userId: log.userId ?? null, cost: 0 }
      bucket.cost += cost
      overheadByUser.set(key, bucket)
    }

    const clientIds = Array.from(costByClient.keys())
    const overheadUserIds = Array.from(overheadByUser.values())
      .map(bucket => bucket.userId)
      .filter((id): id is string => Boolean(id))

    const [tierRevenue, clients, users] = await Promise.all([
      getTierRevenueMap(),
      prisma.client.findMany({
        where: { id: { in: clientIds } },
        select: {
          id: true,
          name: true,
          email: true,
          userId: true,
          user: {
            select: {
              name: true,
              role: true,
              adminRole: true,
            },
          },
          athleteSubscription: {
            select: { tier: true, status: true },
          },
        },
      }),
      prisma.user.findMany({
        where: { id: { in: overheadUserIds } },
        select: {
          id: true,
          name: true,
          role: true,
          adminRole: true,
        },
      }),
    ])

    // Period adjustment (cost is over `days`, revenue is monthly)
    const periodFraction = days / 30

    const clientMap = new Map(clients.map(c => [c.id, c]))
    const userMap = new Map(users.map(u => [u.id, u]))

    type MarginEntry = {
      entityType: RevenueEntityType
      userId: string
      clientId: string | null
      name: string
      role: string | undefined
      tier: string
      subscriptionStatus: string | null
      costUsd: number
      revenueUsd: number
      marginUsd: number
      marginPercent: number | null
      status: MarginStatus
    }

    const entries: MarginEntry[] = []
    let totalCost = 0
    let totalRevenue = 0
    let clientLinkedCost = 0
    let platformOverheadCost = 0

    for (const [clientId, cost] of costByClient.entries()) {
      const client = clientMap.get(clientId)
      const subscription = client?.athleteSubscription
      const tier = subscription?.tier || 'FREE'
      const subscriptionStatus = subscription?.status ?? null
      const monthlyRevenue = tierRevenue.get(tier) || 0
      const periodRevenue = monthlyRevenue * periodFraction

      // Only count revenue for ACTIVE (not TRIAL — they're not paying yet)
      const effectiveRevenue = subscriptionStatus === 'ACTIVE' ? periodRevenue : 0

      const margin = effectiveRevenue - cost
      const marginPct = effectiveRevenue > 0 ? (margin / effectiveRevenue) * 100 : null

      let marginStatus: MarginStatus
      if (tier === 'FREE' && cost > 0.01) marginStatus = 'FREE_LOSS'
      else if (margin < 0) marginStatus = 'LOSS'
      else if (marginPct !== null && marginPct < 30) marginStatus = 'THIN_MARGIN'
      else marginStatus = 'PROFITABLE'

      entries.push({
        entityType: 'CLIENT',
        userId: client?.userId ?? 'unknown',
        clientId,
        name: client?.name || 'Unknown athlete',
        role: client?.user?.adminRole ? 'ADMIN' : client?.user?.role,
        tier,
        subscriptionStatus,
        costUsd: roundUsd(cost),
        revenueUsd: Math.round(effectiveRevenue * 100) / 100,
        marginUsd: Math.round(margin * 100) / 100,
        marginPercent: marginPct !== null ? Math.round(marginPct * 10) / 10 : null,
        status: marginStatus,
      })

      totalCost += cost
      totalRevenue += effectiveRevenue
      clientLinkedCost += cost
    }

    for (const bucket of overheadByUser.values()) {
      const user = bucket.userId ? userMap.get(bucket.userId) : null
      const cost = bucket.cost

      entries.push({
        entityType: bucket.userId ? 'USER_OVERHEAD' : 'UNATTRIBUTED',
        userId: bucket.userId ?? 'unattributed',
        clientId: null,
        name: user?.name || (bucket.userId ? 'Unknown user' : 'Unattributed'),
        role: user?.adminRole ? 'ADMIN' : user?.role,
        tier: 'PLATFORM_OVERHEAD',
        subscriptionStatus: null,
        costUsd: roundUsd(cost),
        revenueUsd: 0,
        marginUsd: Math.round(-cost * 100) / 100,
        marginPercent: null,
        status: 'PLATFORM_OVERHEAD',
      })

      totalCost += cost
      platformOverheadCost += cost
    }

    // Sort client margin problems first; platform overhead is tracked but is
    // not a subscription conversion problem.
    entries.sort((a, b) => {
      const aOverhead = a.status === 'PLATFORM_OVERHEAD' ? 1 : 0
      const bOverhead = b.status === 'PLATFORM_OVERHEAD' ? 1 : 0
      return aOverhead - bOverhead || a.marginUsd - b.marginUsd
    })

    // Summary by tier
    const byTier: Record<string, { count: number; cost: number; revenue: number; margin: number }> = {}
    for (const e of entries) {
      if (!byTier[e.tier]) byTier[e.tier] = { count: 0, cost: 0, revenue: 0, margin: 0 }
      byTier[e.tier].count++
      byTier[e.tier].cost += e.costUsd
      byTier[e.tier].revenue += e.revenueUsd
      byTier[e.tier].margin += e.marginUsd
    }
    for (const k of Object.keys(byTier)) {
      byTier[k].cost = Math.round(byTier[k].cost * 100) / 100
      byTier[k].revenue = Math.round(byTier[k].revenue * 100) / 100
      byTier[k].margin = Math.round(byTier[k].margin * 100) / 100
    }

    // Counts
    const losses = entries.filter(e => e.status === 'LOSS').length
    const freeLosses = entries.filter(e => e.status === 'FREE_LOSS').length
    const thinMargin = entries.filter(e => e.status === 'THIN_MARGIN').length
    const platformOverhead = entries.filter(e => e.status === 'PLATFORM_OVERHEAD').length
    const atRiskUsers = entries.filter(e => e.status === 'LOSS' || e.status === 'FREE_LOSS')

    return {
      success: true,
      data: {
        days,
        totalUsersAnalyzed: entries.length,
        totalCostUsd: Math.round(totalCost * 100) / 100,
        totalRevenueUsd: Math.round(totalRevenue * 100) / 100,
        totalMarginUsd: Math.round((totalRevenue - totalCost) * 100) / 100,
        clientLinkedCostUsd: Math.round(clientLinkedCost * 100) / 100,
        platformOverheadCostUsd: Math.round(platformOverheadCost * 100) / 100,
        platformMarginPercent: totalRevenue > 0
          ? Math.round(((totalRevenue - totalCost) / totalRevenue) * 1000) / 10
          : null,
        counts: {
          losses,
          freeLosses,
          thinMargin,
          platformOverhead,
          profitable: entries.length - losses - freeLosses - thinMargin - platformOverhead,
        },
        byTier,
        atRiskUserCount: atRiskUsers.length,
        atRiskUsers: atRiskUsers.slice(0, 50),
        worstOffenders: entries.slice(0, 10),
        note: 'Client-linked usage is matched by AIUsageLog.clientId to the athlete subscription. Rows without clientId are platform overhead, not subscription margin losses. Revenue uses FX_SEK_TO_USD/PlatformConfig to convert PricingTier SEK amounts to USD.',
      },
    }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

/**
 * Find users whose AI costs exceed or approach their subscription revenue (margin at-risk).
 */
export async function getMarginAtRiskUsers(days: number = 30): Promise<OperatorToolResult> {
  try {
    const result = await getRevenueVsCost(days)
    if (!result.success || !result.data) return result

    const data = result.data as {
      atRiskUserCount?: number
      atRiskUsers?: unknown[]
      worstOffenders: unknown[]
      counts: Record<string, number>
    }
    const atRisk = (data.atRiskUsers ?? data.worstOffenders).filter((u): u is { status: string } => (
      typeof u === 'object' &&
      u !== null &&
      'status' in u &&
      ((u as { status: string }).status === 'LOSS' || (u as { status: string }).status === 'FREE_LOSS')
    ))

    return {
      success: true,
      data: {
        days,
        atRiskCount: data.atRiskUserCount ?? atRisk.length,
        atRiskUsers: atRisk,
        summary: data.counts,
      },
    }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

// ============================================================================
// FEATURE CURATOR TOOLS
// ============================================================================
