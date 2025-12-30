/**
 * Video Analysis AI Endpoint
 *
 * POST /api/video-analysis/[id]/analyze - Run Gemini analysis on video
 *
 * Uses Google's official @google/genai SDK directly for reliable Gemini 2.5/3 Pro
 * video analysis, bypassing Vercel AI SDK compatibility issues.
 *
 * Supports two modes:
 * 1. RUNNING_GAIT: Structured output for detailed biomechanical analysis
 * 2. Other types: Text-based analysis with JSON parsing
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCoach } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import {
  createGoogleGenAIClient,
  generateContent,
  generateStructuredContent,
  fetchAsBase64,
  createInlineData,
  createText,
  getGeminiModelId,
  type VideoMetadata,
} from '@/lib/ai/google-genai-client';

// Frame rates for different video analysis types
const VIDEO_FPS = {
  RUNNING_GAIT: 5,        // Higher FPS for fast motion analysis (5 frames/sec)
  STRENGTH: 2,            // Lower FPS for slower strength movements
  SKIING_CLASSIC: 8,      // Fast cyclic motion, need detail
  SKIING_SKATING: 8,      // Fast lateral movement
  SKIING_DOUBLE_POLE: 6,  // Less lateral movement
  HYROX_STATION: 4,       // Similar to strength, functional movements
  DEFAULT: 1,             // Default FPS
} as const;
import { GEMINI_MODELS } from '@/lib/ai/gemini-config';
import { isHttpUrl, downloadAsBase64 as downloadFromStorage } from '@/lib/storage/supabase-storage';
import {
  buildSkiingPrompt,
  isSkiingVideoType,
  getSkiingFPS,
  getSkiingTechniqueType,
  type SkiingTechniqueType as SkiingVideoType,
} from '@/lib/ai/skiing-prompts';
import { parseSkiingAnalysisResponse } from '@/lib/validations/skiing-analysis';
import {
  buildHyroxPrompt,
  isHyroxVideoType,
  getHyroxFPS,
  type HyroxStationType,
  HYROX_STATION_LABELS,
} from '@/lib/ai/hyrox-prompts';
import { parseHyroxAnalysisResponse } from '@/lib/validations/hyrox-analysis';

const VIDEO_BUCKET = 'video-analysis';

/**
 * Fetch video as base64 from either a full URL or Supabase storage path.
 */
async function getVideoAsBase64(videoUrl: string): Promise<{ base64: string; mimeType: string }> {
  if (isHttpUrl(videoUrl)) {
    // Full URL - fetch directly
    return fetchAsBase64(videoUrl);
  }

  // Supabase storage path - download from storage
  const result = await downloadFromStorage(VIDEO_BUCKET, videoUrl);
  return {
    base64: result.base64,
    mimeType: result.mimeType || 'video/mp4',
  };
}

interface AnalysisResult {
  formScore: number;
  issues: Array<{
    issue: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
    timestamp?: string;
    description: string;
  }>;
  recommendations: Array<{
    priority: number;
    recommendation: string;
    explanation: string;
  }>;
  overallAssessment: string;
  strengths: string[];
  areasForImprovement: string[];
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireCoach();
    const { id } = await params;

    // Get the analysis record
    const analysis = await prisma.videoAnalysis.findFirst({
      where: { id, coachId: user.id },
      include: {
        athlete: { select: { id: true, name: true, gender: true } },
        exercise: {
          select: {
            id: true,
            name: true,
            nameSv: true,
            description: true,
            muscleGroup: true,
            biomechanicalPillar: true,
            instructions: true,
          },
        },
      },
    });

    if (!analysis) {
      return NextResponse.json(
        { error: 'Analysis not found' },
        { status: 404 }
      );
    }

    // Get API keys with the default model relation
    const apiKeys = await prisma.userApiKey.findUnique({
      where: { userId: user.id },
      include: {
        defaultModel: true, // Include the AIModel relation to get the actual modelId
      },
    });

    if (!apiKeys?.googleKeyEncrypted) {
      return NextResponse.json(
        { error: 'Google API key not configured. Please add your API key in settings.' },
        { status: 400 }
      );
    }

    // Update status to processing
    await prisma.videoAnalysis.update({
      where: { id },
      data: { status: 'PROCESSING' },
    });

