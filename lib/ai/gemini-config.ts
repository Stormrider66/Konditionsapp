/**
 * Gemini Configuration
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
  /** Best for video/audio analysis - fast, stable */
  VIDEO_ANALYSIS: 'gemini-3.5-flash',

  /** Best for audio transcription and extraction */
  AUDIO_TRANSCRIPTION: 'gemini-3.5-flash',

  /** Best for chat conversations with long context */
  CHAT: 'gemini-3.5-flash',

  /** Best for quick responses where latency matters */
  FLASH: 'gemini-3.5-flash',

  /** Advanced reasoning */
  PRO: 'gemini-3.1-pro-preview',

  /** Newest capability, advanced reasoning */
  PRO_PREVIEW: 'gemini-3.1-pro-preview',

  /** Image generation (fast) */
  IMAGE_GENERATION: 'gemini-2.5-flash-image',

  /** Image generation (high quality) */
  IMAGE_GENERATION_PRO: 'gemini-3-pro-image-preview',

  /** Text/multimodal embedding — Matryoshka dimensions, strong multilingual */
  EMBEDDING: 'gemini-embedding-2-preview',

  /** Real-time voice coaching via Live API (bidirectional WebSocket) */
  VOICE_COACHING: 'gemini-3.1-flash-live-preview',
} as const;

/**
 * Gemini model capabilities and limits.
 */
