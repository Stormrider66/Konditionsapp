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
import { GEMINI_MODELS } from '@/lib/ai/gemini-config'
import { FoodPhotoAnalysisSchema } from '@/lib/validations/gemini-schemas'
import { rateLimitJsonResponse } from '@/lib/api/rate-limit'
import { requireFeatureAccess } from '@/lib/subscription/require-feature-access'
import { logger } from '@/lib/logger'
import { getResolvedGoogleKey } from '@/lib/user-api-keys'

export async function POST(request: NextRequest) {
  try {
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { clientId, isCoachInAthleteMode, user } = resolved

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
        { error: 'originalAnalysis och refinementText krävs' },
        { status: 400 }
      )
    }

    // Resolve Google API key
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { userId: true },
    })

    if (!client) {
      return NextResponse.json({ error: 'Athlete account not found' }, { status: 400 })
    }

    const keyOwnerId = isCoachInAthleteMode ? user.id : client.userId

    // Refinement can include image context and should stay on Gemini.
    const googleKey = await getResolvedGoogleKey(keyOwnerId)

    if (!googleKey) {
      return NextResponse.json(
        { error: 'Google/Gemini API-nyckel saknas för bildanalys. Aktivera Gemini i AI-inställningar.' },
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
      text: `Du är en expert på näringslära. Här är en tidigare analys av en måltid:

${JSON.stringify(originalAnalysis, null, 2)}

Användaren säger: "${refinementText}"

Uppdatera analysen baserat på användarens korrigering. Behåll all befintlig information men justera det som användaren påpekar. Om användaren nämner nya livsmedel, lägg till dem. Om användaren korrigerar portionsstorlekar eller mängder, uppdatera kalorier och makros därefter.

Returnera en komplett uppdaterad analys.${enhancedMode ? `

UTÖKAD ANALYS: Inkludera även fettfördelning (mättat, enkelomättat, fleromättat), kolhydratfördelning (socker, komplexa kolhydrater) och proteinkvalitet (isCompleteProtein) per matvara och i totals.` : ''}`,
    })

    const result = await generateObject({
      model: google(GEMINI_MODELS.FLASH),
      schema: FoodPhotoAnalysisSchema,
      messages: [{ role: 'user', content }],
    })

    return NextResponse.json({
      success: true,
      result: result.object,
      enhancedMode,
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('Food scan refine error', {}, error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json(
      {
        error: 'Kunde inte uppdatera analysen',
        details:
          process.env.NODE_ENV === 'production'
            ? undefined
            : (error instanceof Error ? error.message : 'Unknown error'),
      },
      { status: 500 }
    )
  }
}
