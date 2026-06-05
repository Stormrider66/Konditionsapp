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
import { retryOnTransientAiError } from '@/lib/ai/transient-retry'
import { pickConfidentFood } from '@/lib/nutrition/recipe-food-match'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'
import { z } from 'zod'

export const runtime = 'nodejs'
// Handwriting OCR at medium thinking plus a transient-overload retry needs more
// headroom than the default 60s, matching the refine route.
export const maxDuration = 120
export const dynamic = 'force-dynamic'

const recipeSchema = z.object({
  title: z.string().nullable().optional(),
  ingredients: z
    .array(
      z.object({
        name: z.string().describe('User-facing ingredient name in the requested app language. Keep the SPECIFIC food (e.g. "coconut sugar", not "sugar").'),
        lookupName: z.string().nullable().optional().describe('Swedish ingredient lookup name, as close as possible to Livsmedelsverket food terminology. Keep the specific food type (e.g. "kokossocker", "vaniljpulver"), never generalise it away.'),
        grams: z.number().nonnegative().describe('Weight in grams for the full recipe or batch.'),
        // Per-100 g estimate for THIS specific ingredient. Used as the fallback
        // when the database has no confident match, so the row still shows the
        // right name with reasonable macros instead of a wrong food. All
        // optional: a missing estimate degrades that row to name+grams (the user
        // can still estimate/pick a food) rather than failing the whole scan.
        estCaloriesPer100g: z.number().nonnegative().nullable().optional().describe('Best estimate of kcal per 100 g of this specific ingredient.'),
        estProteinPer100g: z.number().nonnegative().nullable().optional().describe('Estimated protein grams per 100 g.'),
        estCarbsPer100g: z.number().nonnegative().nullable().optional().describe('Estimated carbohydrate grams per 100 g.'),
        estFatPer100g: z.number().nonnegative().nullable().optional().describe('Estimated fat grams per 100 g.'),
        estFiberPer100g: z.number().nonnegative().nullable().optional().describe('Estimated fibre grams per 100 g, if known.'),
        estSugarPer100g: z.number().nonnegative().nullable().optional().describe('Estimated sugar grams per 100 g, if known.'),
      })
    )
    .min(1),
  notes: z.string().nullable().optional(),
})

interface RecipeEstimate {
  caloriesPer100g: number
  proteinPer100g: number
  carbsPer100g: number
  fatPer100g: number
  fiberPer100g: number | null
  sugarPer100g: number | null
}

function buildEstimate(ing: z.infer<typeof recipeSchema>['ingredients'][number]): RecipeEstimate | null {
  const calories = ing.estCaloriesPer100g
  if (calories == null || !Number.isFinite(calories)) return null
  const nonNeg = (v: number | null | undefined) =>
    v != null && Number.isFinite(v) ? Math.max(0, v) : 0
  return {
    caloriesPer100g: Math.max(0, calories),
    proteinPer100g: nonNeg(ing.estProteinPer100g),
    carbsPer100g: nonNeg(ing.estCarbsPer100g),
    fatPer100g: nonNeg(ing.estFatPer100g),
    fiberPer100g: ing.estFiberPer100g != null ? Math.max(0, ing.estFiberPer100g) : null,
    sugarPer100g: ing.estSugarPer100g != null ? Math.max(0, ing.estSugarPer100g) : null,
  }
}

