/**
 * AI Conversation Message API
 *
 * POST /api/ai/conversations/[id]/message - Send message and get AI response
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCoach } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { searchSimilarChunks, hasEmbeddingKeys, type EmbeddingKeys } from '@/lib/ai/embeddings'
import Anthropic from '@anthropic-ai/sdk'
import { generateText } from 'ai'
import { getResolvedAiKeys } from '@/lib/user-api-keys'
import { resolveModel } from '@/types/ai-models'
import { createModelInstance } from '@/lib/ai/create-model'
import { rateLimitJsonResponse } from '@/lib/api/rate-limit'
import { logger } from '@/lib/logger'
import { normalizeAIModelId } from '@/lib/ai/model-compat'
import { logAiUsage, withAiContext } from '@/lib/ai/usage-logger'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

interface SendMessageRequest {
  content: string
  contextDocuments?: string[]
  webSearchEnabled?: boolean
}

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

// POST - Send message and get AI response
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let locale: AppLocale = resolveRequestLocale(request)

  try {
    const user = await requireCoach()
    locale = resolveRequestLocale(request, user.language)

    const rateLimited = await rateLimitJsonResponse('ai:conversations:message', user.id, {
      limit: 10,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    const { id: conversationId } = await params

    const body: SendMessageRequest = await request.json()
    const { content, contextDocuments = [] } = body

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json(
        { error: t(locale, 'Message content is required', 'Meddelandetext krävs') },
        { status: 400 }
      )
    }

    // Get conversation and verify ownership
    const conversation = await prisma.aIConversation.findFirst({
      where: {
        id: conversationId,
        coachId: user.id,
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 20, // Last 20 messages for context
        },
        athlete: {
          select: {
            id: true,
            name: true,
            email: true,
            gender: true,
            birthDate: true,
            sportProfile: true,
          },
        },
      },
    })

    if (!conversation) {
      return NextResponse.json(
        { error: t(locale, 'Conversation not found', 'Konversationen hittades inte') },
        { status: 404 }
      )
    }

    // Get API keys
    const apiKeysRow = await prisma.userApiKey.findUnique({
      where: { userId: user.id },
    })
    const decryptedKeys = await getResolvedAiKeys(user.id)

    if (!apiKeysRow) {
      return NextResponse.json(
        { error: t(locale, 'API keys are not configured', 'API-nycklar är inte konfigurerade') },
        { status: 400 }
      )
    }

    // Save user message
    const userMessage = await prisma.aIMessage.create({
      data: {
        conversationId,
        role: 'user',
        content: content.trim(),
      },
    })

    // Build context from documents if available
    const embeddingKeys: EmbeddingKeys = { googleKey: decryptedKeys.googleKey, openaiKey: decryptedKeys.openaiKey }
    let documentContext = ''
    if (contextDocuments.length > 0 && hasEmbeddingKeys(embeddingKeys)) {
      try {
        const chunks = await searchSimilarChunks(
          content,
          user.id,
          embeddingKeys,
          {
            matchThreshold: 0.75,
            matchCount: 5,
            documentIds: contextDocuments,
          }
        )

        if (chunks.length > 0) {
          const docs = await prisma.coachDocument.findMany({
            where: { id: { in: chunks.map((c) => c.documentId) } },
            select: { id: true, name: true },
          })
          const docMap = new Map(docs.map((d) => [d.id, d.name]))

          documentContext = chunks
            .map(
              (c, i) =>
                `[${t(locale, 'Source', 'Källa')} ${i + 1}: ${docMap.get(c.documentId) || t(locale, 'Document', 'Dokument')}]\n${c.content}`
            )
            .join('\n\n---\n\n')
        }
      } catch (error) {
        logger.warn('Error fetching document context', {}, error)
      }
    }

    // Build athlete context
    let athleteContext = ''
    if (conversation.athlete) {
      const athlete = conversation.athlete
      athleteContext = locale === 'sv'
        ? `
ATLETINFORMATION:
- Namn: ${athlete.name}
- Email: ${athlete.email}
${athlete.gender ? `- Kön: ${athlete.gender}` : ''}
${athlete.birthDate ? `- Födelsedatum: ${athlete.birthDate}` : ''}
${athlete.sportProfile ? `- Sport: ${JSON.stringify(athlete.sportProfile)}` : ''}
`
        : `
ATHLETE INFORMATION:
- Name: ${athlete.name}
- Email: ${athlete.email}
${athlete.gender ? `- Gender: ${athlete.gender}` : ''}
${athlete.birthDate ? `- Birth date: ${athlete.birthDate}` : ''}
${athlete.sportProfile ? `- Sport: ${JSON.stringify(athlete.sportProfile)}` : ''}
`
    }

    // Build system prompt
    const systemPrompt = locale === 'sv'
      ? `Du är en erfaren tränare och idrottsfysiolog som hjälper coacher att skapa träningsprogram.
Du har djup kunskap om:
- Periodisering och träningsplanering
- Fysiologiska principer (VO2max, laktattröskel, etc.)
- Olika träningsmetodiker (Polarized, Norwegian, Canova, etc.)
- Styrketräning för uthållighetsidrottare
- Skadeförebyggande och återhämtning

${athleteContext}

${documentContext ? `RELEVANT INFORMATION FRÅN DOKUMENT:\n${documentContext}\n` : ''}

Svara alltid på svenska. Var konkret och ge praktiska råd baserade på vetenskaplig grund.
När du föreslår träningsprogram, var specifik med intensiteter, volymer och frekvenser.`
      : `You are an experienced coach and exercise physiologist who helps coaches create training programs.
You have deep knowledge of:
- Periodization and training planning
- Physiological principles (VO2max, lactate threshold, etc.)
- Different training methodologies (Polarized, Norwegian, Canova, etc.)
- Strength training for endurance athletes
- Injury prevention and recovery

${athleteContext}

${documentContext ? `RELEVANT INFORMATION FROM DOCUMENTS:\n${documentContext}\n` : ''}

Always answer in English. Be concrete and give practical advice grounded in science.
When you suggest training programs, be specific with intensities, volumes, and frequencies.`

    // Build message history
    const messageHistory = conversation.messages.map((msg) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }))

    // Add current user message
    messageHistory.push({
      role: 'user',
      content: content.trim(),
    })

    let assistantResponse = ''
    let inputTokens = 0
    let outputTokens = 0
    const startTime = Date.now()

    // Resolve fallback once outside so the no-key 400 stays a clean early return.
    const fallbackResolved =
      conversation.provider === 'ANTHROPIC' && decryptedKeys.anthropicKey
        ? null
        : conversation.provider === 'GOOGLE' && decryptedKeys.googleKey
        ? null
        : resolveModel(decryptedKeys, 'balanced')
    if (
      conversation.provider !== 'ANTHROPIC' &&
      conversation.provider !== 'GOOGLE' &&
      !fallbackResolved
    ) {
      return NextResponse.json(
        {
          error: t(
            locale,
            'No AI API key is configured. Configure at least one API key in settings.',
            'Ingen AI API-nyckel konfigurerad. Konfigurera minst en API-nyckel i inställningarna.'
          ),
        },
        { status: 400 }
      )
    }

    await withAiContext(
      { userId: user.id, clientId: conversation.athleteId, category: 'chat', conversationId },
      async () => {
      // Call AI based on provider
      if (conversation.provider === 'ANTHROPIC' && decryptedKeys.anthropicKey) {
        try {
          const anthropic = new Anthropic({
            apiKey: decryptedKeys.anthropicKey,
          })

          const model = conversation.modelUsed || 'claude-sonnet-4-6'
          const response = await anthropic.messages.create({
            model,
            max_tokens: 4096,
            system: systemPrompt,
            messages: messageHistory,
          })

          assistantResponse =
            response.content[0].type === 'text' ? response.content[0].text : ''
          inputTokens = response.usage.input_tokens
          outputTokens = response.usage.output_tokens

          logAiUsage({
            provider: 'ANTHROPIC',
            model,
            inputTokens,
            outputTokens,
          })
        } catch (error) {
          logger.error('Anthropic API error', {}, error)
          throw new Error(
            `AI API error: ${error instanceof Error ? error.message : 'Unknown error'}`
          )
        }
      } else if (conversation.provider === 'GOOGLE' && decryptedKeys.googleKey) {
        // Google/Gemini API call
        try {
          const model = normalizeAIModelId(conversation.modelUsed || 'gemini-3.5-flash')
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${decryptedKeys.googleKey}`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                contents: [
                  {
                    role: 'user',
                    parts: [
                      {
                        text: `${systemPrompt}\n\n${messageHistory.map((m) => `${m.role === 'user' ? t(locale, 'User', 'Användare') : t(locale, 'Assistant', 'Assistent')}: ${m.content}`).join('\n\n')}`,
                      },
                    ],
                  },
                ],
                generationConfig: {
                  maxOutputTokens: 4096,
                  thinkingConfig: {
                    thinkingLevel: 'low',
                  },
                },
              }),
            }
          )

          const data = await response.json()

          if (!response.ok) {
            throw new Error(data.error?.message || 'Gemini API error')
          }

          assistantResponse =
            data.candidates?.[0]?.content?.parts?.[0]?.text || ''
          inputTokens = data.usageMetadata?.promptTokenCount || 0
          outputTokens =
            (data.usageMetadata?.candidatesTokenCount || 0) +
            (data.usageMetadata?.thoughtsTokenCount || 0)

          logAiUsage({
            provider: 'GOOGLE',
            model,
            inputTokens,
            outputTokens,
          })
        } catch (error) {
          logger.error('Google API error', {}, error)
          throw new Error(
            `AI API error: ${error instanceof Error ? error.message : 'Unknown error'}`
          )
        }
      } else if (fallbackResolved) {
        try {
          // createModelInstance is auto-instrumented via usageLoggingMiddleware,
          // so the AIUsageLog row is written without an explicit logAiUsage call.
          const response = await generateText({
            model: createModelInstance(fallbackResolved),
            system: systemPrompt,
            messages: messageHistory.map(m => ({
              role: m.role as 'user' | 'assistant',
              content: String(m.content),
            })),
            maxOutputTokens: 4096,
          })
          assistantResponse = response.text
          inputTokens = response.usage?.inputTokens ?? 0
          outputTokens = response.usage?.outputTokens ?? 0
        } catch (error) {
          logger.error('AI fallback API error', { provider: fallbackResolved.provider }, error)
          throw new Error(
            `AI API error: ${error instanceof Error ? error.message : 'Unknown error'}`
          )
        }
      }
    })

    const latencyMs = Date.now() - startTime

    // Save assistant message
    const assistantMessage = await prisma.aIMessage.create({
      data: {
        conversationId,
        role: 'assistant',
        content: assistantResponse,
        inputTokens,
        outputTokens,
        modelUsed: conversation.modelUsed,
        latencyMs,
      },
    })

    // Update conversation stats
    await prisma.aIConversation.update({
      where: { id: conversationId },
      data: {
        totalTokensUsed: {
          increment: inputTokens + outputTokens,
        },
        updatedAt: new Date(),
        // Set title from first message if not set
        ...(conversation.title
          ? {}
          : {
              title:
                content.trim().substring(0, 50) +
                (content.length > 50 ? '...' : ''),
            }),
      },
    })

    return NextResponse.json({
      success: true,
      userMessage,
      assistantMessage,
      usage: {
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
        latencyMs,
      },
    })
  } catch (error) {
    logger.error('Send message error', {}, error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }

    return NextResponse.json(
      {
        error: t(locale, 'Failed to send message', 'Misslyckades med att skicka meddelande'),
        message:
          process.env.NODE_ENV === 'production'
            ? t(locale, 'Internal server error', 'Internt serverfel')
            : (error instanceof Error ? error.message : 'Unknown error'),
      },
      { status: 500 }
    )
  }
}
