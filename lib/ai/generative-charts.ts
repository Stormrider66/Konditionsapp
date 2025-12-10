/**
 * Generative Chart System
 *
 * Uses Gemini 3 Pro to dynamically generate Recharts configurations
 * based on natural language requests. Instead of static PDFs, the AI
 * returns chart configurations that render client-side.
 *
 * Example: "Show me how his running economy compares to the team average"
 * → Returns a Recharts LineChart configuration with the data
 */

import { generateObject } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { GEMINI_MODELS } from '@/lib/ai/gemini-config';

// Zod schema for chart configurations
const ChartDataPointSchema = z.object({
  name: z.string().describe('X-axis label (e.g., date, week number, category)'),
  value: z.number().describe('Primary Y-axis value'),
  value2: z.number().optional().describe('Secondary Y-axis value for dual-axis charts'),
  category: z.string().optional().describe('Category for grouping/coloring'),
});

const ChartConfigSchema = z.object({
  chartType: z.enum(['line', 'bar', 'area', 'composed', 'radar', 'pie']).describe('Type of chart to render'),
  title: z.string().describe('Chart title in Swedish'),
  subtitle: z.string().optional().describe('Chart subtitle explaining the data'),
  data: z.array(ChartDataPointSchema).describe('Data points for the chart'),
  xAxisLabel: z.string().describe('X-axis label'),
  yAxisLabel: z.string().describe('Primary Y-axis label'),
  yAxis2Label: z.string().optional().describe('Secondary Y-axis label for dual-axis charts'),
  colors: z.object({
    primary: z.string().default('#3b82f6'),
    secondary: z.string().default('#10b981'),
    tertiary: z.string().default('#f59e0b'),
  }).describe('Chart colors'),
  showLegend: z.boolean().default(true),
  showGrid: z.boolean().default(true),
  showTooltip: z.boolean().default(true),
  annotations: z.array(z.object({
    type: z.enum(['line', 'area', 'label']),
    value: z.number(),
    label: z.string(),
    color: z.string().default('#ef4444'),
  })).optional().describe('Reference lines or annotations'),
  insights: z.array(z.string()).describe('Key insights from the data in Swedish'),
});

export type ChartConfig = z.infer<typeof ChartConfigSchema>;

export interface GenerateChartRequest {
  coachUserId: string;
  clientId: string;
  query: string; // Natural language query
  dataContext?: 'training_load' | 'wellness' | 'performance' | 'comparison' | 'all';
  timeRange?: {
    start: Date;
    end: Date;
  };
}

export interface GenerateChartResponse {
  success: boolean;
  chart: ChartConfig | null;
  error?: string;
  query: string;
  generatedAt: string;
}

/**
 * Generate a chart configuration from a natural language query
 */
