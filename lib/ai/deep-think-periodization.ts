/**
 * Deep Think Periodization Engine
 *
 * Uses Gemini 3 Pro's "thinkingLevel" capability for sophisticated
 * multi-week periodization reasoning. This is critical for understanding
 * the interconnectedness of training blocks (e.g., how a missed strength
 * session in Week 4 affects the taper in Week 12).
 */

import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { prisma } from '@/lib/prisma';
import { GEMINI_MODELS, getGeminiThinkingOptions } from '@/lib/ai/gemini-config';
import { decryptSecret } from '@/lib/crypto/secretbox';
import type {
  PeriodizationAnalysis,
  PeriodizationAdjustment,
  PeriodizationWarning,
  WeeklyAdjustment
} from './advanced-intelligence/periodization-adjustments';

export interface DeepThinkPeriodizationRequest {
  clientId: string;
  programId?: string;
  coachUserId: string;
  lookbackWeeks?: number;
  targetRace?: {
    name: string;
    date: Date;
    distance: string;
  };
  methodology?: 'POLARIZED' | 'NORWEGIAN' | 'PYRAMIDAL' | 'CANOVA';
}

export interface DeepThinkPeriodizationResponse extends PeriodizationAnalysis {
  aiReasoning: string;
  confidenceScore: number;
  interconnectedFactors: {
    factor: string;
    impact: string;
    affectedWeeks: number[];
  }[];
  alternativeScenarios: {
    scenario: string;
    outcome: string;
    probability: number;
  }[];
}

/**
 * Generate periodization analysis using Gemini 3 Pro Deep Think
 *
 * This uses high thinkingLevel for complex multi-week reasoning
 */
export async function analyzeWithDeepThink(
  request: DeepThinkPeriodizationRequest
): Promise<DeepThinkPeriodizationResponse> {
  const { clientId, programId, coachUserId, lookbackWeeks = 12 } = request;

  // Get API keys
  const apiKeys = await prisma.userApiKey.findUnique({
    where: { userId: coachUserId },
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
    throw new Error('Google API key not configured');
  }

  // Prevent IDOR: ensure the client belongs to this coach
  const ownedClient = await prisma.client.findFirst({
    where: { id: clientId, userId: coachUserId },
    select: { id: true },
  })
  if (!ownedClient) {
    throw new Error('Client not found or not accessible')
  }

  // Fetch comprehensive training data
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - lookbackWeeks * 7);

  const [
    athlete,
    workoutLogs,
    checkIns,
    trainingLoads,
    fieldTests,
    injuryHistory,
    program,
    raceResults,
  ] = await Promise.all([
    prisma.client.findUnique({
      where: { id: clientId },
      include: {
        sportProfile: true,
        tests: { orderBy: { testDate: 'desc' }, take: 3 },
      },
    }),
    prisma.workoutLog.findMany({
      where: {
        athleteId: clientId,
        completedAt: { gte: startDate },
      },
      include: { workout: true },
      orderBy: { completedAt: 'desc' },
    }),
    prisma.dailyCheckIn.findMany({
      where: {
        clientId,
        date: { gte: startDate },
      },
      orderBy: { date: 'desc' },
    }),
    prisma.trainingLoad.findMany({
      where: {
        clientId,
        date: { gte: startDate },
      },
      orderBy: { date: 'desc' },
    }),
    prisma.fieldTest.findMany({
      where: { clientId, valid: true },
      orderBy: { date: 'desc' },
      take: 5,
    }),
    prisma.injuryAssessment.findMany({
      where: { clientId },
      orderBy: { date: 'desc' },
      take: 10,
    }),
    programId
      ? prisma.trainingProgram.findUnique({
          where: { id: programId },
          include: {
            weeks: { include: { days: { include: { workouts: true } } } },
          },
        })
      : null,
    prisma.race.findMany({
      where: { clientId },
      orderBy: { date: 'desc' },
      take: 5,
    }),
  ]);

  // Build comprehensive context for Deep Think
  const contextData: DeepThinkContext = {
    athlete,
    workoutLogs,
    checkIns,
    trainingLoads,
    fieldTests,
    injuryHistory,
    program,
    raceResults,
    request,
  };

  const contextString = buildDeepThinkContext(contextData);

  // Initialize Gemini with Deep Think
  const google = createGoogleGenerativeAI({
    apiKey: googleKey,
  });

  // Use Gemini 3 Pro with high thinkingLevel for complex reasoning
  const result = await generateText({
    model: google(GEMINI_MODELS.VIDEO_ANALYSIS),
    prompt: buildDeepThinkPrompt(contextString),
    maxOutputTokens: 8192,
    // Enable deep thinking mode for complex multi-week periodization analysis
    providerOptions: getGeminiThinkingOptions('deep'),
  });

  // Parse the response
  return parseDeepThinkResponse(result.text, contextData);
}

