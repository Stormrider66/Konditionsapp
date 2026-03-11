/**
 * Text-Based Food Analysis API
 *
 * POST /api/ai/food-scan/analyze-text
 *
 * Uses Gemini Flash to estimate calories and macronutrients
 * from a text description of a meal (no image required).
 * Supports enhanced macro subcategories when enabled.
 */

import { NextRequest, NextResponse } from 'next/server'
import { generateObject } from 'ai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { GEMINI_MODELS } from '@/lib/ai/gemini-config'
import { FoodPhotoAnalysisSchema } from '@/lib/validations/gemini-schemas'
import { rateLimitJsonResponse } from '@/lib/api/rate-limit'
import { requireFeatureAccess } from '@/lib/subscription/require-feature-access'
import { logger } from '@/lib/logger'
import { getResolvedGoogleKey } from '@/lib/user-api-keys'
import { z } from 'zod'

const requestSchema = z.object({
  description: z.string().min(1, 'Beskrivning krävs'),
})

export async function POST(request: NextRequest) {
  try {
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { clientId, isCoachInAthleteMode, user } = resolved

    const denied = await requireFeatureAccess(clientId, 'nutrition_planning')
    if (denied) return denied

    const rateLimited = await rateLimitJsonResponse('ai:food-scan-text', user.id, {
      limit: 10,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    const body = await request.json()
    const validation = requestSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Ogiltig förfrågan', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { description } = validation.data

    // Resolve Google API key
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { userId: true },
    })

    if (!client) {
      return NextResponse.json(
        { error: 'Athlete account not found' },
        { status: 400 }
      )
    }

    const keyOwnerId = isCoachInAthleteMode ? user.id : client.userId
    const googleKey = await getResolvedGoogleKey(keyOwnerId)

    if (!googleKey) {
      return NextResponse.json(
        { error: 'Google/Gemini API-nyckel saknas. Aktivera Gemini i AI-inställningar.' },
        { status: 400 }
      )
    }

    // Check enhanced macro analysis preference
    const prefs = await prisma.dietaryPreferences.findUnique({
      where: { clientId },
      select: { enhancedMacroAnalysis: true },
    })
    const enhancedMode = prefs?.enhancedMacroAnalysis ?? false

    const google = createGoogleGenerativeAI({ apiKey: googleKey })

    const result = await generateObject({
      model: google(GEMINI_MODELS.FLASH),
      schema: FoodPhotoAnalysisSchema,
      messages: [
        {
          role: 'user',
          content: `Du är en expert på näringslära. Uppskatta kalorier och makronäringsämnen baserat på denna måltidsbeskrivning:

"${description}"

INSTRUKTIONER:
1. Identifiera varje separat matvara/ingrediens i beskrivningen
2. Uppskatta portionsstorlek i gram och beskriv portionen på svenska (t.ex. "1 skiva", "2 dl", "1 portion")
3. Beräkna kalorier och makros (protein, kolhydrater, fett, fiber) per matvara
4. Summera totala kalorier och makros för hela måltiden
5. Ge en kort svensk beskrivning av måltiden
6. Föreslå vilken måltidstyp det troligtvis är
7. Sätt confidence baserat på hur detaljerad beskrivningen är

VIKTIGT:
- Sätt alltid success till true om det finns mat att analysera
- Var realistisk med portionsstorlekar — svenskar äter normala portioner
- Räkna med vanliga svenska livsmedel och tillagningsmetoder
- Om beskrivningen är vag, använd rimliga standardportioner${enhancedMode ? `

UTÖKAD ANALYS (detaljerade makrosubkategorier):
8. Fettfördelning per matvara: mättade, enkelomättade, fleromättade fettsyror (gram)
9. Kolhydratfördelning per matvara: socker och komplexa kolhydrater (stärkelse) i gram
10. Proteinkvalitet: ange om matvaran är en komplett proteinkälla (alla essentiella aminosyror)
11. Summera fett- och kolhydratsubkategorier i totals` : ''}`,
        },
      ],
    })

    return NextResponse.json({
      success: true,
      result: result.object,
      enhancedMode,
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('Food scan text analysis error', {}, error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json(
      {
        error: 'Kunde inte analysera måltiden',
        details:
          process.env.NODE_ENV === 'production'
            ? undefined
            : (error instanceof Error ? error.message : 'Unknown error'),
      },
      { status: 500 }
    )
  }
}