    try {
      // Create Google GenAI client (official SDK)
      const client = createGoogleGenAIClient(apiKeys.googleKeyEncrypted);

      // Use model from user settings if it's a Google model, otherwise fall back to default
      // Video analysis requires Google/Gemini models (not Claude)
      let modelId: string;
      if (apiKeys.defaultModel?.provider === 'GOOGLE' && apiKeys.defaultModel?.modelId) {
        modelId = apiKeys.defaultModel.modelId;
        console.log('[Video Analysis] Using user-selected Gemini model:', modelId);
      } else {
        modelId = getGeminiModelId('video');
        console.log('[Video Analysis] User has non-Google model selected, using default:', modelId);
      }

      // Use different analysis approach based on video type
      if (analysis.videoType === 'RUNNING_GAIT') {
        return await analyzeRunningGait(id, analysis, client, modelId);
      }

      // Handle skiing video types
      if (isSkiingVideoType(analysis.videoType)) {
        return await analyzeSkiingTechnique(id, analysis, client, modelId);
      }

      // Handle HYROX station video type
      if (isHyroxVideoType(analysis.videoType)) {
        return await analyzeHyroxStation(id, analysis, client, modelId);
      }

      // For STRENGTH and other types, use text-based approach
      const prompt = buildAnalysisPrompt(analysis);

      // Fetch video and convert to base64 (handles both URLs and storage paths)
      const { base64, mimeType } = await getVideoAsBase64(analysis.videoUrl);

      // Configure video metadata with appropriate FPS for the video type
      const fps = analysis.videoType === 'STRENGTH' ? VIDEO_FPS.STRENGTH : VIDEO_FPS.DEFAULT;
      const videoMetadata: VideoMetadata = { fps };

      console.log(`[Video Analysis] Analyzing ${analysis.videoType} video with ${fps} FPS`);

      // Call Gemini with video and metadata for proper frame sampling
      const result = await generateContent(client, modelId, [
        createText(prompt),
        createInlineData(base64, mimeType, videoMetadata),
      ]);

      // Parse the AI response
      const analysisResult = parseAnalysisResponse(result.text);

      // Update the analysis record with results
      const updatedAnalysis = await prisma.videoAnalysis.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          aiAnalysis: result.text,
          aiProvider: 'GOOGLE',
          modelUsed: modelId,
          formScore: analysisResult.formScore,
          issuesDetected: analysisResult.issues,
          recommendations: analysisResult.recommendations,
        },
        include: {
          athlete: { select: { id: true, name: true } },
          exercise: { select: { id: true, name: true, nameSv: true } },
        },
      });

      return NextResponse.json({
        success: true,
        analysis: updatedAnalysis,
        result: analysisResult,
      });
    } catch (aiError) {
      console.error('AI analysis error:', aiError);

      // Update status to failed
      await prisma.videoAnalysis.update({
        where: { id },
        data: {
          status: 'FAILED',
          processingError: aiError instanceof Error ? aiError.message : 'AI analysis failed',
        },
      });

      return NextResponse.json(
        { error: 'AI analysis failed', details: aiError instanceof Error ? aiError.message : 'Unknown error' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Video analysis error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to analyze video' },
      { status: 500 }
    );
  }
}

function buildAnalysisPrompt(analysis: {
  videoType: string;
  athlete: { name: string; gender: string | null } | null;
  exercise: {
    name: string;
    nameSv: string | null;
    description: string | null;
    muscleGroup: string | null;
    biomechanicalPillar: string | null;
    instructions: string | null;
  } | null;
}): string {
  const athleteName = analysis.athlete?.name || 'atleten';
  const gender = analysis.athlete?.gender === 'MALE' ? 'han' : analysis.athlete?.gender === 'FEMALE' ? 'hon' : 'de';

  if (analysis.videoType === 'STRENGTH' && analysis.exercise) {
    const exercise = analysis.exercise;

    return `Du är en erfaren styrketränare och biomekaniexpert. Analysera denna video av ${athleteName} som utför övningen "${exercise.nameSv || exercise.name}".

## ÖVNINGSINFORMATION
- **Namn**: ${exercise.nameSv || exercise.name}
- **Beskrivning**: ${exercise.description || 'Ej angivet'}
- **Muskelgrupp**: ${exercise.muscleGroup || 'Ej angivet'}
- **Biomekanisk kategori**: ${exercise.biomechanicalPillar || 'Ej angivet'}
${exercise.instructions ? `\n## INSTRUKTIONER\n${exercise.instructions}` : ''}

## DIN UPPGIFT
Analysera videon noggrant och ge en professionell teknisk bedömning. Svara på svenska i följande JSON-format:

\`\`\`json
{
  "formScore": <0-100>,
  "issues": [
    {
      "issue": "<kort beskrivning>",
      "severity": "LOW|MEDIUM|HIGH",
      "timestamp": "<ungefärlig tidpunkt i videon om möjligt>",
      "description": "<detaljerad förklaring>"
    }
  ],
  "recommendations": [
    {
      "priority": <1-5, där 1 är högst>,
      "recommendation": "<vad ${gender} bör göra>",
      "explanation": "<varför detta är viktigt>"
    }
  ],
  "overallAssessment": "<sammanfattande bedömning av tekniken>",
  "strengths": ["<saker som görs bra>"],
  "areasForImprovement": ["<områden som behöver förbättras>"]
}
\`\`\`

Var specifik och konstruktiv. Fokusera på:
1. Ledpositioner och rörelsemönster
2. Stabilitet i core och bål
3. Tempo och kontroll
4. Belastningsfördelning
5. Symmetri mellan höger och vänster sida`;
  }

  if (analysis.videoType === 'RUNNING_GAIT') {
    return `Du är en erfaren löpcoach och biomekaniexpert. Analysera denna löpvideo av ${athleteName}.

## DIN UPPGIFT
Analysera löpteknik och rörelsemönster noggrant. Svara på svenska i följande JSON-format:

\`\`\`json
{
  "formScore": <0-100>,
  "issues": [
    {
      "issue": "<kort beskrivning>",
      "severity": "LOW|MEDIUM|HIGH",
      "timestamp": "<ungefärlig tidpunkt om möjligt>",
      "description": "<detaljerad förklaring>"
    }
  ],
  "recommendations": [
    {
      "priority": <1-5>,
      "recommendation": "<vad ${gender} bör göra>",
      "explanation": "<varför detta är viktigt>"
    }
  ],
  "overallAssessment": "<sammanfattande bedömning>",
  "strengths": ["<saker som görs bra>"],
  "areasForImprovement": ["<områden som behöver förbättras>"]
}
\`\`\`

Analysera följande aspekter:
1. **Fotisättning**: Häl-, mitt- eller framfotslandning
2. **Kadens**: Uppskattad stegfrekvens
3. **Steglängd**: Proportionerlig till kadensen
4. **Armarbete**: Svingmönster och position
5. **Bålhållning**: Lutning och stabilitet
6. **Höftextension**: Fullständig utsträckning i frånskjut
7. **Vertikal oscillation**: Upp-och-ned-rörelse
8. **Knälyft**: Höjd och timing
9. **Symmetri**: Skillnader höger/vänster

Identifiera potentiella skaderisker och ineffektiviteter.`;
  }

  // Default/Sport-specific analysis
  return `Du är en erfaren idrottscoach och rörelsexpert. Analysera denna video av ${athleteName}.

## DIN UPPGIFT
Analysera rörelsen och tekniken noggrant. Svara på svenska i följande JSON-format:

\`\`\`json
{
  "formScore": <0-100>,
  "issues": [
    {
      "issue": "<kort beskrivning>",
      "severity": "LOW|MEDIUM|HIGH",
      "timestamp": "<ungefärlig tidpunkt om möjligt>",
      "description": "<detaljerad förklaring>"
    }
  ],
  "recommendations": [
    {
      "priority": <1-5>,
      "recommendation": "<vad ${gender} bör göra>",
      "explanation": "<varför detta är viktigt>"
    }
  ],
  "overallAssessment": "<sammanfattande bedömning>",
  "strengths": ["<saker som görs bra>"],
  "areasForImprovement": ["<områden som behöver förbättras>"]
}
\`\`\`

Analysera:
1. Rörelsemönster och teknik
2. Kroppshållning och stabilitet
3. Koordination och timing
4. Effektivitet i rörelsen
5. Potentiella förbättringsområden`;
}