interface DeepThinkContext {
  athlete: any;
  workoutLogs: any[];
  checkIns: any[];
  trainingLoads: any[];
  fieldTests: any[];
  injuryHistory: any[];
  program: any;
  raceResults: any[];
  request: DeepThinkPeriodizationRequest;
}

function buildDeepThinkContext(data: DeepThinkContext): string {
  const { athlete, workoutLogs, checkIns, trainingLoads, fieldTests, injuryHistory, program, raceResults, request } = data;

  let context = `## ATHLETE PROFILE
Name: ${athlete?.name || 'Unknown'}
Age: ${athlete?.birthDate ? Math.floor((Date.now() - new Date(athlete.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : 'Unknown'}
Sport: ${athlete?.sportProfile?.primarySport || 'Running'}
Training Methodology: ${request.methodology || 'Not specified'}

## TARGET RACE
${request.targetRace ? `
Race: ${request.targetRace.name}
Date: ${request.targetRace.date.toISOString().split('T')[0]}
Distance: ${request.targetRace.distance}
Weeks until race: ${Math.ceil((request.targetRace.date.getTime() - Date.now()) / (7 * 24 * 60 * 60 * 1000))}
` : 'No specific target race'}

## CURRENT PROGRAM
${program ? `
Program: ${program.name}
Start: ${program.startDate}
End: ${program.endDate}
Current Week: ${program.weeks?.length || 0}
Phase: ${program.currentPhase || 'Unknown'}
` : 'No active program'}

## TRAINING LOAD HISTORY (Last ${request.lookbackWeeks || 12} weeks)
`;

  // Weekly summaries
  const weeklyData = groupByWeek(trainingLoads);
  weeklyData.forEach((week, index) => {
    const avgLoad = week.reduce((sum, d) => sum + (d.dailyLoad || 0), 0) / week.length;
    const avgACWR = week.find(d => d.acwr)?.acwr || null;
    context += `Week -${index + 1}: Avg Load=${avgLoad.toFixed(0)} TSS, ACWR=${avgACWR?.toFixed(2) || 'N/A'}\n`;
  });

  // Check-in summary
  context += `\n## ATHLETE WELLNESS (Last 21 days)\n`;
  const recentCheckIns = checkIns.slice(0, 21);
  const avgReadiness = recentCheckIns.reduce((sum, c) => sum + (c.readinessScore || 70), 0) / recentCheckIns.length;
  const avgFatigue = recentCheckIns.reduce((sum, c) => sum + (c.fatigue || 5), 0) / recentCheckIns.length;
  const avgSleep = recentCheckIns.reduce((sum, c) => sum + (c.sleepHours || 7), 0) / recentCheckIns.length;
  context += `Average Readiness: ${avgReadiness.toFixed(1)}/100\n`;
  context += `Average Fatigue: ${avgFatigue.toFixed(1)}/10\n`;
  context += `Average Sleep: ${avgSleep.toFixed(1)} hours\n`;

  // Workout completion
  const completed = workoutLogs.filter(w => w.completed).length;
  const total = workoutLogs.length;
  context += `\n## WORKOUT ADHERENCE\n`;
  context += `Completion rate: ${total > 0 ? ((completed / total) * 100).toFixed(0) : 0}% (${completed}/${total})\n`;

  // Missed/modified workouts
  const modified = workoutLogs.filter(w => w.modifications);
  if (modified.length > 0) {
    context += `Modified workouts: ${modified.length}\n`;
    modified.slice(0, 5).forEach(w => {
      context += `  - ${w.workout?.name || 'Workout'}: ${w.modifications}\n`;
    });
  }

  // Field tests
  if (fieldTests.length > 0) {
    context += `\n## RECENT FIELD TESTS\n`;
    fieldTests.forEach(ft => {
      context += `${ft.testType} (${new Date(ft.date).toISOString().split('T')[0]}): ${JSON.stringify(ft.results)}\n`;
    });
  }

  // Injury history
  if (injuryHistory.length > 0) {
    context += `\n## INJURY HISTORY\n`;
    injuryHistory.forEach(inj => {
      context += `${inj.injuryType} (${inj.status}): ${inj.location} - Pain level: ${inj.painLevel}/10\n`;
    });
  }

  // Race history
  if (raceResults.length > 0) {
    context += `\n## RACE HISTORY\n`;
    raceResults.forEach(race => {
      context += `${race.raceName} (${new Date(race.raceDate).toISOString().split('T')[0]}): ${race.timeFormatted} - VDOT: ${race.vdot || 'N/A'}\n`;
    });
  }

  return context;
}

