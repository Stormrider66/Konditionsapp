const OPENAI_REALTIME_TEXT_INPUT_USD_PER_1M = 4
const OPENAI_REALTIME_TEXT_OUTPUT_USD_PER_1M = 24
const OPENAI_REALTIME_AUDIO_INPUT_USD_PER_1M = 32
const OPENAI_REALTIME_AUDIO_OUTPUT_USD_PER_1M = 64

const ESTIMATED_AUDIO_TOKENS_PER_SECOND = 50

export interface RealtimeVoiceUsageInput {
  durationSeconds: number
  audioInputSeconds?: number
  audioOutputSeconds?: number
  inputTokens?: number
  outputTokens?: number
  textInputTokens?: number
  textOutputTokens?: number
  audioInputTokens?: number
  audioOutputTokens?: number
}

export interface RealtimeVoiceCostEstimate {
  inputTokens: number
  outputTokens: number
  textInputTokens: number
  textOutputTokens: number
  audioInputTokens: number
  audioOutputTokens: number
  estimatedCost: number
  usedTokenDetails: boolean
}

function normalizedNumber(value: number | undefined): number | undefined {
  if (value === undefined || !Number.isFinite(value) || value < 0) return undefined
  return Math.floor(value)
}

function tokensFromSeconds(seconds: number | undefined): number | undefined {
  if (seconds === undefined || !Number.isFinite(seconds) || seconds <= 0) return undefined
  return Math.ceil(seconds * ESTIMATED_AUDIO_TOKENS_PER_SECOND)
}

function costPerMillion(tokens: number, usdPerMillion: number): number {
  return (tokens / 1_000_000) * usdPerMillion
}

export function estimateRealtimeVoiceCost(input: RealtimeVoiceUsageInput): RealtimeVoiceCostEstimate {
  const totalInputTokens = normalizedNumber(input.inputTokens)
  const totalOutputTokens = normalizedNumber(input.outputTokens)

  let audioInputTokens = normalizedNumber(input.audioInputTokens)
  let audioOutputTokens = normalizedNumber(input.audioOutputTokens)
  let textInputTokens = normalizedNumber(input.textInputTokens)
  let textOutputTokens = normalizedNumber(input.textOutputTokens)

  const usedTokenDetails =
    audioInputTokens !== undefined ||
    audioOutputTokens !== undefined ||
    textInputTokens !== undefined ||
    textOutputTokens !== undefined ||
    totalInputTokens !== undefined ||
    totalOutputTokens !== undefined

  if (audioInputTokens === undefined && textInputTokens === undefined && totalInputTokens !== undefined) {
    audioInputTokens = totalInputTokens
    textInputTokens = 0
  }

  if (audioOutputTokens === undefined && textOutputTokens === undefined && totalOutputTokens !== undefined) {
    audioOutputTokens = totalOutputTokens
    textOutputTokens = 0
  }

  if (audioInputTokens === undefined) {
    audioInputTokens =
      tokensFromSeconds(input.audioInputSeconds) ??
      tokensFromSeconds(input.durationSeconds * 0.5) ??
      0
  }

  if (audioOutputTokens === undefined) {
    audioOutputTokens =
      tokensFromSeconds(input.audioOutputSeconds) ??
      tokensFromSeconds(input.durationSeconds * 0.2) ??
      0
  }

  if (textInputTokens === undefined) {
    textInputTokens = totalInputTokens !== undefined
      ? Math.max(0, totalInputTokens - audioInputTokens)
      : 400
  }

  if (textOutputTokens === undefined) {
    textOutputTokens = totalOutputTokens !== undefined
      ? Math.max(0, totalOutputTokens - audioOutputTokens)
      : 100
  }

  const inputTokens = audioInputTokens + textInputTokens
  const outputTokens = audioOutputTokens + textOutputTokens
  const estimatedCost =
    costPerMillion(textInputTokens, OPENAI_REALTIME_TEXT_INPUT_USD_PER_1M) +
    costPerMillion(textOutputTokens, OPENAI_REALTIME_TEXT_OUTPUT_USD_PER_1M) +
    costPerMillion(audioInputTokens, OPENAI_REALTIME_AUDIO_INPUT_USD_PER_1M) +
    costPerMillion(audioOutputTokens, OPENAI_REALTIME_AUDIO_OUTPUT_USD_PER_1M)

  return {
    inputTokens,
    outputTokens,
    textInputTokens,
    textOutputTokens,
    audioInputTokens,
    audioOutputTokens,
    estimatedCost,
    usedTokenDetails,
  }
}
