/**
 * Gemini 3 Pro Configuration
 *
 * Centralized configuration for Gemini model selection and capabilities.
 * Used throughout the app for consistent model usage.
 */

/**
 * Available Gemini models and their recommended use cases.
 *
 * Note: Model IDs may need adjustment based on Google's API availability.
 * Check https://ai.google.dev/gemini-api/docs/models for current model IDs.
 */
export const GEMINI_MODELS = {
  /** Best for video/audio analysis - fast, stable (December 2025) */
  VIDEO_ANALYSIS: 'gemini-2.5-flash',

  /** Best for audio transcription and extraction */
  AUDIO_TRANSCRIPTION: 'gemini-2.5-flash',

  /** Best for chat conversations with long context */
  CHAT: 'gemini-2.5-flash',

  /** Best for quick responses where latency matters */
  FLASH: 'gemini-2.5-flash',

  /** Advanced reasoning */
  PRO: 'gemini-2.5-pro',

  /** Newest capability, advanced reasoning */
  PRO_PREVIEW: 'gemini-3-pro-preview',
} as const;

/**
 * Gemini model capabilities and limits.
 */
export const GEMINI_CAPABILITIES = {
  /** Maximum video length in seconds (Gemini supports ~1 hour) */
  maxVideoLengthSeconds: 60,

  /** Maximum audio length in seconds */
  maxAudioLengthSeconds: 60,

  /** Context window in tokens (2 million for Gemini 2.5 Pro) */
  contextWindowTokens: 2_000_000,

  /** Whether structured output (generateObject) is supported */
  structuredOutput: true,

  /** Whether grounding/web search is supported */
  grounding: true,

  /** Whether code execution is supported */
  codeExecution: true,

  /** Supported video MIME types */
  supportedVideoTypes: [
    'video/mp4',
    'video/webm',
    'video/quicktime', // .mov
    'video/x-msvideo', // .avi
  ],

  /** Supported audio MIME types */
  supportedAudioTypes: [
    'audio/webm',
    'audio/mp4',
    'audio/mpeg', // .mp3
    'audio/wav',
    'audio/ogg',
  ],
} as const;

/**
 * Cost estimates per 1K tokens (USD).
 * Based on provider pricing as of December 2025.
 */
export const GEMINI_PRICING: Record<string, { input: number; output: number }> = {
  // Google Gemini models
  'gemini-3-pro-preview': {
    input: 0.002, // $2.00 per 1M input tokens
    output: 0.012, // $12.00 per 1M output tokens
  },
  'gemini-2.5-pro': {
    input: 0.00125, // $1.25 per 1M input tokens
    output: 0.005, // $5.00 per 1M output tokens
  },
  'gemini-2.5-flash': {
    input: 0.00015, // $0.15 per 1M input tokens
    output: 0.0006, // $0.60 per 1M output tokens
  },
  // Anthropic Claude models
  'claude-sonnet-4-5-20250929': {
    input: 0.003, // $3.00 per 1M input tokens
    output: 0.015, // $15.00 per 1M output tokens
  },
  'claude-opus-4-5-20251101': {
    input: 0.005, // $5.00 per 1M input tokens
    output: 0.025, // $25.00 per 1M output tokens
  },
  'claude-haiku-4-5-20251001': {
    input: 0.001, // $1.00 per 1M input tokens
    output: 0.005, // $5.00 per 1M output tokens
  },
  // OpenAI GPT models
  'gpt-5.2-thinking': {
    input: 0.010, // $10.00 per 1M input tokens
    output: 0.030, // $30.00 per 1M output tokens
  },
  'gpt-5.2': {
    input: 0.005, // $5.00 per 1M input tokens
    output: 0.015, // $15.00 per 1M output tokens
  },
  'gpt-5.2-instant': {
    input: 0.001, // $1.00 per 1M input tokens
    output: 0.003, // $3.00 per 1M output tokens
  },
};

/**
 * Estimate cost for a video analysis request.
 * A 60-second video is roughly 15k-20k tokens.
 *
 * @param durationSeconds - Video duration
 * @param model - Gemini model being used
 * @returns Estimated cost in USD
 */
export function estimateVideoCost(
  durationSeconds: number,
  model: keyof typeof GEMINI_PRICING = 'gemini-3-pro-preview'
): number {
  // Rough estimate: ~300 tokens per second of video
  const estimatedTokens = durationSeconds * 300;
  const pricing = GEMINI_PRICING[model];

  // Assume 80% input (video), 20% output (analysis)
  const inputTokens = estimatedTokens * 0.8;
  const outputTokens = 2000; // Typical analysis output

  return (inputTokens / 1000) * pricing.input + (outputTokens / 1000) * pricing.output;
}

/**
 * Estimate cost for an audio transcription request.
 *
 * @param durationSeconds - Audio duration
 * @param model - Gemini model being used
 * @returns Estimated cost in USD
 */
export function estimateAudioCost(
  durationSeconds: number,
  model: keyof typeof GEMINI_PRICING = 'gemini-3-pro-preview'
): number {
  // Rough estimate: ~100 tokens per second of audio
  const estimatedTokens = durationSeconds * 100;
  const pricing = GEMINI_PRICING[model];

  const inputTokens = estimatedTokens;
  const outputTokens = 1500; // Typical extraction output

  return (inputTokens / 1000) * pricing.input + (outputTokens / 1000) * pricing.output;
}

/**
 * Get the recommended model for a specific task.
 */
