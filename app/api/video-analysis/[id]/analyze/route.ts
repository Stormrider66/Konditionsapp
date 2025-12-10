/**
 * Video Analysis AI Endpoint
 *
 * POST /api/video-analysis/[id]/analyze - Run Gemini analysis on video
 *
 * Supports two modes:
 * 1. RUNNING_GAIT: Uses Gemini 3 Pro (configured in gemini-config.ts) with generateObject() for structured output
 * 2. Other types: Uses generateText() with JSON parsing (backwards compatible)
 *
 * Model selection is centralized in lib/ai/gemini-config.ts - update GEMINI_MODELS.VIDEO_ANALYSIS
 * when new models become available.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCoach } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText, generateObject } from 'ai';
import { RunningGaitAnalysisSchema, type RunningGaitAnalysisResult } from '@/lib/validations/gemini-schemas';
import { GEMINI_MODELS } from '@/lib/ai/gemini-config';

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

    // Get API keys
    const apiKeys = await prisma.userApiKey.findUnique({
      where: { userId: user.id },
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
      // Create Google AI provider
      const google = createGoogleGenerativeAI({
        apiKey: apiKeys.googleKeyEncrypted,
      });

      // Use different analysis approach based on video type
      if (analysis.videoType === 'RUNNING_GAIT') {
        // Use Gemini 2.5 Pro with structured output for running gait analysis
        return await analyzeRunningGait(id, analysis, google);
      }

      // For STRENGTH and other types, use the existing text-based approach
      const prompt = buildAnalysisPrompt(analysis);

      // Call Gemini with video URL
      const result = await generateText({
        model: google(GEMINI_MODELS.VIDEO_ANALYSIS),
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt,
              },
              {
                type: 'file',
                data: analysis.videoUrl,
                mimeType: 'video/mp4',
              },
            ],
          },
        ],
        maxTokens: 4096,
      });

      // Parse the AI response
      const analysisResult = parseAnalysisResponse(result.text);

      // Update the analysis record with results
      const updatedAnalysis = await prisma.videoAnalysis.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          aiAnalysis: result.text,
          aiProvider: 'GOOGLE',
          modelUsed: GEMINI_MODELS.VIDEO_ANALYSIS,
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
 * Analyze running gait video using Gemini 2.5 Pro with structured output.
 * Uses generateObject() for type-safe, validated responses.
 */