function parseAnalysisResponse(response: string): AnalysisResult {
  try {
    // Try to extract JSON from the response
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[1]);
      return {
        formScore: Math.min(100, Math.max(0, parsed.formScore || 50)),
        issues: parsed.issues || [],
        recommendations: parsed.recommendations || [],
        overallAssessment: parsed.overallAssessment || '',
        strengths: parsed.strengths || [],
        areasForImprovement: parsed.areasForImprovement || [],
      };
    }

    // Try parsing the whole response as JSON
    const parsed = JSON.parse(response);
    return {
      formScore: Math.min(100, Math.max(0, parsed.formScore || 50)),
      issues: parsed.issues || [],
      recommendations: parsed.recommendations || [],
      overallAssessment: parsed.overallAssessment || '',
      strengths: parsed.strengths || [],
      areasForImprovement: parsed.areasForImprovement || [],
    };
  } catch {
    // If parsing fails, return a basic structure with the raw text
    return {
      formScore: 50,
      issues: [],
      recommendations: [],
      overallAssessment: response,
      strengths: [],
      areasForImprovement: [],
    };
  }
}

/**
 * Analyze skiing technique video (Classic, Skating, or Double Pole).
 * Uses Swedish prompts for detailed technique analysis.
 */
async function analyzeSkiingTechnique(
  id: string,
  analysis: {
    videoUrl: string;
    videoType: string;
    athlete: { id: string; name: string; gender: string | null } | null;
  },
  client: ReturnType<typeof createGoogleGenAIClient>,
  modelId: string
): Promise<NextResponse> {
  const videoType = analysis.videoType as SkiingVideoType;

  // Get athlete's skiing settings if available
  let skiingSettings = undefined;
  if (analysis.athlete?.id) {
    const sportProfile = await prisma.sportProfile.findUnique({
      where: { clientId: analysis.athlete.id },
      select: { skiingSettings: true },
    });
    skiingSettings = sportProfile?.skiingSettings as Record<string, unknown> | undefined;
  }

  // Build the skiing-specific prompt
  const prompt = buildSkiingPrompt(videoType, {
    gender: analysis.athlete?.gender || 'MALE',
    athleteName: analysis.athlete?.name,
    experienceLevel: skiingSettings?.experienceLevel as string | undefined,
    skiingSettings: skiingSettings as {
      technique?: string;
      primaryDiscipline?: string;
      terrainPreference?: string;
      currentThresholdPace?: number | null;
    } | undefined,
  });

  // Fetch video as base64
  const { base64, mimeType } = await getVideoAsBase64(analysis.videoUrl);

  // Get appropriate FPS for skiing video type
  const fps = getSkiingFPS(videoType);
  const videoMetadata: VideoMetadata = { fps };

  console.log(`[Video Analysis] Analyzing ${videoType} skiing video with ${fps} FPS`);

  // Call Gemini with video
  const result = await generateContent(client, modelId, [
    createText(prompt),
    createInlineData(base64, mimeType, videoMetadata),
  ]);

  // Parse the structured response
  const parsedAnalysis = parseSkiingAnalysisResponse(videoType, result.text);

  if (!parsedAnalysis) {
    console.error('[Skiing Analysis] Failed to parse AI response');
    // Still save the raw response
    await prisma.videoAnalysis.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        aiAnalysis: result.text,
        aiProvider: 'GOOGLE',
        modelUsed: modelId,
        formScore: 50, // Default score
      },
    });

    return NextResponse.json({
      success: true,
      warning: 'Analysis completed but structured parsing failed',
      rawAnalysis: result.text,
    });
  }

  // Map technique type for database
  const techniqueType = getSkiingTechniqueType(videoType);

  // Determine overall form score (use overallScore or average available scores)
  const formScore = Math.round(parsedAnalysis.overallScore || 50);

  // Extract insights for the base VideoAnalysis record
  const issues = parsedAnalysis.insights?.weaknesses?.map((weakness, i) => ({
    issue: weakness,
    severity: 'MEDIUM' as const,
    description: weakness,
  })) || [];

  const recommendations = parsedAnalysis.insights?.drills?.map((drill, i) => ({
    priority: drill.priority,
    recommendation: drill.drill,
    explanation: drill.focus,
  })) || [];

  // Update the VideoAnalysis record
  await prisma.videoAnalysis.update({
    where: { id },
    data: {
      status: 'COMPLETED',
      aiAnalysis: result.text,
      aiProvider: 'GOOGLE',
      modelUsed: modelId,
      formScore,
      issuesDetected: issues,
      recommendations,
    },
  });

  // Create the detailed SkiingTechniqueAnalysis record
  const skiingAnalysisData: Record<string, unknown> = {
    videoAnalysisId: id,
    techniqueType,
    overallScore: parsedAnalysis.overallScore,
    efficiencyScore: parsedAnalysis.efficiencyScore,
    primaryStrengths: parsedAnalysis.insights?.strengths || [],
    primaryWeaknesses: parsedAnalysis.insights?.weaknesses || [],
    techniqueDrills: parsedAnalysis.insights?.drills || [],
    comparisonToElite: parsedAnalysis.insights?.eliteComparison,
  };

  // Handle technique-specific scores (DoublePole has powerScore/rhythmScore, others have balanceScore/timingScore)
  if ('balanceScore' in parsedAnalysis) {
    skiingAnalysisData.balanceScore = parsedAnalysis.balanceScore;
  }
  if ('timingScore' in parsedAnalysis) {
    skiingAnalysisData.timingScore = parsedAnalysis.timingScore;
  }
  if ('powerScore' in parsedAnalysis) {
    skiingAnalysisData.powerScore = parsedAnalysis.powerScore;
  }
  if ('rhythmScore' in parsedAnalysis) {
    skiingAnalysisData.rhythmScore = parsedAnalysis.rhythmScore;
  }

  // Add technique-specific fields based on video type
  if ('poleAnalysis' in parsedAnalysis && parsedAnalysis.poleAnalysis) {
    skiingAnalysisData.poleAngleAtPlant = parsedAnalysis.poleAnalysis.plantAngle;
    skiingAnalysisData.poleAngleAtRelease = parsedAnalysis.poleAnalysis.releaseAngle;
    skiingAnalysisData.polePlantTiming = parsedAnalysis.poleAnalysis.timing;
    skiingAnalysisData.poleForceApplication = parsedAnalysis.poleAnalysis.forceApplication;
    skiingAnalysisData.armSwingSymmetry = parsedAnalysis.poleAnalysis.armSymmetry;
  }

  if ('hipPosition' in parsedAnalysis && parsedAnalysis.hipPosition) {
    skiingAnalysisData.hipPositionScore = parsedAnalysis.hipPosition.score;
    skiingAnalysisData.hipHeightConsistency = parsedAnalysis.hipPosition.heightConsistency;
    skiingAnalysisData.forwardLean = parsedAnalysis.hipPosition.forwardLean;
    skiingAnalysisData.coreEngagement = parsedAnalysis.hipPosition.coreEngagement;
  }

  // Classic-specific fields
  if ('kickAnalysis' in parsedAnalysis && parsedAnalysis.kickAnalysis) {
    skiingAnalysisData.kickTimingScore = parsedAnalysis.kickAnalysis.timingScore;
    skiingAnalysisData.kickExtension = parsedAnalysis.kickAnalysis.extension;
    skiingAnalysisData.waxPocketEngagement = parsedAnalysis.kickAnalysis.waxPocketEngagement;
  }

  if ('weightTransfer' in parsedAnalysis && parsedAnalysis.weightTransfer) {
    skiingAnalysisData.weightTransferScore = parsedAnalysis.weightTransfer.score;
    skiingAnalysisData.weightShiftTiming = parsedAnalysis.weightTransfer.timing;
    skiingAnalysisData.lateralStability = parsedAnalysis.weightTransfer.lateralStability;
  }

  if ('glidePhase' in parsedAnalysis && parsedAnalysis.glidePhase) {
    skiingAnalysisData.glidePhaseDuration = parsedAnalysis.glidePhase.duration;
    skiingAnalysisData.legRecoveryPattern = parsedAnalysis.glidePhase.legRecovery;
  }

  // Skating-specific fields
  if ('skatingVariant' in parsedAnalysis) {
    skiingAnalysisData.skatingVariant = parsedAnalysis.skatingVariant;
  }

  if ('edgeAnalysis' in parsedAnalysis && parsedAnalysis.edgeAnalysis) {
    skiingAnalysisData.edgeAngleLeft = parsedAnalysis.edgeAnalysis.leftAngle;
    skiingAnalysisData.edgeAngleRight = parsedAnalysis.edgeAnalysis.rightAngle;
    skiingAnalysisData.edgeAngleSymmetry = parsedAnalysis.edgeAnalysis.symmetry;
    skiingAnalysisData.pushOffAngle = parsedAnalysis.edgeAnalysis.pushOffAngle;
  }

  if ('vPattern' in parsedAnalysis && parsedAnalysis.vPattern) {
    skiingAnalysisData.vPatternWidth = parsedAnalysis.vPattern.width;
    skiingAnalysisData.skateFrequency = parsedAnalysis.vPattern.frequency;
  }

  if ('recovery' in parsedAnalysis && parsedAnalysis.recovery) {
    skiingAnalysisData.recoveryLegPath = parsedAnalysis.recovery.legPath;
  }

  // Double pole-specific fields
  if ('trunkAnalysis' in parsedAnalysis && parsedAnalysis.trunkAnalysis) {
    skiingAnalysisData.trunkFlexionRange = parsedAnalysis.trunkAnalysis.flexionRange;
    skiingAnalysisData.compressionDepth = parsedAnalysis.trunkAnalysis.compressionDepth;
    skiingAnalysisData.returnPhaseSpeed = parsedAnalysis.trunkAnalysis.returnSpeed;
  }

  if ('legDrive' in parsedAnalysis && parsedAnalysis.legDrive) {
    skiingAnalysisData.legDriveContribution = parsedAnalysis.legDrive.contribution;
  }

  if ('rhythm' in parsedAnalysis && parsedAnalysis.rhythm) {
    skiingAnalysisData.rhythmConsistency = parsedAnalysis.rhythm.consistency;
  }

  // Note: powerScore, rhythmScore, balanceScore, timingScore are already correctly
  // handled at lines 560-572 based on what the AI returns for each technique type.
  // Do NOT overwrite efficiencyScore with powerScore - they are separate metrics.

  // Create the skiing analysis record
  const skiingAnalysis = await prisma.skiingTechniqueAnalysis.create({
    data: skiingAnalysisData as any,
  });

  // Fetch the updated video analysis
  const updatedAnalysis = await prisma.videoAnalysis.findUnique({
    where: { id },
    include: {
      athlete: { select: { id: true, name: true } },
      skiingTechniqueAnalysis: true,
    },
  });

  return NextResponse.json({
    success: true,
    analysis: updatedAnalysis,
    skiingAnalysis,
    result: parsedAnalysis,
  });
}

