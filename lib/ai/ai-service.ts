/**
 * AI Service
 *
 * Provides a simple interface for generating AI text responses.
 * Used by background services (pattern detection, nudges, check-ins)
 * that need non-streaming AI generation.
 *
 * Uses resolveModel() for provider-agnostic model selection.
 */

import { generateText } from 'ai'
import { getResolvedAiKeys } from '@/lib/user-api-keys'
import { resolveModel, type AvailableKeys } from '@/types/ai-models'
import { createModelInstance } from '@/lib/ai/create-model'

export interface GenerateOptions {
  maxTokens?: number
  temperature?: number
}

/**
 * Generate an AI response using the user's configured API keys.
 *
 * Tries providers in order: Google > Anthropic > OpenAI
 * Falls back to environment variables if user has no keys configured.
 *
 * @param userId - The coach's user ID (for API key lookup)
 * @param prompt - The prompt to send to the AI
 * @param options - Optional generation settings
 * @returns The generated text response
 */
export async function generateAIResponse(
  userId: string,
  prompt: string,
  options: GenerateOptions = {}
): Promise<string> {
  const { maxTokens = 1000, temperature = 0.7 } = options

  // Get user's API keys
  const userKeys = await getResolvedAiKeys(userId)

  // Try user keys first
  const resolved = resolveModel(userKeys, 'fast')
  if (resolved) {
    try {
      const result = await generateText({
        model: createModelInstance(resolved),
        prompt,
        maxOutputTokens: maxTokens,
        temperature,
      })
      return result.text
    } catch (error) {
      console.warn(`AI generation failed with ${resolved.provider}:`, error)
    }
  }

  // Fall back to environment variables
  const envKeys: AvailableKeys = {
    googleKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || null,
    anthropicKey: process.env.ANTHROPIC_API_KEY || null,
    openaiKey: process.env.OPENAI_API_KEY || null,
  }

  const envResolved = resolveModel(envKeys, 'fast')
  if (envResolved) {
    try {
      const result = await generateText({
        model: createModelInstance(envResolved),
        prompt,
        maxOutputTokens: maxTokens,
        temperature,
      })
      return result.text
    } catch (error) {
      console.warn(`Environment AI generation failed with ${envResolved.provider}:`, error)
    }
  }

  throw new Error('No AI provider available. Please configure API keys.')
}
