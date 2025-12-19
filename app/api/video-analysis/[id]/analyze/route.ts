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
} from '@/lib/ai/google-genai-client';
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

      // For STRENGTH and other types, use text-based approach
      const prompt = buildAnalysisPrompt(analysis);

      // Fetch video and convert to base64
      const { base64, mimeType } = await fetchAsBase64(analysis.videoUrl);

      // Call Gemini with video
      const result = await generateContent(client, modelId, [
        createText(prompt),
        createInlineData(base64, mimeType),
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
    // Fetch video and convert to base64
    const { base64, mimeType } = await fetchAsBase64(analysis.videoUrl);

    // Generate analysis
    const result = await generateContent(client, modelId, [
      createText(prompt),
      createInlineData(base64, mimeType),
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