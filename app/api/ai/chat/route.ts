/**
 * AI Chat Streaming API
 *
 * POST /api/ai/chat - Stream AI responses using Vercel AI SDK
 */

import { NextRequest } from 'next/server';
import { streamText, type CoreMessage, type LanguageModel } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { requireCoach, requireAthlete, getCurrentUser } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { checkAthleteFeatureAccess, incrementAIChatUsage } from '@/lib/subscription/feature-access';
import { searchSimilarChunks } from '@/lib/ai/embeddings';
import { buildSportSpecificContext, type AthleteData } from '@/lib/ai/sport-context-builder';
import { buildAthleteOwnContext } from '@/lib/ai/athlete-context-builder';
import { buildAthleteSystemPrompt, MemoryContext, AthleteCapabilities } from '@/lib/ai/athlete-prompts';
import { webSearch, formatSearchResultsForContext } from '@/lib/ai/web-search';
import { getConsentStatus } from '@/lib/agent/gdpr/consent-manager';
import { extractMemoriesFromConversation, saveMemories } from '@/lib/ai/memory-extractor';
import { getDecryptedUserApiKeys } from '@/lib/user-api-keys';
import { buildCalendarContext } from '@/lib/ai/calendar-context-builder';
import { rateLimitJsonResponse } from '@/lib/api/rate-limit';
import { matchKnowledgeSkills, fetchSkillContext } from '@/lib/ai/knowledge-skills';
import { logger } from '@/lib/logger'

// Allow longer execution time for AI streaming responses (60 seconds)
export const maxDuration = 60;

// Support both old (content) and new (parts) message formats
interface UIMessagePart {
  type: 'text';
  text: string;
}

interface ChatRequestMessage {
  id?: string;
  role: 'user' | 'assistant' | 'system';
  content?: string;
  parts?: UIMessagePart[];
}

interface ChatRequest {
  conversationId?: string;
  messages: ChatRequestMessage[];
  model: string;
  provider: 'ANTHROPIC' | 'GOOGLE' | 'OPENAI';
  athleteId?: string;
  documentIds?: string[];
  webSearchEnabled?: boolean;
  /** Enable Gemini Deep Think mode for extended reasoning */
  deepThinkEnabled?: boolean;
  /** Page-specific context data (video analysis, test results, etc.) */
  pageContext?: string;
  /** Athlete chat mode - uses athlete's own context and coach's API keys */
  isAthleteChat?: boolean;
  /** Client ID for athlete chat (athlete's own client record) */
  clientId?: string;
  /** Memory context for personalized AI interactions */
  memoryContext?: MemoryContext;
}

/**
 * Extract text content from a message (handles both old and new formats)
 * AI SDK 5 sends messages with `parts` array, older format uses `content` string
 */
function getMessageContent(message: ChatRequestMessage): string {
  // New format: parts array
  if (message.parts && message.parts.length > 0) {
    return message.parts
      .filter((part): part is UIMessagePart => part.type === 'text')
      .map((part) => part.text)
      .join('');
  }
  // Old format: content string
  return message.content || '';
}

/**
 * Convert UIMessage format to CoreMessage format for streamText
 */
