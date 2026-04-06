/**
 * Text → Drill Generation using Gemini
 *
 * Coach describes a drill in natural language and the AI generates
 * a complete DrillStructure JSON, ready for visualization and animation.
 */

import {
  createGoogleGenAIClient,
  generateContent,
} from '@/lib/ai/google-genai-client'
import { getResolvedGoogleKey } from '@/lib/user-api-keys'
import { logger } from '@/lib/logger'
import type { DrillStructure } from '@/components/coach/drills/IceHockeyRink'

// Sport-specific coordinate configs for the prompt
const SPORT_PROMPTS: Record<string, string> = {
  ICE_HOCKEY: `Coordinate system (IIHF ice hockey rink):
- X: 0 (left goal) to 200 (right goal)
- Y: 0 (top boards) to 85 (bottom boards)
- Center ice: x=100, y=42.5
- Blue lines: x=65, x=135
- Faceoff circles: (31,22), (31,63), (169,22), (169,63)
Player labels: C, LW, RW, LD, RD, G or numbers 1-6.`,

  FOOTBALL: `Coordinate system (FIFA football pitch):
- X: 0 (left goal) to 210 (right goal)
- Y: 0 (top sideline) to 136 (bottom sideline)
- Center: x=105, y=68
- Penalty areas: x=0-33 and x=177-210
Player labels: GK, CB, LB, RB, CDM, CM, CAM, LW, RW, ST.`,

  HANDBALL: `Coordinate system (IHF handball court):
- X: 0 (left goal) to 200 (right goal)
- Y: 0 (top sideline) to 100 (bottom sideline)
- Center: x=100, y=50
- 6m arcs near goals
Player labels: MV, VB, HB, VH, HH, M9, M6.`,

  BASKETBALL: `Coordinate system (FIBA basketball court):
- X: 0 (left basket) to 280 (right basket)
- Y: 0 (top sideline) to 150 (bottom sideline)
- Center: x=140, y=75
- Three-point lines and keys at each end
Player labels: PG, SG, SF, PF, C.`,

  FLOORBALL: `Coordinate system (IFF floorball rink):
- X: 0 (left goal) to 200 (right goal)
- Y: 0 (top boards) to 100 (bottom boards)
- Center: x=100, y=50
Player labels: C, LW, RW, LD, RD, G.`,

  VOLLEYBALL: `Coordinate system (FIVB volleyball court):
- X: 0 (left end) to 180 (right end)
- Y: 0 (top sideline) to 90 (bottom sideline)
- Net/center line at x=90
- Attack lines at x=60 and x=120
Player labels: S (setter), OH (outside hitter), OPP (opposite), MB (middle blocker), L (libero), RS (right side).`,
}

function buildPrompt(sportType: string): string {
  const sportCoords = SPORT_PROMPTS[sportType] || SPORT_PROMPTS.ICE_HOCKEY

  return `You are an expert sports coach and drill designer. A coach will describe a drill or tactical exercise in natural language. Generate a complete drill diagram as structured JSON.

${sportCoords}

Return ONLY valid JSON with this structure:
{
  "title": "Short name for the drill (in Swedish)",
  "description": "Brief description of the objective and execution (in Swedish)",
  "players": [
    { "id": "p1", "x": 100, "y": 42, "label": "C", "team": "home" }
  ],
  "movements": [
    { "id": "m1", "fromX": 100, "fromY": 42, "toX": 150, "toY": 30, "type": "skate" }
  ],
  "zones": [
    { "id": "z1", "x": 135, "y": 0, "width": 65, "height": 85, "color": "#22c55e", "label": "Zone label" }
  ],
  "annotations": [
    { "id": "a1", "x": 150, "y": 10, "text": "Annotation text" }
  ]
}

Guidelines:
- Movement types: "skate" (player skating/running, solid arrow), "pass" (pass, dashed blue), "shot" (shot on goal, red arrow), "puck" (ball/puck movement, dotted)
- Team: "home" (red) = team executing the drill, "away" (blue) = opponents/passive players
- Place players in realistic starting positions for the described drill
- Order movements logically (they will be animated sequentially)
- Use zones to highlight tactical areas
- Add annotations for coaching cues
- Write all text in Swedish
- Make the drill tactically sound and realistic`
}

export interface TextDrillResult {
  title: string
  description: string
  structure: DrillStructure
}

export async function generateDrillFromText(
  prompt: string,
  sportType: string,
  userId: string,
  businessId?: string,
): Promise<TextDrillResult> {
  const googleKey = await getResolvedGoogleKey(userId, { businessId })

  if (!googleKey) {
    throw new Error('Ingen Google AI-nyckel konfigurerad. Lägg till en i inställningarna.')
  }

  const client = createGoogleGenAIClient(googleKey)
  const systemPrompt = buildPrompt(sportType)

  const result = await generateContent(
    client,
    'gemini-2.5-flash-preview-05-20',
    [
      { text: systemPrompt },
      { text: `Coach's drill description:\n\n${prompt}` },
    ],
  )

  if (!result.text) {
    throw new Error('AI returnerade inget svar')
  }

  logger.info('Text-to-drill generation completed', {
    sportType,
    promptLength: prompt.length,
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
    logger.error('Failed to parse text-to-drill JSON', { response: result.text, error: String(err) })
    throw new Error('Kunde inte tolka AI-svaret. Försök med en tydligare beskrivning.')
  }
}
