/**
 * Recipe Photo Extraction API
 *
 * POST /api/ai/food-scan/recipe
 * FormData: { image: File }
 *
 * Different from /api/ai/food-scan, which analyses a plate of cooked food.
 * This endpoint reads a recipe — recipe card, ingredient label on a package,
 * a handwritten list, or any photo where an ingredient list is visible —
 * and returns the structured ingredient list with estimated grams.
 *
 * Each extracted ingredient is matched against the Livsmedelsverket Food
 * table server-side (ILIKE prefix-then-substring) so the client receives
 * rows that are immediately usable in the ingredient builder, with foodId
 * and per-100g macros already wired when a confident match is found.
 */

import { NextRequest, NextResponse } from 'next/server'
import { generateObject } from 'ai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { GEMINI_MODELS, getGeminiThinkingOptions } from '@/lib/ai/gemini-config'
import { rateLimitJsonResponse } from '@/lib/api/rate-limit'
import { requireFeatureAccess } from '@/lib/subscription/require-feature-access'
import { logger } from '@/lib/logger'
import { resolveAthleteGoogleKeyContext } from '@/lib/ai/resolve-athlete-google-key'
import { withGoogleLogging } from '@/lib/ai/google'
import { withAiContext } from '@/lib/ai/usage-logger'
import { requireAiAllowance } from '@/lib/ai/billing/require-ai-allowance'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const runtime = 'nodejs'
export const maxDuration = 60
export const dynamic = 'force-dynamic'

const recipeSchema = z.object({
  title: z.string().nullable().optional(),
  ingredients: z
    .array(
      z.object({
        name: z.string().describe('User-facing ingredient name in the requested app language.'),
        lookupName: z.string().nullable().optional().describe('Swedish ingredient lookup name, as close as possible to Livsmedelsverket food terminology.'),
        grams: z.number().nonnegative().describe('Weight in grams for the full recipe or batch.'),
      })
    )
    .min(1),
  notes: z.string().nullable().optional(),
})

type AppLocale = 'en' | 'sv'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

