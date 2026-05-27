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
import { GEMINI_MODELS, getGeminiThinkingOptions } from '@/lib/ai/gemini-config'
import { FoodPhotoAnalysisSchema } from '@/lib/validations/gemini-schemas'
import { rateLimitJsonResponse } from '@/lib/api/rate-limit'
import { requireFeatureAccess } from '@/lib/subscription/require-feature-access'
import { logger } from '@/lib/logger'
import { resolveAthleteGoogleKeyContext } from '@/lib/ai/resolve-athlete-google-key'
import { withGoogleLogging } from '@/lib/ai/google'
import { withAiContext } from '@/lib/ai/usage-logger'
import { requireAiAllowance } from '@/lib/ai/billing/require-ai-allowance'
import { z } from 'zod'

export const maxDuration = 120

const requestSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  clientHour: z.number().int().min(0).max(23).optional(),
})

type AppLocale = 'en' | 'sv'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

function buildFoodTextAnalysisPrompt({
  description,
  clientHour,
  enhancedMode,
  locale,
}: {
  description: string
  clientHour?: number
  enhancedMode: boolean
  locale: AppLocale
}): string {
  const outputLanguage = locale === 'sv' ? 'Swedish' : 'English'
  const timeContext = clientHour != null
    ? locale === 'sv'
      ? `KONTEXT: Användaren loggar måltiden kl ${String(clientHour).padStart(2, '0')}:00 (lokal tid). Använd tiden som primär signal för måltidstyp: före 10 = BREAKFAST, 10-11 = MORNING_SNACK, 11-14 = LUNCH, 14-16 = AFTERNOON_SNACK, 17-20 = DINNER, efter 20 = EVENING_SNACK. Avvik endast om beskrivningen uppenbart tillhör en annan kategori.\n\n`
      : `CONTEXT: The user is logging the meal at ${String(clientHour).padStart(2, '0')}:00 local time. Use the time as the primary signal for meal type: before 10 = BREAKFAST, 10-11 = MORNING_SNACK, 11-14 = LUNCH, 14-16 = AFTERNOON_SNACK, 17-20 = DINNER, after 20 = EVENING_SNACK. Only deviate if the description clearly belongs to another category.\n\n`
    : ''

  if (locale === 'sv') {
    return `Du är en expert på näringslära. Uppskatta kalorier och makronäringsämnen baserat på denna måltidsbeskrivning. Skriv alla användarsynliga namn, portionsbeskrivningar, måltidsbeskrivningar och anteckningar på ${outputLanguage}.

"${description}"

${timeContext}INSTRUKTIONER:
1. Identifiera varje separat matvara/ingrediens i beskrivningen
2. Uppskatta portionsstorlek i gram och beskriv portionen på svenska (t.ex. "1 skiva", "2 dl", "1 portion")
3. Beräkna kalorier och makros (protein, kolhydrater, fett, fiber) per matvara
4. Summera totala kalorier och makros för hela måltiden
5. Ge en kort svensk beskrivning av måltiden
6. Föreslå vilken måltidstyp det troligtvis är${clientHour != null ? ' - följ tidsregeln ovan' : ''}
7. Sätt confidence baserat på hur detaljerad beskrivningen är

VIKTIGT:
- Sätt alltid success till true om det finns mat att analysera
- Var realistisk med portionsstorlekar
- Räkna med vanliga svenska livsmedel och tillagningsmetoder när beskrivningen är svensk eller svensk kontext är tydlig
- Om beskrivningen är vag, använd rimliga standardportioner${enhancedMode ? `

UTÖKAD ANALYS (detaljerade makrosubkategorier):
8. Fettfördelning per matvara: mättade, enkelomättade, fleromättade fettsyror (gram)
9. Kolhydratfördelning per matvara: socker och komplexa kolhydrater (stärkelse) i gram
10. Proteinkvalitet: ange om matvaran är en komplett proteinkälla (alla essentiella aminosyror)
11. Proteinkälla per matvara: proteinSource ska vara ANIMAL, PLANT, MIXED eller UNKNOWN. Animaliskt är inte alltid samma sak som komplett; soja/tofu/tempeh och quinoa kan vara kompletta växtkällor.
12. Summera fett- och kolhydratsubkategorier i totals` : ''}`
  }

  return `You are a nutrition expert. Estimate calories and macronutrients based on this meal description. Write all user-facing item names, portion descriptions, meal descriptions, and notes in ${outputLanguage}.

"${description}"

${timeContext}INSTRUCTIONS:
1. Identify every separate food item or ingredient in the description
2. Estimate portion size in grams and describe the portion in English (for example "1 slice", "2 dl", "1 serving")
3. Calculate calories and macros (protein, carbohydrates, fat, fiber) per food item
4. Sum total calories and macros for the full meal
5. Provide a brief English meal description
6. Suggest the most likely meal type${clientHour != null ? ' - follow the time rule above' : ''}
7. Set confidence based on how detailed the description is

IMPORTANT:
- Always set success to true if there is food to analyze
- Be realistic with portion sizes
- Account for common foods and preparation methods from the user's description; preserve culturally specific foods instead of translating them into different foods
- If the description is vague, use reasonable standard portions${enhancedMode ? `

ENHANCED ANALYSIS (detailed macro subcategories):
8. Fat breakdown per food item: saturated, monounsaturated, and polyunsaturated fatty acids in grams
9. Carbohydrate breakdown per food item: sugar and complex carbohydrates (starch) in grams
10. Protein quality: indicate whether the food is a complete protein source with all essential amino acids
11. Protein source per food item: proteinSource must be ANIMAL, PLANT, MIXED, or UNKNOWN. Animal does not always mean complete; soy, tofu, tempeh, and quinoa can be complete plant sources.
12. Sum fat and carbohydrate subcategories in totals` : ''}`
}

