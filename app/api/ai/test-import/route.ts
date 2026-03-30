/**
 * Smart Test Import API
 *
 * POST /api/ai/test-import
 *
 * Uses Gemini Flash multimodal to extract test data from:
 * - Photos of test printouts, handwritten tables, or screen captures
 * - PDF/CSV documents with test results
 * - Audio dictation of test results (Swedish or English)
 *
 * Returns structured data matching TestDataForm fields for pre-fill.
 */

export const maxDuration = 120

import { NextRequest, NextResponse } from 'next/server'
import { generateObject } from 'ai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { requireCoach, canAccessClient } from '@/lib/auth-utils'
import { GEMINI_MODELS } from '@/lib/ai/gemini-config'
import { TestImportResultSchema } from '@/lib/validations/test-import-schema'
import { rateLimitJsonResponse } from '@/lib/api/rate-limit'
import { requireCoachFeatureAccess, requireFeatureAccess } from '@/lib/subscription/require-feature-access'
import { getResolvedGoogleKey } from '@/lib/user-api-keys'
import { logger } from '@/lib/logger'

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic']
const DOCUMENT_TYPES = ['application/pdf', 'text/csv']
const AUDIO_TYPES = ['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/x-m4a']

const MAX_IMAGE_SIZE = 10 * 1024 * 1024   // 10MB
const MAX_DOC_SIZE = 25 * 1024 * 1024     // 25MB
const MAX_AUDIO_SIZE = 10 * 1024 * 1024   // 10MB

function getMediaCategory(mimeType: string): 'image' | 'document' | 'audio' | null {
  if (IMAGE_TYPES.includes(mimeType)) return 'image'
  if (DOCUMENT_TYPES.includes(mimeType)) return 'document'
  if (AUDIO_TYPES.includes(mimeType)) return 'audio'
  return null
}

function getMaxSize(category: 'image' | 'document' | 'audio'): number {
  if (category === 'document') return MAX_DOC_SIZE
  return category === 'image' ? MAX_IMAGE_SIZE : MAX_AUDIO_SIZE
}

