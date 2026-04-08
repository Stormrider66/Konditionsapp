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
import { resolveModel, isModelIntent } from '@/types/ai-models';
import { createModelInstance } from '@/lib/ai/create-model';
import { requireCoach, resolveAthleteClientId, getCurrentUser } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { checkAthleteFeatureAccess, incrementAIChatUsage } from '@/lib/subscription/feature-access';
import { searchSimilarChunks, hasEmbeddingKeys, type EmbeddingKeys } from '@/lib/ai/embeddings';
import { buildSportSpecificContext, type AthleteData } from '@/lib/ai/sport-context-builder';
import { buildAthleteOwnContext } from '@/lib/ai/athlete-context-builder';
import { buildAthleteSystemPrompt, MemoryContext, AthleteCapabilities } from '@/lib/ai/athlete-prompts';
import { webSearch, formatSearchResultsForContext } from '@/lib/ai/web-search';
import { getConsentStatus } from '@/lib/agent/gdpr/consent-manager';
import { getStaffPermissions, ROLE_LABELS } from '@/lib/permissions/assistant-coach';
import { extractMemoriesFromConversation, saveMemories } from '@/lib/ai/memory-extractor';
import { getPlatformAiKeyOwnerId, getResolvedAiKeys } from '@/lib/user-api-keys';
import { buildCalendarContext } from '@/lib/ai/calendar-context-builder';
import { rateLimitJsonResponse } from '@/lib/api/rate-limit';
import { matchKnowledgeSkills, fetchSkillContext } from '@/lib/ai/knowledge-skills';
import { logger } from '@/lib/logger'
import { buildConstitutionPreamble } from '@/lib/ai/constitution'
import { createChatTools } from '@/lib/ai/chat-tools'
import { createCoachChatTools } from '@/lib/ai/coach-chat-tools'

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
  /** Intent-based model selection for athlete chat (replaces model/provider) */
  intent?: string;
}

type LowerProvider = 'anthropic' | 'google' | 'openai'

function inferProviderFromModelRef(value: string): LowerProvider | null {
  const lower = value.toLowerCase()
  if (lower.includes('gemini')) return 'google'
  if (lower.includes('claude')) return 'anthropic'
  if (lower.includes('gpt-')) return 'openai'
  return null
}

