/**
 * AI Budget Manager
 *
 * Handles budget checking, usage logging, and cost tracking for AI operations.
 */

import { prisma } from '@/lib/prisma'

// ============================================
// Types
// ============================================

export interface BudgetCheckResult {
  allowed: boolean
  remaining: number | null // null = unlimited
  warning?: string
  currentSpent: number
  monthlyBudget: number | null
}

export interface BudgetStatus {
  monthlyBudget: number | null
  periodStart: Date
  periodSpent: number
  remaining: number | null
  percentUsed: number | null
  alertThreshold: number
  researchBudget: number | null
  chatBudget: number | null
  daysRemaining: number
  alertSent: boolean
  isOverBudget: boolean
  isNearLimit: boolean
}

export interface UsageLogParams {
  userId: string
  category: 'research' | 'chat' | 'embedding'
  provider: string
  model: string
  inputTokens: number
  outputTokens: number
  estimatedCost: number
  researchSessionId?: string
  conversationId?: string
}

export interface UsageStats {
  total: number
  byCategory: {
    research: number
    chat: number
    embedding: number
  }
  byProvider: {
    GEMINI: number
    OPENAI: number
    ANTHROPIC: number
  }
  history: Array<{
    date: string
    cost: number
  }>
}

// ============================================
// Budget Checking
// ============================================

/**
 * Check if a user has sufficient budget for an operation
 */
export async function checkBudget(
  userId: string,
  estimatedCost: number,
  category?: 'research' | 'chat'
): Promise<BudgetCheckResult> {
  const budget = await prisma.aIUsageBudget.findUnique({
    where: { userId },
  })

  // No budget record = unlimited
  if (!budget) {
    return {
      allowed: true,
      remaining: null,
      currentSpent: 0,
      monthlyBudget: null,
    }
  }

  // No monthly budget set = unlimited
  if (!budget.monthlyBudget) {
    return {
      allowed: true,
      remaining: null,
      currentSpent: budget.periodSpent,
      monthlyBudget: null,
    }
  }

  // Check category-specific budget if applicable
  if (category === 'research' && budget.researchBudget !== null) {
    // Would need to calculate category-specific spent amount
    // For now, use overall budget
  }

  const remaining = budget.monthlyBudget - budget.periodSpent

  // Check if budget exceeded
  if (remaining < estimatedCost) {
    return {
      allowed: false,
      remaining,
      currentSpent: budget.periodSpent,
      monthlyBudget: budget.monthlyBudget,
      warning: `Budget exceeded. Remaining: $${remaining.toFixed(2)}, Estimated cost: $${estimatedCost.toFixed(2)}`,
    }
  }

  // Check alert threshold
  const afterOperation = budget.periodSpent + estimatedCost
  const percentUsed = afterOperation / budget.monthlyBudget

  if (percentUsed >= budget.alertThreshold) {
    return {
      allowed: true,
      remaining: remaining - estimatedCost,
      currentSpent: budget.periodSpent,
      monthlyBudget: budget.monthlyBudget,
      warning: `This operation will use ${(percentUsed * 100).toFixed(0)}% of your monthly budget ($${afterOperation.toFixed(2)} of $${budget.monthlyBudget.toFixed(2)})`,
    }
  }

  return {
    allowed: true,
    remaining: remaining - estimatedCost,
    currentSpent: budget.periodSpent,
    monthlyBudget: budget.monthlyBudget,
  }
}

// ============================================
// Usage Logging
// ============================================

/**
 * Log AI usage and update budget spent
 */
export async function logUsage(params: UsageLogParams): Promise<void> {
  await prisma.$transaction([
    // Create usage log entry
    prisma.aIUsageLog.create({
      data: {
        userId: params.userId,
        category: params.category,
        provider: params.provider,
        model: params.model,
        inputTokens: params.inputTokens,
        outputTokens: params.outputTokens,
        estimatedCost: params.estimatedCost,
        researchSessionId: params.researchSessionId,
        conversationId: params.conversationId,
      },
    }),

    // Update or create budget record with incremented spent
    prisma.aIUsageBudget.upsert({
      where: { userId: params.userId },
      update: {
        periodSpent: { increment: params.estimatedCost },
      },
      create: {
        userId: params.userId,
        periodSpent: params.estimatedCost,
      },
    }),
  ])
}

// ============================================
// Budget Status
// ============================================

/**
 * Get current budget status for a user
 */