function buildRecipePrompt(locale: AppLocale): string {
  if (locale === 'sv') {
    return `Du är en expert på näringslära. Bilden visar ett recept eller en ingredienslista -
det kan vara ett receptkort, en ingrediensförteckning på en förpackning, en handskriven lista
eller ett fotograferat recept. Din uppgift är att extrahera alla ingredienser med uppskattad
vikt i gram för hela receptet/satsen.

INSTRUKTIONER:
1. Identifiera varje separat ingrediens och dess mängd. Ange svensk benämning i ingredients[].name och ingredients[].lookupName som matchar
   svenska livsmedelsdatabasens terminologi (t.ex. "havregryn", "vetemjöl", "kycklingfilé").
2. Skriv title och notes på svenska.
3. Konvertera alla mått till gram. Vanliga konverteringar: 1 dl mjöl ungefär 60 g, 1 dl vatten/mjölk = 100 g,
   1 msk olja ungefär 14 g, 1 tsk salt ungefär 5 g, 1 ägg ungefär 55 g, 1 standardportion ris (torrt) ungefär 75 g.
4. Om receptet anger att det räcker till flera portioner, dela INTE ingredienserna per portion.
   Spara hela satsens ingrediensmängder så användaren senare kan logga hur mycket hen åt eller drack.
5. Om receptet anger slutvolym eller slutvikt (t.ex. "ca 8 dl"), nämn det i notes men behåll ingrediensmängderna för hela satsen.
6. Om antalet portioner inte framgår, gissa inte portioner. Arbeta med hela receptet.
7. Ignorera kryddor i mycket små mängder (under 1 g) om de inte är betydande näringsämnen.

VIKTIGT:
- Returnera alltid minst en ingrediens.
- Använd korrekta svenska termer i ingredients[].name och ingredients[].lookupName - undvik engelska eller varumärken om generiska finns.
- Var konservativ med portionsuppskattning - det är bättre att underskatta än överskatta.`
  }

  return `You are a nutrition expert. The image shows a recipe or ingredient list -
it may be a recipe card, a package ingredient list, a handwritten list, or a photographed recipe.
Your task is to extract every ingredient with an estimated weight in grams for the full recipe or batch.

INSTRUCTIONS:
1. Identify each separate ingredient and its quantity. Write ingredients[].name in English for the user.
   For ingredients[].lookupName, use a Swedish lookup term that matches
   the Swedish food database as closely as possible (for example "havregryn", "vetemjöl", "kycklingfilé").
   lookupName is used only for database matching, so keep lookupName in Swedish even when the app language is English.
2. Write title and notes in English.
3. Convert all measurements to grams. Common conversions: 1 dl flour is about 60 g, 1 dl water/milk = 100 g,
   1 tbsp oil is about 14 g, 1 tsp salt is about 5 g, 1 egg is about 55 g, 1 standard dry rice serving is about 75 g.
4. If the recipe says it serves multiple portions, do NOT divide ingredients per portion.
   Save the full batch amounts so the user can later log how much they ate or drank.
5. If the recipe gives final volume or final weight (for example "about 8 dl"), mention it in notes but keep ingredient amounts for the full batch.
6. If the number of portions is not clear, do not guess portions. Work with the full recipe.
7. Ignore spices in very small amounts (under 1 g) unless they are nutritionally meaningful.

IMPORTANT:
- Always return at least one ingredient.
- Keep ingredients[].name user-facing and English. Use correct Swedish terms in ingredients[].lookupName; avoid English or brand names when a generic Swedish lookup term exists.
- Be conservative with portion estimates - underestimating is better than overestimating.`
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

    const rateLimited = await rateLimitJsonResponse('ai:food-scan-recipe', user.id, {
      limit: 10,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    const formData = await request.formData()
    const imageFile = formData.get('image') as File | null

    if (!imageFile) {
      return NextResponse.json({ error: t(locale, 'No image uploaded', 'Ingen bild uppladdad') }, { status: 400 })
    }

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

    if (imageFile.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: t(locale, 'The image cannot be larger than 10MB.', 'Bilden får inte vara större än 10MB.') },
        { status: 400 }
      )
    }

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
            'Google/Gemini API key is missing for image analysis. Enable Gemini in AI settings.',
            'Google/Gemini API-nyckel saknas för bildanalys. Aktivera Gemini i AI-inställningar.'
          ),
        },
        { status: 400 }
      )
    }

    const arrayBuffer = await imageFile.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')
    const mimeForGemini =
      normalizedType === 'image/heic' || normalizedType === 'image/heif'
        ? 'image/jpeg'
        : normalizedType

    const google = createGoogleGenerativeAI({ apiKey: googleKey })

    const prompt = buildRecipePrompt(locale)

    const result = await withAiContext(
      { userId: user.id, clientId, category: 'food_scan_recipe' },
      () =>
        generateObject({
          model: withGoogleLogging(google(GEMINI_MODELS.FLASH)),
          schema: recipeSchema,
          providerOptions: getGeminiThinkingOptions('quick'),
          messages: [
            {
              role: 'user',
              content: [
                { type: 'image', image: `data:${mimeForGemini};base64,${base64}` },
                { type: 'text', text: prompt },
              ],
            },
          ],
        }),
    )

    // Match each extracted ingredient against the Food table so the client
    // can drop the rows straight into the builder with foodId + macros set.
    const ingredients = await Promise.all(
      result.object.ingredients.map(async (ing) => {
        const q = (ing.lookupName || ing.name).trim().toLowerCase()
        if (q.length < 2) return { ...ing, food: null }
        const prefix = await prisma.food.findFirst({
          where: { searchName: { startsWith: q } },
          orderBy: [{ popularity: 'desc' }, { searchName: 'asc' }],
          select: {
            id: true,
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
          },
        })
        if (prefix) return { ...ing, food: prefix }
        const contains = await prisma.food.findFirst({
          where: { searchName: { contains: q } },
          orderBy: [{ popularity: 'desc' }, { searchName: 'asc' }],
          select: {
            id: true,
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
          },
        })
        return { ...ing, food: contains }
      })
    )

    return NextResponse.json({
      success: true,
      title: result.object.title,
      notes: result.object.notes,
      ingredients,
    })
  } catch (error) {
    logger.error('Recipe scan failed', {}, error)
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    return NextResponse.json(
      {
        error: t(locale, 'Could not parse the recipe', 'Kunde inte tolka receptet'),
        details:
          process.env.NODE_ENV === 'production'
            ? undefined
            : error instanceof Error
              ? error.message
              : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
