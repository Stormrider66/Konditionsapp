// app/api/norwegian-singles/generate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireCoach, hasReachedAthleteLimit } from '@/lib/auth-utils';
import {
  generateNorwegianSinglesProgram,
  saveNorwegianSinglesProgram
} from '@/lib/training-engine/generators/norwegian-singles-generator';
import { validateNorwegianSinglesEligibility } from '@/lib/training-engine/integration/norwegian-singles-validation';

/**
 * POST /api/norwegian-singles/generate
 * Generate a complete Norwegian Singles training program
 *
 * Body:
 * {
 *   clientId: string;
 *   startDate: string;
 *   durationWeeks: number;
 *   baseWeeklyVolume: number;
 *   targetWeeklyVolume: number;
 *   qualitySessions: 2 | 3;
 *   includeXFactor: boolean;
 *   fiveKTime?: number; // seconds
 *   fieldTestData?: { distance: number; duration: number; type: '20MIN' | '30MIN' };
 *   availableDays?: string[];
 *   maxSessionDuration?: number;
 *   terrain?: 'TRACK' | 'ROAD' | 'TRAIL' | 'MIXED';
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate and authorize
    const user = await requireCoach();

    // Check subscription limits
    const limitReached = await hasReachedAthleteLimit(user.id);
    if (limitReached) {
      return NextResponse.json(
        {
          success: false,
          error: 'Du har nått gränsen för antalet atleter i din prenumeration'
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Validate required fields
    if (!body.clientId) {
      return NextResponse.json(
        { success: false, error: 'clientId krävs' },
        { status: 400 }
      );
    }

    if (!body.fiveKTime && !body.fieldTestData) {
      return NextResponse.json(
        {
          success: false,
          error: 'Antingen 5K-tid eller fälttestdata krävs för att beräkna tröskeltempo'
        },
        { status: 400 }
      );
    }

    // Verify client belongs to this coach
    const client = await prisma.client.findUnique({
      where: { id: body.clientId },
      select: { userId: true, name: true, id: true }
    });

    if (!client) {
      return NextResponse.json(
        { success: false, error: 'Klient hittades inte' },
        { status: 404 }
      );
    }

    if (client.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Obehörig åtkomst' },
        { status: 403 }
      );
    }

    // Check eligibility
    const eligibility = await validateNorwegianSinglesEligibility(
      body.clientId,
      prisma
    );

    if (!eligibility.eligible) {
      const criticalIssues = eligibility.requirements
        .filter(r => r.severity === 'CRITICAL' && !r.met)
        .map(r => r.message);

      return NextResponse.json(
        {
          success: false,
          error: 'Idrottare uppfyller inte kraven för Norwegian Singles',
          details: criticalIssues
        },
        { status: 400 }
      );
    }

    // Generate program
    const program = await generateNorwegianSinglesProgram(
      body.clientId,
      {
        startDate: new Date(body.startDate),
        durationWeeks: body.durationWeeks || 12,
        baseWeeklyVolume: body.baseWeeklyVolume || 50,
        targetWeeklyVolume: body.targetWeeklyVolume || 75,
        qualitySessions: body.qualitySessions || 2,
        includeXFactor: body.includeXFactor ?? false,
        fiveKTime: body.fiveKTime,
        fieldTestData: body.fieldTestData,
        availableDays: body.availableDays,
        maxSessionDuration: body.maxSessionDuration,
        terrain: body.terrain
      },
      prisma
    );

    // Save to database
    const savedProgram = await saveNorwegianSinglesProgram(program, prisma);

    // Generate summary
    const summary = {
      programId: savedProgram.id,
      clientName: client.name,
      methodology: 'Norwegian Singles',
      duration: `${body.durationWeeks || 12} veckor`,
      startDate: new Date(body.startDate).toLocaleDateString('sv-SE'),
      endDate: program.endDate.toLocaleDateString('sv-SE'),

      volumeProgression: {
        starting: `${program.config.baseWeeklyVolume} km/vecka`,
        peak: `${program.config.targetWeeklyVolume} km/vecka`,
        qualityPercentage: '20-25%'
      },

      sessionStructure: {
        qualitySessionsPerWeek: program.config.qualitySessions,
        pattern: program.config.qualitySessions === 2
          ? 'E-Q-E-Q-E-E-LR (2 kvalitetspass)'
          : 'E-Q-E-Q-E-Q-LR (3 kvalitetspass)',
        includesXFactor: program.config.includeXFactor
      },

      paceTargets: {
        lt2Pace: formatPace(program.config.lt2Pace),
        pace1000m: formatPace(program.config.pace1000m),
        pace2000m: formatPace(program.config.pace2000m),
        pace3000m: formatPace(program.config.pace3000m),
        easyPace: formatPace(program.config.easyPace)
      },

      intensityControl: {
        targetLactate: '2.3-3.0 mmol/L',
        targetHR: '82-87% HRmax (kan driva till 86-91%)',
        targetRPE: '6-7/10',
        talkTest: 'Kan prata korta meningar (4-8 ord)'
      },

      keyPrinciples: [
        '🎯 Sub-tröskel träning (2.3-3.0 mmol/L)',
        '⏱️ 60-sekunders vila = "hemliga såsen"',
        '💚 Lätta löpningar VERKLIGEN lätta (<70% HRmax)',
        '🛑 Stoppa om HR >92% HRmax',
        '♻️ Återhämtning, återhämtning, återhämtning'
      ],

      phases: program.weeks.reduce((acc: any, week) => {
        if (!acc[week.phase]) {
          acc[week.phase] = {
            weeks: 0,
            avgVolume: 0,
            avgQuality: 0
          };
        }
        acc[week.phase].weeks++;
        acc[week.phase].avgVolume += week.targetVolume;
        acc[week.phase].avgQuality += week.qualityVolume;
        return acc;
      }, {})
    };

    // Calculate phase averages
    Object.keys(summary.phases).forEach(phase => {
      const p = summary.phases[phase];
      p.avgVolume = Math.round(p.avgVolume / p.weeks);
      p.avgQuality = Math.round(p.avgQuality / p.weeks);
    });

    return NextResponse.json({
      success: true,
      data: {
        program: savedProgram,
        summary,
        eligibility
      }
    });

  } catch (error: any) {
    console.error('[Norwegian Singles Generation] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Ett fel uppstod vid programgenerering'
      },
      { status: 500 }
    );
  }
}

/**
 * Helper: Format pace from seconds/km to MM:SS
 */
function formatPace(secondsPerKm: number): string {
  const minutes = Math.floor(secondsPerKm / 60);
  const seconds = Math.round(secondsPerKm % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}/km`;
}
