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
    id: 'gemini-3-flash',
    name: 'Gemini 3 Flash',
    provider: 'google',
    modelId: 'gemini-3-flash-preview',
    description: 'Snabb och kostnadseffektiv. Gratis tier tillgänglig.',
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
    name: 'Gemini 3 Pro',
    provider: 'google',
    modelId: 'gemini-3-pro-preview',
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
  // Anthropic Models (Claude 4.5)
  {
    id: 'claude-haiku',
    name: 'Claude Haiku 4.5',
    provider: 'anthropic',
    modelId: 'claude-haiku-4-5-20251016',
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
    name: 'Claude Sonnet 4.5',
    provider: 'anthropic',
    modelId: 'claude-sonnet-4-5-20250929',
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
    name: 'Claude Opus 4.5',
    provider: 'anthropic',
    modelId: 'claude-opus-4-5-20251101',
    description: 'Anthropics mest kraftfulla. 64K output för långa program.',
    costTier: 'high',
    capabilities: {
      reasoning: 'excellent',
      speed: 'slow',
      contextWindow: 200000,
      maxOutputTokens: 64000,
    },
    pricing: {
      input: 5.0,   // $5.00 per 1M tokens
      output: 25.0, // $25.00 per 1M tokens
    },
    bestForLongOutput: true,
  },
  // OpenAI Models (GPT-5)
  {
    id: 'gpt-5-nano',
    name: 'GPT-5 Nano',
    provider: 'openai',
    modelId: 'gpt-5-nano',
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
    id: 'gpt-5.2',
    name: 'GPT-5.2',
    provider: 'openai',
    modelId: 'gpt-5.2',
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
