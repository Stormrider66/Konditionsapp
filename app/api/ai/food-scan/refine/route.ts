/**
 * Food Scan Refinement API
 *
 * POST /api/ai/food-scan/refine
 *
 * Takes an original food analysis and user correction text,
 * returns an updated analysis via Gemini Flash.
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
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'
import {
  applySimpleFoodIdentityCorrection,
  getFoodCorrectionSearchTerm,
  parseSimpleFoodIdentityCorrection,
  type FoodReferenceMatch,
  type SimpleFoodIdentityCorrection,
} from '@/lib/nutrition/food-scan-fast-refine'

export const runtime = 'nodejs'
export const maxDuration = 120
export const dynamic = 'force-dynamic'

const REFINE_TIMEOUT_MS = 35_000
const REFINE_MAX_OUTPUT_TOKENS = 4_096
const REFINE_RETRY_DELAYS_MS = [600, 1_500]

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

function buildRefinementPrompt({
  originalAnalysis,
  refinementText,
  enhancedMode,
  locale,
}: {
  originalAnalysis: unknown
  refinementText: string
  enhancedMode: boolean
  locale: AppLocale
}): string {
  if (locale === 'sv') {
    return `Du är en expert på näringslära. Här är en tidigare analys av en måltid:

${JSON.stringify(originalAnalysis, null, 2)}

Användaren säger: "${refinementText}"

Uppdatera analysen baserat på användarens korrigering. Behåll all befintlig information men justera det som användaren påpekar. Om användaren nämner nya livsmedel, lägg till dem. Om användaren korrigerar portionsstorlekar eller mängder, uppdatera kalorier och makros därefter. Om användaren säger att en matvara egentligen är något annat, byt ut den och räkna om näringsvärden.

VIKTIGT OM RECEPT OCH DRYCKER: Om en befintlig rad är ett helt recept/en hel sats (t.ex. "1 hel sats (ca 8 dl)") och användaren skriver att hen drack/åt en mindre mängd (t.ex. "jag drack 2 dl"), ska du skala raden proportionellt. Exempel: 2 dl av en sats på 8 dl = 25% av kalorier och makron, inte hela satsen.

VIKTIGT OM KÖTT/FISK/FÅGEL MED BEN: Om användaren anger vikt med ben eller matvaran är t.ex. kycklingklubbor, kycklingvingar, revben, kotlett med ben eller hel fisk, behåll vikten inklusive ben i estimatedGrams men beräkna kalorier och makros på ätbar del efter ben. Skriv gärna i portionDescription, t.ex. "300 g med ben (ca 200 g ätbart)".

VIKTIGT: Sätt alltid success till true - maten har redan identifierats och vi uppdaterar bara analysen.

Returnera en komplett uppdaterad analys med alla matvaror - inte bara de ändrade. Skriv alla användarsynliga namn, portionsbeskrivningar, måltidsbeskrivningar och anteckningar på svenska.${enhancedMode ? `

UTÖKAD ANALYS: Inkludera även fettfördelning (mättat, enkelomättat, fleromättat), kolhydratfördelning (socker, komplexa kolhydrater), proteinkvalitet (isCompleteProtein) och proteinkälla (proteinSource: ANIMAL, PLANT, MIXED eller UNKNOWN) per matvara och i totals.` : ''}`
  }

  return `You are a nutrition expert. Here is a previous meal analysis:

${JSON.stringify(originalAnalysis, null, 2)}

The user says: "${refinementText}"

Update the analysis based on the user's correction. Keep all existing information, but adjust what the user points out. If the user mentions new foods, add them. If the user corrects portion sizes or quantities, update calories and macros accordingly. If the user says a food item is actually something else, replace it and recalculate nutrition values.

IMPORTANT FOR RECIPES AND DRINKS: If an existing row represents a whole recipe/batch (for example "1 whole batch (about 8 dl)") and the user says they drank/ate a smaller amount (for example "I drank 2 dl"), scale the row proportionally. Example: 2 dl from an 8 dl batch = 25% of calories and macros, not the whole batch.

IMPORTANT FOR MEAT/FISH/POULTRY WITH BONES: If the user gives weight with bones, or the food is chicken drumsticks, chicken wings, ribs, bone-in chop, or whole fish, keep the bone-in weight in estimatedGrams but calculate calories and macros from the edible portion after bones. Mention this in portionDescription, for example "300 g with bone (about 200 g edible)".

IMPORTANT: Always set success to true - the food has already been identified and we are only updating the analysis.

Return a complete updated analysis with all food items, not only the changed ones. Write all user-facing names, portion descriptions, meal descriptions, and notes in English.${enhancedMode ? `

ENHANCED ANALYSIS: Also include fat breakdown (saturated, monounsaturated, polyunsaturated), carbohydrate breakdown (sugar, complex carbohydrates), protein quality (isCompleteProtein), and protein source (proteinSource: ANIMAL, PLANT, MIXED, or UNKNOWN) per food item and in totals.` : ''}`
}

function createTimeoutSignal(timeoutMs: number): AbortSignal {
  const timeout = (AbortSignal as typeof AbortSignal & {
    timeout?: (ms: number) => AbortSignal
  }).timeout

  if (timeout) return timeout(timeoutMs)

  const controller = new AbortController()
  setTimeout(() => controller.abort(), timeoutMs)
  return controller.signal
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function getErrorText(error: unknown): string {
  if (error instanceof Error) {
    const cause = error.cause instanceof Error ? ` ${error.cause.message}` : ''
    return `${error.name} ${error.message}${cause}`.toLowerCase()
  }

  if (typeof error === 'object' && error !== null) {
    const maybeStatus = 'status' in error ? String(error.status) : ''
    const maybeStatusCode = 'statusCode' in error ? String(error.statusCode) : ''
    const maybeCode = 'code' in error ? String(error.code) : ''
    return `${maybeStatus} ${maybeStatusCode} ${maybeCode}`.toLowerCase()
  }

  return String(error ?? '').toLowerCase()
}

function isAbortError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    error.name === 'AbortError'
  )
}

function isTransientAiError(error: unknown): boolean {
  if (isAbortError(error)) return false

  const text = getErrorText(error)
  return (
    text.includes('429') ||
    text.includes('503') ||
    text.includes('504') ||
    text.includes('rate') ||
    text.includes('resource_exhausted') ||
    text.includes('overloaded') ||
    text.includes('service unavailable') ||
    text.includes('temporarily unavailable') ||
    text.includes('try again') ||
    text.includes('unavailable')
  )
}

const FOOD_REFERENCE_SELECT = {
  nameSv: true,
  nameEn: true,
  category: true,
  caloriesPer100g: true,
  proteinPer100g: true,
  carbsPer100g: true,
  fatPer100g: true,
  fiberPer100g: true,
  saturatedFatPer100g: true,
  monounsaturatedFatPer100g: true,
  polyunsaturatedFatPer100g: true,
  sugarPer100g: true,
  isCompleteProtein: true,
  proteinSource: true,
} as const

async function findFoodReferenceMatch(
  correction: SimpleFoodIdentityCorrection
): Promise<FoodReferenceMatch | null> {
  const q = getFoodCorrectionSearchTerm(correction)
  if (q.length < 2) return null

  const exact = await prisma.food.findFirst({
    where: { searchName: q },
    select: FOOD_REFERENCE_SELECT,
  })
  if (exact) return exact

  const prefix = await prisma.food.findFirst({
    where: { searchName: { startsWith: q } },
    orderBy: [{ popularity: 'desc' }, { searchName: 'asc' }],
    select: FOOD_REFERENCE_SELECT,
  })
  if (prefix) return prefix

  if (q.includes('pasta') && (q.includes('majs') || q.includes('corn'))) {
    const matches = await prisma.food.findMany({
      where: {
        AND: [
          { searchName: { contains: 'pasta' } },
          { searchName: { contains: 'majs' } },
        ],
      },
      orderBy: [{ popularity: 'desc' }, { searchName: 'asc' }],
      take: 20,
      select: FOOD_REFERENCE_SELECT,
    })
    const cooked = matches.find((food) => food.nameSv.toLowerCase().includes('kokt'))
    if (cooked) return cooked
    if (matches[0]) return matches[0]
  }

  // Auto-applying a broad substring match can pick the wrong Livsmedelsverket
  // row for short foods like "majs" or "pasta", so only use it for specific
  // multi-syllable corrections where exact/prefix did not hit.
  if (q.length < 8) return null

  return prisma.food.findFirst({
    where: { searchName: { contains: q } },
    orderBy: [{ popularity: 'desc' }, { searchName: 'asc' }],
    select: FOOD_REFERENCE_SELECT,
  })
}

export async function POST(request: NextRequest) {
  let locale: AppLocale = resolveRequestLocale(request)
  let logContext:
    | {
        clientId: string
        isCoachInAthleteMode: boolean
        route: 'food-scan-refine'
        userId: string
      }
    | undefined

  try {
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    const { clientId, isCoachInAthleteMode, user } = resolved
    locale = resolveRequestLocale(request, user.language)
    logContext = {
      clientId,
      isCoachInAthleteMode,
      route: 'food-scan-refine',
      userId: user.id,
    }
    const requestLogger = logger.child(logContext)

    const denied = await requireFeatureAccess(clientId, 'nutrition_planning')
    if (denied) return denied

    const rateLimited = await rateLimitJsonResponse('ai:food-scan-refine', user.id, {
      limit: 10,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    const body = await request.json()
    const { originalAnalysis, refinementText, imageBase64, imageMimeType } = body

    if (!originalAnalysis || !refinementText) {
      return NextResponse.json(
        {
          error: t(
            locale,
            'originalAnalysis and refinementText are required',
            'originalAnalysis och refinementText krävs'
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

    const simpleCorrection = parseSimpleFoodIdentityCorrection(String(refinementText))
    const foodMatch = simpleCorrection
      ? await findFoodReferenceMatch(simpleCorrection)
      : null
    const fastRefine = simpleCorrection
      ? applySimpleFoodIdentityCorrection({
          originalAnalysis,
          correction: simpleCorrection,
          foodMatch,
          locale,
        })
      : null

    if (fastRefine) {
      requestLogger.info('Food scan refine fast path applied', {
        source: fastRefine.source,
        targetIndex: fastRefine.targetIndex,
      })

      return NextResponse.json({
        success: true,
        result: fastRefine.result,
        enhancedMode,
        fastRefine: {
          source: fastRefine.source,
          targetIndex: fastRefine.targetIndex,
        },
        generatedAt: new Date().toISOString(),
      })
    }

    const allowanceDenied = await requireAiAllowance(clientId)
    if (allowanceDenied) return allowanceDenied

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

    // Refinement can include image context and should stay on Gemini.
    const googleKey = keyContext.googleKey

    if (!googleKey) {
      requestLogger.warn('Food scan refine missing Google key', {
        businessId: keyContext.businessId,
        keyOwnerId: keyContext.keyOwnerId,
      })
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

    const google = createGoogleGenerativeAI({ apiKey: googleKey })

    // Build message content
    const content: Array<{ type: 'text'; text: string } | { type: 'image'; image: string }> = []
    const normalizedImageMimeType =
      imageMimeType === 'image/jpg' ? 'image/jpeg' : imageMimeType
    const mimeForGemini =
      normalizedImageMimeType === 'image/heic' || normalizedImageMimeType === 'image/heif'
        ? 'image/jpeg'
        : normalizedImageMimeType

    if (imageBase64 && mimeForGemini) {
      content.push({
        type: 'image',
        image: `data:${mimeForGemini};base64,${imageBase64}`,
      })
    }

    content.push({
      type: 'text',
      text: buildRefinementPrompt({
        originalAnalysis,
        refinementText,
        enhancedMode,
        locale,
      }),
    })

    requestLogger.info('Food scan refine started', {
      businessId: keyContext.businessId,
      hadImageContext: Boolean(imageBase64 && mimeForGemini),
      itemCount: Array.isArray(originalAnalysis?.items) ? originalAnalysis.items.length : null,
      keyOwnerId: keyContext.keyOwnerId,
      refinementTextLength: String(refinementText).length,
    })

    let result: Awaited<ReturnType<typeof generateObject<typeof FoodPhotoAnalysisSchema>>> | null = null
    for (let attempt = 0; attempt <= REFINE_RETRY_DELAYS_MS.length; attempt += 1) {
      try {
        result = await withAiContext(
          { userId: user.id, clientId, category: 'food_scan_refine' },
          () =>
            generateObject({
              model: withGoogleLogging(google(GEMINI_MODELS.FLASH)),
              schema: FoodPhotoAnalysisSchema,
              messages: [{ role: 'user', content }],
              providerOptions: getGeminiThinkingOptions('quick'),
              temperature: 0.1,
              maxOutputTokens: REFINE_MAX_OUTPUT_TOKENS,
              abortSignal: createTimeoutSignal(REFINE_TIMEOUT_MS),
            }),
        )
        break
      } catch (error) {
        const shouldRetry = attempt < REFINE_RETRY_DELAYS_MS.length && isTransientAiError(error)
        requestLogger.warn('Food scan refine AI call failed', {
          attempt: attempt + 1,
          businessId: keyContext.businessId,
          keyOwnerId: keyContext.keyOwnerId,
          retrying: shouldRetry,
          transient: isTransientAiError(error),
        })

        if (!shouldRetry) throw error
        await sleep(REFINE_RETRY_DELAYS_MS[attempt])
      }
    }

    if (!result) {
      throw new Error('Food scan refinement did not return a result')
    }

    if (!result.object.success) {
      requestLogger.warn('Food scan refine returned unsuccessful analysis', {
        businessId: keyContext.businessId,
        confidence: result.object.confidence,
        hadImageContext: Boolean(imageBase64 && mimeForGemini),
        itemCount: result.object.items.length,
        keyOwnerId: keyContext.keyOwnerId,
      })
    }

    return NextResponse.json({
      success: true,
      result: result.object,
      enhancedMode,
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    logger.error(
      'Food scan refine error',
      logContext,
      error
    )

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }

    // Surface a more helpful message when possible
    const errMsg = getErrorText(error)
    let userMessage = t(locale, 'Could not update the analysis', 'Kunde inte uppdatera analysen')
    if (
      isAbortError(error) ||
      errMsg.includes('abort') ||
      errMsg.includes('timed out') ||
      errMsg.includes('timeout')
    ) {
      userMessage = t(
        locale,
        'The update took too long. Try again or describe the change more briefly.',
        'Uppdateringen tog för lång tid. Försök igen eller beskriv ändringen kortare.'
      )
    } else if (errMsg.includes('quota')) {
      userMessage = t(
        locale,
        'The Gemini AI quota seems temporarily exhausted. Try again in a moment.',
        'AI-kvoten hos Gemini verkar vara tillfälligt slut. Försök igen om en stund.'
      )
    } else if (
      errMsg.includes('429') ||
      errMsg.includes('rate') ||
      errMsg.includes('overloaded') ||
      errMsg.includes('503') ||
      errMsg.includes('unavailable')
    ) {
      userMessage = t(
        locale,
        'The AI service is temporarily overloaded. Try again in a moment.',
        'AI-tjänsten är tillfälligt överbelastad. Försök igen om en stund.'
      )
    } else if (errMsg.includes('body') || errMsg.includes('too large') || errMsg.includes('entity_too_large')) {
      userMessage = t(
        locale,
        'The image is too large. Try without the image or take a new photo.',
        'Bilden är för stor. Försök utan bild eller ta en ny bild.'
      )
    }

    return NextResponse.json(
      {
        error: userMessage,
        details:
          process.env.NODE_ENV === 'production'
            ? undefined
            : (error instanceof Error ? error.message : 'Unknown error'),
      },
      { status: 500 }
    )
  }
}