const FOOD_SELECT = {
  id: true,
  searchName: true,
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
2. BEHÅLL ingrediensens specifika identitet. Generalisera ALDRIG en specifik ingrediens till en bredare:
   kokossocker är INTE socker, kokosgrädde är INTE grädde, mandelmjöl är INTE vetemjöl,
   vaniljpulver är INTE vaniljpudding eller vaniljsocker. Ta bara bort varumärken (t.ex. "Änglamark"),
   aldrig själva livsmedelstypen (kokos-, mandel-, soja-, havre- osv.).
3. Skriv title och notes på svenska.
4. Konvertera alla mått till gram. Vanliga konverteringar: 1 dl mjöl ungefär 60 g, 1 dl vatten/mjölk = 100 g,
   1 dl grädde/kokosgrädde = 100 g, 1 dl strösocker ungefär 85 g, 1 msk olja ungefär 14 g, 1 tsk salt ungefär 5 g,
   1 tsk torrt pulver (vaniljpulver, kanel, bakpulver) ungefär 3 g, 1 ägg ungefär 55 g, 1 standardportion ris (torrt) ungefär 75 g.
5. Ange för VARJE ingrediens din bästa uppskattning av näringsvärdet per 100 g för den FAKTISKA ingrediensen
   (estCaloriesPer100g, estProteinPer100g, estCarbsPer100g, estFatPer100g, och estFiberPer100g/estSugarPer100g om du vet).
   Detta används som reserv när databasen saknar en exakt träff - basera det på den specifika ingrediensen, inte en bredare kategori.
6. Om receptet anger att det räcker till flera portioner, dela INTE ingredienserna per portion.
   Spara hela satsens ingrediensmängder så användaren senare kan logga hur mycket hen åt eller drack.
7. Om receptet anger slutvolym eller slutvikt (t.ex. "ca 8 dl"), nämn det i notes men behåll ingrediensmängderna för hela satsen.
8. Om antalet portioner inte framgår, gissa inte portioner. Arbeta med hela receptet.
9. Ignorera kryddor i mycket små mängder (under 1 g) om de inte är betydande näringsämnen.

VIKTIGT:
- Returnera alltid minst en ingrediens.
- Använd korrekta svenska termer i ingredients[].name och ingredients[].lookupName - undvik varumärken om generiska finns,
  men behåll alltid det specifika livsmedlet (kokossocker, kokosgrädde, vaniljpulver), generalisera inte bort det.
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
2. KEEP the ingredient's specific identity. NEVER generalise a specific ingredient to a broader one:
   coconut sugar is NOT sugar, coconut cream is NOT cream, almond flour is NOT wheat flour,
   vanilla powder is NOT vanilla pudding or vanilla sugar. Only strip brand names (e.g. "Änglamark"),
   never the food type itself (coconut-, almond-, soy-, oat-, etc.). In lookupName keep the specific
   Swedish term (kokossocker, kokosgrädde, vaniljpulver), do not collapse it to a category.
3. Write title and notes in English.
4. Convert all measurements to grams. Common conversions: 1 dl flour is about 60 g, 1 dl water/milk = 100 g,
   1 dl cream/coconut cream = 100 g, 1 dl granulated sugar is about 85 g, 1 tbsp oil is about 14 g, 1 tsp salt is about 5 g,
   1 tsp dry powder (vanilla powder, cinnamon, baking powder) is about 3 g, 1 egg is about 55 g, 1 standard dry rice serving is about 75 g.
5. For EVERY ingredient, give your best estimate of its nutrition per 100 g for the ACTUAL ingredient
   (estCaloriesPer100g, estProteinPer100g, estCarbsPer100g, estFatPer100g, plus estFiberPer100g/estSugarPer100g if known).
   This is used as a fallback when the database has no exact match - base it on the specific ingredient, not a broader category.
6. If the recipe says it serves multiple portions, do NOT divide ingredients per portion.
   Save the full batch amounts so the user can later log how much they ate or drank.
7. If the recipe gives final volume or final weight (for example "about 8 dl"), mention it in notes but keep ingredient amounts for the full batch.
8. If the number of portions is not clear, do not guess portions. Work with the full recipe.
9. Ignore spices in very small amounts (under 1 g) unless they are nutritionally meaningful.

IMPORTANT:
- Always return at least one ingredient.
- Keep ingredients[].name user-facing and English. Use correct Swedish terms in ingredients[].lookupName; avoid brand names when a generic term exists,
  but always keep the specific food (kokossocker, kokosgrädde, vaniljpulver) - do not generalise it away.
- Be conservative with portion estimates - underestimating is better than overestimating.`
}

export async function POST(request: NextRequest) {
  let locale: AppLocale = resolveRequestLocale(request)
  try {
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    const { clientId, isCoachInAthleteMode, user } = resolved
    locale = resolveRequestLocale(request, user.language)

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
        // Retry transient Gemini overloads (429/503/overloaded) so a momentary
        // blip doesn't surface as "Kunde inte tolka receptet".
        retryOnTransientAiError(() =>
          generateObject({
            model: withGoogleLogging(google(GEMINI_MODELS.FLASH)),
            schema: recipeSchema,
            // Reading handwritten recipes and mapping them to correct Swedish food
            // terms is error-prone at minimal thinking, so this one runs at medium.
            providerOptions: getGeminiThinkingOptions('standard'),
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
        ),
    )

    // Match each extracted ingredient against the Food table so the client can
    // drop rows straight into the builder. A DB row is only auto-applied when we
    // are confident it is the SAME food (see pickConfidentFood) — a weak ILIKE
    // hit like "vanilj" → "Vaniljpudding" is rejected. Whatever the outcome, we
    // also pass the model's per-100 g estimate so unmatched rows still land with
    // the correct name and reasonable macros instead of empty or wrong values.
    const ingredients = await Promise.all(
      result.object.ingredients.map(async (ing) => {
        const estimate = buildEstimate(ing)
        const q = (ing.lookupName || ing.name).trim().toLowerCase()
        const out = { name: ing.name, lookupName: ing.lookupName ?? null, grams: ing.grams }
        if (q.length < 2) return { ...out, food: null, estimate }

        // Pull a few popularity-ranked candidates per band and accept the first
        // that clears the whole-word confidence gate, rather than blindly taking
        // the single most popular hit.
        const prefix = await prisma.food.findMany({
          where: { searchName: { startsWith: q } },
          orderBy: [{ popularity: 'desc' }, { searchName: 'asc' }],
          take: 5,
          select: FOOD_SELECT,
        })
        let match = pickConfidentFood(q, prefix)
        if (!match) {
          const contains = await prisma.food.findMany({
            where: { searchName: { contains: q } },
            orderBy: [{ popularity: 'desc' }, { searchName: 'asc' }],
            take: 8,
            select: FOOD_SELECT,
          })
          match = pickConfidentFood(q, contains)
        }

        if (!match) return { ...out, food: null, estimate }
        // Drop searchName (gating-only) before sending to the client.
        const { searchName: _searchName, ...food } = match
        return { ...out, food, estimate: null }
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