/**
 * Analyze HYROX station video with station-specific prompts.
 * Supports all 8 HYROX stations with specialized analysis.
 */
async function analyzeHyroxStation(
  id: string,
  analysis: {
    videoUrl: string;
    videoType: string | null;
    athlete: { id: string; name: string; gender: string | null } | null;
  },
  client: ReturnType<typeof createGoogleGenAIClient>,
  modelId: string
): Promise<NextResponse> {
  // Fetch full analysis to get station type and athlete context
  const fullAnalysis = await prisma.videoAnalysis.findUnique({
    where: { id },
    include: {
      athlete: {
        include: {
          sportProfile: true,
        },
      },
    },
  });

  if (!fullAnalysis) {
    return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
  }

  // Get station type from the hyroxStation field (set during upload)
  const stationType = (fullAnalysis.hyroxStation || 'SKIERG') as HyroxStationType;

  // Build athlete context for HYROX
  const athleteContext = fullAnalysis.athlete?.sportProfile?.hyroxSettings
    ? {
        hyroxCategory: (fullAnalysis.athlete.sportProfile.hyroxSettings as { category?: string })?.category,
        stationTimes: (fullAnalysis.athlete.sportProfile.hyroxSettings as { stationTimes?: Record<string, number> })?.stationTimes,
        weakStations: (fullAnalysis.athlete.sportProfile.hyroxSettings as { weakStations?: string[] })?.weakStations,
        strongStations: (fullAnalysis.athlete.sportProfile.hyroxSettings as { strongStations?: string[] })?.strongStations,
      }
    : undefined;

  // Build the prompt with station-specific focus
  const prompt = buildHyroxPrompt(stationType, athleteContext);

  // Fetch video and convert to base64
  const { base64, mimeType } = await getVideoAsBase64(analysis.videoUrl);

  // Configure video metadata with appropriate FPS
  const fps = getHyroxFPS();
  const videoMetadata: VideoMetadata = { fps };

  console.log(`[Video Analysis] Analyzing HYROX ${HYROX_STATION_LABELS[stationType]} with ${fps} FPS`);

  // Call Gemini with video
  const result = await generateContent(client, modelId, [
    createText(prompt),
    createInlineData(base64, mimeType, videoMetadata),
  ]);

  // Parse the response
  const parsedAnalysis = parseHyroxAnalysisResponse(stationType, result.text);

  if (!parsedAnalysis) {
    // Fallback: store raw response if parsing fails
    await prisma.videoAnalysis.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        aiAnalysis: result.text,
        aiProvider: 'GOOGLE',
        modelUsed: modelId,
        formScore: 50, // Default score
      },
    });

    return NextResponse.json({
      success: true,
      warning: 'Could not parse structured response',
      rawAnalysis: result.text,
    });
  }

  // Convert strengths/weaknesses to issue/recommendation format
  const issues = parsedAnalysis.insights.weaknesses.map((weakness, i) => ({
    issue: weakness,
    severity: 'MEDIUM' as const,
    description: weakness,
  }));

  const recommendations = parsedAnalysis.insights.drills.map((drill, i) => ({
    priority: drill.priority,
    recommendation: drill.drill,
    explanation: drill.focus,
  }));

  // Update the video analysis record
  // Note: raceStrategyTips is stored in HyroxStationAnalysis, not here.
  // Keep recommendations as a simple array for consistency with skiing analysis.
  await prisma.videoAnalysis.update({
    where: { id },
    data: {
      status: 'COMPLETED',
      aiAnalysis: result.text,
      aiProvider: 'GOOGLE',
      modelUsed: modelId,
      formScore: Math.round(parsedAnalysis.formScore),
      issuesDetected: issues,
      recommendations,
    },
  });

  // Create the detailed HyroxStationAnalysis record
  const hyroxAnalysisData: Record<string, unknown> = {
    videoAnalysisId: id,
    stationType,
    overallScore: parsedAnalysis.overallScore,
    efficiencyScore: parsedAnalysis.efficiencyScore,
    formScore: parsedAnalysis.formScore,
    paceConsistency: parsedAnalysis.paceConsistency,
    coreStability: parsedAnalysis.coreStability,
    breathingPattern: parsedAnalysis.breathingPattern,
    movementCadence: parsedAnalysis.movementCadence,
    fatigueIndicators: parsedAnalysis.fatigueIndicators || null,
    primaryStrengths: parsedAnalysis.insights.strengths,
    primaryWeaknesses: parsedAnalysis.insights.weaknesses,
    improvementDrills: parsedAnalysis.insights.drills,
    raceStrategyTips: parsedAnalysis.insights.raceStrategyTips,
  };

  // Add station-specific fields based on station type
  if (stationType === 'SKIERG' && 'pullLength' in parsedAnalysis) {
    hyroxAnalysisData.pullLength = parsedAnalysis.pullLength;
    hyroxAnalysisData.hipHingeDepth = parsedAnalysis.hipHingeDepth;
    hyroxAnalysisData.armExtension = parsedAnalysis.armExtension;
    hyroxAnalysisData.legDriveContribution = parsedAnalysis.legDriveContribution;
  }

  if (stationType === 'SLED_PUSH' && 'bodyAngle' in parsedAnalysis) {
    hyroxAnalysisData.bodyAngle = parsedAnalysis.bodyAngle;
    hyroxAnalysisData.armLockout = parsedAnalysis.armLockout;
    hyroxAnalysisData.strideLength = parsedAnalysis.strideLength;
    hyroxAnalysisData.drivePhase = parsedAnalysis.drivePhase;
  }

  if (stationType === 'SLED_PULL' && 'pullTechnique' in parsedAnalysis) {
    hyroxAnalysisData.pullTechnique = parsedAnalysis.pullTechnique;
    hyroxAnalysisData.ropePath = parsedAnalysis.ropePath;
    hyroxAnalysisData.anchorStability = parsedAnalysis.anchorStability;
  }

  if (stationType === 'BURPEE_BROAD_JUMP' && 'burpeeDepth' in parsedAnalysis) {
    hyroxAnalysisData.burpeeDepth = parsedAnalysis.burpeeDepth;
    hyroxAnalysisData.jumpDistance = parsedAnalysis.jumpDistance;
    hyroxAnalysisData.transitionSpeed = parsedAnalysis.transitionSpeed;
    hyroxAnalysisData.landingMechanics = parsedAnalysis.landingMechanics;
  }

  if (stationType === 'ROWING' && 'driveSequence' in parsedAnalysis) {
    hyroxAnalysisData.driveSequence = parsedAnalysis.driveSequence;
    hyroxAnalysisData.laybackAngle = parsedAnalysis.laybackAngle;
    hyroxAnalysisData.catchPosition = parsedAnalysis.catchPosition;
    hyroxAnalysisData.strokeRate = parsedAnalysis.strokeRate;
    hyroxAnalysisData.powerApplication = parsedAnalysis.powerApplication;
  }

  if (stationType === 'FARMERS_CARRY' && 'shoulderPack' in parsedAnalysis) {
    hyroxAnalysisData.shoulderPack = parsedAnalysis.shoulderPack;
    hyroxAnalysisData.trunkPosture = parsedAnalysis.trunkPosture;
    hyroxAnalysisData.stridePattern = parsedAnalysis.stridePattern;
    hyroxAnalysisData.gripFatigue = parsedAnalysis.gripFatigue;
  }

  if (stationType === 'SANDBAG_LUNGE' && 'bagPosition' in parsedAnalysis) {
    hyroxAnalysisData.bagPosition = parsedAnalysis.bagPosition;
    hyroxAnalysisData.kneeTracking = parsedAnalysis.kneeTracking;
    hyroxAnalysisData.stepLength = parsedAnalysis.stepLength;
    hyroxAnalysisData.torsoPosition = parsedAnalysis.torsoPosition;
  }

  if (stationType === 'WALL_BALLS' && 'squatDepth' in parsedAnalysis) {
    hyroxAnalysisData.squatDepth = parsedAnalysis.squatDepth;
    hyroxAnalysisData.throwMechanics = parsedAnalysis.throwMechanics;
    hyroxAnalysisData.wallBallCatchHeight = parsedAnalysis.wallBallCatchHeight;
    hyroxAnalysisData.rhythmConsistency = parsedAnalysis.rhythmConsistency;
  }

  // Check if this is a weak/strong station for the athlete
  if (athleteContext?.weakStations?.includes(stationType)) {
    hyroxAnalysisData.isWeakStation = true;
  }
  if (athleteContext?.strongStations?.includes(stationType)) {
    hyroxAnalysisData.isStrongStation = true;
  }

  // Create the HYROX analysis record
  const hyroxAnalysis = await prisma.hyroxStationAnalysis.create({
    data: hyroxAnalysisData as any,
  });

  // Fetch the updated video analysis
  const updatedAnalysis = await prisma.videoAnalysis.findUnique({
    where: { id },
    include: {
      athlete: { select: { id: true, name: true } },
      hyroxStationAnalysis: true,
    },
  });

  return NextResponse.json({
    success: true,
    analysis: updatedAnalysis,
    hyroxAnalysis,
    result: parsedAnalysis,
  });
}

