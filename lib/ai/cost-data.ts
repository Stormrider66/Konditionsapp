/**
 * AI Cost Data — Shared constants for AI cost info pages
 *
 * Feature cost estimates, usage profiles, and athlete tier comparisons.
 */

import type { AIModelConfig } from '@/types/ai-models'

// ─── Feature Cost Estimates ──────────────────────────────────────────────────

export interface FeatureCostEstimate {
  id: string
  name: string
  description: string
  /** Estimated input tokens per invocation */
  inputTokens: number
  /** Estimated output tokens per invocation */
  outputTokens: number
  /** Whether this feature runs automatically (system-initiated) */
  automatic: boolean
}

export const AI_FEATURES: FeatureCostEstimate[] = [
  {
    id: 'chat',
    name: 'AI chat (one message)',
    description: 'Questions about training, nutrition, and recovery',
    inputTokens: 2000,
    outputTokens: 800,
    automatic: false,
  },
  {
    id: 'wod',
    name: 'Daily workout (WOD)',
    description: 'Generate a daily training session',
    inputTokens: 3000,
    outputTokens: 1500,
    automatic: false,
  },
  {
    id: 'program',
    name: 'Program generation',
    description: 'Complete training program (4-16 weeks)',
    inputTokens: 5000,
    outputTokens: 8000,
    automatic: false,
  },
  {
    id: 'nutrition',
    name: 'Nutrition planning',
    description: 'Nutrition plan based on training and goals',
    inputTokens: 3000,
    outputTokens: 3000,
    automatic: false,
  },
  {
    id: 'briefing',
    name: 'Morning briefing',
    description: 'Daily summary with readiness and tips',
    inputTokens: 2000,
    outputTokens: 600,
    automatic: true,
  },
  {
    id: 'memory',
    name: 'Memory extraction',
    description: 'Extracts key info from conversations',
    inputTokens: 1500,
    outputTokens: 400,
    automatic: true,
  },
  {
    id: 'analysis',
    name: 'Performance analysis',
    description: 'Trend analysis of training data',
    inputTokens: 4000,
    outputTokens: 2000,
    automatic: false,
  },
  {
    id: 'video',
    name: 'Video analysis',
    description: 'Running technique, skiing technique, HYROX analysis',
    inputTokens: 5000,
    outputTokens: 2000,
    automatic: false,
  },
]

// ─── Monthly Usage Profiles ─────────────────────────────────────────────────

export interface UsageProfile {
  id: string
  name: string
  description: string
  /** How many times each feature is used per month */
  usage: Record<string, number>
}

export const USAGE_PROFILES: UsageProfile[] = [
  {
    id: 'light',
    name: 'Light user',
    description: 'Basic AI usage',
    usage: {
      chat: 10,
      wod: 5,
      program: 0,
      nutrition: 0,
      briefing: 15,
      memory: 5,
      analysis: 0,
      video: 0,
    },
  },
  {
    id: 'normal',
    name: 'Normal user',
    description: 'Regular AI usage',
    usage: {
      chat: 30,
      wod: 20,
      program: 1,
      nutrition: 1,
      briefing: 25,
      memory: 15,
      analysis: 2,
      video: 0,
    },
  },
  {
    id: 'heavy',
    name: 'Active user',
    description: 'Intensive AI usage',
    usage: {
      chat: 80,
      wod: 30,
      program: 3,
      nutrition: 2,
      briefing: 30,
      memory: 40,
      analysis: 5,
      video: 3,
    },
  },
]

// ─── Athlete Tier Features ──────────────────────────────────────────────────

export interface TierFeature {
  name: string
  free: string | boolean
  standard: string | boolean
  pro: string | boolean
}

export const ATHLETE_TIER_FEATURES: TierFeature[] = [
  { name: 'AI credits', free: 'Limited trial', standard: 'Daily use', pro: 'Larger credit pool' },
  { name: 'Daily workouts (WOD)', free: false, standard: true, pro: true },
  { name: 'Program generation', free: false, standard: false, pro: true },
  { name: 'Nutrition planning', free: false, standard: false, pro: true },
  { name: 'Morning briefing', free: false, standard: true, pro: true },
  { name: 'Video analysis', free: false, standard: false, pro: true },
  { name: 'Strava-sync', free: false, standard: false, pro: true },
  { name: 'Garmin-sync', free: false, standard: false, pro: true },
  { name: 'Training log', free: false, standard: true, pro: true },
  { name: 'Performance analysis', free: false, standard: false, pro: true },
]

// ─── Cost Calculation Helpers ───────────────────────────────────────────────

/**
 * Calculate the cost of a single feature invocation for a given model.
 */
export function featureCostUSD(feature: FeatureCostEstimate, model: AIModelConfig): number {
  const inputCost = (feature.inputTokens / 1_000_000) * model.pricing.input
  const outputCost = (feature.outputTokens / 1_000_000) * model.pricing.output
  return inputCost + outputCost
}

/**
 * Calculate total monthly cost for a usage profile with a given model.
 */
export function monthlyCostUSD(profile: UsageProfile, model: AIModelConfig): number {
  let total = 0
  for (const feature of AI_FEATURES) {
    const count = profile.usage[feature.id] || 0
    if (count > 0) {
      total += featureCostUSD(feature, model) * count
    }
  }
  return total
}

/**
 * Format USD amount to SEK string (approximate rate: 1 USD ≈ 10.5 SEK)
 */
export function formatCostSEK(usd: number): string {
  const sek = usd * 10.5
  if (sek < 0.1) return '< 0,10 kr'
  if (sek < 1) return `${sek.toFixed(2).replace('.', ',')} kr`
  return `${sek.toFixed(1).replace('.', ',')} kr`
}

/**
 * Format USD amount to display string
 */
export function formatCostUSD(usd: number): string {
  if (usd < 0.001) return '< $0.001'
  if (usd < 0.01) return `$${usd.toFixed(4)}`
  return `$${usd.toFixed(3)}`
}
