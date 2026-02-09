/**
 * Audio Journal Processing API
 *
 * POST /api/audio-journal/[id]/process - Process audio with Gemini
 *
 * Uses Google's official @google/genai SDK for audio transcription
 * and structured wellness data extraction.
 */

import { NextRequest, NextResponse } from 'next/server';
import { resolveAthleteClientId, requireCoach } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import {
  createGoogleGenAIClient,
  generateContent,
  fetchAsBase64,
  createInlineData,
  createText,
  getGeminiModelId,
} from '@/lib/ai/google-genai-client';
import type { AudioExtractionResult } from '@/lib/validations/gemini-schemas';
import { decryptSecret } from '@/lib/crypto/secretbox';
import { isHttpUrl, normalizeStoragePath } from '@/lib/storage/supabase-storage';
import { downloadAsBase64 } from '@/lib/storage/supabase-storage-server';
import { rateLimitJsonResponse } from '@/lib/api/rate-limit'
import { logger } from '@/lib/logger'

export const maxDuration = 300

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Can be processed by athlete or coach
    let user;
    let isCoach = false;

    // Try as athlete (or coach in athlete mode) first
    const resolved = await resolveAthleteClientId();
    if (resolved) {
      user = resolved.user;
    } else {
      // Try as coach
      user = await requireCoach();
      isCoach = true;
    }

    const rateLimited = await rateLimitJsonResponse('audio-journal:process', user.id, {
      limit: 5,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    // Get the audio journal record
    const audioJournal = await prisma.audioJournal.findUnique({
      where: { id },
      include: {
        client: {
          select: { id: true, name: true, userId: true },
        },
      },
    });

    if (!audioJournal) {
      return NextResponse.json({ error: 'Audio journal not found' }, { status: 404 });
    }

    // Verify access
    if (isCoach) {
      if (audioJournal.client.userId !== user.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
    } else {
      // Athlete (or coach in athlete mode) - verify they own this journal
      if (resolved?.clientId !== audioJournal.clientId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
    }

    // Get API keys (from coach who owns the client)
    const apiKeys = await prisma.userApiKey.findUnique({
      where: { userId: audioJournal.client.userId },
    });

    let googleKey: string | undefined
    if (apiKeys?.googleKeyEncrypted) {
      try {
        googleKey = decryptSecret(apiKeys.googleKeyEncrypted)
      } catch {
        googleKey = undefined
      }
    }

    if (!googleKey) {
      return NextResponse.json(
        { error: 'Google API key not configured. Coach must add API key in settings.' },
        { status: 400 }
      );
    }

    // Update status to processing
    const startTime = Date.now();
    await prisma.audioJournal.update({
      where: { id },
      data: { status: 'PROCESSING' },
    });

    try {
      // Create Google GenAI client (official SDK)
      const client = createGoogleGenAIClient(googleKey);
      const modelId = getGeminiModelId('audio');

      // Build Swedish prompt for extraction
      const prompt = `Du är en erfaren idrottscoach som lyssnar på en atletnodagsincheckning.

UPPGIFT: Transkribera inspelningen och extrahera strukturerad data för träningsplanering.

## LYSSNA EFTER:
1. **Sömnkvalitet och längd** - "sov bra/dåligt", "vaknade X gånger", "X timmar"
2. **Trötthet/energi** - "trött", "pigg", "sliten", "full av energi"
3. **Ömhet/smärta** - kroppsdel + intensitet (lätt, måttlig, kraftig)
4. **Stress** - arbete, privatliv, träningsrelaterad
5. **Humör** - "glad", "nedstämd", "irriterad", etc.
6. **Motivation** - "taggad", "orkar inte", "ser fram emot"
7. **Gårdagens träning** - hur det kändes, RPE, eventuella problem

## KONVERTERING TILL NUMERISK SKALA (1-10):
- "utmärkt/jättebra/fantastisk" = 9-10
- "bra/pigg" = 7-8
- "okej/normal" = 5-6
- "dålig/trött" = 3-4
- "mycket dålig/sliten" = 1-2

## OUTPUT FORMAT
Svara i följande JSON-format:

\`\`\`json
{
  "transcription": "<full transkription på svenska>",
  "confidence": <0.0-1.0>,
  "wellness": {
    "sleepQuality": <1-10 eller null om ej nämnt>,
    "sleepHours": <antal timmar eller null>,
    "fatigue": <1-10 eller null>,
    "soreness": <1-10 eller null>,
    "stress": <1-10 eller null>,
    "mood": <1-10 eller null>,
    "motivation": <1-10 eller null>,
    "sorenessLocation": "<kroppsdel eller null>"
  },
  "physicalSymptoms": [
    {"symptom": "<symptom>", "severity": "MILD|MODERATE|SEVERE", "location": "<plats eller null>"}
  ],
  "trainingNotes": {
    "yesterdayPerformance": "<kommentar om gårdagens träning eller null>",
    "plannedAdjustments": "<planerade ändringar eller null>",
    "concerns": ["<bekymmer>"]
  },
  "aiInterpretation": {
    "readinessEstimate": <1-10>,
    "recommendedAction": "PROCEED|REDUCE|EASY|REST",
    "flaggedConcerns": ["<bekymmer som kräver coach-uppmärksamhet>"],
    "keyInsights": ["<viktiga insikter från inspelningen>"]
  }
}
\`\`\`

VIKTIGT: Om atleten INTE nämner något (t.ex. sömn), lämna det fältet som null.
Gissa inte värden som inte nämndes.`;

      // Fetch audio and convert to base64 (supports both legacy public URLs and storage paths)
      const MAX_AUDIO_BYTES = 15 * 1024 * 1024 // 15MB (inline_data practical limit)
      const path = normalizeStoragePath('audio-journals', audioJournal.audioUrl)
      const fetched = path
        ? await downloadAsBase64('audio-journals', path, { maxBytes: MAX_AUDIO_BYTES })
        : (isHttpUrl(audioJournal.audioUrl)
            ? await fetchAsBase64(audioJournal.audioUrl, { maxBytes: MAX_AUDIO_BYTES })
            : (() => {
                throw new Error('Invalid audio URL')
              })())

      const base64 = fetched.base64
      const mimeType = audioJournal.mimeType || fetched.mimeType || 'audio/mpeg'

      // Call Gemini with audio
      const result = await generateContent(client, modelId, [
        createText(prompt),
        createInlineData(base64, mimeType),
      ]);

      // Parse the response
      let extracted: AudioExtractionResult;
      try {
        const jsonMatch = result.text.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          extracted = JSON.parse(jsonMatch[1]);
        } else {
          extracted = JSON.parse(result.text);
        }
      } catch {
        // Fallback if JSON parsing fails
        extracted = {
          transcription: result.text,
          confidence: 0.5,
          wellness: {
            sleepQuality: undefined,
            sleepHours: undefined,
            fatigue: undefined,
            soreness: undefined,
            stress: undefined,
            mood: undefined,
            motivation: undefined,
          },
          physicalSymptoms: [],
          trainingNotes: {
            concerns: [],
          },
          aiInterpretation: {
            readinessEstimate: 5,
            recommendedAction: 'PROCEED' as const,
            flaggedConcerns: [],
            keyInsights: ['Kunde inte tolka inspelningen strukturerat'],
          },
        };
      }

      const processingTime = Date.now() - startTime;

      // Update audio journal with results
      await prisma.audioJournal.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          transcription: extracted.transcription,
          transcriptionModel: modelId,
          transcriptionConfidence: extracted.confidence,
          extractedData: extracted.wellness,
          extractionConfidence: extracted.confidence,
          aiInterpretation: extracted.aiInterpretation,
          processingTimeMs: processingTime,
        },
      });

      // Check if there's already a DailyCheckIn for today - if not, create one
      const today = new Date(audioJournal.date);
      today.setHours(0, 0, 0, 0);

      const existingCheckIn = await prisma.dailyCheckIn.findUnique({
        where: {
          clientId_date: {
            clientId: audioJournal.clientId,
            date: today,
          },
        },
      });

      let dailyCheckIn;

      if (!existingCheckIn && hasEnoughData(extracted.wellness)) {
        // Create DailyCheckIn from extracted data
        dailyCheckIn = await prisma.dailyCheckIn.create({
          data: {
            clientId: audioJournal.clientId,
            date: today,
            sleepQuality: extracted.wellness.sleepQuality || 5,
            sleepHours: extracted.wellness.sleepHours,
            soreness: extracted.wellness.soreness || 5,
            fatigue: extracted.wellness.fatigue || 5,
            stress: extracted.wellness.stress || 5,
            mood: extracted.wellness.mood || 5,
            motivation: extracted.wellness.motivation || 5,
            readinessScore: extracted.aiInterpretation.readinessEstimate,
            readinessDecision: extracted.aiInterpretation.recommendedAction,
            notes: `[Röstincheckning] ${extracted.transcription.substring(0, 500)}`,
          },
        });

        // Link audio journal to check-in
        await prisma.audioJournal.update({
          where: { id },
          data: { dailyCheckInId: dailyCheckIn.id },
        });
      }

      return NextResponse.json({
        success: true,
        extracted,
        dailyCheckIn: dailyCheckIn || existingCheckIn,
        processingTimeMs: processingTime,
      });
    } catch (aiError) {
      logger.error('Audio journal AI processing error', { id }, aiError)

      // Update status to failed
      await prisma.audioJournal.update({
        where: { id },
        data: {
          status: 'FAILED',
          processingError: aiError instanceof Error ? aiError.message : 'AI processing failed',
        },
      });

      const isProd = process.env.NODE_ENV === 'production'
      return NextResponse.json(
        {
          error: 'AI processing failed',
          details:
            isProd
              ? undefined
              : (aiError instanceof Error ? aiError.message : 'Unknown error'),
        },
        { status: 500 }
      );
    }
  } catch (error) {
    logger.error('Audio journal processing error', {}, error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to process audio' },
      { status: 500 }
    );
  }
}

/**
 * Check if we have enough extracted data to create a DailyCheckIn.
 * Requires at least 3 fields to be extracted.
 */
function hasEnoughData(wellness: AudioExtractionResult['wellness']): boolean {
  const fields = [
    wellness.sleepQuality,
    wellness.sleepHours,
    wellness.fatigue,
    wellness.soreness,
    wellness.stress,
    wellness.mood,
    wellness.motivation,
  ];

  const filledFields = fields.filter((f) => f !== null && f !== undefined);
  return filledFields.length >= 3;
}