export async function generateChartFromQuery(
  request: GenerateChartRequest
): Promise<GenerateChartResponse> {
  const { coachUserId, clientId, query, dataContext = 'all', timeRange } = request;

  // Get API keys
  const apiKeys = await prisma.userApiKey.findUnique({
    where: { userId: coachUserId },
  });

  if (!apiKeys?.googleKeyEncrypted) {
    return {
      success: false,
      chart: null,
      error: 'Google API key not configured',
      query,
      generatedAt: new Date().toISOString(),
    };
  }

  // Fetch relevant data based on context
  const athleteData = await fetchAthleteData(clientId, dataContext, timeRange);

  if (!athleteData) {
    return {
      success: false,
      chart: null,
      error: 'No data found for athlete',
      query,
      generatedAt: new Date().toISOString(),
    };
  }

  // Initialize Gemini
  const google = createGoogleGenerativeAI({
    apiKey: apiKeys.googleKeyEncrypted,
  });

  try {
    // Use generateObject for structured output
    const result = await generateObject({
      model: google(GEMINI_MODELS.FLASH), // Use Flash for speed
      schema: ChartConfigSchema,
      prompt: buildChartPrompt(query, athleteData),
    });

    return {
      success: true,
      chart: result.object,
      query,
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Chart generation error:', error);
    return {
      success: false,
      chart: null,
      error: error instanceof Error ? error.message : 'Failed to generate chart',
      query,
      generatedAt: new Date().toISOString(),
    };
  }
}

interface AthleteData {
  athlete: {
    name: string;
    sport: string;
  };
  trainingLoads: Array<{
    date: string;
    dailyLoad: number;
    acwr: number | null;
  }>;
  checkIns: Array<{
    date: string;
    readinessScore: number | null;
    fatigue: number;
    sleepHours: number | null;
    mood: number;
  }>;
  workoutLogs: Array<{
    date: string;
    type: string;
    duration: number | null;
    rpe: number | null;
    completed: boolean;
  }>;
  fieldTests: Array<{
    date: string;
    testType: string;
    results: any;
  }>;
  raceResults: Array<{
    date: string;
    name: string;
    distance: string;
    time: string;
    vdot: number | null;
  }>;
  teamAverages?: {
    avgLoad: number;
    avgReadiness: number;
    avgRPE: number;
  };
}

async function fetchAthleteData(
  clientId: string,
  context: string,
  timeRange?: { start: Date; end: Date }
): Promise<AthleteData | null> {
  const startDate = timeRange?.start || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 90 days default
  const endDate = timeRange?.end || new Date();

  const athlete = await prisma.client.findUnique({
    where: { id: clientId },
    include: { sportProfile: true },
  });

  if (!athlete) return null;

  const [trainingLoads, checkIns, workoutLogs, fieldTests, raceResults] = await Promise.all([
    context === 'all' || context === 'training_load'
      ? prisma.trainingLoad.findMany({
          where: { clientId, date: { gte: startDate, lte: endDate } },
          orderBy: { date: 'asc' },
        })
      : [],
    context === 'all' || context === 'wellness'
      ? prisma.dailyCheckIn.findMany({
          where: { clientId, date: { gte: startDate, lte: endDate } },
          orderBy: { date: 'asc' },
        })
      : [],
    context === 'all' || context === 'training_load'
      ? prisma.workoutLog.findMany({
          where: {
            athleteId: clientId,
            completedAt: { gte: startDate, lte: endDate },
          },
          include: { workout: true },
          orderBy: { completedAt: 'asc' },
        })
      : [],
    context === 'all' || context === 'performance'
      ? prisma.fieldTest.findMany({
          where: { clientId, valid: true },
          orderBy: { date: 'desc' },
          take: 10,
        })
      : [],
    context === 'all' || context === 'performance'
      ? prisma.race.findMany({
          where: { clientId },
          orderBy: { date: 'desc' },
          take: 10,
        })
      : [],
  ]);

  // Calculate team averages for comparison context
  let teamAverages;
  if (context === 'comparison' || context === 'all') {
    const coachId = athlete.userId;
    const teamClients = await prisma.client.findMany({
      where: { userId: coachId },
      select: { id: true },
    });

    const teamLoads = await prisma.trainingLoad.findMany({
      where: {
        clientId: { in: teamClients.map(c => c.id) },
        date: { gte: startDate, lte: endDate },
      },
    });

    const teamCheckIns = await prisma.dailyCheckIn.findMany({
      where: {
        clientId: { in: teamClients.map(c => c.id) },
        date: { gte: startDate, lte: endDate },
      },
    });

    teamAverages = {
      avgLoad: teamLoads.reduce((sum, l) => sum + (l.dailyLoad || 0), 0) / teamLoads.length || 0,
      avgReadiness: teamCheckIns.reduce((sum, c) => sum + (c.readinessScore || 70), 0) / teamCheckIns.length || 70,
      avgRPE: 5, // Default
    };
  }

  return {
    athlete: {
      name: athlete.name,
      sport: athlete.sportProfile?.primarySport || 'RUNNING',
    },
    trainingLoads: trainingLoads.map(l => ({
      date: l.date.toISOString().split('T')[0],
      dailyLoad: l.dailyLoad || 0,
      acwr: l.acwr,
    })),
    checkIns: checkIns.map(c => ({
      date: c.date.toISOString().split('T')[0],
      readinessScore: c.readinessScore,
      fatigue: c.fatigue,
      sleepHours: c.sleepHours,
      mood: c.mood,
    })),
    workoutLogs: workoutLogs.map(w => ({
      date: w.completedAt?.toISOString().split('T')[0] || '',
      type: w.workout?.type || 'OTHER',
      duration: w.duration,
      rpe: w.perceivedEffort,
      completed: w.completed,
    })),
    fieldTests: fieldTests.map(f => ({
      date: f.date.toISOString().split('T')[0],
      testType: f.testType,
      results: f.results,
    })),
    raceResults: raceResults.map(r => ({
      date: r.date.toISOString().split('T')[0],
      name: r.name || 'Race',
      distance: r.distance || '',
      time: r.actualTime || '',
      vdot: r.vdot,
    })),
    teamAverages,
  };
}

function buildChartPrompt(query: string, data: AthleteData): string {
  return `You are a sports analytics expert creating visualizations for coaches.

Based on the user's query, generate a Recharts-compatible chart configuration.

## USER QUERY
"${query}"

## ATHLETE DATA
Name: ${data.athlete.name}
Sport: ${data.athlete.sport}

### Training Loads (last 90 days)
${JSON.stringify(data.trainingLoads.slice(-30), null, 2)}

### Wellness Check-ins (last 30 days)
${JSON.stringify(data.checkIns.slice(-30), null, 2)}

### Workout Logs
${JSON.stringify(data.workoutLogs.slice(-20), null, 2)}

### Field Tests
${JSON.stringify(data.fieldTests, null, 2)}

### Race Results
${JSON.stringify(data.raceResults, null, 2)}

${data.teamAverages ? `### Team Averages
Avg Load: ${data.teamAverages.avgLoad.toFixed(0)} TSS
Avg Readiness: ${data.teamAverages.avgReadiness.toFixed(0)}/100
Avg RPE: ${data.teamAverages.avgRPE.toFixed(1)}/10` : ''}

## INSTRUCTIONS
1. Analyze the query to understand what visualization is needed
2. Select appropriate data from the athlete data
3. Choose the best chart type for the visualization
4. Format data points correctly for Recharts
5. Add meaningful Swedish titles and labels
6. Include 2-3 key insights from the data
7. Add reference lines/annotations if helpful (e.g., thresholds, averages)

Respond with a valid chart configuration matching the schema.`;
}

/**
 * Pre-defined chart templates for common queries
 */
export const CHART_TEMPLATES = {
  trainingLoadTrend: {
    chartType: 'area' as const,
    title: 'Träningsbelastning över tid',
    xAxisLabel: 'Datum',
    yAxisLabel: 'TSS',
  },
  acwrTrend: {
    chartType: 'composed' as const,
    title: 'ACWR-utveckling',
    xAxisLabel: 'Datum',
    yAxisLabel: 'ACWR',
    annotations: [
      { type: 'line' as const, value: 1.5, label: 'Riskzon', color: '#ef4444' },
      { type: 'line' as const, value: 0.8, label: 'Underträning', color: '#f59e0b' },
    ],
  },
  readinessVsFatigue: {
    chartType: 'line' as const,
    title: 'Beredskap vs Trötthet',
    xAxisLabel: 'Datum',
    yAxisLabel: 'Beredskap (%)',
    yAxis2Label: 'Trötthet (1-10)',
  },
  performanceProgression: {
    chartType: 'line' as const,
    title: 'Prestationsutveckling',
    xAxisLabel: 'Datum',
    yAxisLabel: 'VDOT',
  },
  intensityDistribution: {
    chartType: 'pie' as const,
    title: 'Intensitetsfördelning',
    xAxisLabel: 'Zon',
    yAxisLabel: 'Procent',
  },
};