function buildDeepThinkPrompt(context: string): string {
  return `You are an elite endurance coach with expertise in periodization theory (Bompa, Issurin, Seiler).

Analyze this athlete's training data and provide sophisticated periodization recommendations. Consider:

1. **Interconnectedness**: How do missed sessions or low-quality weeks cascade through the training block?
2. **Supercompensation timing**: Are key workouts optimally placed for adaptation?
3. **Fatigue accumulation**: Is the athlete building productive fatigue or approaching overtraining?
4. **Phase transitions**: Should the athlete change phases? What are the risks of staying/changing?
5. **Race readiness**: If targeting a race, is the current trajectory optimal?

${context}

## ANALYSIS REQUIRED

Provide your analysis in the following JSON format:

{
  "currentPhase": {
    "name": "BASE|BUILD|PEAK|RACE|RECOVERY",
    "weekNumber": number,
    "totalWeeks": number,
    "focus": "description",
    "targetVolume": number,
    "targetIntensity": number
  },
  "recommendedPhase": null | { same structure as currentPhase },
  "phaseProgress": number (0-100),
  "adjustments": [
    {
      "type": "volume|intensity|frequency|recovery|phase",
      "urgency": "immediate|soon|planned",
      "currentValue": "string",
      "recommendedValue": "string",
      "rationale": "detailed reasoning",
      "confidence": number (0-1),
      "triggers": ["list of triggers"]
    }
  ],
  "warnings": [
    {
      "type": "overtraining|undertraining|imbalance|plateau|injury_risk",
      "severity": "low|medium|high",
      "message": "description",
      "action": "recommended action"
    }
  ],
  "weeklyPlan": [
    {
      "weekNumber": number,
      "volumeChange": number (percentage),
      "intensityChange": number (percentage),
      "keyWorkouts": ["list"],
      "focus": "description"
    }
  ],
  "aiReasoning": "Your detailed chain-of-thought reasoning explaining the interconnections you identified",
  "confidenceScore": number (0-1),
  "interconnectedFactors": [
    {
      "factor": "description of factor",
      "impact": "how it affects training",
      "affectedWeeks": [week numbers]
    }
  ],
  "alternativeScenarios": [
    {
      "scenario": "description",
      "outcome": "expected result",
      "probability": number (0-1)
    }
  ]
}

Think deeply about the interconnections between training weeks. A high-intensity session in Week 3 affects recovery in Week 4, which affects the quality of threshold work in Week 5, which determines readiness for race simulation in Week 8.`;
}

function parseDeepThinkResponse(
  responseText: string,
  context: DeepThinkContext
): DeepThinkPeriodizationResponse {
  try {
    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      currentPhase: parsed.currentPhase || {
        name: 'BASE',
        weekNumber: 1,
        totalWeeks: 12,
        focus: 'Aerob bas',
        targetVolume: 100,
        targetIntensity: 60,
      },
      recommendedPhase: parsed.recommendedPhase || null,
      phaseProgress: parsed.phaseProgress || 50,
      adjustments: parsed.adjustments || [],
      warnings: parsed.warnings || [],
      weeklyPlan: parsed.weeklyPlan || [],
      aiReasoning: parsed.aiReasoning || '',
      confidenceScore: parsed.confidenceScore || 0.7,
      interconnectedFactors: parsed.interconnectedFactors || [],
      alternativeScenarios: parsed.alternativeScenarios || [],
    };
  } catch (error) {
    console.error('Failed to parse Deep Think response:', error);

    // Return safe defaults
    return {
      currentPhase: {
        name: 'BASE',
        weekNumber: 1,
        totalWeeks: 12,
        focus: 'Aerob bas',
        targetVolume: 100,
        targetIntensity: 60,
      },
      recommendedPhase: null,
      phaseProgress: 50,
      adjustments: [],
      warnings: [{
        type: 'imbalance',
        severity: 'low',
        message: 'Could not complete AI analysis. Using algorithmic defaults.',
        action: 'Review training data manually',
      }],
      weeklyPlan: [],
      aiReasoning: 'Analysis failed - using algorithmic fallback',
      confidenceScore: 0.3,
      interconnectedFactors: [],
      alternativeScenarios: [],
    };
  }
}

function groupByWeek(data: any[]): any[][] {
  const weeks: any[][] = [];
  let currentWeek: any[] = [];
  let currentWeekStart: Date | null = null;

  for (const item of data) {
    const itemDate = new Date(item.date);

    if (!currentWeekStart) {
      currentWeekStart = itemDate;
    }

    const daysDiff = Math.floor(
      (currentWeekStart.getTime() - itemDate.getTime()) / (24 * 60 * 60 * 1000)
    );

    if (daysDiff >= 7) {
      if (currentWeek.length > 0) {
        weeks.push(currentWeek);
      }
      currentWeek = [item];
      currentWeekStart = itemDate;
    } else {
      currentWeek.push(item);
    }
  }

  if (currentWeek.length > 0) {
    weeks.push(currentWeek);
  }

  return weeks.slice(0, 12); // Max 12 weeks
}
