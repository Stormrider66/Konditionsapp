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

    // Subscription gate (athlete-level, reuse nutrition_planning feature)
    const denied = await requireFeatureAccess(clientId, 'nutrition_planning')
    if (denied) return denied

    // Rate limit: 10 requests per 60 seconds
    const rateLimited = await rateLimitJsonResponse('ai:food-scan', user.id, {
      limit: 10,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    // Parse FormData
    const formData = await request.formData()
    const imageFile = formData.get('image') as File | null

    if (!imageFile) {
      return NextResponse.json(
        { error: 'Ingen bild uppladdad' },
        { status: 400 }
      )
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic']
    if (!validTypes.includes(imageFile.type)) {
      return NextResponse.json(
        { error: 'Ogiltigt bildformat. Använd JPEG, PNG, WebP eller HEIC.' },
        { status: 400 }
      )
    }

    // Validate file size (max 10MB)
    if (imageFile.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Bilden får inte vara större än 10MB.' },
        { status: 400 }
      )
    }

    // Resolve Google API key:
    // For athletes → use coach's key via client.userId
    // For coach-in-athlete-mode → use own key
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

    // Food photo analysis is vision-based and must run on Gemini/Google.
    const googleKey = await getResolvedGoogleKey(keyOwnerId)

    if (!googleKey) {
      return NextResponse.json(
        { error: 'Google/Gemini API-nyckel saknas för bildanalys. Aktivera Gemini i AI-inställningar.' },
        { status: 400 }
      )
    }

    // Convert file to base64
    const arrayBuffer = await imageFile.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')

    // Initialize Gemini
    const google = createGoogleGenerativeAI({
      apiKey: googleKey,
    })

    // Call Gemini Flash with structured output
    const result = await generateObject({
      model: google(GEMINI_MODELS.FLASH),
      schema: FoodPhotoAnalysisSchema,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              image: `data:${imageFile.type};base64,${base64}`,
            },
            {
              type: 'text',
              text: `Du är en expert på näringslära och matidentifiering. Analysera denna bild av en måltid och uppskatta kalorier och makronäringsämnen.

INSTRUKTIONER:
1. Identifiera varje separat matvara/ingrediens i bilden
2. Uppskatta portionsstorlek i gram och beskriv portionen på svenska (t.ex. "1 skiva", "2 dl", "1 portion")
3. Beräkna kalorier och makros (protein, kolhydrater, fett, fiber) per matvara
4. Summera totala kalorier och makros för hela måltiden
5. Ge en kort svensk beskrivning av måltiden
6. Föreslå vilken måltidstyp det troligtvis är (frukost, lunch, middag, mellanmål etc.)
7. Ange din konfidensgrad (0-1) baserat på bildens tydlighet och hur väl du kan identifiera maten

VIKTIGT:
- Om bilden inte visar mat, sätt success till false
- Var realistisk med portionsstorlekar — svenskar äter normala portioner
- Räkna med vanliga svenska livsmedel och tillagningsmetoder
- Om du ser förpackningar med näringsinformation, använd den informationen
- Ange eventuella osäkerheter i notes-fältet`,
            },
          ],
        },
      ],
    })

    if (process.env.NODE_ENV !== 'production') {
      logger.debug('Food scan result', {
        success: result.object.success,
        itemCount: result.object.items.length,
        confidence: result.object.confidence,
      })
    }

    return NextResponse.json({
      success: true,
      result: result.object,
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('Food scan error', {}, error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json(
      {
        error: 'Kunde inte analysera bilden',
        details:
          process.env.NODE_ENV === 'production'
            ? undefined
            : (error instanceof Error ? error.message : 'Unknown error'),
      },
      { status: 500 }
    )
  }
}
