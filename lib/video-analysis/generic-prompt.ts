import type { AnalysisResult } from './shared'
import { getExerciseDisplayName } from '@/lib/exercises/display-name'

export type GenericPromptAnalysis = {
  videoType: string
  athlete: { name: string; gender: string | null } | null
  exercise: {
    name: string
    nameSv: string | null
    nameEn?: string | null
    description: string | null
    muscleGroup: string | null
    biomechanicalPillar: string | null
    instructions: string | null
  } | null
}

type AppLocale = 'en' | 'sv'

/**
 * Build the prompt for analysis types that don't have a specialised
 * analyzer (STRENGTH, RUNNING_GAIT fallback, default).
 */
export function buildAnalysisPrompt(analysis: GenericPromptAnalysis, locale: AppLocale = 'en'): string {
  const athleteName = analysis.athlete?.name || (locale === 'sv' ? 'atleten' : 'the athlete')
  const gender = locale === 'sv'
    ? analysis.athlete?.gender === 'MALE'
      ? 'han'
      : analysis.athlete?.gender === 'FEMALE' ? 'hon' : 'de'
    : analysis.athlete?.gender === 'MALE'
      ? 'he'
      : analysis.athlete?.gender === 'FEMALE' ? 'she' : 'they'

  if (analysis.videoType === 'STRENGTH' && analysis.exercise) {
    const exercise = analysis.exercise
    const exerciseName = getExerciseDisplayName(exercise, locale)
    if (locale === 'en') {
      return `You are an experienced strength coach and biomechanics expert. Analyze this video of ${athleteName} performing "${exerciseName}".

## EXERCISE INFORMATION
- **Name**: ${exerciseName}
- **Description**: ${exercise.description || 'Not provided'}
- **Muscle group**: ${exercise.muscleGroup || 'Not provided'}
- **Biomechanical category**: ${exercise.biomechanicalPillar || 'Not provided'}
${exercise.instructions ? `\n## INSTRUCTIONS\n${exercise.instructions}` : ''}

## YOUR TASK
Analyze the video carefully and provide a professional technical assessment. Respond in English using this JSON format:

\`\`\`json
{
  "formScore": <0-100>,
  "issues": [
    {
      "issue": "<short description>",
      "severity": "LOW|MEDIUM|HIGH",
      "timestamp": "<approximate time in the video if possible>",
      "description": "<detailed explanation>"
    }
  ],
  "recommendations": [
    {
      "priority": <1-5, where 1 is highest>,
      "recommendation": "<what ${gender} should do>",
      "explanation": "<why this matters>"
    }
  ],
  "overallAssessment": "<summary assessment of the technique>",
  "strengths": ["<things done well>"],
  "areasForImprovement": ["<areas that need improvement>"]
}
\`\`\`

Be specific and constructive. Focus on:
1. Joint positions and movement patterns
2. Core and trunk stability
3. Tempo and control
4. Load distribution
5. Symmetry between right and left sides`
    }

    return `Du är en erfaren styrketränare och biomekaniexpert. Analysera denna video av ${athleteName} som utför övningen "${exerciseName}".

## ÖVNINGSINFORMATION
- **Namn**: ${exerciseName}
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
5. Symmetri mellan höger och vänster sida`
  }

  if (analysis.videoType === 'RUNNING_GAIT') {
    if (locale === 'en') {
      return `You are an experienced running coach and biomechanics expert. Analyze this running video of ${athleteName}.

## YOUR TASK
Analyze running technique and movement patterns carefully. Respond in English using this JSON format:

\`\`\`json
{
  "formScore": <0-100>,
  "issues": [
    {
      "issue": "<short description>",
      "severity": "LOW|MEDIUM|HIGH",
      "timestamp": "<approximate time if possible>",
      "description": "<detailed explanation>"
    }
  ],
  "recommendations": [
    {
      "priority": <1-5>,
      "recommendation": "<what ${gender} should do>",
      "explanation": "<why this matters>"
    }
  ],
  "overallAssessment": "<summary assessment>",
  "strengths": ["<things done well>"],
  "areasForImprovement": ["<areas that need improvement>"]
}
\`\`\`

Analyze these aspects:
1. **Foot strike**: heel, midfoot, or forefoot landing
2. **Cadence**: estimated step frequency
3. **Stride length**: proportional to cadence
4. **Arm action**: swing pattern and position
5. **Trunk posture**: lean and stability
6. **Hip extension**: full extension at toe-off
7. **Vertical oscillation**: up-and-down movement
8. **Knee lift**: height and timing
9. **Symmetry**: right/left differences

Identify potential injury risks and inefficiencies.`
    }

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

Identifiera potentiella skaderisker och ineffektiviteter.`
  }

  // Default/Sport-specific analysis
  if (locale === 'en') {
    return `You are an experienced sports coach and movement expert. Analyze this video of ${athleteName}.

## YOUR TASK
Analyze the movement and technique carefully. Respond in English using this JSON format:

\`\`\`json
{
  "formScore": <0-100>,
  "issues": [
    {
      "issue": "<short description>",
      "severity": "LOW|MEDIUM|HIGH",
      "timestamp": "<approximate time if possible>",
      "description": "<detailed explanation>"
    }
  ],
  "recommendations": [
    {
      "priority": <1-5>,
      "recommendation": "<what ${gender} should do>",
      "explanation": "<why this matters>"
    }
  ],
  "overallAssessment": "<summary assessment>",
  "strengths": ["<things done well>"],
  "areasForImprovement": ["<areas that need improvement>"]
}
\`\`\`

Analyze:
1. Movement pattern and technique
2. Posture and stability
3. Coordination and timing
4. Movement efficiency
5. Potential improvement areas`
  }

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
5. Potentiella förbättringsområden`
}

/**
 * Parse the AI's ```json``` block (or raw JSON) into AnalysisResult.
 * Falls back to a safe default object if parsing fails.
 */
export function parseAnalysisResponse(response: string): AnalysisResult {
  try {
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[1])
      return {
        formScore: Math.min(100, Math.max(0, parsed.formScore || 50)),
        issues: parsed.issues || [],
        recommendations: parsed.recommendations || [],
        overallAssessment: parsed.overallAssessment || '',
        strengths: parsed.strengths || [],
        areasForImprovement: parsed.areasForImprovement || [],
      }
    }

    const parsed = JSON.parse(response)
    return {
      formScore: Math.min(100, Math.max(0, parsed.formScore || 50)),
      issues: parsed.issues || [],
      recommendations: parsed.recommendations || [],
      overallAssessment: parsed.overallAssessment || '',
      strengths: parsed.strengths || [],
      areasForImprovement: parsed.areasForImprovement || [],
    }
  } catch {
    return {
      formScore: 50,
      issues: [],
      recommendations: [],
      overallAssessment: response,
      strengths: [],
      areasForImprovement: [],
    }
  }
}
