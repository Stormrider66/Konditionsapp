/**
 * AI Model Configuration Types
 *
 * Defines available AI models with their capabilities, cost tiers, and provider info.
 */

export type AIProvider = 'anthropic' | 'google' | 'openai'

export type CostTier = 'free' | 'low' | 'medium' | 'high'

export interface AIModelConfig {
  id: string
  name: string
  provider: AIProvider
  modelId: string
  description: string
  costTier: CostTier
  capabilities: {
    reasoning: 'basic' | 'good' | 'excellent'
    speed: 'slow' | 'medium' | 'fast'
    contextWindow: number
    maxOutputTokens: number
  }
  /** Price per 1M tokens in USD */
  pricing: {
    input: number
    output: number
  }
  recommended?: boolean
  /** Best for long-form generation (programs, reports) */
  bestForLongOutput?: boolean
}

/**
 * Available AI models for WOD generation
 * Ordered by recommendation (best value first)
 */
export const AI_MODELS: AIModelConfig[] = [
  // Google Models (Gemini 3)
  {
    id: 'gemini-3.1-flash-lite',
    name: 'Gemini 3.1 Flash Lite',
    provider: 'google',
    modelId: 'gemini-3.1-flash-lite-preview',
    description: 'Snabbaste och billigaste. Perfekt för bakgrundsuppgifter.',
    costTier: 'low',
    capabilities: {
      reasoning: 'good',
      speed: 'fast',
      contextWindow: 1048576,
      maxOutputTokens: 65536,
    },
    pricing: {
      input: 0.25,  // $0.25 per 1M tokens
      output: 1.5,  // $1.50 per 1M tokens
    },
  },
  {
    id: 'gemini-3-flash',
    name: 'Gemini 3 Flash',
    provider: 'google',
    modelId: 'gemini-3-flash-preview',
    description: 'Snabb och kostnadseffektiv. Bra för chatt och interaktiva uppgifter.',
    costTier: 'low',
    capabilities: {
      reasoning: 'good',
      speed: 'fast',
      contextWindow: 1048576,
      maxOutputTokens: 65536,
    },
    pricing: {
      input: 0.5,   // $0.50 per 1M tokens
      output: 3.0,  // $3.00 per 1M tokens
    },
    recommended: true,
  },
  {
    id: 'gemini-3-pro',
    name: 'Gemini 3.1 Pro',
    provider: 'google',
    modelId: 'gemini-3.1-pro-preview',
    description: 'Googles bästa modell. 64K output för långa program.',
    costTier: 'medium',
    capabilities: {
      reasoning: 'excellent',
      speed: 'medium',
      contextWindow: 1048576,
      maxOutputTokens: 65536,
    },
    pricing: {
      input: 2.0,   // $2.00 per 1M tokens
      output: 12.0, // $12.00 per 1M tokens
    },
    bestForLongOutput: true,
  },
  // Anthropic Models (Claude 4.6)
  {
    id: 'claude-haiku',
    name: 'Claude Haiku 4.5',
    provider: 'anthropic',
    modelId: 'claude-haiku-4-5',
    description: 'Snabb och billig. Bra för enkla uppgifter.',
    costTier: 'low',
    capabilities: {
      reasoning: 'good',
      speed: 'fast',
      contextWindow: 200000,
      maxOutputTokens: 8192,
    },
    pricing: {
      input: 1.0,  // $1.00 per 1M tokens
      output: 5.0, // $5.00 per 1M tokens
    },
  },
  {
    id: 'claude-sonnet',
    name: 'Claude Sonnet 4.6',
    provider: 'anthropic',
    modelId: 'claude-sonnet-4-6',
    description: 'Balanserad prestanda och kostnad. Utmärkt för träning.',
    costTier: 'medium',
    capabilities: {
      reasoning: 'excellent',
      speed: 'medium',
      contextWindow: 200000,
      maxOutputTokens: 64000,
    },
    pricing: {
      input: 3.0,   // $3.00 per 1M tokens
      output: 15.0, // $15.00 per 1M tokens
    },
    bestForLongOutput: true,
  },
  {
    id: 'claude-opus',
    name: 'Claude Opus 4.7',
    provider: 'anthropic',
    modelId: 'claude-opus-4-7',
    description: 'Anthropics mest kraftfulla. 128K output för långa program.',
    costTier: 'high',
    capabilities: {
      reasoning: 'excellent',
      speed: 'slow',
      contextWindow: 200000,
      maxOutputTokens: 128000,
    },
    pricing: {
      input: 5.0,   // $5.00 per 1M tokens
      output: 25.0, // $25.00 per 1M tokens
    },
    bestForLongOutput: true,
  },
  // OpenAI Models (GPT-5)
  {
    id: 'gpt-5.3-instant',
    name: 'GPT-5.3 Instant',
    provider: 'openai',
    modelId: 'gpt-5.3-instant',
    description: 'Snabbast och billigast. Bra för enklare uppgifter.',
    costTier: 'low',
    capabilities: {
      reasoning: 'good',
      speed: 'fast',
      contextWindow: 128000,
      maxOutputTokens: 16384,
    },
    pricing: {
      input: 0.5,  // $0.50 per 1M tokens
      output: 2.0, // $2.00 per 1M tokens
    },
  },
  {
    id: 'gpt-5-mini',
    name: 'GPT-5 Mini',
    provider: 'openai',
    modelId: 'gpt-5-mini',
    description: 'Balanserad prestanda och kostnad.',
    costTier: 'medium',
    capabilities: {
      reasoning: 'excellent',
      speed: 'medium',
      contextWindow: 128000,
      maxOutputTokens: 32768,
    },
    pricing: {
      input: 1.5,  // $1.50 per 1M tokens
      output: 6.0, // $6.00 per 1M tokens
    },
  },
  {
    id: 'gpt-5.5',
    name: 'GPT-5.5',
    provider: 'openai',
    modelId: 'gpt-5.5',
    description: 'OpenAIs flaggskepp. 128K output - bäst för långa program!',
    costTier: 'high',
    capabilities: {
      reasoning: 'excellent',
      speed: 'medium',
      contextWindow: 400000,
      maxOutputTokens: 128000,
    },
    pricing: {
      input: 1.75,  // $1.75 per 1M tokens
      output: 14.0, // $14.00 per 1M tokens
    },
    bestForLongOutput: true,
  },
]