function buildPrompt(testType: string, category: 'image' | 'document' | 'audio'): string {
  const sportContext =
    testType === 'RUNNING'
      ? 'Löptest: extrahera speed (km/h) per steg. Incline (lutning) om det finns.'
      : testType === 'CYCLING'
        ? 'Cykeltest: extrahera power (watt) och cadence (rpm) per steg.'
        : 'Skidtest: extrahera pace (min/km) per steg.'

  const commonSuffix = `
Du extraherar testdata från ett fysiologiskt laktattest (stegtest/tröskeltest).

Testtyp: ${testType}
${sportContext}

FÄLTNAMN (matchar formuläret exakt):
- stages[]: durationMinutes, durationSeconds, heartRate (slag/min), lactate (mmol/L), vo2 (ml/kg/min, valfritt)
  + speed (km/h) för löpning, power (watt) för cykling, pace (min/km) för skidåkning
  + cadence (rpm) för cykling, incline för löpning (valfritt)
  + METABOL DATA (om tillgänglig från spirometri/Oxycon/Cosmed):
    rer (Respiratory Exchange Ratio, t.ex. 0.85), ve (minutventilation L/min),
    vco2 (koldioxidproduktion ml/min), fatPercent (fettförbränning %),
    choPercent (kolhydratförbränning %), respiratoryRate (andningsfrekvens, andetag/min)
- restingLactate: vilolaktat i mmol/L (före testet)
- testDate: datum i YYYY-MM-DD format
- postTestMeasurements[]: timeMinutes, timeSeconds, lactate — eftermätningar post-max

REGLER:
1. Normalisera svenska decimalkomma till punkt i JSON (4,5 → 4.5)
2. Minst 3 steg krävs — varna om färre
3. Varna om laktat sjunker mellan steg (kan vara inmatningsfel)
4. Om stegduration saknas, anta 4 minuter (standard)
5. Fyll i sourceDescription med vad du identifierade (t.ex. "Cosmed-utskrift med 6 steg")
6. Identifiera utrustning om möjligt (Cosmed K5, Kvark, Lactate Pro 2, etc.)
7. Confidence: 0.9+ om data är tydlig, 0.5-0.9 om delvis osäker, <0.5 om mycket oklart
8. Svara alltid på svenska i warnings och sourceDescription
9. Om du hittar eftermätningar (post-test/recovery-laktat), inkludera dem i postTestMeasurements`

  if (category === 'image') {
    return `${commonSuffix}

BILDSPECIFIKT:
- Hantera utskrifter, handskrivna tabeller, skärmfoton
- Läs av kolumnrubriker för att matcha rätt fält
- Om handskrivet: var extra noga med siffror som kan förväxlas (1/7, 5/6, 3/8)
- Varna om bilden är suddig, bländad, eller delvis avskuren`
  }

  if (category === 'document') {
    return `${commonSuffix}

DOKUMENTSPECIFIKT:
- Texten nedan är extraherad från ett PDF- eller CSV-dokument
- Identifiera tabellstruktur och kolumnrubriker
- CSV-filer kan ha semikolon (;) som separator (vanligt i Sverige)`
  }

  // audio
  return `${commonSuffix}

LJUDSPECIFIKT:
- Lyssnaren dikterar testresultat på svenska eller engelska
- Format kan vara: "Steg 1, hastighet 8, puls 120, laktat 1.2"
- Om ett värde upprepas/korrigeras, använd det senaste/korrigerade värdet
- Varna om det finns luckor eller oklarheter i dikteringen
- "Komma" i tal betyder decimaltecken (t.ex. "ett komma fem" = 1.5)`
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireCoach()

    // Subscription gate
    const denied = await requireCoachFeatureAccess(user.id, 'smart_test_import')
    if (denied) return denied

    // Rate limit: 10 requests per 60 seconds
    const rateLimited = await rateLimitJsonResponse('ai:test-import', user.id, {
      limit: 10,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    // Parse FormData — supports multiple files for merging sources
    const formData = await request.formData()
    const files = formData.getAll('file') as File[]
    const testType = formData.get('testType') as string | null
    const clientId = formData.get('clientId') as string | null

    if (files.length === 0) {
      return NextResponse.json(
        { error: 'Ingen fil uppladdad' },
        { status: 400 }
      )
    }

    if (!testType || !['RUNNING', 'CYCLING', 'SKIING'].includes(testType)) {
      return NextResponse.json(
        { error: 'Ogiltig testtyp' },
        { status: 400 }
      )
    }

    // Validate all files
    let category: 'image' | 'document' | 'audio' | null = null
    for (const file of files) {
      const fileCategory = getMediaCategory(file.type)
      if (!fileCategory) {
        return NextResponse.json(
          { error: 'Filtypen stöds inte. Använd bild (JPEG/PNG/WebP/HEIC), dokument (PDF/CSV), eller ljud (WebM/MP4/WAV/OGG).' },
          { status: 400 }
        )
      }
      if (!category) category = fileCategory
      const maxSize = getMaxSize(fileCategory)
      if (file.size > maxSize) {
        return NextResponse.json(
          { error: `Filen får inte vara större än ${maxSize / (1024 * 1024)}MB.` },
          { status: 400 }
        )
      }
    }

    if (!category) {
      return NextResponse.json({ error: 'Ingen giltig fil' }, { status: 400 })
    }
    // Use first file for backward compat with single-file paths
    const file = files[0]

    // Validate client access if provided
    if (clientId) {
      const hasAccess = await canAccessClient(user.id, clientId)
      if (!hasAccess) {
        return NextResponse.json(
          { error: 'Klienten hittades inte eller saknar behörighet' },
          { status: 404 }
        )
      }

      const athleteDenied = await requireFeatureAccess(clientId, 'lactate_ocr')
      if (athleteDenied) return athleteDenied
    }

    // Get Google API key
    const googleKey = await getResolvedGoogleKey(user.id)
    if (!googleKey) {
      return NextResponse.json(
        { error: 'Google/Gemini API-nyckel saknas. Konfigurera i AI-inställningar.' },
        { status: 400 }
      )
    }

    // Initialize Gemini
    const google = createGoogleGenerativeAI({ apiKey: googleKey })
    let prompt = buildPrompt(testType, category)

    // Add merge instruction when multiple files are provided
    if (files.length > 1) {
      prompt += `

FLERA BILDER/FILER:
Du har fått ${files.length} bilder. Dessa kan komma från olika källor, t.ex.:
- Ett handskrivet protokoll med hastighet, puls, laktat, VO₂
- En spirometri/metabol analysator-skärm (Oxycon/Cosmed) med RER, VE, VCO2, FAT%, CHO%, Rf

SAMMANFOGA data från alla bilder till EN uppsättning stages genom att matcha på hastighet eller stegnummer.
Om samma fält finns i flera bilder, prioritera det mest specifika/exakta värdet.`
    }

    let result

    if (category === 'image') {
      // Build content array with all images
      const imageContents: Array<{ type: 'image'; image: string } | { type: 'text'; text: string }> = []

      for (const f of files) {
        const arrayBuffer = await f.arrayBuffer()
        const base64 = Buffer.from(arrayBuffer).toString('base64')
        imageContents.push({
          type: 'image',
          image: `data:${f.type};base64,${base64}`,
        })
      }
      imageContents.push({ type: 'text', text: prompt })

      result = await generateObject({
        model: google(GEMINI_MODELS.FLASH),
        schema: TestImportResultSchema,
        messages: [
          {
            role: 'user',
            content: imageContents,
          },
        ],
      })
    } else if (category === 'document') {
      // For PDFs and CSVs: extract text and send as text prompt
      const arrayBuffer = await file.arrayBuffer()

      if (file.type === 'text/csv') {
        const text = new TextDecoder('utf-8').decode(arrayBuffer)
        result = await generateObject({
          model: google(GEMINI_MODELS.FLASH),
          schema: TestImportResultSchema,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `${prompt}\n\n--- DOKUMENTINNEHÅLL ---\n${text}`,
                },
              ],
            },
          ],
        })
      } else {
        // PDF: send as file part to Gemini (it handles PDFs natively)
        const base64 = Buffer.from(arrayBuffer).toString('base64')
        result = await generateObject({
          model: google(GEMINI_MODELS.FLASH),
          schema: TestImportResultSchema,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'file',
                  data: base64,
                  mimeType: 'application/pdf',
                } as any,
                { type: 'text', text: prompt },
              ],
            },
          ],
        })
      }
    } else {
      // Audio: send as inline data to Gemini multimodal
      const arrayBuffer = await file.arrayBuffer()
      const base64 = Buffer.from(arrayBuffer).toString('base64')

      result = await generateObject({
        model: google(GEMINI_MODELS.FLASH),
        schema: TestImportResultSchema,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'file',
                data: base64,
                mimeType: file.type,
              } as any,
              { type: 'text', text: prompt },
            ],
          },
        ],
      })
    }

    if (process.env.NODE_ENV !== 'production') {
      logger.debug('Test import result', {
        category,
        confidence: result.object.confidence,
        stageCount: result.object.stages.length,
        equipment: result.object.detectedEquipment,
      })
    }

    return NextResponse.json({
      success: true,
      result: result.object,
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('Test import error', {}, error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json(
      {
        error: 'Kunde inte extrahera testdata',
        details:
          process.env.NODE_ENV === 'production'
            ? undefined
            : (error instanceof Error ? error.message : 'Unknown error'),
      },
      { status: 500 }
    )
  }
}