async function analyzeRunningGait(
  id: string,
  analysis: {
    videoUrl: string;
    athlete: { id: string; name: string; gender: string | null } | null;
  },
  google: ReturnType<typeof createGoogleGenerativeAI>
): Promise<NextResponse> {
  const athleteName = analysis.athlete?.name || 'atleten';
  const gender = analysis.athlete?.gender === 'MALE' ? 'han' : analysis.athlete?.gender === 'FEMALE' ? 'hon' : 'de';

  const prompt = `Du är en erfaren löpbiomekaniker och idrottsfysiolog. Analysera denna löpvideo noggrant.

## ATLET INFORMATION
- **Namn**: ${athleteName}
- **Pronomen**: ${gender}

## ANALYSERA FÖLJANDE ASPEKTER

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
- Identifiera kompensationsmönster med:
  - issue: namn på problemet
  - severity: LOW/MEDIUM/HIGH
  - observation: vad du ser i videon
  - timestamp: ungefärlig tidpunkt i videon
- Bedöm posterior chain-engagemang (glutes, hamstrings)

### 4. LÖPEFFEKTIVITET
- Rating: EXCELLENT/GOOD/MODERATE/POOR
- Poäng 0-100
- Lista energiläckage med typ, beskrivning och påverkansnivå

### 5. COACHING (PÅ SVENSKA)
- **Omedelbar korrigering**: Viktigaste cue att ge atleten direkt
- **Övningsrekommendation**: Specifik drill för att adressera huvudproblemet
- **Styrkeprioriteringar**: Muskelgrupper att fokusera på i styrketräning

### 6. SUMMERING
- Övergripande poäng 0-100
- Sammanfattning på svenska

SVARA MED STRUKTURERAD DATA ENLIGT SCHEMAT.`;

  try {
    // Use generateObject for structured, validated output
    const result = await generateObject({
      model: google(GEMINI_MODELS.VIDEO_ANALYSIS),
      schema: RunningGaitAnalysisSchema,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'file', data: analysis.videoUrl, mimeType: 'video/mp4' },
          ],
        },
      ],
    });

    const gaitResult = result.object as RunningGaitAnalysisResult;

    // Map structured result to existing VideoAnalysis fields (backwards compatible)
    const issues = gaitResult.injuryRiskAnalysis.detectedCompensations.map((comp) => ({
      issue: comp.issue,
      severity: comp.severity,
      timestamp: comp.timestamp,
      description: comp.observation,
    }));

    const recommendations = gaitResult.coachingCues.strengthFocus.map((muscle, idx) => ({
      priority: idx + 1,
      recommendation: `Stärk ${muscle}`,
      explanation: `Baserat på löpanalys för förbättrad löpekonomi`,
    }));

    // Add immediate correction as first recommendation
    recommendations.unshift({
      priority: 0,
      recommendation: gaitResult.coachingCues.immediateCorrection,
      explanation: `Primär korrigeringscue`,
    });

    // Add drill recommendation
    recommendations.push({
      priority: recommendations.length,
      recommendation: `Utför: ${gaitResult.coachingCues.drillRecommendation}`,
      explanation: `Drill för att förbättra löpteknik`,
    });

    // Update the VideoAnalysis record with backwards-compatible fields
    const updatedAnalysis = await prisma.videoAnalysis.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        aiAnalysis: gaitResult.summary,
        aiProvider: 'GOOGLE',
        modelUsed: GEMINI_MODELS.VIDEO_ANALYSIS,
        formScore: gaitResult.overallScore,
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
        cadence: gaitResult.biometrics.estimatedCadence,
        footStrikePattern: gaitResult.biometrics.footStrike,
        // Map enum values to descriptive strings for the database
        groundContactTime: gaitResult.biometrics.groundContactTime === 'SHORT' ? 180 :
                          gaitResult.biometrics.groundContactTime === 'NORMAL' ? 230 :
                          280, // LONG
        verticalOscillation: gaitResult.biometrics.verticalOscillation === 'MINIMAL' ? 6 :
                            gaitResult.biometrics.verticalOscillation === 'MODERATE' ? 9 :
                            12, // EXCESSIVE
        // Asymmetry
        asymmetryPercent: gaitResult.asymmetry.overallPercent,
        // Injury risk
        injuryRiskLevel: gaitResult.injuryRiskAnalysis.riskScore <= 3 ? 'LOW' :
                        gaitResult.injuryRiskAnalysis.riskScore <= 6 ? 'MODERATE' :
                        'HIGH',
        injuryRiskScore: gaitResult.injuryRiskAnalysis.riskScore,
        injuryRiskFactors: gaitResult.injuryRiskAnalysis.detectedCompensations,
        // Efficiency
        runningEfficiency: gaitResult.efficiency.rating,
        energyLeakages: gaitResult.efficiency.energyLeakages,
        // Coaching
        coachingCues: [
          {
            cue: gaitResult.coachingCues.immediateCorrection,
            priority: 1,
            drillName: gaitResult.coachingCues.drillRecommendation,
          },
          ...gaitResult.coachingCues.strengthFocus.map((muscle, idx) => ({
            cue: `Stärk ${muscle}`,
            priority: idx + 2,
          })),
        ],
        drillRecommendations: [gaitResult.coachingCues.drillRecommendation],
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
          gaitResult.injuryRiskAnalysis.posteriorChainEngagement
            ? 'God aktivering av bakre kedjan'
            : null,
          gaitResult.efficiency.rating === 'EXCELLENT' || gaitResult.efficiency.rating === 'GOOD'
            ? 'Effektiv löpteknik'
            : null,
        ].filter(Boolean),
        areasForImprovement: [
          ...gaitResult.efficiency.energyLeakages.map((l) => l.type),
          ...gaitResult.asymmetry.significantDifferences,
        ],
      },
      // Include structured gait data for the new dashboard
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
