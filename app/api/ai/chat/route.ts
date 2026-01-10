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
import { searchSimilarChunks } from '@/lib/ai/embeddings';
import { buildSportSpecificContext, type AthleteData } from '@/lib/ai/sport-context-builder';
import { buildAthleteOwnContext } from '@/lib/ai/athlete-context-builder';
import { buildAthleteSystemPrompt, MemoryContext } from '@/lib/ai/athlete-prompts';
import { webSearch, formatSearchResultsForContext } from '@/lib/ai/web-search';
import { extractMemoriesFromConversation, saveMemories } from '@/lib/ai/memory-extractor';
import { getDecryptedUserApiKeys } from '@/lib/user-api-keys';
import { buildCalendarContext } from '@/lib/ai/calendar-context-builder';
import { rateLimitJsonResponse } from '@/lib/api/rate-limit';
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

      // Get current program window for calendar constraints (if available)
      try {
        const program = await prisma.trainingProgram.findFirst({
          where: {
            clientId: athleteClientId,
            isActive: true,
          },
          orderBy: { createdAt: 'desc' },
          select: { startDate: true, endDate: true },
        });
        calendarProgramStartDate = program?.startDate;
        calendarProgramEndDate = program?.endDate;
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

    // Build context from athlete data
    let athleteContext = '';
    let sportSpecificContext = '';
    let athleteSystemPrompt = ''; // For athlete chat mode

    // Athlete chat mode: Use simplified context from athlete's own data
    if (isAthleteChat && athleteClientId) {
      try {
        athleteContext = await buildAthleteOwnContext(athleteClientId);
        athleteSystemPrompt = buildAthleteSystemPrompt(athleteContext, athleteName, memoryContext);
      } catch (error) {
        logger.warn('Error building athlete context', { athleteClientId }, error)
      }
    }
    // Coach chat mode: Use full context with athlete data
    else if (athleteId) {
      const athlete = await prisma.client.findFirst({
        where: { id: athleteId, userId: userId },
        include: {
          sportProfile: true,
          tests: {
            orderBy: { testDate: 'desc' },
            take: 3,
            include: { testStages: true },
          },
          trainingPrograms: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              id: true,
              name: true,
              goalType: true,
              goalRace: true,
              startDate: true,
              endDate: true,
            },
          },
          raceResults: {
            orderBy: { raceDate: 'desc' },
            take: 5,
            select: {
              id: true,
              raceName: true,
              raceDate: true,
              distance: true,
              timeFormatted: true,
              vdot: true,
            },
          },
          injuryAssessments: {
            where: { status: { not: 'FULLY_RECOVERED' } },
            orderBy: { date: 'desc' },
            take: 3,
          },
          fieldTests: {
            orderBy: { date: 'desc' },
            take: 5,
            select: {
              id: true,
              testType: true,
              date: true,
              results: true,
            },
          },
          dailyCheckIns: {
            orderBy: { date: 'desc' },
            take: 7,
            select: {
              date: true,
              sleepQuality: true,
              sleepHours: true,
              fatigue: true,
              soreness: true,
              mood: true,
              restingHR: true,
              hrv: true,
            },
          },
          bodyCompositions: {
            orderBy: { measurementDate: 'desc' },
            take: 1,
            select: {
              measurementDate: true,
              weightKg: true,
              bodyFatPercent: true,
              muscleMassKg: true,
              visceralFat: true,
              boneMassKg: true,
              waterPercent: true,
              bmrKcal: true,
              metabolicAge: true,
            },
          },
          videoAnalyses: {
            orderBy: { createdAt: 'desc' },
            take: 5,
            where: { status: 'COMPLETED' },
            select: {
              id: true,
              createdAt: true,
              videoType: true,
              cameraAngle: true,
              formScore: true,
              issuesDetected: true,
              recommendations: true,
              aiPoseAnalysis: true,
              runningGaitAnalysis: true,
            },
          },
        },
      });

      if (athlete) {
        // Calculate age
        const age = athlete.birthDate
          ? Math.floor((Date.now() - new Date(athlete.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
          : null;

        // Create anonymous athlete reference (GDPR compliance - no PII sent to AI)
        const athleteRef = `Atlet-${athlete.id.slice(0, 8)}`;

        // Build basic info - NO personal identifiers sent to AI
        let basicInfo = `## ATLET INFORMATION
- **Referens**: ${athleteRef}
- **Kön**: ${athlete.gender || 'Ej angivet'}
- **Ålder**: ${age ? `${age} år` : 'Okänd'}
- **Längd**: ${athlete.height ? `${athlete.height} cm` : 'Ej angivet'}
- **Vikt**: ${athlete.weight ? `${athlete.weight} kg` : 'Ej angivet'}`;

        // Sport profile info
        let sportInfo = '';
        if (athlete.sportProfile) {
          const sp = athlete.sportProfile;
          sportInfo = `
### Sportprofil
- **Primärsport**: ${sp.primarySport}
${sp.secondarySports?.length ? `- **Sekundärsporter**: ${(sp.secondarySports as string[]).join(', ')}` : ''}`;

          // Add sport-specific settings
          const settings = sp.primarySport === 'RUNNING' ? sp.runningSettings :
                          sp.primarySport === 'CYCLING' ? sp.cyclingSettings :
                          sp.primarySport === 'SWIMMING' ? sp.swimmingSettings :
                          sp.primarySport === 'HYROX' ? sp.hyroxSettings :
                          sp.primarySport === 'TRIATHLON' ? sp.triathlonSettings : null;

          if (settings && typeof settings === 'object') {
            const settingsObj = settings as Record<string, unknown>;
            const settingsLines: string[] = [];

            // Running settings
            if ('targetRace' in settingsObj) settingsLines.push(`- **Mållopp**: ${settingsObj.targetRace}`);
            if ('weeklyVolume' in settingsObj) settingsLines.push(`- **Veckovolym**: ${settingsObj.weeklyVolume} km`);
            if ('preferredMethodology' in settingsObj) settingsLines.push(`- **Träningsmetodik**: ${settingsObj.preferredMethodology}`);

            // Cycling settings
            if ('currentFtp' in settingsObj) settingsLines.push(`- **FTP**: ${settingsObj.currentFtp}W`);
            if ('primaryDiscipline' in settingsObj) settingsLines.push(`- **Disciplin**: ${settingsObj.primaryDiscipline}`);

            // Swimming settings
            if ('currentCss' in settingsObj) settingsLines.push(`- **CSS**: ${settingsObj.currentCss}`);
            if ('primaryStroke' in settingsObj) settingsLines.push(`- **Huvudsimsätt**: ${settingsObj.primaryStroke}`);

            // HYROX settings
            if ('targetCategory' in settingsObj) settingsLines.push(`- **Kategori**: ${settingsObj.targetCategory}`);
            if ('targetTime' in settingsObj) settingsLines.push(`- **Måltid**: ${settingsObj.targetTime}`);

            if (settingsLines.length > 0) {
              sportInfo += '\n' + settingsLines.join('\n');
            }
          }
        }

        // Latest test data
        let testInfo = '';
        if (athlete.tests?.[0]) {
          const test = athlete.tests[0];
          testInfo = `
### Senaste laktattest (${new Date(test.testDate).toLocaleDateString('sv-SE')})
- **Testtyp**: ${test.testType}
- **Max HR**: ${test.maxHR ? `${test.maxHR} bpm` : 'Ej uppmätt'}
- **VO2max**: ${test.vo2max ? `${test.vo2max.toFixed(1)} ml/kg/min` : 'Ej uppmätt'}`;

          // Add threshold info if available
          const aerobicThreshold = test.aerobicThreshold as { hr?: number; value?: number; unit?: string } | null;
          const anaerobicThreshold = test.anaerobicThreshold as { hr?: number; value?: number; unit?: string } | null;

          if (aerobicThreshold) {
            testInfo += `
- **Aerob tröskel (LT1)**: ${aerobicThreshold.value} ${aerobicThreshold.unit || ''} @ ${aerobicThreshold.hr} bpm`;
          }
          if (anaerobicThreshold) {
            testInfo += `
- **Anaerob tröskel (LT2)**: ${anaerobicThreshold.value} ${anaerobicThreshold.unit || ''} @ ${anaerobicThreshold.hr} bpm`;
          }
        }

        // Race results with VDOT
        let raceInfo = '';
        if (athlete.raceResults?.length) {
          const races = athlete.raceResults.slice(0, 3);
          raceInfo = `
### Tävlingshistorik`;
          for (const race of races) {
            raceInfo += `
- **${race.raceName || race.distance}** (${new Date(race.raceDate).toLocaleDateString('sv-SE')}): ${race.timeFormatted}${race.vdot ? ` (VDOT: ${race.vdot.toFixed(1)})` : ''}`;
          }
        }

        // Current program
        let programInfo = '';
        if (athlete.trainingPrograms?.[0]) {
          const prog = athlete.trainingPrograms[0];
          calendarProgramStartDate = prog.startDate;
          calendarProgramEndDate = prog.endDate;
          programInfo = `
### Pågående träningsprogram
- **Program**: ${prog.name}
- **Måltyp**: ${prog.goalType || 'Ej specificerad'}
${prog.goalRace ? `- **Mållopp**: ${prog.goalRace}` : ''}
- **Period**: ${new Date(prog.startDate).toLocaleDateString('sv-SE')} - ${new Date(prog.endDate).toLocaleDateString('sv-SE')}`;
        }

        // Active injuries
        let injuryInfo = '';
        if (athlete.injuryAssessments?.length) {
          injuryInfo = `
### Aktiva skador/begränsningar`;
          for (const injury of athlete.injuryAssessments) {
            injuryInfo += `
- **${injury.injuryType}**: ${injury.status} (smärta: ${injury.painLevel}/10)`;
          }
        }

        // Body composition (bioimpedance data)
        let bodyCompInfo = '';
        if (athlete.bodyCompositions?.[0]) {
          const bc = athlete.bodyCompositions[0];
          bodyCompInfo = `
### Kroppssammansättning (${new Date(bc.measurementDate).toLocaleDateString('sv-SE')})`;
          if (bc.weightKg) bodyCompInfo += `
- **Vikt**: ${bc.weightKg} kg`;
          if (bc.bodyFatPercent) bodyCompInfo += `
- **Kroppsfett**: ${bc.bodyFatPercent}%`;
          if (bc.muscleMassKg) bodyCompInfo += `
- **Muskelmassa**: ${bc.muscleMassKg} kg`;
          if (bc.waterPercent) bodyCompInfo += `
- **Vätska**: ${bc.waterPercent}%`;
          if (bc.visceralFat) bodyCompInfo += `
- **Visceralt fett**: ${bc.visceralFat}`;
          if (bc.bmrKcal) bodyCompInfo += `
- **BMR (mätt)**: ${bc.bmrKcal} kcal`;
          if (bc.metabolicAge) bodyCompInfo += `
- **Metabolisk ålder**: ${bc.metabolicAge} år`;
        }

        // Video analysis (running gait analysis)
        let videoAnalysisInfo = '';
        if (athlete.videoAnalyses?.length) {
          videoAnalysisInfo = `
### Videoanalyser`;
          for (const video of athlete.videoAnalyses) {
            const date = new Date(video.createdAt).toLocaleDateString('sv-SE');
            const angleLabel = video.cameraAngle === 'FRONT' ? 'Framifrån' :
                               video.cameraAngle === 'SIDE' ? 'Från sidan' :
                               video.cameraAngle === 'BACK' ? 'Bakifrån' : null;
            const angleInfo = angleLabel ? ` - ${angleLabel}` : '';
            videoAnalysisInfo += `

#### Videoanalys (${date}${angleInfo})`;
            if (video.cameraAngle) {
              const viewFocus = video.cameraAngle === 'FRONT' ? 'armsving, symmetri, knäspårning' :
                                video.cameraAngle === 'SIDE' ? 'fotisättning, lutning, oscillation' :
                                video.cameraAngle === 'BACK' ? 'höftfall, hälpiska, gluteal' : '';
              if (viewFocus) {
                videoAnalysisInfo += `
- **Kameravy fokus**: ${viewFocus}`;
              }
            }
            if (video.formScore) {
              videoAnalysisInfo += `
- **Formpoäng**: ${video.formScore}/100`;
            }
            if (video.issuesDetected && Array.isArray(video.issuesDetected) && video.issuesDetected.length > 0) {
              videoAnalysisInfo += `
- **Identifierade problem**: ${(video.issuesDetected as string[]).join(', ')}`;
            }
            if (video.recommendations && Array.isArray(video.recommendations) && video.recommendations.length > 0) {
              videoAnalysisInfo += `
- **Rekommendationer**: ${(video.recommendations as string[]).join(', ')}`;
            }

            // Running gait analysis details
            const gait = video.runningGaitAnalysis;
            if (gait) {
              videoAnalysisInfo += `

##### Löpstilsanalys`;
              if (gait.cadence) videoAnalysisInfo += `
- **Kadans**: ${gait.cadence} steg/min`;
              if (gait.groundContactTime) videoAnalysisInfo += `
- **Markkontakttid**: ${gait.groundContactTime} ms`;
              if (gait.verticalOscillation) videoAnalysisInfo += `
- **Vertikal oscillation**: ${gait.verticalOscillation} cm`;
              if (gait.strideLength) videoAnalysisInfo += `
- **Steglängd**: ${gait.strideLength} m`;
              if (gait.footStrikePattern) videoAnalysisInfo += `
- **Fotisättning**: ${gait.footStrikePattern}`;
              if (gait.asymmetryPercent) videoAnalysisInfo += `
- **Asymmetri**: ${gait.asymmetryPercent}%`;
              if (gait.leftContactTime && gait.rightContactTime) videoAnalysisInfo += `
- **Markkontakt vänster/höger**: ${gait.leftContactTime}/${gait.rightContactTime} ms`;
              if (gait.injuryRiskLevel) videoAnalysisInfo += `
- **Skaderisk**: ${gait.injuryRiskLevel}${gait.injuryRiskScore ? ` (${gait.injuryRiskScore}/100)` : ''}`;
              if (gait.injuryRiskFactors && Array.isArray(gait.injuryRiskFactors) && gait.injuryRiskFactors.length > 0) {
                videoAnalysisInfo += `
- **Riskfaktorer**: ${(gait.injuryRiskFactors as string[]).join(', ')}`;
              }
              if (gait.runningEfficiency) videoAnalysisInfo += `
- **Löpeffektivitet**: ${gait.runningEfficiency}%`;
              if (gait.energyLeakages && Array.isArray(gait.energyLeakages) && gait.energyLeakages.length > 0) {
                videoAnalysisInfo += `
- **Energiläckage**: ${(gait.energyLeakages as string[]).join(', ')}`;
              }
              if (gait.coachingCues && Array.isArray(gait.coachingCues) && gait.coachingCues.length > 0) {
                videoAnalysisInfo += `
- **Coachingråd**: ${(gait.coachingCues as string[]).join('; ')}`;
              }
              if (gait.drillRecommendations && Array.isArray(gait.drillRecommendations) && gait.drillRecommendations.length > 0) {
                videoAnalysisInfo += `
- **Rekommenderade övningar**: ${(gait.drillRecommendations as string[]).join(', ')}`;
              }
              if (gait.summary) videoAnalysisInfo += `
- **Sammanfattning**: ${gait.summary}`;
            }
          }
        }

        athleteContext = `${basicInfo}${sportInfo}${testInfo}${raceInfo}${programInfo}${injuryInfo}${bodyCompInfo}${videoAnalysisInfo}
`;

        // Build sport-specific context with detailed training data
        sportSpecificContext = buildSportSpecificContext(athlete as unknown as AthleteData);
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
- När du genererar ett program, inkludera JSON-format som kan sparas
- Om videoanalysdata finns tillgänglig, integrera löpteknikrekommendationer i programmet
- Vid hög asymmetri eller skaderisk, inkludera preventiva övningar och styrketräning
${webSearchEnabled ? '- Du kan referera till aktuell forskning och trender inom träningsvetenskap' : ''}
${calendarContext ? `
## KALENDERMEDVETEN PLANERING
- RESPEKTERA alltid atletens kalenderblockeringar (semester, resor, arbete)
- PLACERA ALDRIG träningspass på blockerade dagar
- ANPASSA intensitet under höghöjdsläger enligt fas (akut, anpassning, optimal)
- PLANERA gradvis återgång efter sjukdom - prioritera hälsa över "hinna ikapp"
- FLYTTA nyckelpass (intervaller, långpass) till fullt tillgängliga dagar
- INFORMERA om hur kalenderbegränsningar påverkar programmet` : ''}

${athleteContext}
${sportSpecificContext}
${calendarContext}
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

    // Stream the response
    const result = streamText({
      model: aiModel as LanguageModel,
      system: systemPrompt,
      messages: coreMessages,
      maxOutputTokens: 4096,
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
            // Save user message
            const lastUserMessage = messages.filter(m => m.role === 'user').pop();
            if (lastUserMessage) {
              await prisma.aIMessage.create({
                data: {
                  conversationId,
                  role: 'user',
                  content: getMessageContent(lastUserMessage),
                },
              });
            }

            // Save assistant message
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