/**
 * Get models available for a given set of API keys
 */
export function getAvailableModels(keys: {
  anthropicKey?: string | null
  googleKey?: string | null
  openaiKey?: string | null
}): AIModelConfig[] {
  return AI_MODELS.filter(model => {
    if (model.provider === 'anthropic' && keys.anthropicKey) return true
    if (model.provider === 'google' && keys.googleKey) return true
    if (model.provider === 'openai' && keys.openaiKey) return true
    return false
  })
}

/**
 * Get model by ID
 */
export function getModelById(id: string): AIModelConfig | undefined {
  return AI_MODELS.find(m => m.id === id)
}

/**
 * Get default model based on available keys
 */
export function getDefaultModel(keys: {
  anthropicKey?: string | null
  googleKey?: string | null
  openaiKey?: string | null
}): AIModelConfig | undefined {
  const available = getAvailableModels(keys)
  // Return recommended model if available, otherwise first available
  return available.find(m => m.recommended) || available[0]
}

/**
 * Cost tier labels in Swedish
 */
export const COST_TIER_LABELS: Record<CostTier, string> = {
  free: 'Gratis',
  low: 'Låg kostnad',
  medium: 'Medel',
  high: 'Premium',
}

/**
 * Cost tier colors for badges
 */
export const COST_TIER_COLORS: Record<CostTier, string> = {
  free: 'bg-green-500/20 text-green-600 border-green-500/30',
  low: 'bg-blue-500/20 text-blue-600 border-blue-500/30',
  medium: 'bg-orange-500/20 text-orange-600 border-orange-500/30',
  high: 'bg-purple-500/20 text-purple-600 border-purple-500/30',
}

/**
 * Format token count for display (e.g., 128000 -> "128K")
 */
/**
 * Format token count for display (e.g., 128000 -> "128K")
 */
