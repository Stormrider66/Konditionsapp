export interface RealtimeVoiceUsageAccumulator {
  inputTokens: number
  outputTokens: number
  textInputTokens: number
  textOutputTokens: number
  audioInputTokens: number
  audioOutputTokens: number
}

interface RealtimeUsageShape {
  input_tokens?: number
  output_tokens?: number
  inputTokens?: number
  outputTokens?: number
  input_token_details?: {
    text_tokens?: number
    audio_tokens?: number
  }
  output_token_details?: {
    text_tokens?: number
    audio_tokens?: number
  }
  inputTokenDetails?: {
    textTokens?: number
    audioTokens?: number
  }
  outputTokenDetails?: {
    textTokens?: number
    audioTokens?: number
  }
}

interface RealtimeEventShape {
  type?: string
  response?: {
    usage?: RealtimeUsageShape
  }
  usage?: RealtimeUsageShape
}

export function createRealtimeVoiceUsageAccumulator(): RealtimeVoiceUsageAccumulator {
  return {
    inputTokens: 0,
    outputTokens: 0,
    textInputTokens: 0,
    textOutputTokens: 0,
    audioInputTokens: 0,
    audioOutputTokens: 0,
  }
}

function numberValue(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : 0
}

export function addRealtimeUsageFromEvent(
  accumulator: RealtimeVoiceUsageAccumulator,
  event: unknown
): void {
  const data = event as RealtimeEventShape
  if (data?.type !== 'response.done') return

  const usage = data.response?.usage ?? data.usage
  if (!usage) return

  const inputTokens = numberValue(usage.input_tokens ?? usage.inputTokens)
  const outputTokens = numberValue(usage.output_tokens ?? usage.outputTokens)
  const textInputTokens = numberValue(
    usage.input_token_details?.text_tokens ?? usage.inputTokenDetails?.textTokens
  )
  const textOutputTokens = numberValue(
    usage.output_token_details?.text_tokens ?? usage.outputTokenDetails?.textTokens
  )
  const audioInputTokens = numberValue(
    usage.input_token_details?.audio_tokens ?? usage.inputTokenDetails?.audioTokens
  )
  const audioOutputTokens = numberValue(
    usage.output_token_details?.audio_tokens ?? usage.outputTokenDetails?.audioTokens
  )

  accumulator.inputTokens += inputTokens
  accumulator.outputTokens += outputTokens
  accumulator.textInputTokens += textInputTokens
  accumulator.textOutputTokens += textOutputTokens
  accumulator.audioInputTokens += audioInputTokens
  accumulator.audioOutputTokens += audioOutputTokens
}

export function hasRealtimeUsageTokens(accumulator: RealtimeVoiceUsageAccumulator): boolean {
  return (
    accumulator.inputTokens > 0 ||
    accumulator.outputTokens > 0 ||
    accumulator.textInputTokens > 0 ||
    accumulator.textOutputTokens > 0 ||
    accumulator.audioInputTokens > 0 ||
    accumulator.audioOutputTokens > 0
  )
}
