/**
 * Operator Agent Tool Executor
 *
 * Central dispatcher for operator-agent tools. The individual tool
 * implementations live under ./tools/ grouped by category (Phase 7
 * decomposition). This file:
 *
 *   1. Re-exports every tool function so existing call sites that import
 *      `from '@/lib/operator-agents/tool-executor'` keep working.
 *   2. Provides `executeOperatorTool` which routes a named tool call
 *      to the correct implementation.
 */

import type { OperatorToolResult } from './types'

// ── Per-category imports ────────────────────────────────────────────

import {
  getSentryErrors,
  getCronJobFailures,
  getAgentErrorRate,
  logHealthSnapshot,
  alertFounder,
} from './tools/platform-health'

import {
  getOpenSupportTickets,
  getTicket,
  searchSimilarTickets,
  classifyTicket,
  draftTicketResponse,
  markAsFeatureRequest,
  escalateToFounder,
  getUserContext,
  createGitHubIssue,
  linkGitHubIssue,
} from './tools/support'

import {
  getAIUsage24h,
  getAIUsageMonthToDate,
  getTopSpenders,
  predictMonthEnd,
  detectCostAnomalies,
} from './tools/cost-usage'

import {
  getCostBreakdownByEntity,
  getTopSpendingUsers,
  getCostBreakdownByBusiness,
  getUsersNearLimits,
  getRevenueVsCost,
  getMarginAtRiskUsers,
} from './tools/cost-breakdown'

import {
  getOpenFeatureRequests,
  getAllFeatureRequests,
  categorizeFeatureRequest,
  scoreFeatureRequest,
  markDuplicate,
  summarizeFeatureRequest,
  getUserTier,
} from './tools/features'

import {
  getActiveSubscriptions,
  getUserEngagement,
  getSupportHistory,
  getUsageTrend,
  calculateChurnScore,
  draftRetentionEmail,
  flagForFounderReview,
} from './tools/churn'

import {
  getRevenueYesterday,
  getSignupsYesterday,
  getUrgentSupportTickets,
  getCriticalErrors,
  getAtRiskUsers,
  getTopFeatureRequest,
  getCostToday,
  getKeyMetrics,
  saveBriefAndEmail,
} from './tools/founder-brief'

import {
  getNewUsersLast7d,
  getUserActivationProgress,
  findStuckUsers,
  draftOnboardingNudge,
} from './tools/onboarding'

import {
  getMRRSnapshot,
  getChurnRate,
  getNewSubscribersLast7d,
  saveBIReport,
} from './tools/bi'

import {
  findMilestoneEvents,
  getPlatformMetrics,
  draftSocialPost,
  draftBlogPost,
  draftNewsletter,
  saveContentQueue,
} from './tools/marketing'

import {
  findOrphanedRecords,
  findDuplicateUsers,
  findInvalidDates,
  findIncompleteProfiles,
  findStaleData,
  calculateDataHealthScore,
} from './tools/data-quality'

import {
  getConsentWithdrawals,
  getPendingGDPRRequests,
  getAuditLogAnomalies,
  getFailedLogins,
  getSuspiciousPatterns,
  getAgentActionAnomalies,
} from './tools/compliance'

import {
  getKnownCompetitors,
  webSearch,
  fetchUrl,
  saveCompetitorDigest,
} from './tools/competitor'

import { getNutritionUsageStats } from './tools/nutrition'

// ── Re-exports (historical import path) ─────────────────────────────

export {
  getSentryErrors,
  getCronJobFailures,
  getAgentErrorRate,
  logHealthSnapshot,
  alertFounder,
  getOpenSupportTickets,
  getTicket,
  searchSimilarTickets,
  classifyTicket,
  draftTicketResponse,
  markAsFeatureRequest,
  escalateToFounder,
  getUserContext,
  createGitHubIssue,
  linkGitHubIssue,
  getAIUsage24h,
  getAIUsageMonthToDate,
  getTopSpenders,
  predictMonthEnd,
  detectCostAnomalies,
  getCostBreakdownByEntity,
  getTopSpendingUsers,
  getCostBreakdownByBusiness,
  getUsersNearLimits,
  getRevenueVsCost,
  getMarginAtRiskUsers,
  getOpenFeatureRequests,
  getAllFeatureRequests,
  categorizeFeatureRequest,
  scoreFeatureRequest,
  markDuplicate,
  summarizeFeatureRequest,
  getUserTier,
  getActiveSubscriptions,
  getUserEngagement,
  getSupportHistory,
  getUsageTrend,
  calculateChurnScore,
  draftRetentionEmail,
  flagForFounderReview,
  getRevenueYesterday,
  getSignupsYesterday,
  getUrgentSupportTickets,
  getCriticalErrors,
  getAtRiskUsers,
  getTopFeatureRequest,
  getCostToday,
  getKeyMetrics,
  saveBriefAndEmail,
  getNewUsersLast7d,
  getUserActivationProgress,
  findStuckUsers,
  draftOnboardingNudge,
  getMRRSnapshot,
  getChurnRate,
  getNewSubscribersLast7d,
  saveBIReport,
  findMilestoneEvents,
  getPlatformMetrics,
  draftSocialPost,
  draftBlogPost,
  draftNewsletter,
  saveContentQueue,
  findOrphanedRecords,
  findDuplicateUsers,
  findInvalidDates,
  findIncompleteProfiles,
  findStaleData,
  calculateDataHealthScore,
  getConsentWithdrawals,
  getPendingGDPRRequests,
  getAuditLogAnomalies,
  getFailedLogins,
  getSuspiciousPatterns,
  getAgentActionAnomalies,
  getKnownCompetitors,
  webSearch,
  fetchUrl,
  saveCompetitorDigest,
  getNutritionUsageStats,
}