export function formatTokenCount(tokens: number | undefined | null): string {
  if (tokens == null || isNaN(tokens)) {
    return '0'
  }
  if (tokens >= 1000000) {
    return `${(tokens / 1000000).toFixed(tokens % 1000000 === 0 ? 0 : 1)}M`
  }
  if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(tokens % 1000 === 0 ? 0 : 1)}K`
  }
  return tokens.toString()
}

/**
 * Estimate weeks of training program that can be generated
 * Assumes ~4000 tokens per week of detailed program
 */
export function estimateWeeksFromTokens(maxOutputTokens: number | undefined | null): number {
  if (maxOutputTokens == null || isNaN(maxOutputTokens)) return 0
  return Math.floor(maxOutputTokens / 4000)
}

/**
 * Get models sorted by output capacity (best for long programs first)
 */
export function getModelsForLongOutput(keys: {
  anthropicKey?: string | null
  googleKey?: string | null
  openaiKey?: string | null
}): AIModelConfig[] {
  return getAvailableModels(keys)
    .filter(m => m.capabilities.maxOutputTokens >= 32000)
    .sort((a, b) => b.capabilities.maxOutputTokens - a.capabilities.maxOutputTokens)
}

/**
 * Get the best model for generating long programs
 */
export function getBestModelForLongOutput(keys: {
  anthropicKey?: string | null
  googleKey?: string | null
  openaiKey?: string | null
}): AIModelConfig | undefined {
  const models = getModelsForLongOutput(keys)
  return models[0]
}

// ─── Provider-Agnostic Model Resolution ─────────────────────────────────────

/**
 * Intent describes what capability tier is needed.
 * - 'fast':      Cheapest/fastest model. For background tasks, memory extraction, briefings.
 * - 'balanced':  Good quality at reasonable cost. For chat, nutrition plans, analysis.
 * - 'powerful':  Best available reasoning. For program generation, deep research.
 */
export type ModelIntent = 'fast' | 'balanced' | 'powerful'

export interface ResolvedModel {
  provider: AIProvider
  modelId: string
  apiKey: string
  displayName: string
  supportsVision: boolean
}

export interface AvailableKeys {
  anthropicKey?: string | null
  googleKey?: string | null
  openaiKey?: string | null
}

export interface ConfiguredProviders {
  hasAnthropic: boolean
  hasGoogle: boolean
  hasOpenai: boolean
}

interface TierEntry {
  modelId: string
  displayName: string
  /** Whether this model can accept images as input via the AI SDK multimodal content parts. */
  supportsVision: boolean
}

/**
 * Equivalent models across providers, grouped by intent tier.
 * Priority order: Google → Anthropic → OpenAI (cheapest-first for equal quality).
 */
export const MODEL_TIERS: Record<ModelIntent, {
  google:    TierEntry
  anthropic: TierEntry
  openai:    TierEntry
}> = {
  fast: {
    google:    { modelId: 'gemini-3.1-flash-lite-preview', displayName: 'Gemini 3.1 Flash Lite', supportsVision: true },
    anthropic: { modelId: 'claude-haiku-4-5',              displayName: 'Claude Haiku 4.5',     supportsVision: true },
    openai:    { modelId: 'gpt-5.3-instant',               displayName: 'GPT-5.3 Instant',      supportsVision: true },
  },
  balanced: {
    google:    { modelId: 'gemini-3-flash-preview',     displayName: 'Gemini 3 Flash',    supportsVision: true },
    anthropic: { modelId: 'claude-sonnet-4-6',          displayName: 'Claude Sonnet 4.6', supportsVision: true },
    openai:    { modelId: 'gpt-5-mini',                 displayName: 'GPT-5 Mini',        supportsVision: true },
  },
  powerful: {
    google:    { modelId: 'gemini-3.1-pro-preview',     displayName: 'Gemini 3.1 Pro',    supportsVision: true },
    // Intentionally pinned to 4.6 (not 4.7). Opus 4.7's always-on extended
    // thinking drops temperature support and burns output tokens on thinking,
    // which hurts deterministic extraction flows (importer, roster parser).
    // Reasoning-heavy flows that actually benefit from 4.7 should route via
    // a task-specific override (see EXTRACTION_TIERS / future TASK_TIERS).
    anthropic: { modelId: 'claude-opus-4-6',            displayName: 'Claude Opus 4.6',   supportsVision: true },
    openai:    { modelId: 'gpt-5.5',                    displayName: 'GPT-5.5',           supportsVision: true },
  },
}

/**
 * Task-specific tier override for structured extraction workflows
 * (program importer, roster parser, anything that reads a source doc and
 * emits a predictable JSON shape).
 *
 * For extraction we deliberately prefer the BALANCED tier's models even
 * when the caller asked for 'powerful'. Reasons:
 *   - Sonnet 4.6 / Gemini 3 Flash / GPT-5 Mini all support `temperature`,
 *     which we set to 0.1 for run-to-run consistency.
 *   - They don't spend output tokens on extended thinking (Opus 4.7's
 *     failure mode on our Excel imports: thinking ate the budget and the
 *     JSON truncated past exercise names).
 *   - They're cheaper and faster, and extraction doesn't benefit from
 *     "think harder" the way open-ended reasoning does.
 *
 * Vision still works: Sonnet 4.6 / Flash / Mini all have supportsVision=true.
 */
export const EXTRACTION_TIERS: typeof MODEL_TIERS = {
  fast: MODEL_TIERS.fast,
  balanced: MODEL_TIERS.balanced,
  // 'powerful' collapses to the balanced tier for extraction tasks.
  powerful: MODEL_TIERS.balanced,
}

/**
 * Resolve the best available model for a given intent (server-side, with
 * actual API keys).
 *
 * `preferredProvider` overrides the default Google→Anthropic→OpenAI priority.
 * When set and a matching key exists we pick that provider's model; if the
 * preferred provider has no key we fall back to the normal priority order
 * rather than refusing the request. Useful for callers that want "prefer
 * Claude for this task" without failing if the key is missing.
 *
 * Returns null if no keys are available at all.
 */
export function resolveModel(
  keys: AvailableKeys,
  intent: ModelIntent = 'balanced',
  preferredProvider?: AIProvider
): ResolvedModel | null {
  return resolveFromTiers(MODEL_TIERS, keys, intent, preferredProvider)
}

/**
 * Task-aware variant of resolveModel for structured extraction. Same
 * semantics as resolveModel but uses EXTRACTION_TIERS — callers that route
 * through here get the deterministic, temperature-supporting models for
 * Anthropic (Sonnet 4.6) even when they asked for 'powerful'.
 *
 * Use this for: program importer, team-roster import, document RAG
 * extraction. Do NOT use for: coaching advice, reasoning-heavy planning,
 * creative output — those should stay on resolveModel so they keep the
 * top-tier reasoning models.
 */
export function resolveExtractionModel(
  keys: AvailableKeys,
  intent: ModelIntent = 'balanced',
  preferredProvider?: AIProvider
): ResolvedModel | null {
  return resolveFromTiers(EXTRACTION_TIERS, keys, intent, preferredProvider)
}

function resolveFromTiers(
  tiers: typeof MODEL_TIERS,
  keys: AvailableKeys,
  intent: ModelIntent,
  preferredProvider?: AIProvider
): ResolvedModel | null {
  const tier = tiers[intent]

  if (preferredProvider === 'anthropic' && keys.anthropicKey) {
    return { provider: 'anthropic', modelId: tier.anthropic.modelId, apiKey: keys.anthropicKey, displayName: tier.anthropic.displayName, supportsVision: tier.anthropic.supportsVision }
  }
  if (preferredProvider === 'google' && keys.googleKey) {
    return { provider: 'google', modelId: tier.google.modelId, apiKey: keys.googleKey, displayName: tier.google.displayName, supportsVision: tier.google.supportsVision }
  }
  if (preferredProvider === 'openai' && keys.openaiKey) {
    return { provider: 'openai', modelId: tier.openai.modelId, apiKey: keys.openaiKey, displayName: tier.openai.displayName, supportsVision: tier.openai.supportsVision }
  }

  if (keys.googleKey) {
    return { provider: 'google', modelId: tier.google.modelId, apiKey: keys.googleKey, displayName: tier.google.displayName, supportsVision: tier.google.supportsVision }
  }
  if (keys.anthropicKey) {
    return { provider: 'anthropic', modelId: tier.anthropic.modelId, apiKey: keys.anthropicKey, displayName: tier.anthropic.displayName, supportsVision: tier.anthropic.supportsVision }
  }
  if (keys.openaiKey) {
    return { provider: 'openai', modelId: tier.openai.modelId, apiKey: keys.openaiKey, displayName: tier.openai.displayName, supportsVision: tier.openai.supportsVision }
  }

  return null
}

/**
 * Resolve a vision-capable model for the intent. Upgrades through the tiers
 * (fast → balanced → powerful) if the chosen tier's model doesn't support
 * images. Returns null if no configured provider has any vision model at all.
 */
export function resolveVisionModel(
  keys: AvailableKeys,
  intent: ModelIntent = 'balanced'
): ResolvedModel | null {
  const order: ModelIntent[] = intent === 'fast'
    ? ['fast', 'balanced', 'powerful']
    : intent === 'balanced'
      ? ['balanced', 'powerful', 'fast']
      : ['powerful', 'balanced', 'fast']

  for (const tier of order) {
    const resolved = resolveModel(keys, tier)
    if (resolved?.supportsVision) return resolved
  }
  return null
}

/**
 * Client-side model resolution using provider availability flags (no actual keys needed).
 * Used by UI components that know which providers are configured but don't have the keys.
 */
export function resolveModelForClient(
  configured: ConfiguredProviders,
  intent: ModelIntent = 'balanced'
): { provider: AIProvider; modelId: string; displayName: string } | null {
  const tier = MODEL_TIERS[intent]

  if (configured.hasGoogle) {
    return { provider: 'google', ...tier.google }
  }
  if (configured.hasAnthropic) {
    return { provider: 'anthropic', ...tier.anthropic }
  }
  if (configured.hasOpenai) {
    return { provider: 'openai', ...tier.openai }
  }

  return null
}

// ─── Intent Tier Labels (Athlete-facing) ──────────────────────────────────────

export interface IntentTierLabel {
  label: string
  description: string
  icon: 'zap' | 'sparkles' | 'flame'
}

export const INTENT_TIER_LABELS: Record<ModelIntent, IntentTierLabel> = {
  fast: {
    label: 'Snabb',
    description: 'Snabba svar, perfekt för enkla frågor och daglig hjälp.',
    icon: 'zap',
  },
  balanced: {
    label: 'Balanserad',
    description: 'Bra kvalitet och hastighet. Rekommenderas för de flesta uppgifter.',
    icon: 'sparkles',
  },
  powerful: {
    label: 'Kraftfull',
    description: 'Bästa kvalitet. Perfekt för träningsprogram och djup analys.',
    icon: 'flame',
  },
}

/**
 * Type guard: is the value a valid ModelIntent?
 */
export function isModelIntent(value: unknown): value is ModelIntent {
  return value === 'fast' || value === 'balanced' || value === 'powerful'
}

/**
 * Map a legacy model ID (from the AI_MODELS list or DB) to an intent tier.
 * Falls back to 'balanced' for unknown IDs.
 */
export function legacyModelIdToIntent(id: string): ModelIntent {
  // Check all tiers across all providers
  for (const [intent, tier] of Object.entries(MODEL_TIERS) as [ModelIntent, typeof MODEL_TIERS[ModelIntent]][]) {
    if (tier.google.modelId === id || tier.anthropic.modelId === id || tier.openai.modelId === id) {
      return intent
    }
  }

  // Also match the short IDs used in the AI_MODELS array
  const fastIds = ['gemini-3.1-flash-lite', 'claude-haiku', 'gpt-5.3-instant']
  const balancedIds = ['gemini-3-flash', 'claude-sonnet', 'gpt-5-mini']
  const powerfulIds = ['gemini-3-pro', 'claude-opus', 'gpt-5.5']

  if (fastIds.includes(id)) return 'fast'
  if (balancedIds.includes(id)) return 'balanced'
  if (powerfulIds.includes(id)) return 'powerful'

  return 'balanced'
}
