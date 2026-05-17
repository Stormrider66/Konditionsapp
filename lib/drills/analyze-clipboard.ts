/**
 * Clipboard Photo → Drill Analysis using Gemini
 *
 * Takes a photo of a clipboard/whiteboard with a hand-drawn drill
 * and extracts structured drill data (positions, movements, annotations).
 */

import {
  createGoogleGenAIClient,
  generateContent,
  type AiCallMeta,
} from '@/lib/ai/google-genai-client'
import { getResolvedGoogleKey } from '@/lib/user-api-keys'
import { logger } from '@/lib/logger'
import type { DrillStructure } from '@/components/coach/drills/IceHockeyRink'

const DRILL_ANALYSIS_PROMPT = `You are an expert ice hockey coach analyzing a photo of a hand-drawn drill diagram on a clipboard or whiteboard.

Analyze the image and extract the drill structure as JSON. The coordinate system is:
- X: 0 (left goal) to 200 (right goal)
- Y: 0 (top boards) to 85 (bottom boards)
- Center ice is at x=100, y=42.5
- Blue lines at x=65 and x=135
- Faceoff circles at (31,22), (31,63), (169,22), (169,63)

Return ONLY valid JSON with this structure:
{
  "title": "Name of the drill (infer from context)",
  "description": "Brief description of the drill objective and execution in Swedish",
  "players": [
    { "id": "p1", "x": 100, "y": 42, "label": "C", "team": "home" }
  ],
  "movements": [
    { "id": "m1", "fromX": 100, "fromY": 42, "toX": 150, "toY": 30, "type": "skate", "playerId": "p1", "phase": 1 }
  ],
  "zones": [
    { "id": "z1", "x": 135, "y": 0, "width": 65, "height": 85, "color": "#22c55e", "label": "Offensiv zon" }
  ],
  "annotations": [
    { "id": "a1", "x": 150, "y": 10, "text": "Passning" }
  ]
}

Player labels: Use standard hockey abbreviations (C, LW, RW, LD, RD, G) or numbers (1-6).
Movement types: "skate" (solid arrow), "pass" (dashed blue), "shot" (red arrow), "puck" (dotted).
Team: "home" (red) for the team executing the drill, "away" (blue) for opponents/passive players.
For skating movements, set "playerId" to the moving player's id.
Use "phase" to show timing: all movements with the same phase happen simultaneously, later phases happen after earlier phases.
Include all visible defenders/opponents and their movement routes when pressure or defensive timing is shown.

If the image is unclear, make your best interpretation. Include all visible players, arrows, and text.
Write the description in Swedish.`

export interface DrillAnalysisResult {
  title: string
  description: string
  structure: DrillStructure
}

export async function analyzeClipboardPhoto(
  imageBase64: string,
  mimeType: string,
  userId: string,
  businessId?: string,
  meta?: AiCallMeta,
): Promise<DrillAnalysisResult> {
  const googleKey = await getResolvedGoogleKey(userId, { businessId })

  if (!googleKey) {
    throw new Error('Ingen Google AI-nyckel konfigurerad. Lägg till en i inställningarna.')
  }

  const client = createGoogleGenAIClient(googleKey)

  const result = await generateContent(
    client,
    'gemini-2.5-pro-preview-06-05',
    [
      { text: DRILL_ANALYSIS_PROMPT },
      { inlineData: { mimeType, data: imageBase64 } },
    ],
    undefined,
    {
      ...meta,
      userId: meta?.userId ?? userId,
      category: meta?.category ?? 'coach_drill_clipboard_analysis',
    },
  )

  if (!result.text) {
    throw new Error('AI returnerade inget svar')
  }

  logger.info('Drill analysis completed', {
    inputTokens: result.usage?.inputTokens,
    outputTokens: result.usage?.outputTokens,
  })

  // Parse JSON from response (handle markdown code blocks)
  let jsonText = result.text.trim()
  if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
  }

  try {
    const parsed = JSON.parse(jsonText)
    return {
      title: parsed.title || 'Övning',
      description: parsed.description || '',
      structure: {
        players: parsed.players || [],
        movements: parsed.movements || [],
        zones: parsed.zones || [],
        annotations: parsed.annotations || [],
      },
    }
  } catch (err) {
    logger.error('Failed to parse drill analysis JSON', { response: result.text, error: String(err) })
    throw new Error('Kunde inte tolka AI-svaret. Försök med en tydligare bild.')
  }
}