export async function POST(request: NextRequest) {
  let locale: AppLocale = 'en'
  try {
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    const { clientId, isCoachInAthleteMode, user } = resolved
    locale = user.language === 'sv' ? 'sv' : 'en'

    const denied = await requireFeatureAccess(clientId, 'nutrition_planning')
    if (denied) return denied

    const allowanceDenied = await requireAiAllowance(clientId)
    if (allowanceDenied) return allowanceDenied

    const rateLimited = await rateLimitJsonResponse('ai:food-scan-text', user.id, {
      limit: 10,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    const body = await request.json()
    const validation = requestSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: t(locale, 'Invalid request', 'Ogiltig förfrågan'), details: validation.error.errors },
        { status: 400 }
      )
    }

    const { description, clientHour } = validation.data

    // Resolve Google API key
    const keyContext = await resolveAthleteGoogleKeyContext({
      clientId,
      isCoachInAthleteMode,
      userId: user.id,
    })

    if (!keyContext) {
      return NextResponse.json(
        { error: t(locale, 'Athlete account not found', 'Atletkontot hittades inte') },
        { status: 400 }
      )
    }

    const googleKey = keyContext.googleKey

    if (!googleKey) {
      return NextResponse.json(
        {
          error: t(
            locale,
            'Google/Gemini API key is missing. Enable Gemini in AI settings.',
            'Google/Gemini API-nyckel saknas. Aktivera Gemini i AI-inställningar.'
          ),
        },
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

    const result = await withAiContext(
      { userId: user.id, clientId, category: 'food_scan_text' },
      () =>
        generateObject({
          model: withGoogleLogging(google(GEMINI_MODELS.FLASH)),
          schema: FoodPhotoAnalysisSchema,
          providerOptions: getGeminiThinkingOptions('quick'),
          messages: [
            {
              role: 'user',
              content: buildFoodTextAnalysisPrompt({
                description,
                clientHour,
                enhancedMode,
                locale,
              }),
            },
          ],
        }),
    )

    return NextResponse.json({
      success: true,
      result: result.object,
      enhancedMode,
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('Food scan text analysis error', {}, error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }

    return NextResponse.json(
      {
        error: t(locale, 'Could not analyze the meal', 'Kunde inte analysera måltiden'),
        details:
          process.env.NODE_ENV === 'production'
            ? undefined
            : (error instanceof Error ? error.message : 'Unknown error'),
      },
      { status: 500 }
    )
  }
}
