/**
 * Menstrual Cycle AI Insights API
 *
 * GET /api/menstrual-cycle/insights/[clientId] - Get AI-generated insights
 *
 * Uses Gemini to analyze cycle patterns and provide personalized recommendations.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCoach, requireAthlete } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { CycleInsightsSchema } from '@/lib/validations/gemini-schemas';
import { GEMINI_MODELS } from '@/lib/ai/gemini-config';
import { decryptSecret } from '@/lib/crypto/secretbox';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const { clientId } = await params;

    // Verify access
    let isAthlete = false;
    try {
      const user = await requireAthlete();
      const athleteAccount = await prisma.athleteAccount.findUnique({
        where: { userId: user.id },
        select: { clientId: true },
      });
      if (athleteAccount?.clientId !== clientId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
      isAthlete = true;
    } catch {
      const user = await requireCoach();
      const client = await prisma.client.findFirst({
        where: { id: clientId, userId: user.id },
      });
      if (!client) {
        return NextResponse.json({ error: 'Client not found' }, { status: 404 });
      }
    }

    // Get client data
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        name: true,
        userId: true,
      },
    });

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Get cycle history (last 6 cycles)
    const cycles = await prisma.menstrualCycle.findMany({
      where: { clientId },
      orderBy: { startDate: 'desc' },
      take: 6,
      include: {
        dailyLogs: {
          orderBy: { date: 'asc' },
        },
      },
    });

    if (cycles.length === 0) {
      return NextResponse.json({
        hasData: false,
        message: 'Ingen cykeldata tillgänglig. Börja logga för att få personliga insikter.',
      });
    }

    // Get current cycle
    const currentCycle = cycles.find((c) => c.endDate === null);

    // Calculate statistics
    const completedCycles = cycles.filter((c) => c.cycleLength !== null);
    const avgCycleLength = completedCycles.length > 0
      ? completedCycles.reduce((sum, c) => sum + (c.cycleLength || 0), 0) / completedCycles.length
      : null;

    // Get all daily logs for analysis
    const allLogs = cycles.flatMap((c) => c.dailyLogs);

    // Calculate phase symptom patterns
    const phasePatterns = calculatePhasePatterns(allLogs);

    // Try to get AI insights if API key is configured
    let aiInsights = null;

    const apiKeys = await prisma.userApiKey.findUnique({
      where: { userId: client.userId },
    });

    let googleKey: string | undefined
    if (apiKeys?.googleKeyEncrypted) {
      try {
        googleKey = decryptSecret(apiKeys.googleKeyEncrypted)
      } catch {
        googleKey = undefined
      }
    }

    if (googleKey && allLogs.length >= 10) {
      try {
        const google = createGoogleGenerativeAI({
          apiKey: googleKey,
        });

        const prompt = buildInsightsPrompt({
          cycleCount: cycles.length,
          avgCycleLength,
          currentCycle: currentCycle
            ? {
                day: Math.floor(
                  (new Date().getTime() - new Date(currentCycle.startDate).getTime()) /
                    (1000 * 60 * 60 * 24)
                ) + 1,
                phase: currentCycle.currentPhase,
              }
            : null,
          phasePatterns,
          recentLogs: allLogs.slice(-14), // Last 14 logs
        });

        const result = await generateObject({
          model: google(GEMINI_MODELS.FLASH), // Use Flash for quick insights
          schema: CycleInsightsSchema,
          prompt,
        });

        aiInsights = result.object;
      } catch (error) {
        console.error('AI insights generation error:', error);
        // Continue without AI insights
      }
    }

    // Calculate current phase info
    let currentPhaseInfo = null;
    if (currentCycle) {
      const startDate = new Date(currentCycle.startDate);
      startDate.setHours(0, 0, 0, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const cycleDay = Math.floor(
        (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      ) + 1;

      const phase = calculatePhase(cycleDay);
      currentPhaseInfo = {
        cycleDay,
        phase,
        phaseDay: calculatePhaseDay(cycleDay, phase),
        daysRemaining: calculateDaysRemaining(cycleDay, phase),
      };
    }

    return NextResponse.json({
      hasData: true,
      statistics: {
        totalCycles: cycles.length,
        completedCycles: completedCycles.length,
        avgCycleLength: avgCycleLength ? Math.round(avgCycleLength * 10) / 10 : null,
        totalLogsRecorded: allLogs.length,
      },
      currentCycle: currentPhaseInfo,
      phasePatterns,
      aiInsights,
      trainingRecommendations: aiInsights?.trainingRecommendations || getDefaultRecommendations(currentPhaseInfo?.phase),
    });
  } catch (error) {
    console.error('Cycle insights error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to generate insights' },
      { status: 500 }
    );
  }
}

type Phase = 'MENSTRUAL' | 'FOLLICULAR' | 'OVULATORY' | 'LUTEAL';

function calculatePhase(cycleDay: number): Phase {
  if (cycleDay <= 5) return 'MENSTRUAL';
  if (cycleDay <= 13) return 'FOLLICULAR';
  if (cycleDay <= 16) return 'OVULATORY';
  return 'LUTEAL';
}

function calculatePhaseDay(cycleDay: number, phase: Phase): number {
  const phaseStarts: Record<Phase, number> = {
    MENSTRUAL: 1,
    FOLLICULAR: 6,
    OVULATORY: 14,
    LUTEAL: 17,
  };
  return cycleDay - phaseStarts[phase] + 1;
}

function calculateDaysRemaining(cycleDay: number, phase: Phase): number {
  const phaseEnds: Record<Phase, number> = {
    MENSTRUAL: 5,
    FOLLICULAR: 13,
    OVULATORY: 16,
    LUTEAL: 28,
  };
  return phaseEnds[phase] - cycleDay + 1;
}

interface Log {
  phase: string | null;
  fatigue: number | null;
  moodScore: number | null;
  cramps: number | null;
  perceivedEffort: number | null;
  flowIntensity: number | null;
}

function calculatePhasePatterns(logs: Log[]) {
  const phases: Phase[] = ['MENSTRUAL', 'FOLLICULAR', 'OVULATORY', 'LUTEAL'];
  const patterns: Record<Phase, {
    count: number;
    avgFatigue: number | null;
    avgMood: number | null;
    avgCramps: number | null;
    avgEffort: number | null;
    avgFlow: number | null;
  }> = {} as any;

  for (const phase of phases) {
    const phaseLogs = logs.filter((l) => l.phase === phase);
    if (phaseLogs.length === 0) {
      patterns[phase] = {
        count: 0,
        avgFatigue: null,
        avgMood: null,
        avgCramps: null,
        avgEffort: null,
        avgFlow: null,
      };
      continue;
    }

    const avg = (arr: (number | null)[]): number | null => {
      const valid = arr.filter((v): v is number => v !== null);
      return valid.length > 0 ? valid.reduce((a, b) => a + b, 0) / valid.length : null;
    };

    patterns[phase] = {
      count: phaseLogs.length,
      avgFatigue: avg(phaseLogs.map((l) => l.fatigue)),
      avgMood: avg(phaseLogs.map((l) => l.moodScore)),
      avgCramps: avg(phaseLogs.map((l) => l.cramps)),
      avgEffort: avg(phaseLogs.map((l) => l.perceivedEffort)),
      avgFlow: avg(phaseLogs.map((l) => l.flowIntensity)),
    };
  }

  return patterns;
}

interface InsightsInput {
  cycleCount: number;
  avgCycleLength: number | null;
  currentCycle: { day: number; phase: string | null } | null;
  phasePatterns: Record<string, any>;
  recentLogs: Log[];
}

function buildInsightsPrompt(data: InsightsInput): string {
  return `Du är en expert på kvinnlig idrottsfysiologi och menstruationscykelns påverkan på träning.

Analysera följande data för en kvinnlig idrottare:

## Cykelstatistik
- Antal cykler registrerade: ${data.cycleCount}
- Genomsnittlig cykellängd: ${data.avgCycleLength ? `${Math.round(data.avgCycleLength)} dagar` : 'Ej tillräckligt data'}
- Nuvarande cykeldag: ${data.currentCycle ? data.currentCycle.day : 'Ingen aktiv cykel'}
- Nuvarande fas: ${data.currentCycle?.phase || 'Okänd'}

## Fasmönster (medelvärden 1-5 skala)
${JSON.stringify(data.phasePatterns, null, 2)}

## Senaste loggar (14 dagar)
${data.recentLogs.map((l) => `Fas: ${l.phase}, Trötthet: ${l.fatigue}, Humör: ${l.moodScore}, Kramper: ${l.cramps}, RPE: ${l.perceivedEffort}`).join('\n')}

Baserat på denna data, ge:
1. Nuvarande fas och dag i fasen
2. Träningsrekommendationer med intensitets- och volymmodifierare (0.5-1.2)
3. Fokusområden för träning
4. Personliga insikter baserade på mönster

Svara på svenska.`;
}

function getDefaultRecommendations(phase?: Phase | null) {
  const defaults: Record<Phase, {
    intensityModifier: number;
    volumeModifier: number;
    focusAreas: string[];
  }> = {
    MENSTRUAL: {
      intensityModifier: 0.85,
      volumeModifier: 0.80,
      focusAreas: ['Återhämtning', 'Lätt aerob träning', 'Mobilitet'],
    },
    FOLLICULAR: {
      intensityModifier: 1.0,
      volumeModifier: 1.0,
      focusAreas: ['Styrketräning', 'Intervalldagar', 'Teknisk träning'],
    },
    OVULATORY: {
      intensityModifier: 1.1,
      volumeModifier: 1.05,
      focusAreas: ['Maximal intensitet', 'Tävling', 'Explosiv träning'],
    },
    LUTEAL: {
      intensityModifier: 0.90,
      volumeModifier: 0.85,
      focusAreas: ['Uthållighetsträning', 'Teknikfokus', 'Måttlig intensitet'],
    },
  };

  if (!phase) {
    return defaults.FOLLICULAR; // Default to follicular if unknown
  }

  return defaults[phase];
}
