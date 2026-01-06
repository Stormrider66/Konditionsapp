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
  }
  recommended?: boolean
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
      contextWindow: 1000000,
    },
    recommended: true,
  },
  {
    id: 'gemini-3-pro',
    name: 'Gemini 3 Pro',
    provider: 'google',
    modelId: 'gemini-3-pro-preview',
    description: 'Googles bästa modell. Stöd för video och resonemang.',
    costTier: 'medium',
    capabilities: {
      reasoning: 'excellent',
      speed: 'medium',
      contextWindow: 1000000,
    },
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
    },
  },
  {
    id: 'claude-opus',
    name: 'Claude Opus 4.5',
    provider: 'anthropic',
    modelId: 'claude-opus-4-5-20251101',
    description: 'Anthropics mest kraftfulla modell. Premium kvalitet.',
    costTier: 'high',
    capabilities: {
      reasoning: 'excellent',
      speed: 'slow',
      contextWindow: 200000,
    },
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
    },
  },
  {
    id: 'gpt-5.2',
    name: 'GPT-5.2',
    provider: 'openai',
    modelId: 'gpt-5.2',
    description: 'OpenAIs flaggskeppsmodell. Bäst för kodning och agenter.',
    costTier: 'high',
    capabilities: {
      reasoning: 'excellent',
      speed: 'medium',
      contextWindow: 200000,
    },
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