// ── Dispatcher ──────────────────────────────────────────────────────

/**
 * Route a tool call by name. Invoked by the agent runner.
 */
export async function executeOperatorTool(
  name: string,
  input: Record<string, unknown>
): Promise<OperatorToolResult> {
  try {
    switch (name) {
      // Platform Health
      case 'getSentryErrors':
        return await getSentryErrors((input.minutes as number) || 15)
      case 'getCronJobFailures':
        return await getCronJobFailures((input.hours as number) || 1)
      case 'getAgentErrorRate':
        return await getAgentErrorRate()
      case 'logHealthSnapshot':
        return await logHealthSnapshot(input as Record<string, unknown>)
      case 'alertFounder':
        return await alertFounder(
          input.severity as string,
          input.title as string,
          input.message as string
        )

      // Support Agent
      case 'getOpenSupportTickets':
        return await getOpenSupportTickets()
      case 'getTicket':
        return await getTicket(input.ticketId as string)
      case 'searchSimilarTickets':
        return await searchSimilarTickets(input.query as string)
      case 'classifyTicket':
        return await classifyTicket(
          input.ticketId as string,
          input.category as string,
          input.priority as string
        )
      case 'draftTicketResponse':
        return await draftTicketResponse(
          input.ticketId as string,
          input.body as string
        )
      case 'markAsFeatureRequest':
        return await markAsFeatureRequest(input.ticketId as string)
      case 'escalateToFounder':
        return await escalateToFounder(
          input.ticketId as string,
          input.reason as string
        )
      case 'getUserContext':
        return await getUserContext(input.userId as string)
      case 'createGitHubIssue':
        return await createGitHubIssue(
          input.title as string,
          input.body as string,
          (input.labels as string[]) || []
        )
      case 'linkGitHubIssue':
        return await linkGitHubIssue(
          input.ticketId as string,
          input.url as string
        )

      // Cost Guardian
      case 'getAIUsage24h':
        return await getAIUsage24h()
      case 'getAIUsageMonthToDate':
        return await getAIUsageMonthToDate()
      case 'getTopSpenders':
        return await getTopSpenders((input.days as number) || 7)
      case 'predictMonthEnd':
        return await predictMonthEnd()
      case 'detectCostAnomalies':
        return await detectCostAnomalies()
      case 'getCostBreakdownByEntity':
        return await getCostBreakdownByEntity((input.days as number) || 30)
      case 'getTopSpendingUsers':
        return await getTopSpendingUsers(
          (input.days as number) || 30,
          (input.limit as number) || 10
        )
      case 'getCostBreakdownByBusiness':
        return await getCostBreakdownByBusiness((input.days as number) || 30)
      case 'getUsersNearLimits':
        return await getUsersNearLimits((input.thresholdPercent as number) || 80)
      case 'getRevenueVsCost':
        return await getRevenueVsCost((input.days as number) || 30)
      case 'getMarginAtRiskUsers':
        return await getMarginAtRiskUsers((input.days as number) || 30)

      // Feature Curator
      case 'getOpenFeatureRequests':
        return await getOpenFeatureRequests()
      case 'getAllFeatureRequests':
        return await getAllFeatureRequests()
      case 'categorizeFeatureRequest':
        return await categorizeFeatureRequest(
          input.id as string,
          input.category as string
        )
      case 'scoreFeatureRequest':
        return await scoreFeatureRequest(
          input.id as string,
          input.score as number,
          input.reasoning as string
        )
      case 'markDuplicate':
        return await markDuplicate(
          input.id as string,
          input.duplicateOfId as string
        )
      case 'summarizeFeatureRequest':
        return await summarizeFeatureRequest(
          input.id as string,
          input.summary as string
        )
      case 'getUserTier':
        return await getUserTier(input.userId as string)

      // Churn Predictor
      case 'getActiveSubscriptions':
        return await getActiveSubscriptions()
      case 'getUserEngagement':
        return await getUserEngagement(
          input.userId as string,
          (input.days as number) || 30
        )
      case 'getSupportHistory':
        return await getSupportHistory(input.userId as string)
      case 'getUsageTrend':
        return await getUsageTrend(input.userId as string)
      case 'calculateChurnScore':
        return await calculateChurnScore(input.userId as string)
      case 'draftRetentionEmail':
        return await draftRetentionEmail(
          input.userId as string,
          input.subject as string,
          input.body as string,
          input.reasoning as string
        )
      case 'flagForFounderReview':
        return await flagForFounderReview(
          input.userId as string,
          input.reason as string
        )

      // Founder's Brief
      case 'getRevenueYesterday':
        return await getRevenueYesterday()
      case 'getSignupsYesterday':
        return await getSignupsYesterday()
      case 'getUrgentSupportTickets':
        return await getUrgentSupportTickets()
      case 'getCriticalErrors':
        return await getCriticalErrors((input.hours as number) || 24)
      case 'getAtRiskUsers':
        return await getAtRiskUsers((input.limit as number) || 3)
      case 'getTopFeatureRequest':
        return await getTopFeatureRequest()
      case 'getCostToday':
        return await getCostToday()
      case 'getKeyMetrics':
        return await getKeyMetrics()
      case 'saveBriefAndEmail':
        return await saveBriefAndEmail(input.content as string)

      // Onboarding Activation
      case 'getNewUsersLast7d':
        return await getNewUsersLast7d()
      case 'getUserActivationProgress':
        return await getUserActivationProgress(input.userId as string)
      case 'findStuckUsers':
        return await findStuckUsers()
      case 'draftOnboardingNudge':
        return await draftOnboardingNudge(
          input.userId as string,
          input.step as string,
          input.subject as string,
          input.body as string
        )

      // Business Intelligence
      case 'getMRRSnapshot':
        return await getMRRSnapshot()
      case 'getChurnRate':
        return await getChurnRate((input.days as number) || 30)
      case 'getNewSubscribersLast7d':
        return await getNewSubscribersLast7d()
      case 'saveBIReport':
        return await saveBIReport(input.content as string)

      // Marketing Content
      case 'findMilestoneEvents':
        return await findMilestoneEvents((input.days as number) || 7)
      case 'getPlatformMetrics':
        return await getPlatformMetrics()
      case 'draftSocialPost':
        return await draftSocialPost(
          input.platform as string,
          input.topic as string,
          input.body as string,
          input.imagePrompt as string | undefined
        )
      case 'draftBlogPost':
        return await draftBlogPost(
          input.title as string,
          input.outline as string,
          input.body as string
        )
      case 'draftNewsletter':
        return await draftNewsletter(
          input.week as string,
          (input.highlights as string[]) || [],
          input.body as string
        )
      case 'saveContentQueue':
        return await saveContentQueue(input as Record<string, unknown>)

      // Data Quality
      case 'findOrphanedRecords':
        return await findOrphanedRecords()
      case 'findDuplicateUsers':
        return await findDuplicateUsers()
      case 'findInvalidDates':
        return await findInvalidDates()
      case 'findIncompleteProfiles':
        return await findIncompleteProfiles()
      case 'findStaleData':
        return await findStaleData()
      case 'calculateDataHealthScore':
        return await calculateDataHealthScore()

      // Compliance & Security
      case 'getConsentWithdrawals':
        return await getConsentWithdrawals((input.days as number) || 1)
      case 'getPendingGDPRRequests':
        return await getPendingGDPRRequests()
      case 'getAuditLogAnomalies':
        return await getAuditLogAnomalies((input.hours as number) || 24)
      case 'getFailedLogins':
        return await getFailedLogins((input.hours as number) || 24)
      case 'getSuspiciousPatterns':
        return await getSuspiciousPatterns()
      case 'getAgentActionAnomalies':
        return await getAgentActionAnomalies()

      // Competitor Intel
      case 'getKnownCompetitors':
        return await getKnownCompetitors()
      case 'webSearch':
        return await webSearch(input.query as string)
      case 'fetchUrl':
        return await fetchUrl(input.url as string)
      case 'saveCompetitorDigest':
        return await saveCompetitorDigest(input.content as string)

      case 'getNutritionUsageStats':
        return await getNutritionUsageStats()

      default:
        return { success: false, error: `Unknown operator tool: ${name}` }
    }
  } catch (error) {
    return { success: false, error: `Tool ${name} failed: ${String(error)}` }
  }
}
