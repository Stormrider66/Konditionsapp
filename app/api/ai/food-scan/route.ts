/**
 * Food Photo AI Scanner API
 *
 * POST /api/ai/food-scan
 *
 * Uses Gemini Flash to analyze food photos and estimate
 * calories and macronutrients (Cal AI-style).
 */

import { NextRequest, NextResponse } from 'next/server'
import { generateObject } from 'ai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { GEMINI_MODELS, GEMINI_PRICING, getGeminiThinkingOptions } from '@/lib/ai/gemini-config'
import { FoodPhotoAnalysisSchema } from '@/lib/validations/gemini-schemas'
import { rateLimitJsonResponse } from '@/lib/api/rate-limit'
import { requireFeatureAccess } from '@/lib/subscription/require-feature-access'
import { logger } from '@/lib/logger'
import { resolveAthleteGoogleKeyContext } from '@/lib/ai/resolve-athlete-google-key'
import { buildFoodMemoryContext } from '@/lib/nutrition/build-memory-context'
import { logAiUsage } from '@/lib/ai/usage-logger'
import { AI_ALLOWANCE_MINIMUM_REMAINING_SEK, requireAiAllowance } from '@/lib/ai/billing/require-ai-allowance'
import {
  calibratePortions,
  fetchPortionStats,
  recomputeTotals,
  type PortionSnap,
} from '@/lib/nutrition/portion-calibration'

export const runtime = 'nodejs'
export const maxDuration = 60
export const dynamic = 'force-dynamic'

const MEMORY_CONFIDENCE_THRESHOLD = 0.75

const WEEKDAY_LABEL_SV = [
  'söndag',
  'måndag',
  'tisdag',
  'onsdag',
  'torsdag',
  'fredag',
  'lördag',
] as const

const WEEKDAY_LABEL_EN = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const

type AppLocale = 'en' | 'sv'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

