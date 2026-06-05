import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { incrementAIChatUsage } from '@/lib/subscription/feature-access'
import { getResolvedAiKeys } from '@/lib/user-api-keys'
import { extractMemoriesFromConversation, saveMemories } from '@/lib/ai/memory-extractor'
import { logAiUsage, withAiContext, type AiProviderTag } from '@/lib/ai/usage-logger'
import type { ChatRequestMessage } from './types'
import { getMessageContent } from './message-format'

type AppLocale = 'en' | 'sv'

type Usage = {
  inputTokens?: number
  outputTokens?: number
}

export interface BuildOnFinishInput {
  conversationId?: string
  messages: ChatRequestMessage[]
  model: string
  provider: string
  maxOutputTokens: number
  isAthleteChat: boolean
  athleteClientId?: string
  apiKeyUserId: string
  effectiveBusinessId: string | null
  usageLoggedByMiddleware: boolean
  locale?: AppLocale
}

/**
 * Build the `onFinish` callback streamText will invoke after the stream
 * closes. Persists both the user and assistant turns (when a
 * conversationId is supplied), increments athlete AI-chat usage, and
 * fires a non-blocking memory-extraction job.
 */
export function buildOnFinishHandler(input: BuildOnFinishInput) {
  const {
    conversationId,
    messages,
    model,
    provider,
    maxOutputTokens,
    isAthleteChat,
    athleteClientId,
    apiKeyUserId,
    effectiveBusinessId,
    usageLoggedByMiddleware,
    locale = 'en',
  } = input

  return async ({
    text,
    usage,
    finishReason,
  }: {
    text?: string
    usage?: Usage
    finishReason?: string
  }): Promise<void> => {
    logger.debug('AI response finished', {
      textLength: text?.length,
      usage,
      finishReason,
      hasConversationId: Boolean(conversationId),
    })

    if (finishReason === 'length') {
      logger.warn('AI response truncated due to token limit', {
        provider,
        model,
        maxOutputTokens,
        outputTokens: usage?.outputTokens,
      })
    }

    if (!usageLoggedByMiddleware) {
      logAiUsage({
        userId: apiKeyUserId,
        clientId: athleteClientId,
        category: isAthleteChat ? 'athlete_chat' : 'coach_chat',
        provider: provider as AiProviderTag,
        model,
        inputTokens: usage?.inputTokens ?? 0,
        outputTokens: usage?.outputTokens ?? 0,
        conversationId,
      })
    }

    if (conversationId) {
      try {
        const lastUserMessage = messages.filter((m) => m.role === 'user').pop()
        const userContent = lastUserMessage ? getMessageContent(lastUserMessage) : ''
        if (userContent) {
          await prisma.aIMessage.create({
            data: { conversationId, role: 'user', content: userContent },
          })
        }

        if (text) {
          await prisma.aIMessage.create({
            data: {
              conversationId,
              role: 'assistant',
              content: text,
              inputTokens: usage?.inputTokens,
              outputTokens: usage?.outputTokens,
              modelUsed: model,
            },
          })
        }

        await prisma.aIConversation.update({
          where: { id: conversationId },
          data: {
            totalTokensUsed: {
              increment: (usage?.inputTokens || 0) + (usage?.outputTokens || 0),
            },
            updatedAt: new Date(),
          },
        })
      } catch (error) {
        logger.error('Error saving messages', { conversationId }, error)
      }
    }

    if (isAthleteChat && athleteClientId) {
      try {
        await incrementAIChatUsage(athleteClientId)
      } catch (usageError) {
        logger.warn(
          'Failed to increment AI chat usage',
          { clientId: athleteClientId },
          usageError
        )
      }
    }

    if (isAthleteChat && athleteClientId && text) {
      const lastUserMessage = messages.filter((m) => m.role === 'user').pop()
      if (lastUserMessage) {
        // Fire-and-forget memory extraction (errors handled internally).
        void (async () => {
          try {
            const apiKeys = await getResolvedAiKeys(apiKeyUserId, {
              businessId: effectiveBusinessId,
              disableMembershipFallback: isAthleteChat || !!effectiveBusinessId,
            })
            if (apiKeys.anthropicKey || apiKeys.googleKey || apiKeys.openaiKey) {
              const conversationForMemory = [
                { role: 'user' as const, content: getMessageContent(lastUserMessage) },
                { role: 'assistant' as const, content: text },
              ]
              const extractedMemories = await withAiContext(
                {
                  userId: apiKeyUserId,
                  clientId: athleteClientId,
                  category: 'athlete_memory_extraction',
                  conversationId,
                },
                () => extractMemoriesFromConversation(
                  conversationForMemory,
                  apiKeys,
                  locale
                )
              )
              if (extractedMemories.length > 0) {
                const savedCount = await saveMemories(athleteClientId, extractedMemories)
                logger.debug('Memories extracted from conversation', {
                  clientId: athleteClientId,
                  extracted: extractedMemories.length,
                  saved: savedCount,
                })
              }
            }
          } catch (memoryError) {
            logger.warn(
              'Memory extraction failed (non-blocking)',
              { clientId: athleteClientId },
              memoryError
            )
          }
        })()
      }
    }
  }
}
