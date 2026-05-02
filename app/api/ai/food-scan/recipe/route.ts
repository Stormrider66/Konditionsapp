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
import { GEMINI_MODELS } from '@/lib/ai/gemini-config'
import { rateLimitJsonResponse } from '@/lib/api/rate-limit'
import { requireFeatureAccess } from '@/lib/subscription/require-feature-access'
import { logger } from '@/lib/logger'
import { resolveAthleteGoogleKeyContext } from '@/lib/ai/resolve-athlete-google-key'
import { withGoogleLogging } from '@/lib/ai/google'
import { withAiContext } from '@/lib/ai/usage-logger'
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
        name: z.string().describe('Ingrediensens svenska namn — så nära Livsmedelsverkets terminologi som möjligt.'),
        grams: z.number().nonnegative().describe('Vikt i gram per portion.'),
      })
    )
    .min(1),
  notes: z.string().nullable().optional(),
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

    const rateLimited = await rateLimitJsonResponse('ai:food-scan-recipe', user.id, {
      limit: 10,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    const formData = await request.formData()
    const imageFile = formData.get('image') as File | null

    if (!imageFile) {
      return NextResponse.json({ error: 'Ingen bild uppladdad' }, { status: 400 })
    }

    const normalizedType = imageFile.type === 'image/jpg' ? 'image/jpeg' : imageFile.type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
    if (!validTypes.includes(normalizedType)) {
      return NextResponse.json(
        { error: `Ogiltigt bildformat (${imageFile.type || 'okänt'}). Använd JPEG, PNG eller WebP.` },
        { status: 400 }
      )
    }

    if (imageFile.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Bilden får inte vara större än 10MB.' }, { status: 400 })
    }

    const keyContext = await resolveAthleteGoogleKeyContext({
      clientId,
      isCoachInAthleteMode,
      userId: user.id,
    })
    if (!keyContext) {
      return NextResponse.json({ error: 'Athlete account not found' }, { status: 400 })
    }
    const googleKey = keyContext.googleKey
    if (!googleKey) {
      return NextResponse.json(
        { error: 'Google/Gemini API-nyckel saknas för bildanalys. Aktivera Gemini i AI-inställningar.' },
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

    const prompt = `Du är en expert på näringslära. Bilden visar ett recept eller en ingredienslista —
det kan vara ett receptkort, en ingrediensförteckning på en förpackning, en handskriven lista
eller ett fotograferat recept. Din uppgift är att extrahera alla ingredienser med uppskattad
vikt i gram per portion.

INSTRUKTIONER:
1. Identifiera varje separat ingrediens och dess mängd. Ange svensk benämning som matchar
   svenska livsmedelsdatabasens terminologi (t.ex. "havregryn", "vetemjöl", "kycklingfilé").
2. Konvertera alla mått till gram. Vanliga konverteringar: 1 dl mjöl ≈ 60 g, 1 dl vatten/mjölk = 100 g,
   1 msk olja ≈ 14 g, 1 tsk salt ≈ 5 g, 1 ägg ≈ 55 g, 1 standardportion ris (torrt) ≈ 75 g.
3. Om receptet anger att det räcker till flera portioner, ANGE GRAM PER PORTION (dela med antalet portioner).
4. Om antalet portioner inte framgår, anta 4 portioner och nämn det i notes.
5. Ignorera kryddor i mycket små mängder (under 1 g) om de inte är betydande näringsämnen.

VIKTIGT:
- Returnera alltid minst en ingrediens.
- Använd korrekta svenska termer — undvik engelska eller varumärken om generiska finns.
- Var konservativ med portionsuppskattning — det är bättre att underskatta än överskatta.`

    const result = await withAiContext(
      { userId: user.id, category: 'food_scan_recipe' },
      () =>
        generateObject({
          model: withGoogleLogging(google(GEMINI_MODELS.FLASH)),
          schema: recipeSchema,
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
        const q = ing.name.trim().toLowerCase()
        if (q.length < 2) return { ...ing, food: null }
        const prefix = await prisma.food.findFirst({
          where: { searchName: { startsWith: q } },
          orderBy: [{ popularity: 'desc' }, { searchName: 'asc' }],
          select: {
            id: true,
            nameSv: true,
            category: true,
            caloriesPer100g: true,
            proteinPer100g: true,
            carbsPer100g: true,
            fatPer100g: true,
            fiberPer100g: true,
          },
        })
        if (prefix) return { ...ing, food: prefix }
        const contains = await prisma.food.findFirst({
          where: { searchName: { contains: q } },
          orderBy: [{ popularity: 'desc' }, { searchName: 'asc' }],
          select: {
            id: true,
            nameSv: true,
            category: true,
            caloriesPer100g: true,
            proteinPer100g: true,
            carbsPer100g: true,
            fatPer100g: true,
            fiberPer100g: true,
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json(
      {
        error: 'Kunde inte tolka receptet',
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