function buildPrompt({
  clientHour,
  clientDayOfWeek,
  enhancedMode,
  memoryContext,
  userContext,
  locale,
}: {
  clientHour: number | null
  clientDayOfWeek: number | null
  enhancedMode: boolean
  memoryContext: string | null
  userContext: string | null
  locale: AppLocale
}) {
  const outputLanguage = locale === 'sv' ? 'Swedish' : 'English'
  const timeLine =
    clientHour != null
      ? locale === 'sv'
        ? `KONTEXT: Användaren loggar måltiden kl ${String(clientHour).padStart(2, '0')}:00${
            clientDayOfWeek != null ? ` (${WEEKDAY_LABEL_SV[clientDayOfWeek]})` : ''
          } (lokal tid). Använd tiden som primär signal för måltidstyp: före 10 = BREAKFAST, 10-11 = MORNING_SNACK, 11-14 = LUNCH, 14-16 = AFTERNOON_SNACK, 17-20 = DINNER, efter 20 = EVENING_SNACK. Avvik endast om maten uppenbart tillhör en annan kategori (t.ex. tydlig frukostgröt kl 15 -> AFTERNOON_SNACK, inte BREAKFAST).\n\n`
        : `CONTEXT: The user is logging the meal at ${String(clientHour).padStart(2, '0')}:00${
            clientDayOfWeek != null ? ` (${WEEKDAY_LABEL_EN[clientDayOfWeek]})` : ''
          } local time. Use the time as the primary signal for meal type: before 10 = BREAKFAST, 10-11 = MORNING_SNACK, 11-14 = LUNCH, 14-16 = AFTERNOON_SNACK, 17-20 = DINNER, after 20 = EVENING_SNACK. Only deviate if the food clearly belongs to another category (for example obvious breakfast porridge at 15:00 -> AFTERNOON_SNACK, not BREAKFAST).\n\n`
      : ''

  const memoryBlock = memoryContext ? `${memoryContext}\n\n` : ''

  const userContextBlock = userContext
    ? locale === 'sv'
      ? `\nANVÄNDARENS KONTEXT (viktig information - prioritera detta över egna uppskattningar):\n${userContext}\n\nOm användaren angett en specifik vikt (t.ex. "200g kött"), använd EXAKT den vikten istället för att uppskatta.\nOm användaren angett en specifik matvara (t.ex. "älgfärs" istället för nötfärs), använd den matvarans näringsvärden.\n\n`
      : `\nUSER CONTEXT (important information - prioritize this over your own estimates):\n${userContext}\n\nIf the user gave a specific weight (for example "200g meat"), use EXACTLY that weight instead of estimating.\nIf the user specified a specific food (for example "venison mince" instead of beef mince), use that food's nutrition values.\n\n`
    : ''

  const enhancedBlock = enhancedMode
    ? locale === 'sv'
      ? `\n\nUTÖKAD ANALYS (detaljerade makrosubkategorier):\n8. Fettfördelning per matvara: mättade, enkelomättade, fleromättade fettsyror (gram)\n9. Kolhydratfördelning per matvara: socker och komplexa kolhydrater (stärkelse) i gram\n10. Proteinkvalitet: ange om matvaran är en komplett proteinkälla (alla essentiella aminosyror)\n11. Proteinkälla per matvara: proteinSource ska vara ANIMAL, PLANT, MIXED eller UNKNOWN. Animaliskt är inte alltid samma sak som komplett; soja/tofu/tempeh och quinoa kan vara kompletta växtkällor.\n12. Summera fett- och kolhydratsubkategorier i totals`
      : `\n\nENHANCED ANALYSIS (detailed macro subcategories):\n8. Fat breakdown per food item: saturated, monounsaturated, and polyunsaturated fatty acids in grams\n9. Carbohydrate breakdown per food item: sugar and complex carbohydrates (starch) in grams\n10. Protein quality: indicate whether the food is a complete protein source with all essential amino acids\n11. Protein source per food item: proteinSource must be ANIMAL, PLANT, MIXED, or UNKNOWN. Animal does not always mean complete; soy, tofu, tempeh, and quinoa can be complete plant sources.\n12. Sum fat and carbohydrate subcategories in totals`
    : ''

  if (locale === 'sv') {
  return `Du är en expert på näringslära och matidentifiering. Analysera denna bild av en måltid och uppskatta kalorier och makronäringsämnen.
Skriv alla användarsynliga namn, portionsbeskrivningar, måltidsbeskrivningar och anteckningar på ${outputLanguage}.

${timeLine}${memoryBlock}${userContextBlock}INSTRUKTIONER:
1. Identifiera varje separat matvara/ingrediens i bilden
2. Uppskatta portionsstorlek i gram och beskriv portionen på svenska (t.ex. "1 skiva", "2 dl", "1 portion")
3. Beräkna kalorier och makros (protein, kolhydrater, fett, fiber) per matvara
4. Summera totala kalorier och makros för hela måltiden
5. Ge en kort svensk beskrivning av måltiden
6. Föreslå vilken måltidstyp det troligtvis är (frukost, lunch, middag, mellanmål etc.)${clientHour != null ? ' — följ tidsregeln ovan' : ''}
7. Ange din konfidensgrad (0-1) baserat på bildens tydlighet och hur väl du kan identifiera maten

VIKTIGT:
- Om bilden inte visar mat, sätt success till false
- Var realistisk med portionsstorlekar — svenskar äter normala portioner
- Räkna med vanliga svenska livsmedel och tillagningsmetoder
- Om du ser förpackningar med näringsinformation, använd den informationen
- För kött/fisk/fågel med ben: om vikt anges eller uppskattas inklusive ben, behåll vikten i estimatedGrams men beräkna kalorier och makros på ätbar del efter ben. Skriv gärna i portionDescription, t.ex. "300 g med ben (ca 200 g ätbart)".
- Ange eventuella osäkerheter i notes-fältet${enhancedBlock}`
  }

  return `You are a nutrition and food-identification expert. Analyze this meal photo and estimate calories and macronutrients.
Write all user-facing item names, portion descriptions, meal descriptions, and notes in ${outputLanguage}. Memory context may contain Swedish food names or correction notes; use it for calibration, but keep the final user-facing output in ${outputLanguage}.

${timeLine}${memoryBlock}${userContextBlock}INSTRUCTIONS:
1. Identify each separate food item or ingredient in the image
2. Estimate portion size in grams and describe the portion in English (for example "1 slice", "2 dl", "1 serving")
3. Calculate calories and macros (protein, carbohydrates, fat, fiber) per food item
4. Sum total calories and macros for the full meal
5. Provide a brief English description of the meal
6. Suggest the most likely meal type (breakfast, lunch, dinner, snack, etc.)${clientHour != null ? ' - follow the time rule above' : ''}
7. Set confidence (0-1) based on image clarity and how well you can identify the food

IMPORTANT:
- If the image does not show food, set success to false
- Be realistic with portion sizes
- Account for common foods and preparation methods from the image and user context; preserve culturally specific foods instead of replacing them
- If you can see packaging with nutrition information, use that information
- For meat/fish/poultry with bones: if weight is provided or estimated including bones, keep that weight in estimatedGrams but calculate calories and macros from the edible portion after bones. Mention this in portionDescription, for example "300 g with bone (about 200 g edible)".
- Include any uncertainty in the notes field${enhancedBlock}`
}

function estimateFoodScanCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const pricing = GEMINI_PRICING[model]
  if (!pricing) return 0
  // GEMINI_PRICING is per 1K tokens
  return (inputTokens / 1000) * pricing.input + (outputTokens / 1000) * pricing.output
}

export async function POST(request: NextRequest) {
  let locale: AppLocale = 'en'
  try {
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { clientId, isCoachInAthleteMode, user } = resolved
    locale = user.language === 'sv' ? 'sv' : 'en'

    // Subscription gate (athlete-level, reuse nutrition_planning feature)
    const denied = await requireFeatureAccess(clientId, 'nutrition_planning')
    if (denied) return denied

    const allowanceDenied = await requireAiAllowance(clientId, {
      minimumRemainingSek: AI_ALLOWANCE_MINIMUM_REMAINING_SEK.foodScan,
    })
    if (allowanceDenied) return allowanceDenied

    // Rate limit: 10 requests per 60 seconds
    const rateLimited = await rateLimitJsonResponse('ai:food-scan', user.id, {
      limit: 10,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    // Parse FormData
    const formData = await request.formData()
    const imageFile = formData.get('image') as File | null
    const clientHourRaw = formData.get('clientHour')
    const parsedHour = clientHourRaw != null ? parseInt(String(clientHourRaw), 10) : NaN
    const clientHour = Number.isFinite(parsedHour) && parsedHour >= 0 && parsedHour <= 23
      ? parsedHour
      : null

    const clientDayRaw = formData.get('clientDayOfWeek')
    const parsedDay = clientDayRaw != null ? parseInt(String(clientDayRaw), 10) : NaN
    const clientDayOfWeek = Number.isFinite(parsedDay) && parsedDay >= 0 && parsedDay <= 6
      ? parsedDay
      : null

    const userContext = (formData.get('context') as string | null)?.trim() || null

    if (!imageFile) {
      return NextResponse.json(
        { error: t(locale, 'No image uploaded', 'Ingen bild uppladdad') },
        { status: 400 }
      )
    }

    // Validate file type (normalize non-standard MIME types from some Android devices)
    const normalizedType = imageFile.type === 'image/jpg' ? 'image/jpeg' : imageFile.type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
    if (!validTypes.includes(normalizedType)) {
      return NextResponse.json(
        {
          error: t(
            locale,
            `Invalid image format (${imageFile.type || 'unknown'}). Use JPEG, PNG, or WebP.`,
            `Ogiltigt bildformat (${imageFile.type || 'okänt'}). Använd JPEG, PNG eller WebP.`
          ),
        },
        { status: 400 }
      )
    }

    if (normalizedType === 'image/heic' || normalizedType === 'image/heif') {
      return NextResponse.json(
        {
          error: t(
            locale,
            'The image is in HEIC/HEIF format and could not be converted in the browser. Retake the photo or choose JPEG/PNG/WebP.',
            'Bilden är i HEIC/HEIF-format och kunde inte konverteras i webbläsaren. Ta om bilden eller välj JPEG/PNG/WebP.'
          ),
        },
        { status: 400 }
      )
    }

    // Validate file size (max 10MB)
    if (imageFile.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: t(locale, 'The image cannot be larger than 10MB.', 'Bilden får inte vara större än 10MB.') },
        { status: 400 }
      )
    }

    // Resolve Google API key:
    // For athletes → use coach's key via client.userId
    // For coach-in-athlete-mode → use own key
    const keyContext = await resolveAthleteGoogleKeyContext({
      clientId,
      isCoachInAthleteMode,
      userId: user.id,
    })

    if (!keyContext) {
      return NextResponse.json(
        { error: 'Athlete account not found' },
        { status: 400 }
      )
    }

    // Food photo analysis is vision-based and must run on Gemini/Google.
    const googleKey = keyContext.googleKey

    if (!googleKey) {
      return NextResponse.json(
        {
          error: t(
            locale,
            'Google/Gemini API key is missing for image analysis. Enable Gemini in AI settings.',
            'Google/Gemini API-nyckel saknas för bildanalys. Aktivera Gemini i AI-inställningar.'
          ),
        },
        { status: 400 }
      )
    }

    // Load dietary preferences (memory + enhanced-mode toggles)
    const prefs = await prisma.dietaryPreferences.findUnique({
      where: { clientId },
      select: { enhancedMacroAnalysis: true, memoryEnabled: true },
    })
    const enhancedMode = prefs?.enhancedMacroAnalysis ?? false
    const memoryEnabled = prefs?.memoryEnabled ?? true

    // Convert file to base64
    const arrayBuffer = await imageFile.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')

    // Use normalized MIME type for the data URL sent to Gemini. HEIC/HEIF
    // should have been converted client-side; if not, we fail above instead
    // of labelling HEIC bytes as JPEG and causing a generic model error.
    const mimeForGemini = normalizedType

    const google = createGoogleGenerativeAI({ apiKey: googleKey })
    const modelName = GEMINI_MODELS.FLASH

    // First pass — stateless, no memory context
    const firstPrompt = buildPrompt({
      clientHour,
      clientDayOfWeek,
      enhancedMode,
      memoryContext: null,
      userContext,
      locale,
    })

    const firstPass = await generateObject({
      model: google(modelName),
      schema: FoodPhotoAnalysisSchema,
      providerOptions: getGeminiThinkingOptions('quick'),
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', image: `data:${mimeForGemini};base64,${base64}` },
            { type: 'text', text: firstPrompt },
          ],
        },
      ],
    })

    let finalResult = firstPass.object
    let passes: 1 | 2 = 1
    let memoryUsed = false
    let memoryMealsConsidered = 0
    let memoryCorrectionsConsidered = 0
    let memoryCorrectionHintsIncluded = false

    let inputTokens = firstPass.usage?.inputTokens ?? 0
    let outputTokens =
      (firstPass.usage?.outputTokens ?? 0) +
      (firstPass.usage?.reasoningTokens ?? 0)

    // Second pass — only when first-pass confidence is low and memory is on
    const shouldRetryWithMemory =
      memoryEnabled &&
      finalResult.success &&
      typeof finalResult.confidence === 'number' &&
      finalResult.confidence < MEMORY_CONFIDENCE_THRESHOLD

    if (shouldRetryWithMemory) {
      const memory = await buildFoodMemoryContext({ clientId })
      memoryMealsConsidered = memory.stats.mealsConsidered
      memoryCorrectionsConsidered = memory.stats.correctionsConsidered
      memoryCorrectionHintsIncluded = memory.stats.correctionHintsIncluded

      if (memory.text) {
        const secondPrompt = buildPrompt({
          clientHour,
          clientDayOfWeek,
          enhancedMode,
          memoryContext: memory.text,
          userContext,
          locale,
        })

        // Isolated try/catch: a pass-2 failure (Gemini 5xx, rate limit, schema
        // validation, network flake) must not discard the pass-1 result we
        // already have. We degrade silently to pass 1.
        try {
          const secondPass = await generateObject({
            model: google(modelName),
            schema: FoodPhotoAnalysisSchema,
            providerOptions: getGeminiThinkingOptions('quick'),
            messages: [
              {
                role: 'user',
                content: [
                  { type: 'image', image: `data:${mimeForGemini};base64,${base64}` },
                  { type: 'text', text: secondPrompt },
                ],
              },
            ],
          })

          // Keep the second pass only if it returns a successful analysis. Otherwise
          // fall back to pass 1 so we never regress on a confident-enough result.
          if (secondPass.object.success) {
            finalResult = secondPass.object
            passes = 2
            memoryUsed = true
          }

          inputTokens += secondPass.usage?.inputTokens ?? 0
          outputTokens +=
            (secondPass.usage?.outputTokens ?? 0) +
            (secondPass.usage?.reasoningTokens ?? 0)
        } catch (err) {
          logger.warn('Food scan pass 2 failed; falling back to pass 1', {
            error: err instanceof Error ? err.message : String(err),
          })
        }
      }
    }

    // Portion calibration — snap Gemini's gram estimates toward the user's
    // typical portion when the user has ≥3 historical logs for an item and
    // Gemini is outside the ±40% trust band. Runs regardless of which pass
    // produced the result; gated only on memoryEnabled.
    let portionSnaps: PortionSnap[] = []
    if (memoryEnabled && finalResult.success && finalResult.items.length > 0) {
      const normalizedNames = finalResult.items.map((i) => i.name.toLowerCase().trim())
      const stats = await fetchPortionStats(clientId, normalizedNames)
      if (stats.size > 0) {
        const { items: calibratedItems, snaps } = calibratePortions(finalResult.items, stats)
        if (snaps.length > 0) {
          finalResult = {
            ...finalResult,
            items: calibratedItems,
            totals: { ...finalResult.totals, ...recomputeTotals(calibratedItems) },
          }
          portionSnaps = snaps
        }
      }
    }

    // Log cost (fire-and-forget; do not block the response on logging failure)
    const estimatedCost = estimateFoodScanCost(modelName, inputTokens, outputTokens)
    logAiUsage({
      userId: user.id,
      clientId,
      category: memoryUsed ? 'food_scan_memory' : 'food_scan',
      provider: 'GOOGLE',
      model: modelName,
      inputTokens,
      outputTokens,
      estimatedCost,
    })

    if (process.env.NODE_ENV !== 'production') {
      logger.debug('Food scan result', {
        success: finalResult.success,
        itemCount: finalResult.items.length,
        confidence: finalResult.confidence,
        passes,
        memoryUsed,
        memoryMealsConsidered,
        memoryCorrectionsConsidered,
        memoryCorrectionHintsIncluded,
        portionSnapCount: portionSnaps.length,
      })
    }

    return NextResponse.json({
      success: true,
      result: finalResult,
      enhancedMode,
      memoryUsed,
      passes,
      memoryMealsConsidered,
      memoryCorrectionsConsidered,
      memoryCorrectionHintsIncluded,
      portionSnaps,
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('Food scan error', {}, error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json(
      {
        error: t(locale, 'Could not analyze the image', 'Kunde inte analysera bilden'),
        details:
          process.env.NODE_ENV === 'production'
            ? undefined
            : (error instanceof Error ? error.message : 'Unknown error'),
      },
      { status: 500 }
    )
  }
}