export function getModelForTask(
  task: 'video' | 'audio' | 'chat' | 'quick'
): string {
  switch (task) {
    case 'video':
      return GEMINI_MODELS.VIDEO_ANALYSIS;
    case 'audio':
      return GEMINI_MODELS.AUDIO_TRANSCRIPTION;
    case 'chat':
      return GEMINI_MODELS.CHAT;
    case 'quick':
      return GEMINI_MODELS.FLASH;
    default:
      return GEMINI_MODELS.CHAT;
  }
}

/**
 * Validate that a file type is supported for video analysis.
 */
export function isValidVideoType(mimeType: string): boolean {
  return GEMINI_CAPABILITIES.supportedVideoTypes.includes(
    mimeType as (typeof GEMINI_CAPABILITIES.supportedVideoTypes)[number]
  );
}

/**
 * Validate that a file type is supported for audio analysis.
 */
export function isValidAudioType(mimeType: string): boolean {
  return GEMINI_CAPABILITIES.supportedAudioTypes.includes(
    mimeType as (typeof GEMINI_CAPABILITIES.supportedAudioTypes)[number]
  );
}

/**
 * Safety settings for video/audio analysis.
 * We allow more content since this is professional sports analysis.
 */
export const GEMINI_SAFETY_SETTINGS = [
  {
    category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
    threshold: 'BLOCK_ONLY_HIGH',
  },
  {
    category: 'HARM_CATEGORY_HARASSMENT',
    threshold: 'BLOCK_ONLY_HIGH',
  },
  {
    category: 'HARM_CATEGORY_HATE_SPEECH',
    threshold: 'BLOCK_ONLY_HIGH',
  },
  {
    category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
    threshold: 'BLOCK_ONLY_HIGH',
  },
] as const;

/**
 * Thinking Mode configuration for Gemini 3 Pro.
 *
 * thinkingLevel options:
 * - 'DISABLED': No extended thinking (fastest, cheapest)
 * - 'LOW': Quick reasoning for simple decisions
 * - 'MEDIUM': Balanced reasoning for most tasks (default)
 * - 'HIGH': Deep reasoning for complex multi-step analysis
 *
 * thinkingBudget: Maximum tokens the model can use for internal reasoning
 * (not counted against output tokens, but affects latency and cost)
 */
export type ThinkingLevel = 'DISABLED' | 'LOW' | 'MEDIUM' | 'HIGH';

export interface ThinkingConfig {
  thinkingLevel: ThinkingLevel;
  thinkingBudget?: number;
}

export const THINKING_PRESETS: Record<string, ThinkingConfig> = {
  /** Fast responses, no extended thinking */
  disabled: {
    thinkingLevel: 'DISABLED',
  },
  /** Quick reasoning for simple tasks */
  quick: {
    thinkingLevel: 'LOW',
    thinkingBudget: 5000,
  },
  /** Balanced reasoning for most tasks */
  standard: {
    thinkingLevel: 'MEDIUM',
    thinkingBudget: 10000,
  },
  /** Deep reasoning for complex periodization, injury analysis */
  deep: {
    thinkingLevel: 'HIGH',
    thinkingBudget: 20000,
  },
  /** Maximum reasoning for career-scale analysis */
  maximum: {
    thinkingLevel: 'HIGH',
    thinkingBudget: 50000,
  },
};

/**
 * Get provider options for Gemini with thinking mode.
 *
 * Note: thinkingConfig is a Gemini 3 Pro feature. When the SDK fully supports it,
 * these options will be passed to the model. For now, we return the configuration
 * structure that can be extended.
 *
 * @param preset - Thinking preset name or custom config
 * @returns Provider options object for Vercel AI SDK (currently experimental)
 */
export function getGeminiThinkingOptions(
  preset: keyof typeof THINKING_PRESETS | ThinkingConfig = 'standard'
) {
  const config = typeof preset === 'string' ? THINKING_PRESETS[preset] : preset;

  // Return undefined for now as Vercel AI SDK may not yet support thinkingConfig
  // The configuration is ready for when SDK support is added
  // Store config for future use (suppressing unused warning)
  void config;

  // Return undefined until SDK supports providerOptions.google.thinkingConfig
  return undefined;
}

/**
 * Estimate cost including thinking tokens.
 * Thinking tokens are charged at output rates.
 */
export function estimateCostWithThinking(
  inputTokens: number,
  outputTokens: number,
  thinkingTokens: number,
  model: keyof typeof GEMINI_PRICING = 'gemini-3-pro-preview'
): { inputCost: number; outputCost: number; thinkingCost: number; totalCost: number } {
  const pricing = GEMINI_PRICING[model];

  const inputCost = (inputTokens / 1000) * pricing.input;
  const outputCost = (outputTokens / 1000) * pricing.output;
  const thinkingCost = (thinkingTokens / 1000) * pricing.output; // Thinking charged at output rate

  return {
    inputCost,
    outputCost,
    thinkingCost,
    totalCost: inputCost + outputCost + thinkingCost,
  };
}

/**
 * Format cost for display in UI.
 */
export function formatCost(costUSD: number): string {
  if (costUSD < 0.01) {
    return `$${(costUSD * 100).toFixed(2)}¢`;
  }
  return `$${costUSD.toFixed(4)}`;
}

/**
 * Estimate tokens from text length.
 * Rough approximation: ~4 characters per token for English/Swedish.
 */
export function estimateTokensFromText(text: string): number {
  return Math.ceil(text.length / 4);
}
