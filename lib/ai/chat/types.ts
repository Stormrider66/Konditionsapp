import type { MemoryContext } from '@/lib/ai/athlete-prompts'

/** Supported text part in AI SDK 5 UIMessage format. */
export interface UIMessagePart {
  type: 'text'
  text: string
}

/** Incoming chat message. Accepts both legacy `content` and new `parts`. */
export interface ChatRequestMessage {
  id?: string
  role: 'user' | 'assistant' | 'system'
  content?: string
  parts?: UIMessagePart[]
}

/** Body shape for POST /api/ai/chat. */
export interface ChatRequest {
  conversationId?: string
  messages: ChatRequestMessage[]
  model: string
  provider: 'ANTHROPIC' | 'GOOGLE' | 'OPENAI'
  athleteId?: string
  documentIds?: string[]
  webSearchEnabled?: boolean
  /** Gemini extended reasoning. */
  deepThinkEnabled?: boolean
  /** Page-scoped context (video analysis, test results, …). */
  pageContext?: string
  /** Current business scope from the route, used for safe coach tools/navigation. */
  businessSlug?: string
  /** Athlete-mode chat: uses athlete's own context + coach's API keys. */
  isAthleteChat?: boolean
  /** Athlete client id (athlete-mode chat only). */
  clientId?: string
  /** Personalization memories. */
  memoryContext?: MemoryContext
  /** Model-intent override (athlete chat). */
  intent?: string
}