function intersectProviders(
  a: Set<LowerProvider>,
  b: Set<LowerProvider>
): Set<LowerProvider> {
  return new Set([...a].filter((provider) => b.has(provider)))
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
    // Coach chat: only set when athlete belongs to coach AND consent is present
    let coachVerifiedAthleteId: string | undefined;
    // Date range for calendar constraints (prefer active/current program window)
    let calendarProgramStartDate: Date | undefined;
    let calendarProgramEndDate: Date | undefined;
    // Athlete capabilities for AI chat (self-coached athletes)
    let athleteCapabilities: AthleteCapabilities | undefined;
    // Staff role permissions
    let staffPermissions: Awaited<ReturnType<typeof getStaffPermissions>> | undefined;
    // Strict provider allowlist from athlete model settings (if explicitly configured)
    let athleteAllowedProviders: Set<LowerProvider> | null = null;
    let effectiveBusinessId: string | null = request.headers.get('x-business-id');
    const explicitBusinessSlug = request.headers.get('x-business-slug');

    if (!effectiveBusinessId && explicitBusinessSlug) {
      const scopedBusiness = await prisma.business.findUnique({
        where: { slug: explicitBusinessSlug },
        select: { id: true },
      });
      effectiveBusinessId = scopedBusiness?.id ?? null;
    }

    if (isAthleteChat) {
      // Athlete chat mode (supports coaches in athlete mode)
      const resolved = await resolveAthleteClientId();
      if (!resolved) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
      }
      userId = resolved.user.id;
      athleteClientId = resolved.clientId;

      // Get coach info from the client record
      const clientRecord = await prisma.client.findUnique({
        where: { id: resolved.clientId },
        select: {
          id: true,
          name: true,
          userId: true, // Coach's user ID
          businessId: true,
        },
      });

      if (!clientRecord?.userId) {
        return new Response(
          JSON.stringify({ error: 'Athlete account not properly linked to coach' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      apiKeyUserId = clientRecord.userId; // Use coach's API keys
      athleteName = clientRecord.name;
      effectiveBusinessId = clientRecord.businessId;

      // Direct athlete: client.userId is the athlete themselves → fall back to platform admin
      if (apiKeyUserId === userId && !resolved.isCoachInAthleteMode) {
        const platformKeyOwnerId = await getPlatformAiKeyOwnerId()
        if (platformKeyOwnerId) {
          apiKeyUserId = platformKeyOwnerId
        }
      }

      // Resolve strict provider allowlist from model restrictions.
      // If athlete model list is explicitly set and only contains Gemini models,
      // chat must not silently fall back to Claude/OpenAI.
      try {
        const [coachApiSettings, businessSettings] = await Promise.all([
          prisma.userApiKey.findUnique({
            where: { userId: apiKeyUserId },
            select: { allowedAthleteModelIds: true },
          }),
          effectiveBusinessId
            ? prisma.business.findUnique({
                where: { id: effectiveBusinessId },
                select: {
                  aiKeys: {
                    select: { allowedAthleteModelIds: true },
                  },
                },
              })
            : Promise.resolve(null),
        ])

        const coachRawAllowed = coachApiSettings?.allowedAthleteModelIds || []
        const businessRawAllowed = businessSettings?.aiKeys?.allowedAthleteModelIds || []
        const allRefs = [...new Set([...coachRawAllowed, ...businessRawAllowed])]
          .filter((value) => !isModelIntent(value))

        const providerByRef = new Map<string, LowerProvider>()
        if (allRefs.length > 0) {
          const models = await prisma.aIModel.findMany({
            where: {
              OR: [
                { id: { in: allRefs } },
                { modelId: { in: allRefs } },
              ],
            },
            select: {
              id: true,
              modelId: true,
              provider: true,
            },
          })

          for (const m of models) {
            const mappedProvider: LowerProvider =
              m.provider === 'GOOGLE' ? 'google' : m.provider === 'ANTHROPIC' ? 'anthropic' : 'openai'
            providerByRef.set(m.id, mappedProvider)
            providerByRef.set(m.modelId, mappedProvider)
          }
        }

        const deriveProviders = (rawRefs: string[]): Set<LowerProvider> | null => {
          if (rawRefs.length === 0) return null // no explicit restriction
          const providers = new Set<LowerProvider>()
          for (const ref of rawRefs) {
            if (isModelIntent(ref)) continue // tier value, no provider-specific restriction
            const fromModel = providerByRef.get(ref)
            if (fromModel) {
              providers.add(fromModel)
              continue
            }
            const fromHeuristic = inferProviderFromModelRef(ref)
            if (fromHeuristic) providers.add(fromHeuristic)
          }
          // If we cannot infer providers from configured refs, keep behavior unrestricted.
          return providers.size > 0 ? providers : null
        }

        const coachProviders = deriveProviders(coachRawAllowed)
        const businessProviders = deriveProviders(businessRawAllowed)

        if (coachProviders && businessProviders) {
          const intersection = intersectProviders(coachProviders, businessProviders)
          athleteAllowedProviders = intersection.size > 0 ? intersection : businessProviders
        } else {
          athleteAllowedProviders = coachProviders || businessProviders
        }
      } catch (error) {
        logger.warn('Unable to resolve athlete provider restrictions', {}, error)
      }

      // Skip subscription check for coaches/admins in athlete mode (they own the API keys)
      if (!resolved.isCoachInAthleteMode) {
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

      // Get staff permissions for role-aware context
      staffPermissions = await getStaffPermissions(user.id);
    }

    // Rate limit AI chat per authenticated user (Redis-backed with in-memory fallback)
    const rateLimited = await rateLimitJsonResponse('ai:chat', userId, {
      limit: 20,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    // Get API keys (user's own → business keys → none)
    const decryptedKeys = await getResolvedAiKeys(apiKeyUserId, {
      businessId: effectiveBusinessId,
      disableMembershipFallback: isAthleteChat || !!effectiveBusinessId,
    })
    const effectiveKeys = isAthleteChat && athleteAllowedProviders
      ? {
          anthropicKey: athleteAllowedProviders.has('anthropic') ? decryptedKeys.anthropicKey : null,
          googleKey: athleteAllowedProviders.has('google') ? decryptedKeys.googleKey : null,
          openaiKey: athleteAllowedProviders.has('openai') ? decryptedKeys.openaiKey : null,
        }
      : decryptedKeys

    if (!effectiveKeys.anthropicKey && !effectiveKeys.googleKey && !effectiveKeys.openaiKey) {
      const errorMsg = isAthleteChat
        ? (athleteAllowedProviders
            ? 'Din coach/verksamhet tillåter inte några modeller med tillgängliga API-nycklar just nu.'
            : 'Din coach har inte konfigurerat AI-nycklar ännu')
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
      // Verify that the athlete belongs to this coach OR is in their assigned teams
      const teamScope = staffPermissions?.isTeamScoped && staffPermissions.assignedTeamIds.length > 0
        ? { teamId: { in: staffPermissions.assignedTeamIds } }
        : undefined;
      const athleteCheck = await prisma.client.findFirst({
        where: {
          id: athleteId,
          OR: [
            { userId: userId },
            ...(teamScope ? [teamScope] : []),
          ],
        },
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
        coachVerifiedAthleteId = athleteId;
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
    // GDPR: Never include athlete calendar data without consent.
    // ACL: Never include athlete calendar data unless the athlete belongs to the coach.
    const calendarAthleteId = isAthleteChat ? athleteClientId : coachVerifiedAthleteId;
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
    const embeddingKeys: EmbeddingKeys = { googleKey: decryptedKeys.googleKey, openaiKey: decryptedKeys.openaiKey };
    let skillContext = '';
    let skillsUsed: string[] = [];
    if (hasEmbeddingKeys(embeddingKeys)) {
      const lastUserMsg = messages.filter(m => m.role === 'user').pop();
      if (lastUserMsg) {
        try {
          const userContent = getMessageContent(lastUserMsg);
          const matched = await matchKnowledgeSkills(
            userContent,
            embeddingKeys,
            { maxSkills: 3 }
          );
          if (matched.length > 0) {
            const result = await fetchSkillContext(
              userContent,
              matched,
              embeddingKeys
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
    if (documentIds.length > 0 && hasEmbeddingKeys(embeddingKeys)) {
      const lastUserMessage = messages.filter(m => m.role === 'user').pop();
      if (lastUserMessage) {
        try {
          const lastUserContent = getMessageContent(lastUserMessage);
          const chunks = await searchSimilarChunks(
            lastUserContent,
            apiKeyUserId, // Use the API key owner's ID for document search
            embeddingKeys,
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
      : `${buildConstitutionPreamble('chat', 'coach')}Du är en erfaren tränare och idrottsfysiolog som hjälper coacher att skapa träningsprogram.

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

## STRENGTH STUDIO — STYRKEPASSBYGGAREN
Du kan hjälpa coacher med styrketräningsplanering i Strength Studio. Här är vad som stöds:

### Övningsbibliotek
- 250+ övningar kategoriserade efter biomechanisk pelare: POSTERIOR_CHAIN, KNEE_DOMINANCE, UNILATERAL, FOOT_ANKLE, ANTI_ROTATION_CORE, UPPER_BODY
- Tre progressionsnivåer: Level 1 (statisk/stabilitet), Level 2 (styrka/belastning), Level 3 (dynamisk/ballistisk)
- Kategorier: STRENGTH, PLYOMETRIC, CORE, MOBILITY
- Coacher kan skapa egna övningar och dölja övningar de inte vill se

### Auto-generera styrkepass
Coacher kan auto-generera enskilda pass eller veckoprogram:
- **Enskilt pass**: Genererar ett styrkepass baserat på mål, fas, utrustning och tid
- **Veckoprogram**: Genererar 2-3 kompletterande pass (A/B/C) med varierad pelarfokus:
  - 2x/vecka: Pass A = posterior chain & höft, Pass B = knädominant & unilateral
  - 3x/vecka: Pass A = posterior chain, Pass B = knädominant & explosivitet, Pass C = unilateral & stabilitet

### Atletmedveten generering
Om en atlet väljs vid generering:
- Nivån hämtas automatiskt från atletprofilen
- Aktiva träningsrestriktioner och skador respekteras — övningar som strider mot restriktioner exkluderas
- Senaste smärtrapporter (7 dagar) visas som varning
- 1RM-data används för belastningsberäkning
- Övningar från senaste 14 dagarna undviks för variation
- Kalendern kontrolleras för blockerade/reducerade dagar (semester, sjukdom, höjdläger)

### Träningsmål
- **Generell Styrka**: Posterior chain + knädominans + unilateral
- **Kraft & Explosivitet**: Posterior chain + knädominans + plyometri
- **Skadeförebyggande**: Unilateral + core + stabilitet
- **Löpekonomi**: Balanserad + plyometri

### Träningsfaser (periodisering)
- **Anatomisk Anpassning**: 12-20 reps @ 40-60% 1RM, 30-60s vila
- **Maxstyrka**: 3-6 reps @ 80-95% 1RM, 2-4 min vila
- **Power**: 4-6 reps, explosivt tempo, 2-3 min vila
- **Underhåll**: 3-5 reps @ 75-85% 1RM, minimal volym
- **Taper**: 3-5 reps, reducerad volym inför tävling

### Passbyggare
- Sektionsbyggare: Uppvärmning → Huvudpass → Core → Nedvarvning
- Enkel byggare: Bara övningslista
- Drag-and-drop-ordning inom sektioner
- Set, reps, vikt, vila, tempo och noter per övning

### Progression
- 1RM-estimering (Epley/Brzycki)
- 2-for-2-regeln: Om atleten klarar 2 extra reps i 2 pass → öka vikt
- Plåtpetektering: Automatisk identifiering av platåer
- Deload-rekommendationer baserat på progressionsstatus

## CARDIO STUDIO — KONDITIONSPASSBYGGAREN
Du kan hjälpa coacher att designa konditionspass i Cardio Studio. Här är vad som stöds:

### Segmenttyper
WARMUP, COOLDOWN, INTERVAL, STEADY, RECOVERY, HILL, DRILLS — samt **REPEAT GROUP** (repetitionsblock med flera olika steg).

### Fält per segment
- **Tid** (minuter), **Distans** (km/m), **Kalorier** (cal) — valfritt, kan kombineras
- **Tempo** (min/km), **Puls** (bpm-intervall), **Zon** (1–5)
- **Upprepningar** och **Vila** mellan upprepningar (t.ex. 10×200 m med 60 s vila)

### Repeat Group (repetitionsblock)
Grupperar flera olika steg som upprepas X gånger. Varje steg har:
- Typ: Intervall / Steady / Vila / Recovery
- Tid och/eller kalorier
- **Måltyp**: Watt, RPM (kadens), Tempo, Puls — eller inget mål
- **Målvärde**: t.ex. 250 (W), 62 (rpm), 2:05 (tempo)
- **Utrustning/beskrivning**: fritext som visas på Garmin-klockan (t.ex. "Wattbike", "Roddmaskin", "Assault Bike")
- Vila mellan rundor (valfritt)

**Exempel — HYROX-liknande pass:**
Repeat Group (4 rundor):
1. Intervall | 3 min | Watt: 250 | "Wattbike"
2. Vila | 1 min
3. Intervall | 3 min | RPM: 62 | "Assault Bike"
4. Vila | 1 min
5. Intervall | — | 20 cal | "Roddmaskin"

**Exempel — Klassiskt intervallpass:**
Segment: INTERVAL | 200 m | Tempo: 0:50 | Zon 5 | Upprepa: 10 | Vila: 60 s

**Exempel — Kaloribaserat:**
Segment: INTERVAL | 20 cal | Upprepa: 10 | Vila: 60 s | "Row"

### Garmin-integration
Pass kan pushas direkt till atletens Garmin-klocka vid tilldelning:
- Strukturerade pass med automatisk stegväxling (arbete → vila → nästa)
- **Repeat Groups** → WorkoutRepeatStep med alla steg inuti
- **Upprepade intervaller** → WorkoutRepeatStep med arbete + vila
- **Mål visas** som gauge på klockan: watt, kadens, tempo, puls
- **Utrustningsbeskrivning** visas som text på klockan
- **Kaloribaserade steg** (utan tid/distans) → LAP_BUTTON-läge: atleten trycker lap när klar, vila startar automatiskt
- Stöd för sporttyper: Löpning, Cykling, Simning, HYROX, Allmän kondition

### Tilldelning
- Tilldela till enskilda atleter eller hela lag
- Välj plats (gym, löparbana, etc.) och ansvarig tränare
- Valfri schemaläggning med tid och kalenderintegration
- Push till Garmin vid tilldelning (toggle)

### Atlet-vy (Focus Mode)
Atleten ser passet som en platt steg-för-steg-lista:
- Repeat Groups plattas ut till individuella steg med "Runda 1/4", "Runda 2/4" etc.
- Upprepningar plattas ut till enskilda reps med vila emellan
- Kalorier visas i stegbeskrivningen
- Utrustning och mål visas som anteckningar

## VERKTYG
Du har tillgång till följande verktyg som du kan anropa direkt:

### generateStrengthSession
Generera och spara styrkepass direkt. Använd detta när coachen ber dig skapa styrkepass eller veckoprogram.
- Stödjer enskilt pass (mode: "single") eller veckoprogram med A/B/C variation (mode: "weekly")
- Kan anpassas efter en specifik atlet (clientId) — respekterar deras restriktioner och 1RM
- Välj mål, fas, utrustning, tid och nivå
- Passet sparas automatiskt i Passbiblioteket

### createCardioSession
Skapa konditions- och intervallpass. Sparas i Cardio Studio.
- Stödjer löpning, cykling, simning, rodd, skidåkning, HYROX m.m.
- Segmenttyper: WARMUP, COOLDOWN, INTERVAL, STEADY, RECOVERY, HILL, DRILLS, REPEAT_GROUP
- REPEAT_GROUP för komplexa block (t.ex. 4×[3 min Wattbike + 1 min vila + 20 cal rodd])
- Varje segment kan ha tempo, pulszon, distans, tid, kalorier, vila
- Beräknar total tid och distans automatiskt

### createHybridWorkout
Skapa funktionella/hybrid pass (CrossFit-stil, HYROX, circuit). Sparas i Hybrid Studio.
- Format: AMRAP, FOR_TIME, EMOM, TABATA, CHIPPER
- Definiera övningar med reps, kalorier, distans, vikt (herr/dam)
- Repschema stöd ("21-15-9", "5-5-5-5-5")
- Övningsnamn matchas automatiskt mot övningsbiblioteket

### modifyStrengthSession
Modifiera ett befintligt styrkepass med AI. Kräver sessionId.
- Byta ut övningar (t.ex. "byt knäböj mot benspress")
- Justera volym/intensitet (t.ex. "gör passet lättare")
- Anpassa för skador (t.ex. "ta bort alla hoppövningar")
- AI behåller strukturen och förklarar ändringarna

### createSportWorkout
Skapa sportspecifika pass med blandade sektioner. Perfekt för lagsporter och multisportpass.
- Kombinerar uppvärmning, styrka, kondition, agility/teknik, core och nedvarvning
- Stödjer alla sporter: fotboll, ishockey, handboll, basket, tennis, padel, HYROX m.m.
- Kräver en specifik atlet (clientId) — sparas som träningspass åt atleten
- Idealiskt när coachen vill ha ett komplett sportspecifikt pass

### generateTrainingProgram
Starta generering av ett komplett flervekkors träningsprogram åt en atlet.
- Genereras i bakgrunden med AI (1-10 min beroende på längd)
- Stödjer alla sporter och metodiker (Polarized, Norwegian, Canova, Pyramidal)
- Använder atletens testdata (VO2max, trösklar, maxpuls) och skador automatiskt
- Kräver atletens clientId — använd listAthletes först
- Programmet sparas automatiskt på atletens profil

### listAthletes
Lista coachens atleter. Använd detta för att hitta rätt atlet-ID.

**Viktigt:** Använd verktyg proaktivt! När coachen ber dig skapa ett pass, anropa rätt verktyg direkt:
- "Skapa ett intervallpass" → createCardioSession
- "Bygg ett styrkepass" → generateStrengthSession
- "Ge mig ett AMRAP" → createHybridWorkout
- "Jag behöver ett fotbollspass" → createSportWorkout (med agility + kondition + styrka)
- "Skapa ett HYROX-pass" → createHybridWorkout (FOR_TIME/CHIPPER) eller createCardioSession (REPEAT_GROUP)
- "Skapa ett 12-veckors löpprogram för Anna" → listAthletes + generateTrainingProgram
- "Bygg ett träningsprogram" → generateTrainingProgram (fråga om atlet, sport, mål, veckor)
Fråga bara om information du behöver om det är oklart.

## INSTRUKTIONER
- Svara ALLTID på svenska
- Var konkret och ge praktiska råd baserade på vetenskaplig grund
- När du föreslår träningsprogram, var specifik med intensiteter, volymer och frekvenser
- Använd etablerade träningszoner och metodiker
- Anpassa råden efter atletens nivå och mål
- Om videoanalysdata finns tillgänglig, integrera löpteknikrekommendationer i programmet
- Vid hög asymmetri eller skaderisk, inkludera preventiva övningar och styrketräning
- **VIKTIGT: ANVÄND BEFINTLIG ATLETDATA** — Nedan i kontexten finns atletens profil, testresultat, tröskelvärden, träningszoner, skadehistorik, ACWR, Strava-data med mera. Fråga INTE om information som redan finns i kontexten (t.ex. ålder, vikt, längd, maxpuls, VO2max, trösklar, träningszoner). Använd dessa data direkt. Fråga bara om information som SAKNAS i kontexten.

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

### TOKENOPTIMERING FÖR STORA PROGRAM (8+ veckor)
- Skriv FÖRST en kort sammanfattning/diskussion UTANFÖR JSON-blocket
- Skriv sedan JSON-blocket KOMPAKT: minimera whitespace, skriv vilopass som {"type":"REST","description":"Vila"}
- Håll workout-beskrivningar korta och koncisa (max 200 tecken per description)
- Om faser har IDENTISKA weeklyTemplates, skriv ändå ut varje fas separat (parsern kräver det)
- PRIORITERA att JSON:en blir KOMPLETT framför detaljerade beskrivningar — ett komplett program med korta beskrivningar är MYCKET bättre än ett halvfärdigt program med långa beskrivningar
- Du MÅSTE avsluta JSON-blocket med \`\`\` — om du når tokensgränsen innan du avslutat, har programmet misslyckats

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

${staffPermissions ? `
## DIN ROLL
Du assisterar en ${staffPermissions.roleLabel}.
${staffPermissions.isTeamScoped ? `Denna person har tillgång till specifika lag och kan INTE se data från andra lag.` : ''}
${!staffPermissions.canEditPrograms ? 'Denna person kan INTE skapa eller ändra träningsprogram. Ge inte instruktioner för att göra det.' : ''}
${!staffPermissions.canAccessAI ? 'Begränsa dina svar till information och rådgivning inom personens behörighetsområde.' : ''}
${staffPermissions.role === 'ADMIN' ? 'Som sportchef har denna person full insyn i alla lags resultat, tester och framsteg. Hjälp med personalfrågor, översikt och strategisk planering.' : ''}
${staffPermissions.role === 'PHYSICAL_TRAINER' ? 'Som fystränare kan denna person skapa träningsprogram, köra tester och intervallsessioner. Fokusera på fysisk träning, kondition och styrka.' : ''}
${staffPermissions.role === 'ASSISTANT_COACH' ? 'Som assisterande tränare kan denna person köra tester och intervallsessioner. Hjälp med testgenomförande, teknik och resultatanalys.' : ''}
${staffPermissions.role === 'PHYSIO' ? 'Som fysioterapeut fokuserar denna person på skadehantering, rehabilitering och preventivt arbete.' : ''}
` : ''}
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

    // Intent-based resolution for athlete chat
    if (body.intent && isModelIntent(body.intent) && isAthleteChat) {
      const resolved = resolveModel(effectiveKeys, body.intent);
      if (resolved) {
        aiModel = createModelInstance(resolved);
        logger.info('Athlete intent-based model resolved', {
          intent: body.intent,
          provider: resolved.provider,
          model: resolved.modelId,
        });
      } else {
        return new Response(
          JSON.stringify({ error: 'Ingen AI API-nyckel konfigurerad.' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    } else if (provider === 'ANTHROPIC' && effectiveKeys.anthropicKey) {
      const anthropic = createAnthropic({
        apiKey: effectiveKeys.anthropicKey,
      });
      aiModel = anthropic(model || 'claude-sonnet-4-6');
    } else if (provider === 'GOOGLE' && effectiveKeys.googleKey) {
      const google = createGoogleGenerativeAI({
        apiKey: effectiveKeys.googleKey,
      });
      const geminiModel = model || 'gemini-3-flash-preview';
      aiModel = google(geminiModel);
      // Note: Deep Think (thinkingLevel) is passed via providerOptions in streamText
      if (deepThinkEnabled) {
        logger.info('Using Gemini Deep Think mode', { model: geminiModel })
      }
    } else if (provider === 'OPENAI' && effectiveKeys.openaiKey) {
      const openai = createOpenAI({
        apiKey: effectiveKeys.openaiKey,
      });
      // OpenAI SDK returns LanguageModelV2 which is compatible with streamText
      aiModel = openai(model || 'gpt-5.4');
    } else {
      // Selected provider's key not available — try any available provider
      const resolved = resolveModel(effectiveKeys, 'balanced');
      if (resolved) {
        aiModel = createModelInstance(resolved);
        logger.info('Falling back to available provider', {
          requestedProvider: provider,
          fallbackProvider: resolved.provider,
          fallbackModel: resolved.modelId,
        });
      } else {
        return new Response(
          JSON.stringify({ error: 'Ingen AI API-nyckel konfigurerad. Konfigurera minst en API-nyckel i inställningarna.' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
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
        Boolean(effectiveKeys.anthropicKey || effectiveKeys.googleKey || effectiveKeys.openaiKey),
      messageCount: messages.length,
      documentCount: documentIds.length,
      webSearchEnabled,
      hasConversationId: Boolean(conversationId),
    })

    // Set max output tokens per provider (and model-specific overrides)
    const getMaxOutputTokens = (prov: string, mod: string): number => {
      if (prov === 'OPENAI') return 128000;
      if (prov === 'ANTHROPIC') {
        // Opus 4.6 supports 128k output; Sonnet/Haiku 64k
        if (mod.includes('opus')) return 128000;
        return 64000;
      }
      if (prov === 'GOOGLE') return 65536;
      return 16384;
    };
    const maxOutputTokens = getMaxOutputTokens(provider, model);

    // Log tool injection decision for debugging
    const willInjectTools = isAthleteChat ? !!(athleteClientId) : true
    logger.info('AI chat tool injection', {
      isAthleteChat,
      athleteClientId: athleteClientId || null,
      willInjectTools,
      canGenerateProgram: athleteCapabilities?.canGenerateProgram || false,
      provider,
      model,
    })

    // Stream the response
    const result = streamText({
      model: aiModel as LanguageModel,
      system: systemPrompt,
      messages: coreMessages,
      maxOutputTokens,
      experimental_telemetry: { isEnabled: false },
      // Tool calling for athlete chat (create workouts etc.)
      ...(isAthleteChat && athleteClientId && {
        tools: createChatTools(athleteClientId, conversationId, athleteCapabilities
          ? { canGenerateProgram: athleteCapabilities.canGenerateProgram }
          : undefined),
        maxSteps: 4,
      }),
      // Tool calling for coach chat (generate strength sessions etc.)
      ...(!isAthleteChat && {
        tools: createCoachChatTools(userId),
        maxSteps: 4,
      }),
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
      onFinish: async ({ text, usage, finishReason }) => {
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
                const apiKeys = await getResolvedAiKeys(apiKeyUserId, {
                  businessId: effectiveBusinessId,
                  disableMembershipFallback: isAthleteChat || !!effectiveBusinessId,
                });
                if (apiKeys.anthropicKey || apiKeys.googleKey || apiKeys.openaiKey) {
                  const conversationForMemory = [
                    { role: 'user' as const, content: getMessageContent(lastUserMessage) },
                    { role: 'assistant' as const, content: text },
                  ];
                  const extractedMemories = await extractMemoriesFromConversation(
                    conversationForMemory,
                    apiKeys
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
