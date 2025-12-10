/**
 * Audio Journal Processing API
 *
 * POST /api/audio-journal/[id]/process - Process audio with Gemini 3 Pro
 *
 * Uses generateObject() for structured extraction of wellness data from speech.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAthlete, requireCoach } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { AudioExtractionSchema, type AudioExtractionResult } from '@/lib/validations/gemini-schemas';
import { GEMINI_MODELS } from '@/lib/ai/gemini-config';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Can be processed by athlete or coach
    let user;
    let isCoach = false;

    try {
      user = await requireAthlete();
    } catch {
      user = await requireCoach();
      isCoach = true;
    }

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
      // Athlete - verify they own this journal
      const athleteAccount = await prisma.athleteAccount.findUnique({
        where: { userId: user.id },
        select: { clientId: true },
      });
      if (athleteAccount?.clientId !== audioJournal.clientId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
    }

    // Get API keys (from coach who owns the client)
    const apiKeys = await prisma.userApiKey.findUnique({
      where: { userId: audioJournal.client.userId },
    });

    if (!apiKeys?.googleKeyEncrypted) {
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
      // Create Google AI provider
      const google = createGoogleGenerativeAI({
        apiKey: apiKeys.googleKeyEncrypted,
      });

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

## OUTPUT
Ge:
- Full transkription på svenska
- Strukturerade värden (1-10 skalor)
- AI-tolkning med readiness score (1-10)
- Rekommenderad träningsåtgärd (PROCEED/REDUCE/EASY/REST)
- Flaggade bekymmer som kräver coach-uppmärksamhet

VIKTIGT: Om atleten INTE nämner något (t.ex. sömn), lämna det fältet tomt (null/optional).
Gissa inte värden som inte nämndes.`;

      // Use generateObject for structured extraction
      const result = await generateObject({
        model: google(GEMINI_MODELS.AUDIO_TRANSCRIPTION),
        schema: AudioExtractionSchema,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'file', data: audioJournal.audioUrl, mimeType: audioJournal.mimeType || 'audio/webm' },
            ],
          },
        ],
      });

      const extracted = result.object as AudioExtractionResult;
      const processingTime = Date.now() - startTime;

      // Update audio journal with results
      await prisma.audioJournal.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          transcription: extracted.transcription,
          transcriptionModel: GEMINI_MODELS.AUDIO_TRANSCRIPTION,
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
      console.error('AI processing error:', aiError);

      // Update status to failed
      await prisma.audioJournal.update({
        where: { id },
        data: {
          status: 'FAILED',
          processingError: aiError instanceof Error ? aiError.message : 'AI processing failed',
        },
      });

      return NextResponse.json(
        { error: 'AI processing failed', details: aiError instanceof Error ? aiError.message : 'Unknown error' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Audio journal processing error:', error);

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
