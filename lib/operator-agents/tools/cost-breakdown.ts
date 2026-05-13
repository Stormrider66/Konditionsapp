import { prisma } from '@/lib/prisma'
import type { OperatorToolResult } from '../types'

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

    // Enrich with user + subscription data
    const userIds = grouped.map(g => g.userId).filter((id): id is string => Boolean(id))
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        clients: {
          select: {
            athleteSubscription: {
              select: { tier: true, status: true },
            },
          },
          take: 1,
        },
      },
    })
    const userMap = new Map(users.map(u => [u.id, u]))

    const topSpenders = grouped.map(g => {
      const user = g.userId ? userMap.get(g.userId) : null
      const cost = g._sum.estimatedCost || 0
      return {
        userId: g.userId ?? 'unattributed',
        name: user?.name || (g.userId ? 'Unknown' : 'Unattributed'),
        email: user?.email,
        role: user?.role,
        tier: user?.clients[0]?.athleteSubscription?.tier || 'N/A',
        subscriptionStatus: user?.clients[0]?.athleteSubscription?.status || 'N/A',
        totalCostUsd: Math.round(cost * 1000) / 1000,
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
 * Joins AIUsageLog → User → Client → Business.
 */
export async function getCostBreakdownByBusiness(days: number = 30): Promise<OperatorToolResult> {
  try {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    // Get all logs grouped by userId
    const grouped = await prisma.aIUsageLog.groupBy({
      by: ['userId'],
      where: { createdAt: { gte: since } },
      _sum: { estimatedCost: true, inputTokens: true, outputTokens: true },
    })

    // Map each user to their business (via Client.businessId)
    const userIds = grouped.map(g => g.userId).filter((id): id is string => Boolean(id))
    const clients = await prisma.client.findMany({
      where: { userId: { in: userIds } },
      select: { userId: true, businessId: true, name: true },
    })
    const userToBusiness = new Map<string, string | null>()
    for (const c of clients) {
      userToBusiness.set(c.userId, c.businessId)
    }

    // Aggregate by business
    const byBusiness: Record<string, { cost: number; tokens: number; userCount: Set<string> }> = {}
    const noBusiness = { cost: 0, tokens: 0, userCount: new Set<string>() }

    for (const g of grouped) {
      const businessId = g.userId ? userToBusiness.get(g.userId) : null
      const cost = g._sum.estimatedCost || 0
      const tokens = (g._sum.inputTokens || 0) + (g._sum.outputTokens || 0)

      if (!businessId) {
        noBusiness.cost += cost
        noBusiness.tokens += tokens
        noBusiness.userCount.add(g.userId ?? 'unattributed')
      } else {
        if (!byBusiness[businessId]) {
          byBusiness[businessId] = { cost: 0, tokens: 0, userCount: new Set() }
        }
        byBusiness[businessId].cost += cost
        byBusiness[businessId].tokens += tokens
        byBusiness[businessId].userCount.add(g.userId ?? 'unattributed')
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
        costUsd: Math.round(byBusiness[id].cost * 1000) / 1000,
        tokens: byBusiness[id].tokens,
        userCount: byBusiness[id].userCount.size,
        costPerUserUsd: Math.round((byBusiness[id].cost / byBusiness[id].userCount.size) * 1000) / 1000,
      }))
      .sort((a, b) => b.costUsd - a.costUsd)

    return {
      success: true,
      data: {
        days,
        businesses: breakdown,
        independent: {
          costUsd: Math.round(noBusiness.cost * 1000) / 1000,
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
 * Calculate gross margin (revenue - cost) per user and by tier.
 * Flags users where AI cost exceeds or approaches their subscription revenue.
 */
export async function getRevenueVsCost(days: number = 30): Promise<OperatorToolResult> {
  try {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    // Get all AI cost grouped by userId
    const grouped = await prisma.aIUsageLog.groupBy({
      by: ['userId'],
      where: { createdAt: { gte: since } },
      _sum: { estimatedCost: true },
    })

    // Get tier revenues
    const tierRevenue = await getTierRevenueMap()
    // Period adjustment (cost is over `days`, revenue is monthly)
    const periodFraction = days / 30

    // Enrich with subscription info
    const userIds = grouped.map(g => g.userId).filter((id): id is string => Boolean(id))
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        name: true,
        role: true,
        clients: {
          select: {
            athleteSubscription: {
              select: { tier: true, status: true },
            },
          },
          take: 1,
        },
      },
    })
    const userMap = new Map(users.map(u => [u.id, u]))

    // Calculate margin per user
    type MarginEntry = {
      userId: string
      name: string
      role: string | undefined
      tier: string
      costUsd: number
      revenueUsd: number
      marginUsd: number
      marginPercent: number | null
      status: 'PROFITABLE' | 'THIN_MARGIN' | 'LOSS' | 'FREE_LOSS'
    }

    const entries: MarginEntry[] = []
    let totalCost = 0
    let totalRevenue = 0

    for (const g of grouped) {
      const user = g.userId ? userMap.get(g.userId) : null
      const tier = user?.clients[0]?.athleteSubscription?.tier || 'FREE'
      const status = user?.clients[0]?.athleteSubscription?.status
      const cost = g._sum.estimatedCost || 0
      const monthlyRevenue = tierRevenue.get(tier) || 0
      const periodRevenue = monthlyRevenue * periodFraction

      // Only count revenue for ACTIVE (not TRIAL — they're not paying yet)
      const effectiveRevenue = status === 'ACTIVE' ? periodRevenue : 0

      const margin = effectiveRevenue - cost
      const marginPct = effectiveRevenue > 0 ? (margin / effectiveRevenue) * 100 : null

      let marginStatus: MarginEntry['status']
      if (tier === 'FREE' && cost > 0.01) marginStatus = 'FREE_LOSS'
      else if (margin < 0) marginStatus = 'LOSS'
      else if (marginPct !== null && marginPct < 30) marginStatus = 'THIN_MARGIN'
      else marginStatus = 'PROFITABLE'

      entries.push({
        userId: g.userId ?? 'unattributed',
        name: user?.name || (g.userId ? 'Unknown' : 'Unattributed'),
        role: user?.role,
        tier,
        costUsd: Math.round(cost * 1000) / 1000,
        revenueUsd: Math.round(effectiveRevenue * 100) / 100,
        marginUsd: Math.round(margin * 100) / 100,
        marginPercent: marginPct !== null ? Math.round(marginPct * 10) / 10 : null,
        status: marginStatus,
      })

      totalCost += cost
      totalRevenue += effectiveRevenue
    }

    // Sort by worst margin first (biggest problems)
    entries.sort((a, b) => a.marginUsd - b.marginUsd)

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

    return {
      success: true,
      data: {
        days,
        totalUsersAnalyzed: entries.length,
        totalCostUsd: Math.round(totalCost * 100) / 100,
        totalRevenueUsd: Math.round(totalRevenue * 100) / 100,
        totalMarginUsd: Math.round((totalRevenue - totalCost) * 100) / 100,
        platformMarginPercent: totalRevenue > 0
          ? Math.round(((totalRevenue - totalCost) / totalRevenue) * 1000) / 10
          : null,
        counts: { losses, freeLosses, thinMargin, profitable: entries.length - losses - freeLosses - thinMargin },
        byTier,
        worstOffenders: entries.slice(0, 10),
        note: 'Revenue uses FX_SEK_TO_USD env var (default 10.5) to convert PricingTier SEK amounts to USD. Update if FX rates change significantly.',
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

    const data = result.data as { worstOffenders: unknown[]; counts: Record<string, number> }
    const atRisk = (data.worstOffenders as Array<{ status: string }>).filter(
      u => u.status === 'LOSS' || u.status === 'FREE_LOSS'
    )

    return {
      success: true,
      data: {
        days,
        atRiskCount: atRisk.length,
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
