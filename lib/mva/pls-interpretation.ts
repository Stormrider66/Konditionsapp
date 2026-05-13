import { generateAIResponse } from '@/lib/ai/ai-service'
import type { PLSModelResult, PLSInsight } from './types'

/**
 * Generate AI-powered interpretation of PLS results.
 * Returns null if AI generation fails (graceful degradation).
 */
export async function generatePLSInsight(
  coachUserId: string,
  result: PLSModelResult,
  sportType: string
): Promise<PLSInsight | null> {
  try {
    const topVIP = result.vipScores.slice(0, 5)
    const vipDescription = topVIP
      .map(
        (v) =>
          `- ${v.variableName}: VIP=${v.vip.toFixed(2)}, koefficient=${v.coefficient > 0 ? '+' : ''}${v.coefficient.toFixed(3)} (${v.category})`
      )
      .join('\n')

    const prompt = `Du är en erfaren idrottsfysiolog och dataanalytiker. Analysera dessa PLS-regressionsresultat och ge insikter på svenska.

KONTEXT:
- Sport: ${sportType}
- Responsvariabel (Y): ${result.yVariableName}
- Antal atleter: ${result.athleteIds.length}
- Antal X-variabler: ${result.xVariableIds.length}
- Antal PLS-komponenter: ${result.nComponents}
- R²Y (modellens förklaringsgrad): ${result.r2Y.toFixed(3)}
- Q² (korsvaliderad förklaringsgrad): ${result.q2.toFixed(3)}

TOP 5 VIP-VARIABLER (Variable Importance in Projection):
${vipDescription}

Variabler med VIP > 1.0 anses viktiga. Positiv koefficient = positiv association med ${result.yVariableName}.

Svara EXAKT i detta JSON-format (inget annat):
{
  "summary": "2-3 meningars sammanfattning av vad modellen visar",
  "keyDrivers": ["beskrivning av drivkraft 1", "beskrivning av drivkraft 2", "beskrivning av drivkraft 3"],
  "recommendations": ["rekommendation 1", "rekommendation 2", "rekommendation 3"]
}

Var konkret, undvik generella uttalanden. Fokusera på praktiska insikter som en coach kan agera på.`

    const response = await generateAIResponse(coachUserId, prompt, {
      maxTokens: 800,
      temperature: 0.5,
      category: 'coach_pls_insight',
    })

    // Extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null

    const parsed = JSON.parse(jsonMatch[0])

    if (
      typeof parsed.summary !== 'string' ||
      !Array.isArray(parsed.keyDrivers) ||
      !Array.isArray(parsed.recommendations)
    ) {
      return null
    }

    return {
      summary: parsed.summary,
      keyDrivers: parsed.keyDrivers.filter((d: unknown) => typeof d === 'string'),
      recommendations: parsed.recommendations.filter((r: unknown) => typeof r === 'string'),
    }
  } catch (error) {
    console.warn('PLS AI insight generation failed:', error)
    return null
  }
}