export async function getBudgetStatus(userId: string): Promise<BudgetStatus> {
  const budget = await prisma.aIUsageBudget.findUnique({
    where: { userId },
  })

  const now = new Date()
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const daysRemaining = Math.ceil(
    (endOfMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  )

  if (!budget) {
    return {
      monthlyBudget: null,
      periodStart: new Date(now.getFullYear(), now.getMonth(), 1),
      periodSpent: 0,
      remaining: null,
      percentUsed: null,
      alertThreshold: 0.8,
      researchBudget: null,
      chatBudget: null,
      daysRemaining,
      alertSent: false,
      isOverBudget: false,
      isNearLimit: false,
    }
  }

  const remaining = budget.monthlyBudget
    ? budget.monthlyBudget - budget.periodSpent
    : null

  const percentUsed = budget.monthlyBudget
    ? budget.periodSpent / budget.monthlyBudget
    : null

  const isOverBudget = remaining !== null && remaining < 0
  const isNearLimit = percentUsed !== null && percentUsed >= budget.alertThreshold

  return {
    monthlyBudget: budget.monthlyBudget,
    periodStart: budget.periodStart,
    periodSpent: budget.periodSpent,
    remaining,
    percentUsed,
    alertThreshold: budget.alertThreshold,
    researchBudget: budget.researchBudget,
    chatBudget: budget.chatBudget,
    daysRemaining,
    alertSent: budget.alertSent,
    isOverBudget,
    isNearLimit,
  }
}

// ============================================
// Usage Statistics
// ============================================

/**
 * Get usage statistics for a user
 */
export async function getUsageStats(
  userId: string,
  period: 'day' | 'week' | 'month' | 'all' = 'month'
): Promise<UsageStats> {
  // Calculate date range
  const now = new Date()
  let startDate: Date

  switch (period) {
    case 'day':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      break
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      break
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      break
    case 'all':
      startDate = new Date(0) // Beginning of time
      break
  }

  // Get usage logs
  const logs = await prisma.aIUsageLog.findMany({
    where: {
      userId,
      createdAt: { gte: startDate },
    },
    orderBy: { createdAt: 'asc' },
  })

  // Calculate totals
  const stats: UsageStats = {
    total: 0,
    byCategory: { research: 0, chat: 0, embedding: 0 },
    byProvider: { GEMINI: 0, OPENAI: 0, ANTHROPIC: 0 },
    history: [],
  }

  // Group by date for history
  const dailyCosts: Record<string, number> = {}

  for (const log of logs) {
    stats.total += log.estimatedCost

    // By category
    if (log.category in stats.byCategory) {
      stats.byCategory[log.category as keyof typeof stats.byCategory] +=
        log.estimatedCost
    }

    // By provider
    if (log.provider in stats.byProvider) {
      stats.byProvider[log.provider as keyof typeof stats.byProvider] +=
        log.estimatedCost
    }

    // Daily aggregation
    const dateKey = log.createdAt.toISOString().split('T')[0]
    dailyCosts[dateKey] = (dailyCosts[dateKey] || 0) + log.estimatedCost
  }

  // Convert to history array
  stats.history = Object.entries(dailyCosts)
    .map(([date, cost]) => ({ date, cost }))
    .sort((a, b) => a.date.localeCompare(b.date))

  return stats
}

// ============================================
// Budget Management
// ============================================

/**
 * Update budget settings for a user
 */
export async function updateBudgetSettings(
  userId: string,
  settings: {
    monthlyBudget?: number | null
    alertThreshold?: number
    researchBudget?: number | null
    chatBudget?: number | null
  }
): Promise<void> {
  await prisma.aIUsageBudget.upsert({
    where: { userId },
    update: {
      ...(settings.monthlyBudget !== undefined && {
        monthlyBudget: settings.monthlyBudget,
      }),
      ...(settings.alertThreshold !== undefined && {
        alertThreshold: settings.alertThreshold,
      }),
      ...(settings.researchBudget !== undefined && {
        researchBudget: settings.researchBudget,
      }),
      ...(settings.chatBudget !== undefined && {
        chatBudget: settings.chatBudget,
      }),
    },
    create: {
      userId,
      monthlyBudget: settings.monthlyBudget ?? null,
      alertThreshold: settings.alertThreshold ?? 0.8,
      researchBudget: settings.researchBudget ?? null,
      chatBudget: settings.chatBudget ?? null,
    },
  })
}

/**
 * Reset budget period (called by cron job on 1st of month)
 */
export async function resetBudgetPeriods(): Promise<number> {
  const result = await prisma.aIUsageBudget.updateMany({
    data: {
      periodStart: new Date(),
      periodSpent: 0,
      alertSent: false,
    },
  })

  return result.count
}

// ============================================
// Cost Estimation
// ============================================

/**
 * Estimate cost based on tokens and model
 */
export function estimateCost(
  provider: string,
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  // Pricing per 1M tokens (approximate, will need updating)
  const pricing: Record<string, { input: number; output: number }> = {
    // Gemini
    'deep-research-pro-preview-12-2025': { input: 0, output: 0 }, // Free until Jan 2026
    'gemini-3.1-pro-preview': { input: 2.0, output: 12.0 },
    'gemini-3-flash-preview': { input: 0.075, output: 0.30 },

    // OpenAI
    'gpt-5-mini': { input: 0.25, output: 2.0 },
    'gpt-5.2': { input: 1.75, output: 14.0 },
    'o4-mini-deep-research': { input: 1.1, output: 4.4 },
    'o3-deep-research': { input: 10.0, output: 40.0 },

    // Anthropic
    'claude-opus-4-6': { input: 5.0, output: 25.0 },
    'claude-sonnet-4-6': { input: 3.0, output: 15.0 },
    'claude-haiku-4-5': { input: 0.25, output: 1.25 },
  }

  const modelPricing = pricing[model]

  if (!modelPricing) {
    // Default fallback pricing
    return ((inputTokens * 1.0 + outputTokens * 4.0) / 1_000_000)
  }

  return (
    (inputTokens * modelPricing.input + outputTokens * modelPricing.output) /
    1_000_000
  )
}