export const GEMINI_CAPABILITIES = {
  /** Maximum video length in seconds (Gemini supports ~1 hour) */
  maxVideoLengthSeconds: 60,

  /** Maximum audio length in seconds */
  maxAudioLengthSeconds: 60,

  /** Context window in tokens (1 million for Gemini 3.5 Flash) */
  contextWindowTokens: 1_048_576,

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
export const GEMINI_PRICING: Record<string, { input: number; output: number; imageOutput?: number }> = {
  // Google Gemini models
  'gemini-3.1-pro-preview': {
    input: 0.002, // $2.00 per 1M input tokens
    output: 0.012, // $12.00 per 1M output tokens
  },
  'gemini-2.5-pro': {
    input: 0.00125, // $1.25 per 1M input tokens
    output: 0.005, // $5.00 per 1M output tokens
  },
  'gemini-3.1-flash-lite-preview': {
    input: 0.00025, // $0.25 per 1M input tokens
    output: 0.0015, // $1.50 per 1M output tokens
  },
  'gemini-3.5-flash': {
    input: 0.0015, // $1.50 per 1M input tokens
    output: 0.009, // $9.00 per 1M output tokens
  },
  // Kept for historical logs and any in-flight conversations pinned to preview.
  'gemini-3-flash-preview': {
    input: 0.0005, // $0.50 per 1M input tokens
    output: 0.003, // $3.00 per 1M output tokens
  },
  'gemini-2.5-flash-image': {
    input: 0.0005,
    output: 0.003,
    imageOutput: 0.03, // $30.00 per 1M image output tokens
  },
  'gemini-3-pro-image-preview': {
    input: 0.002,
    output: 0.012,
    imageOutput: 0.067, // Approx. $0.134 per 2K image = $67 per 1M image output tokens
  },
  // Embedding models (output cost is 0 — embeddings are input-only)
  'gemini-embedding-2-preview': {
    input: 0.0002, // $0.20 per 1M input tokens
    output: 0,
  },
  'text-embedding-3-small': {
    input: 0.00002, // $0.02 per 1M input tokens
    output: 0,
  },
  // Google Live API model (text token rates — audio charged separately)
  'gemini-3.1-flash-live-preview': {
    input: 0.00075, // $0.75 per 1M text input tokens
    output: 0.0045, // $4.50 per 1M text output tokens
  },
  // Anthropic Claude models
  'claude-sonnet-4-6': {
    input: 0.003, // $3.00 per 1M input tokens
    output: 0.015, // $15.00 per 1M output tokens
  },
  'claude-opus-4-8': {
    input: 0.005, // $5.00 per 1M input tokens
    output: 0.025, // $25.00 per 1M output tokens
  },
  // Previous-generation Opus — kept for pinned/stored model ids and history.
  'claude-opus-4-7': {
    input: 0.005, // $5.00 per 1M input tokens
    output: 0.025, // $25.00 per 1M output tokens
  },
  'claude-haiku-4-5': {
    input: 0.001, // $1.00 per 1M input tokens
    output: 0.005, // $5.00 per 1M output tokens
  },
  // OpenAI GPT models
  'gpt-5.5-thinking': {
    input: 0.010, // $10.00 per 1M input tokens
    output: 0.030, // $30.00 per 1M output tokens
  },
  'gpt-5.5': {
    input: 0.005, // $5.00 per 1M input tokens
    output: 0.030, // $30.00 per 1M output tokens (matches AI_MODELS pricing on cost pages)
  },
  'gpt-5.3-instant': {
    input: 0.001, // $1.00 per 1M input tokens
    output: 0.003, // $3.00 per 1M output tokens
  },
  'gpt-5.4-nano': {
    input: 0.0002, // $0.20 per 1M input tokens
    output: 0.00125, // $1.25 per 1M output tokens
  },
  'gpt-5.4-mini': {
    input: 0.00075, // $0.75 per 1M input tokens
    output: 0.0045, // $4.50 per 1M output tokens
  },
  // The powerful-intent Anthropic tier in types/ai-models.ts resolves to
  // claude-opus-4-6; priced as the 4.x Opus family.
  'claude-opus-4-6': {
    input: 0.005, // $5.00 per 1M input tokens
    output: 0.025, // $25.00 per 1M output tokens
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
  model: keyof typeof GEMINI_PRICING = 'gemini-3.1-pro-preview'
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
  model: keyof typeof GEMINI_PRICING = 'gemini-3.1-pro-preview'
): number {
  // Rough estimate: ~100 tokens per second of audio
  const estimatedTokens = durationSeconds * 100;
  const pricing = GEMINI_PRICING[model];

  const inputTokens = estimatedTokens;
  const outputTokens = 1500; // Typical extraction output

  return (inputTokens / 1000) * pricing.input + (outputTokens / 1000) * pricing.output;
}

/**
 * Audio-specific pricing for Gemini Live API sessions.
 * Audio tokens are charged at different rates from text tokens.
 */
export const GEMINI_LIVE_AUDIO_PRICING = {
  /** Cost per second of audio input (~25 tokens/s at $3.00/M) */
  audioInputPerSecond: 0.000075,
  /** Cost per second of audio output (~25 tokens/s at $12.00/M) */
  audioOutputPerSecond: 0.0003,
} as const;

/**
 * Estimate cost for a Live API voice coaching session.
 */
export function estimateLiveSessionCost(
  durationSeconds: number,
  audioInputSeconds?: number,
  audioOutputSeconds?: number,
): { audioInputCost: number; audioOutputCost: number; textCost: number; totalCost: number } {
  // Use actual audio seconds if provided, otherwise estimate from session duration
  const audioIn = audioInputSeconds ?? durationSeconds * 0.5;
  const audioOut = audioOutputSeconds ?? durationSeconds * 0.2;

  const audioInputCost = audioIn * GEMINI_LIVE_AUDIO_PRICING.audioInputPerSecond;
  const audioOutputCost = audioOut * GEMINI_LIVE_AUDIO_PRICING.audioOutputPerSecond;
  // Text cost covers system prompt + tool call overhead
  const textCost = 0.001;

  return {
    audioInputCost,
    audioOutputCost,
    textCost,
    totalCost: audioInputCost + audioOutputCost + textCost,
  };
}

/**
 * Get the recommended model for a specific task.
 */
export function getModelForTask(
  task: 'video' | 'audio' | 'chat' | 'quick' | 'image' | 'voice'
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
    case 'image':
      return GEMINI_MODELS.IMAGE_GENERATION;
    case 'voice':
      return GEMINI_MODELS.VOICE_COACHING;
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
 * Thinking Mode configuration for Gemini 3 models.
 *
 * thinkingLevel options:
 * - 'minimal': Lowest-cost setting for simple generation where quality risk is low
 * - 'low': Quick reasoning for simple decisions
 * - 'medium': Balanced reasoning for most tasks
 * - 'high': Deep reasoning for complex multi-step analysis
 *
 * Thinking tokens are billed as output tokens, so keep routine tasks on low.
 */
export type ThinkingLevel = 'minimal' | 'low' | 'medium' | 'high';

export interface ThinkingConfig {
  thinkingLevel: ThinkingLevel;
  thinkingBudget?: number;
}

export const THINKING_PRESETS: Record<string, ThinkingConfig> = {
  /** Lowest-cost responses for very simple tasks */
  minimal: {
    thinkingLevel: 'minimal',
  },
  /** Quick reasoning for simple tasks */
  quick: {
    thinkingLevel: 'low',
  },
  /** Balanced reasoning for most tasks */
  standard: {
    thinkingLevel: 'medium',
  },
  /** Deep reasoning for complex periodization, injury analysis */
  deep: {
    thinkingLevel: 'high',
  },
  /** Maximum reasoning for career-scale analysis */
  maximum: {
    thinkingLevel: 'high',
  },
};

/**
 * Get provider options for Gemini with thinking mode.
 *
 * @param preset - Thinking preset name or custom config
 * @returns Provider options object for Vercel AI SDK
 */
export function getGeminiThinkingOptions(
  preset: keyof typeof THINKING_PRESETS | ThinkingConfig = 'standard'
) {
  const config = typeof preset === 'string' ? THINKING_PRESETS[preset] : preset;
  const thinkingLevel = config.thinkingLevel === 'minimal' ? 'low' : config.thinkingLevel;

  return {
    google: {
      thinkingConfig: {
        thinkingLevel,
        ...(config.thinkingBudget !== undefined ? { thinkingBudget: config.thinkingBudget } : {}),
      },
    },
  };
}

/**
 * Estimate cost including thinking tokens.
 * Thinking tokens are charged at output rates.
 */
export function estimateCostWithThinking(
  inputTokens: number,
  outputTokens: number,
  thinkingTokens: number,
  model: keyof typeof GEMINI_PRICING = 'gemini-3.1-pro-preview'
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
