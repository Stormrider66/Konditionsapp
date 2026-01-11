/**
 * AI Service
 *
 * Provides a simple interface for generating AI text responses.
 * Used by background services (pattern detection, nudges, check-ins)
 * that need non-streaming AI generation.
 */

import { generateText } from 'ai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createOpenAI } from '@ai-sdk/openai'
import { getDecryptedUserApiKeys } from '@/lib/user-api-keys'

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
  const userKeys = await getDecryptedUserApiKeys(userId)

  // Try Google first (preferred for background tasks - fast and cost-effective)
  if (userKeys.googleKey) {
    try {
      const google = createGoogleGenerativeAI({ apiKey: userKeys.googleKey })
      const result = await generateText({
        model: google('gemini-3-flash-preview'),
        prompt,
        maxOutputTokens: maxTokens,
        temperature,
      })
      return result.text
    } catch (error) {
      console.warn('Google AI generation failed, trying next provider:', error)
    }
  }

  // Try Anthropic second
  if (userKeys.anthropicKey) {
    try {
      const anthropic = createAnthropic({ apiKey: userKeys.anthropicKey })
      const result = await generateText({
        model: anthropic('claude-3-5-haiku-20241022'),
        prompt,
        maxOutputTokens: maxTokens,
        temperature,
      })
      return result.text
    } catch (error) {
      console.warn('Anthropic AI generation failed, trying next provider:', error)
    }
  }

  // Try OpenAI third
  if (userKeys.openaiKey) {
    try {
      const openai = createOpenAI({ apiKey: userKeys.openaiKey })
      const result = await generateText({
        model: openai('gpt-4o-mini'),
        prompt,
        maxOutputTokens: maxTokens,
        temperature,
      })
      return result.text
    } catch (error) {
      console.warn('OpenAI AI generation failed:', error)
    }
  }

  // Fall back to environment variables
  const envGoogleKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
  const envAnthropicKey = process.env.ANTHROPIC_API_KEY
  const envOpenaiKey = process.env.OPENAI_API_KEY

  if (envGoogleKey) {
    try {
      const google = createGoogleGenerativeAI({ apiKey: envGoogleKey })
      const result = await generateText({
        model: google('gemini-3-flash-preview'),
        prompt,
        maxOutputTokens: maxTokens,
        temperature,
      })
      return result.text
    } catch (error) {
      console.warn('Environment Google AI generation failed:', error)
    }
  }

  if (envAnthropicKey) {
    try {
      const anthropic = createAnthropic({ apiKey: envAnthropicKey })
      const result = await generateText({
        model: anthropic('claude-3-5-haiku-20241022'),
        prompt,
        maxOutputTokens: maxTokens,
        temperature,
      })
      return result.text
    } catch (error) {
      console.warn('Environment Anthropic AI generation failed:', error)
    }
  }

  if (envOpenaiKey) {
    try {
      const openai = createOpenAI({ apiKey: envOpenaiKey })
      const result = await generateText({
        model: openai('gpt-4o-mini'),
        prompt,
        maxOutputTokens: maxTokens,
        temperature,
      })
      return result.text
    } catch (error) {
      console.warn('Environment OpenAI AI generation failed:', error)
    }
  }

  throw new Error('No AI provider available. Please configure API keys.')
}