/**
 * Analyze running gait video with detailed biomechanical analysis.
 * Uses structured prompting for consistent output.
 */
async function analyzeRunningGait(
  id: string,
  analysis: {
    videoUrl: string;
    athlete: { id: string; name: string; gender: string | null } | null;
  },
  client: ReturnType<typeof createGoogleGenAIClient>,
  modelId: string
): Promise<NextResponse> {
  const athleteName = analysis.athlete?.name || 'atleten';
  const gender = analysis.athlete?.gender === 'MALE' ? 'han' : analysis.athlete?.gender === 'FEMALE' ? 'hon' : 'de';

  const prompt = `Du är en erfaren löpbiomekaniker och idrottsfysiolog. Analysera denna löpvideo noggrant.

## VIKTIGT: ANALYSERA HELA VIDEON
Du har tillgång till HELA videon med flera bildrutor (frames) över tid. Analysera rörelsen genom HELA videosekvensen, inte bara en enskild bildruta. Titta på:
- Hur rörelsen förändras genom videon
- Konsistensen i löpteknik över tid
- Eventuella mönster som upprepas vid varje steg
- Räkna faktiska steg för att uppskatta kadens

## ATLET INFORMATION
- **Namn**: ${athleteName}
- **Pronomen**: ${gender}

## ANALYSERA FÖLJANDE ASPEKTER (baserat på hela videosekvensen)

### 1. BIOMETRISKA MÄTVÄRDEN
Uppskatta baserat på videoanalys:
- **Kadens** (steg/minut) - räkna steg och extrapolera till per minut (typiskt 160-190 för tränade löpare)
- **Markontakttid** - bedöm som SHORT (<200ms), NORMAL (200-260ms), eller LONG (>260ms)
- **Vertikal oscillation** - bedöm som MINIMAL, MODERATE, eller EXCESSIVE
- **Steglängd** - bedöm som SHORT, OPTIMAL, eller OVERSTRIDING relativt till löparens längd och tempo
- **Fotisättning** - identifiera HEEL, MIDFOOT, eller FOREFOOT

### 2. ASYMMETRIANALYS
Jämför vänster och höger sida:
- Övergripande asymmetriprocent (>10% är oroande)
- Lista signifikanta skillnader

### 3. SKADERISKBEDÖMNING
- Ge en riskpoäng 0-10 (0=låg risk, 10=hög risk)
- Identifiera kompensationsmönster
- Bedöm posterior chain-engagemang (glutes, hamstrings)

### 4. LÖPEFFEKTIVITET
- Rating: EXCELLENT/GOOD/MODERATE/POOR
- Poäng 0-100
- Lista energiläckage

### 5. COACHING (PÅ SVENSKA)
- **Omedelbar korrigering**: Viktigaste cue att ge atleten direkt
- **Övningsrekommendation**: Specifik drill för att adressera huvudproblemet
- **Styrkeprioriteringar**: Muskelgrupper att fokusera på i styrketräning

### 6. SUMMERING
- Övergripande poäng 0-100
- Sammanfattning på svenska

SVARA I FÖLJANDE JSON-FORMAT:

\`\`\`json
{
  "biometrics": {
    "estimatedCadence": <number>,
    "groundContactTime": "SHORT|NORMAL|LONG",
    "verticalOscillation": "MINIMAL|MODERATE|EXCESSIVE",
    "strideLength": "SHORT|OPTIMAL|OVERSTRIDING",
    "footStrike": "HEEL|MIDFOOT|FOREFOOT"
  },
  "asymmetry": {
    "overallPercent": <number 0-100>,
    "significantDifferences": ["<list of differences>"]
  },
  "injuryRiskAnalysis": {
    "riskScore": <number 0-10>,
    "posteriorChainEngagement": <boolean>,
    "detectedCompensations": [
      {
        "issue": "<name>",
        "severity": "LOW|MEDIUM|HIGH",
        "observation": "<what you see>",
        "timestamp": "<approx time>"
      }
    ]
  },
  "efficiency": {
    "rating": "EXCELLENT|GOOD|MODERATE|POOR",
    "score": <number 0-100>,
    "energyLeakages": [
      {
        "type": "<type>",
        "description": "<description>",
        "impact": "LOW|MEDIUM|HIGH"
      }
    ]
  },
  "coachingCues": {
    "immediateCorrection": "<most important cue in Swedish>",
    "drillRecommendation": "<specific drill name>",
    "strengthFocus": ["<muscle groups to strengthen>"]
  },
  "overallScore": <number 0-100>,
  "summary": "<Swedish summary>"
}
\`\`\``;

  try {
    // Fetch video and convert to base64 (handles both URLs and storage paths)
    const { base64, mimeType } = await getVideoAsBase64(analysis.videoUrl);

    // Configure video metadata with higher FPS for running gait analysis
    // This ensures Gemini samples more frames for accurate motion analysis
    const videoMetadata: VideoMetadata = {
      fps: VIDEO_FPS.RUNNING_GAIT, // 5 FPS for detailed motion capture
    };

    console.log(`[Video Analysis] Analyzing running gait video with ${videoMetadata.fps} FPS`);

    // Generate analysis with video metadata for proper frame sampling
    const result = await generateContent(client, modelId, [
      createText(prompt),
      createInlineData(base64, mimeType, videoMetadata),
    ]);

    // Parse the structured response
    let gaitResult;
    try {
      console.log('[Video Analysis] Raw AI response length:', result.text.length);
      console.log('[Video Analysis] Raw AI response (first 500 chars):', result.text.substring(0, 500));

      const jsonMatch = result.text.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        console.log('[Video Analysis] Found JSON block, parsing...');
        gaitResult = JSON.parse(jsonMatch[1]);
      } else {
        // Try to find JSON without code blocks
        const jsonStartIndex = result.text.indexOf('{');
        const jsonEndIndex = result.text.lastIndexOf('}');
        if (jsonStartIndex !== -1 && jsonEndIndex !== -1 && jsonEndIndex > jsonStartIndex) {
          const jsonStr = result.text.substring(jsonStartIndex, jsonEndIndex + 1);
          console.log('[Video Analysis] Attempting to parse raw JSON from response...');
          gaitResult = JSON.parse(jsonStr);
        } else {
          gaitResult = JSON.parse(result.text);
        }
      }
      console.log('[Video Analysis] Successfully parsed gait analysis');
    } catch (parseError) {
      // Fallback to basic parsing
      console.error('[Video Analysis] JSON parse error:', parseError);
      console.log('[Video Analysis] Full response that failed to parse:', result.text);
      gaitResult = {
        biometrics: {
          estimatedCadence: 170,
          groundContactTime: 'NORMAL',
          verticalOscillation: 'MODERATE',
          strideLength: 'OPTIMAL',
          footStrike: 'MIDFOOT',
        },
        asymmetry: { overallPercent: 5, significantDifferences: [] },
        injuryRiskAnalysis: {
          riskScore: 3,
          posteriorChainEngagement: true,
          detectedCompensations: [],
        },
        efficiency: { rating: 'GOOD', score: 70, energyLeakages: [] },
        coachingCues: {
          immediateCorrection: 'Se AI-analys för detaljer',
          drillRecommendation: 'A-skip',
          strengthFocus: ['Core', 'Glutes'],
        },
        overallScore: 70,
        summary: result.text.substring(0, 500),
      };
    }

    // Map structured result to existing VideoAnalysis fields
    const issues = (gaitResult.injuryRiskAnalysis?.detectedCompensations || []).map((comp: { issue: string; severity: string; timestamp?: string; observation: string }) => ({
      issue: comp.issue,
      severity: comp.severity,
      timestamp: comp.timestamp,
      description: comp.observation,
    }));

    const recommendations = (gaitResult.coachingCues?.strengthFocus || []).map((muscle: string, idx: number) => ({
      priority: idx + 1,
      recommendation: `Stärk ${muscle}`,
      explanation: `Baserat på löpanalys för förbättrad löpekonomi`,
    }));

    // Add immediate correction as first recommendation
    if (gaitResult.coachingCues?.immediateCorrection) {
      recommendations.unshift({
        priority: 0,
        recommendation: gaitResult.coachingCues.immediateCorrection,
        explanation: `Primär korrigeringscue`,
      });
    }

    // Add drill recommendation
    if (gaitResult.coachingCues?.drillRecommendation) {
      recommendations.push({
        priority: recommendations.length,
        recommendation: `Utför: ${gaitResult.coachingCues.drillRecommendation}`,
        explanation: `Drill för att förbättra löpteknik`,
      });
    }

    // Update the VideoAnalysis record
    const updatedAnalysis = await prisma.videoAnalysis.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        aiAnalysis: gaitResult.summary || result.text,
        aiProvider: 'GOOGLE',
        modelUsed: modelId,
        formScore: gaitResult.overallScore || 70,
        issuesDetected: issues,
        recommendations: recommendations,
      },
      include: {
        athlete: { select: { id: true, name: true } },
        exercise: { select: { id: true, name: true, nameSv: true } },
      },
    });

    // Store extended structured data in RunningGaitAnalysis model
    await prisma.runningGaitAnalysis.create({
      data: {
        videoAnalysisId: id,
        // Biometrics
        cadence: gaitResult.biometrics?.estimatedCadence,
        footStrikePattern: gaitResult.biometrics?.footStrike,
        groundContactTime: gaitResult.biometrics?.groundContactTime === 'SHORT' ? 180 :
                          gaitResult.biometrics?.groundContactTime === 'NORMAL' ? 230 :
                          280, // LONG
        verticalOscillation: gaitResult.biometrics?.verticalOscillation === 'MINIMAL' ? 6 :
                            gaitResult.biometrics?.verticalOscillation === 'MODERATE' ? 9 :
                            12, // EXCESSIVE
        // Asymmetry
        asymmetryPercent: gaitResult.asymmetry?.overallPercent,
        // Injury risk
        injuryRiskLevel: (gaitResult.injuryRiskAnalysis?.riskScore || 0) <= 3 ? 'LOW' :
                        (gaitResult.injuryRiskAnalysis?.riskScore || 0) <= 6 ? 'MODERATE' :
                        'HIGH',
        injuryRiskScore: gaitResult.injuryRiskAnalysis?.riskScore,
        injuryRiskFactors: gaitResult.injuryRiskAnalysis?.detectedCompensations || [],
        // Efficiency
        runningEfficiency: gaitResult.efficiency?.rating,
        energyLeakages: gaitResult.efficiency?.energyLeakages || [],
        // Coaching
        coachingCues: [
          {
            cue: gaitResult.coachingCues?.immediateCorrection,
            priority: 1,
            drillName: gaitResult.coachingCues?.drillRecommendation,
          },
          ...(gaitResult.coachingCues?.strengthFocus || []).map((muscle: string, idx: number) => ({
            cue: `Stärk ${muscle}`,
            priority: idx + 2,
          })),
        ],
        drillRecommendations: gaitResult.coachingCues?.drillRecommendation
          ? [gaitResult.coachingCues.drillRecommendation]
          : [],
        // Overall
        overallScore: gaitResult.overallScore,
        summary: gaitResult.summary,
      },
    });

    return NextResponse.json({
      success: true,
      analysis: updatedAnalysis,
      result: {
        formScore: gaitResult.overallScore,
        issues,
        recommendations,
        overallAssessment: gaitResult.summary,
        strengths: [
          gaitResult.injuryRiskAnalysis?.posteriorChainEngagement
            ? 'God aktivering av bakre kedjan'
            : null,
          gaitResult.efficiency?.rating === 'EXCELLENT' || gaitResult.efficiency?.rating === 'GOOD'
            ? 'Effektiv löpteknik'
            : null,
        ].filter(Boolean),
        areasForImprovement: [
          ...(gaitResult.efficiency?.energyLeakages || []).map((l: { type: string }) => l.type),
          ...(gaitResult.asymmetry?.significantDifferences || []),
        ],
      },
      gaitAnalysis: gaitResult,
    });
  } catch (error) {
    console.error('Running gait analysis error:', error);

    // Update status to failed
    await prisma.videoAnalysis.update({
      where: { id },
      data: {
        status: 'FAILED',
        processingError: error instanceof Error ? error.message : 'Running gait analysis failed',
      },
    });

    return NextResponse.json(
      { error: 'Running gait analysis failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}