function convertToCoreMessages(messages: ChatRequestMessage[]): CoreMessage[] {
  return messages.map((msg) => ({
    role: msg.role,
    content: getMessageContent(msg),
  }));
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();
    const {
      conversationId,
      messages,
      model,
      provider,
      athleteId,
      documentIds = [],
      webSearchEnabled = false,
      deepThinkEnabled = false,
      pageContext = '',
      isAthleteChat = false,
      clientId,
      memoryContext,
    } = body;

    // Different authentication flow for athlete vs coach
    let userId: string;
    let apiKeyUserId: string; // Whose API keys to use
    let athleteClientId: string | undefined; // For athlete context
    let athleteName: string | undefined;
    // Date range for calendar constraints (prefer active/current program window)
    let calendarProgramStartDate: Date | undefined;
    let calendarProgramEndDate: Date | undefined;
    // Athlete capabilities for AI chat (self-coached athletes)
    let athleteCapabilities: AthleteCapabilities | undefined;

    if (isAthleteChat) {
      // Athlete chat mode
      const user = await requireAthlete();
      userId = user.id;

      // Get athlete's client and coach
      const athleteAccount = await prisma.athleteAccount.findUnique({
        where: { userId: user.id },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              userId: true, // Coach's user ID
            },
          },
        },
      });

      if (!athleteAccount?.client?.userId) {
        return new Response(
          JSON.stringify({ error: 'Athlete account not properly linked to coach' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      apiKeyUserId = athleteAccount.client.userId; // Use coach's API keys
      athleteClientId = athleteAccount.client.id;
      athleteName = athleteAccount.client.name;

      // Check subscription for AI chat access
      const access = await checkAthleteFeatureAccess(athleteClientId, 'ai_chat');
      if (!access.allowed) {
        return new Response(
          JSON.stringify({
            error: access.reason || 'AI chat requires a subscription',
            code: access.code || 'SUBSCRIPTION_REQUIRED',
            upgradeUrl: access.upgradeUrl || '/athlete/subscription',
            currentUsage: access.currentUsage,
            limit: access.limit,
          }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Get current program window and subscription info for capabilities
      try {
        const [program, subscription] = await Promise.all([
          prisma.trainingProgram.findFirst({
            where: {
              clientId: athleteClientId,
              isActive: true,
            },
            orderBy: { createdAt: 'desc' },
            select: { startDate: true, endDate: true },
          }),
          prisma.athleteSubscription.findUnique({
            where: { clientId: athleteClientId },
            select: {
              tier: true,
              assignedCoachId: true,
            },
          }),
        ])

        calendarProgramStartDate = program?.startDate
        calendarProgramEndDate = program?.endDate

        // Build athlete capabilities for self-coached athletes
        const isSelfCoached = !subscription?.assignedCoachId
        const subscriptionTier = (subscription?.tier || 'FREE') as 'FREE' | 'STANDARD' | 'PRO'
        const canGenerateProgram = isSelfCoached && (subscriptionTier === 'STANDARD' || subscriptionTier === 'PRO')

        athleteCapabilities = {
          canGenerateProgram,
          hasActiveProgram: !!program,
          subscriptionTier,
          isSelfCoached,
        }
      } catch (error) {
        logger.warn('Error fetching training program dates for calendar context', {}, error)
      }
    } else {
      // Coach chat mode (existing flow)
      const user = await requireCoach();
      userId = user.id;
      apiKeyUserId = user.id; // Use own API keys
    }

    // Rate limit AI chat per authenticated user (Redis-backed with in-memory fallback)
    const rateLimited = await rateLimitJsonResponse('ai:chat', userId, {
      limit: 20,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    // Get API keys (either coach's own or athlete's coach's)
    const apiKeysRow = await prisma.userApiKey.findUnique({
      where: { userId: apiKeyUserId },
    })
    const decryptedKeys = await getDecryptedUserApiKeys(apiKeyUserId)

    if (!apiKeysRow) {
      const errorMsg = isAthleteChat
        ? 'Din coach har inte konfigurerat AI-nycklar ännu'
        : 'API keys not configured';
      return new Response(
        JSON.stringify({ error: errorMsg }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // GDPR: Check consent before building athlete context
    let hasAthleteConsent = false;
    if (isAthleteChat && athleteClientId) {
      const consentStatus = await getConsentStatus(athleteClientId);
      if (!consentStatus.hasRequiredConsent) {
        return new Response(
          JSON.stringify({
            error: 'Du måste godkänna databehandling innan du kan använda AI-chatten.',
            code: 'CONSENT_REQUIRED',
          }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }
      hasAthleteConsent = true;
    } else if (athleteId) {
      // Coach chat: check if the target athlete has consented
      const consentStatus = await getConsentStatus(athleteId);
      hasAthleteConsent = consentStatus.hasRequiredConsent;
    }

    // Build context from athlete data
    let athleteContext = '';
    let sportSpecificContext = '';
    let athleteSystemPrompt = ''; // For athlete chat mode

    // Athlete chat mode: Use simplified context from athlete's own data
    if (isAthleteChat && athleteClientId) {
      try {
        athleteContext = await buildAthleteOwnContext(athleteClientId);
        // GDPR: Pass undefined for athleteName - real name must not be sent to AI providers
        athleteSystemPrompt = buildAthleteSystemPrompt(athleteContext, undefined, memoryContext, athleteCapabilities);
      } catch (error) {
        logger.warn('Error building athlete context', { athleteClientId }, error)
      }
    }
    // Coach chat mode: Use full context with athlete data (same as athlete's floating chat)
    // GDPR: Only include athlete context if athlete has given consent
    else if (athleteId && hasAthleteConsent) {
      // First verify that the athlete belongs to this coach
      const athleteCheck = await prisma.client.findFirst({
        where: { id: athleteId, userId: userId },
        select: {
          id: true,
          trainingPrograms: {
            where: { isActive: true },
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { startDate: true, endDate: true },
          },
          sportProfile: true,
        },
      });

      if (athleteCheck) {
        // Set calendar date range from active program
        if (athleteCheck.trainingPrograms[0]) {
          calendarProgramStartDate = athleteCheck.trainingPrograms[0].startDate;
          calendarProgramEndDate = athleteCheck.trainingPrograms[0].endDate;
        }

        // Use the same comprehensive context builder as athlete's floating chat
        // This includes: test results, workout history, check-ins, injuries, ACWR,
        // Strava/Garmin data, compliance rates, training programs, strength sessions,
        // race results, and agent recommendations
        try {
          athleteContext = await buildAthleteOwnContext(athleteId);
        } catch (error) {
          logger.warn('Error building full athlete context for coach', { athleteId }, error);
        }

        // Also build sport-specific context for detailed training methodology guidance
        if (athleteCheck.sportProfile) {
          // Fetch additional data for sport context
          const [trainingLoad, strengthData, plannedCount, completedCount] = await Promise.all([
            prisma.trainingLoad.findFirst({
              where: { clientId: athleteId },
              orderBy: { date: 'desc' },
            }),
            prisma.strengthSessionAssignment.findMany({
              where: { athleteId },
              orderBy: { assignedDate: 'desc' },
              take: 5,
              include: { session: true },
            }),
            prisma.workout.count({
              where: {
                day: { week: { program: { clientId: athleteId, isActive: true } } },
                createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
              },
            }),
            prisma.workoutLog.count({
              where: {
                workout: { day: { week: { program: { clientId: athleteId } } } },
                completedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
              },
            }),
          ]);

          const athleteWithExtendedContext = {
            sportProfile: athleteCheck.sportProfile,
            trainingLoad,
            strengthSessions: strengthData.map(s => ({
              name: s.session.name,
              phase: s.session.phase,
              assignedDate: s.assignedDate,
              exercises: s.session.exercises,
            })),
            complianceRate: plannedCount > 0 ? (completedCount / plannedCount) * 100 : undefined,
          };
          sportSpecificContext = buildSportSpecificContext(athleteWithExtendedContext as unknown as AthleteData);
        }
      }
    }

    // Build calendar context for the athlete
    let calendarContext = '';
    const calendarAthleteId = isAthleteChat ? athleteClientId : athleteId;
    if (calendarAthleteId) {
      try {
        const calendarData = await buildCalendarContext(
          calendarAthleteId,
          calendarProgramStartDate,
          calendarProgramEndDate
        );
        if (calendarData.hasCalendarData) {
          calendarContext = calendarData.contextText;
        }
      } catch (error) {
        logger.warn('Error building calendar context', { athleteClientId: calendarAthleteId }, error)
      }
    }

    // Auto-retrieve relevant system knowledge (Knowledge Skills)
    let skillContext = '';
    let skillsUsed: string[] = [];
    if (decryptedKeys.openaiKey) {
      const lastUserMsg = messages.filter(m => m.role === 'user').pop();
      if (lastUserMsg) {
        try {
          const userContent = getMessageContent(lastUserMsg);
          const matched = await matchKnowledgeSkills(
            userContent,
            decryptedKeys.openaiKey,
            { maxSkills: 3 }
          );
          if (matched.length > 0) {
            const result = await fetchSkillContext(
              userContent,
              matched,
              decryptedKeys.openaiKey
            );
            skillContext = result.context;
            skillsUsed = result.skillsUsed;
          }
        } catch (error) {
          logger.warn('Error fetching knowledge skills context', {}, error);
        }
      }
    }

    // Build context from documents using RAG
    let documentContext = '';
    if (documentIds.length > 0 && decryptedKeys.openaiKey) {
      const lastUserMessage = messages.filter(m => m.role === 'user').pop();
      if (lastUserMessage) {
        try {
          const lastUserContent = getMessageContent(lastUserMessage);
          const chunks = await searchSimilarChunks(
            lastUserContent,
            apiKeyUserId, // Use the API key owner's ID for document search
            decryptedKeys.openaiKey,
            {
              matchThreshold: 0.75,
              matchCount: 5,
              documentIds,
            }
          );

          if (chunks.length > 0) {
            const docs = await prisma.coachDocument.findMany({
              where: { id: { in: chunks.map(c => c.documentId) } },
              select: { id: true, name: true },
            });
            const docMap = new Map(docs.map(d => [d.id, d.name]));

            documentContext = `
## RELEVANT INFORMATION FRÅN DINA DOKUMENT

${chunks.map((c, i) => `### Källa ${i + 1}: ${docMap.get(c.documentId) || 'Dokument'}
${c.content}
`).join('\n')}
---
`;
          }
        } catch (error) {
          logger.warn('Error fetching document context', { documentCount: documentIds.length }, error)
        }
      }
    }

    // Perform web search if enabled
    let webSearchContext = '';
    if (webSearchEnabled) {
      const lastUserMessage = messages.filter(m => m.role === 'user').pop();
      if (lastUserMessage) {
        try {
          // Extract search-worthy terms from the user's message
          const searchQuery = getMessageContent(lastUserMessage);

          // Only search if the query seems to be asking for research/information
          const searchTerms = ['forskning', 'research', 'studie', 'senaste', 'aktuell',
            'hur', 'vad', 'varför', 'bästa', 'optimal', 'metod', 'protocol'];

          const shouldSearch = searchTerms.some(term =>
            searchQuery.toLowerCase().includes(term)
          );

          if (shouldSearch) {
            const searchResults = await webSearch(searchQuery, { maxResults: 3 });
            if (searchResults.success && searchResults.results.length > 0) {
              webSearchContext = formatSearchResultsForContext(searchResults.results);
            }
          }
        } catch (error) {
          logger.warn('Web search error', {}, error)
        }
      }
    }

    // Build system prompt - use athlete prompt for athlete chat, coach prompt for coach chat
    const systemPrompt = isAthleteChat && athleteSystemPrompt
      ? `${athleteSystemPrompt}
${pageContext}
`
      : `Du är en erfaren tränare och idrottsfysiolog som hjälper coacher att skapa träningsprogram.

## DINA KUNSKAPSOMRÅDEN
- Periodisering och träningsplanering för uthållighetsidrotter
- Fysiologiska principer (VO2max, laktattröskel, löpekonomi, etc.)
- Träningsmetodiker: Polarized (80/20), Norwegian Double Threshold, Canova, Pyramidal
- Styrketräning för uthållighetsidrottare (AA → Max Strength → Power → Maintenance)
- Skadeförebyggande och återhämtning
- HYROX-specifik träning (8 stationer + 8 x 1km)
- Cykling (FTP, power zones, W/kg)
- Simning (CSS-baserad träning, stroke efficiency)
- Triathlon (multi-sport balance, brick sessions)
- Längdskidåkning (klassisk/fristil, dubbelstakning)
- Biomekanisk videoanalys av löpteknik (kadans, markkontakttid, asymmetri, skaderisk)

## INSTRUKTIONER
- Svara ALLTID på svenska
- Var konkret och ge praktiska råd baserade på vetenskaplig grund
- När du föreslår träningsprogram, var specifik med intensiteter, volymer och frekvenser
- Använd etablerade träningszoner och metodiker
- Anpassa råden efter atletens nivå och mål
- Om videoanalysdata finns tillgänglig, integrera löpteknikrekommendationer i programmet
- Vid hög asymmetri eller skaderisk, inkludera preventiva övningar och styrketräning

## PROGRAMGENERERING - VIKTIGT!
När coachen ber dig skapa ett träningsprogram MÅSTE du inkludera programmet i JSON-format i ett kodblock.
Detta gör att en "Publicera"-knapp visas så coachen kan spara programmet direkt till atletens profil.

Använd EXAKT detta JSON-format i ett \`\`\`json kodblock:

\`\`\`json
{
  "name": "Programnamn",
  "description": "Kort beskrivning av programmet",
  "totalWeeks": 12,
  "methodology": "POLARIZED",
  "weeklySchedule": {
    "sessionsPerWeek": 5,
    "restDays": [0, 3]
  },
  "phases": [
    {
      "name": "Basperiod",
      "weeks": "1-4",
      "focus": "Aerob bas och teknik",
      "weeklyTemplate": {
        "monday": { "type": "REST", "description": "Vila" },
        "tuesday": {
          "type": "RUNNING",
          "name": "Grundträning",
          "duration": 60,
          "zone": "2",
          "description": "Lugn löpning i Zon 2",
          "intensity": "easy"
        },
        "wednesday": {
          "type": "STRENGTH",
          "name": "Styrka",
          "duration": 45,
          "description": "Grundläggande styrkepass",
          "intensity": "moderate"
        },
        "thursday": { "type": "REST", "description": "Vila" },
        "friday": {
          "type": "RUNNING",
          "name": "Intervaller",
          "duration": 50,
          "zone": "4",
          "description": "6x4 min i Z4 med 2 min vila",
          "intensity": "hard"
        },
        "saturday": {
          "type": "RUNNING",
          "name": "Långpass",
          "duration": 90,
          "zone": "2",
          "description": "Lugnt långpass",
          "intensity": "easy"
        },
        "sunday": { "type": "REST", "description": "Vila" }
      },
      "keyWorkouts": ["Tröskelintervaller", "Långpass"],
      "volumeGuidance": "Gradvis ökning av volym med 10% per vecka"
    }
  ],
  "notes": "Generella kommentarer om programmet"
}
\`\`\`

Giltiga type-värden: REST, RUNNING, CYCLING, SWIMMING, STRENGTH, CROSS_TRAINING, HYROX, SKIING, CORE, RECOVERY
Giltiga intensity-värden: easy, moderate, hard, threshold, interval, recovery, race_pace

Efter att du genererat JSON-programmet, informera coachen att de kan klicka på "Publicera"-knappen som visas för att spara programmet till atletens kalender.
${webSearchEnabled ? '- Du kan referera till aktuell forskning och trender inom träningsvetenskap' : ''}
${calendarContext ? `
## KALENDERMEDVETEN PLANERING
- RESPEKTERA alltid atletens kalenderblockeringar (semester, resor, arbete)
- PLACERA ALDRIG träningspass på blockerade dagar
- ANPASSA intensitet under höghöjdsläger enligt fas (akut, anpassning, optimal)
- PLANERA gradvis återgång efter sjukdom - prioritera hälsa över "hinna ikapp"
- FLYTTA nyckelpass (intervaller, långpass) till fullt tillgängliga dagar
- INFORMERA om hur kalenderbegränsningar påverkar programmet` : ''}

${athleteId && !hasAthleteConsent ? '\n## OBS: SAMTYCKE SAKNAS\nAtletens data kan inte inkluderas i denna konversation — atleten har inte samtyckt till databehandling för AI-analys. Du kan fortfarande hjälpa coachen med generella frågor.\n' : ''}
${athleteContext}
${sportSpecificContext}
${calendarContext}
${skillContext}
${documentContext}
${webSearchContext}
${pageContext}
`;

    // Create AI provider based on selection
    // Different SDKs return slightly different model types, using any for compatibility
    let aiModel: unknown;

    if (provider === 'ANTHROPIC' && decryptedKeys.anthropicKey) {
      const anthropic = createAnthropic({
        apiKey: decryptedKeys.anthropicKey,
      });
      aiModel = anthropic(model || 'claude-sonnet-4-5-20250929');
    } else if (provider === 'GOOGLE' && decryptedKeys.googleKey) {
      const google = createGoogleGenerativeAI({
        apiKey: decryptedKeys.googleKey,
      });
      const geminiModel = model || 'gemini-3-flash-preview';
      aiModel = google(geminiModel);
      // Note: Deep Think (thinkingLevel) is passed via providerOptions in streamText
      if (deepThinkEnabled) {
        logger.info('Using Gemini Deep Think mode', { model: geminiModel })
      }
    } else if (provider === 'OPENAI' && decryptedKeys.openaiKey) {
      const openai = createOpenAI({
        apiKey: decryptedKeys.openaiKey,
      });
      // OpenAI SDK returns LanguageModelV2 which is compatible with streamText
      aiModel = openai(model || 'gpt-5.2');
    } else {
      return new Response(
        JSON.stringify({ error: 'No valid API key for selected provider' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Convert UIMessage format to CoreMessage format for streamText
    const coreMessages = convertToCoreMessages(messages);

    // Log metadata only (do not log message content)
    logger.debug('AI chat request', {
      provider,
      model,
      isAthleteChat,
      athleteClientId: isAthleteChat ? athleteClientId : undefined,
      deepThinkEnabled: provider === 'GOOGLE' && deepThinkEnabled,
      hasApiKey:
        Boolean(decryptedKeys.anthropicKey || decryptedKeys.googleKey || decryptedKeys.openaiKey),
      messageCount: messages.length,
      documentCount: documentIds.length,
      webSearchEnabled,
      hasConversationId: Boolean(conversationId),
    })

    // Set max output tokens per provider
    const maxTokensByProvider: Record<string, number> = {
      OPENAI: 128000,    // GPT-5.2 supports 128k output
      ANTHROPIC: 64000,  // Claude Opus 4.5 & Sonnet 4.5 support 64k output
      GOOGLE: 65536,     // Gemini
    };
    const maxOutputTokens = maxTokensByProvider[provider] || 16384;

    // Stream the response
    const result = streamText({
      model: aiModel as LanguageModel,
      system: systemPrompt,
      messages: coreMessages,
      maxOutputTokens,
      experimental_telemetry: { isEnabled: false },
      // Provider-specific options for Gemini Deep Think
      ...(provider === 'GOOGLE' && deepThinkEnabled && {
        providerOptions: {
          google: {
            thinkingConfig: {
              thinkingLevel: 'high' as const,
            },
          },
        },
      }),
      onError: (error) => {
        logger.error('Stream error during generation', {}, error)
      },
      onFinish: async ({ text, usage }) => {
        logger.debug('AI response finished', {
          textLength: text?.length,
          usage,
          hasConversationId: Boolean(conversationId),
        })
        // Save to database if we have a conversation
        if (conversationId) {
          try {
            // Save user message (only if content is not empty)
            const lastUserMessage = messages.filter(m => m.role === 'user').pop();
            const userContent = lastUserMessage ? getMessageContent(lastUserMessage) : '';
            if (userContent) {
              await prisma.aIMessage.create({
                data: {
                  conversationId,
                  role: 'user',
                  content: userContent,
                },
              });
            }

            // Save assistant message (only if content is not empty)
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
              });
            }

            // Update conversation
            await prisma.aIConversation.update({
              where: { id: conversationId },
              data: {
                totalTokensUsed: {
                  increment: (usage?.inputTokens || 0) + (usage?.outputTokens || 0),
                },
                updatedAt: new Date(),
              },
            });
          } catch (error) {
            logger.error('Error saving messages', { conversationId }, error)
          }
        }

        // Increment AI chat usage for subscription tracking
        if (isAthleteChat && athleteClientId) {
          try {
            await incrementAIChatUsage(athleteClientId);
          } catch (usageError) {
            logger.warn('Failed to increment AI chat usage', { clientId: athleteClientId }, usageError);
          }
        }

        // Extract memories from athlete conversations (fire-and-forget)
        if (isAthleteChat && athleteClientId && text) {
          const lastUserMessage = messages.filter(m => m.role === 'user').pop();
          if (lastUserMessage) {
            // Run memory extraction in background without blocking
            (async () => {
              try {
                const apiKeys = await getDecryptedUserApiKeys(apiKeyUserId);
                if (apiKeys.anthropicKey) {
                  const conversationForMemory = [
                    { role: 'user' as const, content: getMessageContent(lastUserMessage) },
                    { role: 'assistant' as const, content: text },
                  ];
                  const extractedMemories = await extractMemoriesFromConversation(
                    conversationForMemory,
                    apiKeys.anthropicKey
                  );
                  if (extractedMemories.length > 0) {
                    const savedCount = await saveMemories(athleteClientId, extractedMemories);
                    logger.debug('Memories extracted from conversation', {
                      clientId: athleteClientId,
                      extracted: extractedMemories.length,
                      saved: savedCount,
                    });
                  }
                }
              } catch (memoryError) {
                logger.warn('Memory extraction failed (non-blocking)', { clientId: athleteClientId }, memoryError);
              }
            })();
          }
        }
      },
    });

    // Create the stream response with error handling
    try {
      // AI SDK 5: Use toUIMessageStreamResponse for DefaultChatTransport compatibility
      const response = result.toUIMessageStreamResponse();

      // Add knowledge skills metadata to response headers
      if (skillsUsed.length > 0) {
        response.headers.set('X-Knowledge-Skills', JSON.stringify(skillsUsed));
      }

      logger.debug('Stream response created successfully')
      return response;
    } catch (streamError) {
      logger.error('Error creating stream response', {}, streamError)
      throw streamError;
    }
  } catch (error) {
    logger.error('Chat streaming error', {}, error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check for specific API errors
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    let userMessage = 'Failed to stream response';

    if (errorMessage.includes('401') || errorMessage.includes('authentication') || errorMessage.includes('api_key')) {
      userMessage = 'API key is invalid or expired. Please check your API key in settings.';
    } else if (errorMessage.includes('429') || errorMessage.includes('rate')) {
      userMessage = 'Rate limit exceeded. Please wait a moment and try again.';
    } else if (errorMessage.includes('model')) {
      userMessage = `Model error: ${errorMessage}`;
    }

    return new Response(
      JSON.stringify({
        error: userMessage,
        message: errorMessage,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
