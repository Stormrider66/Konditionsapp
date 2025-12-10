/**
 * AI Chat Streaming API
 *
 * POST /api/ai/chat - Stream AI responses using Vercel AI SDK
 */

import { NextRequest } from 'next/server';
import { streamText, type CoreMessage } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { requireCoach } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { searchSimilarChunks } from '@/lib/ai/embeddings';
import { buildSportSpecificContext, type AthleteData } from '@/lib/ai/sport-context-builder';
import { webSearch, formatSearchResultsForContext } from '@/lib/ai/web-search';

interface ChatRequest {
  conversationId?: string;
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  model: string;
  provider: 'ANTHROPIC' | 'GOOGLE';
  athleteId?: string;
  documentIds?: string[];
  webSearchEnabled?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireCoach();

    const body: ChatRequest = await request.json();
    const {
      conversationId,
      messages,
      model,
      provider,
      athleteId,
      documentIds = [],
      webSearchEnabled = false,
    } = body;

    // Get API keys
    const apiKeys = await prisma.userApiKey.findUnique({
      where: { userId: user.id },
    });

    if (!apiKeys) {
      return new Response(
        JSON.stringify({ error: 'API keys not configured' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Build context from athlete data
    let athleteContext = '';
    let sportSpecificContext = '';
    if (athleteId) {
      const athlete = await prisma.client.findFirst({
        where: { id: athleteId, userId: user.id },
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
        },
      });

      if (athlete) {
        // Calculate age
        const age = athlete.birthDate
          ? Math.floor((Date.now() - new Date(athlete.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
          : null;

        // Build basic info
        let basicInfo = `## ATLET INFORMATION
- **Namn**: ${athlete.name}
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

        athleteContext = `${basicInfo}${sportInfo}${testInfo}${raceInfo}${programInfo}${injuryInfo}${bodyCompInfo}
`;

        // Build sport-specific context with detailed training data
        sportSpecificContext = buildSportSpecificContext(athlete as unknown as AthleteData);
      }
    }

    // Build context from documents using RAG
    let documentContext = '';
    if (documentIds.length > 0 && apiKeys.openaiKeyEncrypted) {
      const lastUserMessage = messages.filter(m => m.role === 'user').pop();
      if (lastUserMessage) {
        try {
          const chunks = await searchSimilarChunks(
            lastUserMessage.content,
            user.id,
            apiKeys.openaiKeyEncrypted,
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
          console.error('Error fetching document context:', error);
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
          const searchQuery = lastUserMessage.content;

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
          console.error('Web search error:', error);
        }
      }
    }

    // Build system prompt
    const systemPrompt = `Du är en erfaren tränare och idrottsfysiolog som hjälper coacher att skapa träningsprogram.

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

## INSTRUKTIONER
- Svara ALLTID på svenska
- Var konkret och ge praktiska råd baserade på vetenskaplig grund
- När du föreslår träningsprogram, var specifik med intensiteter, volymer och frekvenser
- Använd etablerade träningszoner och metodiker
- Anpassa råden efter atletens nivå och mål
- När du genererar ett program, inkludera JSON-format som kan sparas
${webSearchEnabled ? '- Du kan referera till aktuell forskning och trender inom träningsvetenskap' : ''}

${athleteContext}
${sportSpecificContext}
${documentContext}
${webSearchContext}
`;

    // Create AI provider based on selection
    let aiModel;

    if (provider === 'ANTHROPIC' && apiKeys.anthropicKeyEncrypted) {
      const anthropic = createAnthropic({
        apiKey: apiKeys.anthropicKeyEncrypted,
      });
      aiModel = anthropic(model || 'claude-sonnet-4-5-20250929');
    } else if (provider === 'GOOGLE' && apiKeys.googleKeyEncrypted) {
      const google = createGoogleGenerativeAI({
        apiKey: apiKeys.googleKeyEncrypted,
      });
      aiModel = google(model || 'gemini-3-pro-preview');
    } else {
      return new Response(
        JSON.stringify({ error: 'No valid API key for selected provider' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Log request details for debugging
    console.log('AI Chat Request:', {
      provider,
      model,
      hasApiKey: !!apiKeys.anthropicKeyEncrypted || !!apiKeys.googleKeyEncrypted,
      messageCount: messages.length,
    });

    // Stream the response
    const result = streamText({
      model: aiModel,
      system: systemPrompt,
      messages: messages as CoreMessage[],
      maxTokens: 4096,
      experimental_telemetry: { isEnabled: false },
      onError: (error) => {
        console.error('Stream error during generation:', error);
      },
      onFinish: async ({ text, usage }) => {
        console.log('AI response finished:', { textLength: text?.length, usage });
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
                  content: lastUserMessage.content,
                },
              });
            }

            // Save assistant message
            await prisma.aIMessage.create({
              data: {
                conversationId,
                role: 'assistant',
                content: text,
                inputTokens: usage?.promptTokens,
                outputTokens: usage?.completionTokens,
                modelUsed: model,
              },
            });

            // Update conversation
            await prisma.aIConversation.update({
              where: { id: conversationId },
              data: {
                totalTokensUsed: {
                  increment: (usage?.promptTokens || 0) + (usage?.completionTokens || 0),
                },
                updatedAt: new Date(),
              },
            });
          } catch (error) {
            console.error('Error saving messages:', error);
          }
        }
      },
    });

    // Create the stream response with error handling
    try {
      // Consume the text stream to catch any API errors
      const textStream = result.textStream;

      const response = result.toDataStreamResponse();
      console.log('Stream response created successfully');
      return response;
    } catch (streamError) {
      console.error('Error creating stream response:', streamError);
      throw streamError;
    }
  } catch (error) {
    console.error('Chat streaming error:', error);

    // Log detailed error info
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }

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
