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

export const runtime = 'nodejs'
export const maxDuration = 300
export const dynamic = 'force-dynamic'

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
import { withGoogleLogging } from '@/lib/ai/google'
import { withAiContext } from '@/lib/ai/usage-logger'
import { requireAiAllowance } from '@/lib/ai/billing/require-ai-allowance'

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic']
const DOCUMENT_TYPES = ['application/pdf', 'text/csv']
const AUDIO_TYPES = ['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/x-m4a']

const MAX_IMAGE_SIZE = 10 * 1024 * 1024   // 10MB
const MAX_DOC_SIZE = 25 * 1024 * 1024     // 25MB
const MAX_AUDIO_SIZE = 10 * 1024 * 1024   // 10MB

type AppLocale = 'en' | 'sv'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

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

function buildEnglishPrompt(
  testType: string,
  category: 'image' | 'document' | 'audio',
  imageCount = 1
): string {
  const sportContext =
    testType === 'RUNNING'
      ? 'Running test: extract speed (km/h) for each stage. Extract incline if present.'
      : testType === 'CYCLING'
        ? 'Cycling test: extract power (watts) and cadence (rpm) for each stage.'
        : 'Skiing test: extract pace (min/km) for each stage.'

  const commonSuffix = `
You extract test data from a physiological lactate test (step test / threshold test).

Test type: ${testType}
${sportContext}

FIELD NAMES (must match the form exactly):
- stages[]: durationMinutes + durationSeconds are ADDITIVE components of total
  stage duration (totalSeconds = durationMinutes*60 + durationSeconds). A 4-minute
  stage = {durationMinutes: 4, durationSeconds: 0}. NEVER return {durationMinutes: 4,
  durationSeconds: 240}, because that becomes 8 minutes and double-counts time.
  heartRate (beats/min), lactate (mmol/L), vo2 (ml/kg/min, optional)
  + speed (km/h) for running, power (watts) for cycling, pace (min/km) for skiing
  + cadence (rpm) for cycling, incline for running (optional)
  + METABOLIC DATA (if available from spirometry/Oxycon/Cosmed/Jaeger/Vyntus):
    rer (Respiratory Exchange Ratio, decimal between 0.70 and 1.30), ve
    (minute ventilation L/min), vco2 (carbon dioxide production ml/min),
    fatPercent (fat oxidation %), choPercent (carbohydrate oxidation %),
    respiratoryRate (breaths/min).
- restingLactate: resting lactate in mmol/L (before the test)
- testDate: date in YYYY-MM-DD format
- postTestMeasurements[]: timeMinutes, timeSeconds, lactate for post-max measurements

RULES:
1. Normalize decimal commas to decimal points in JSON (4,5 -> 4.5)
2. At least 3 stages are required; warn if fewer are found
3. Warn if lactate decreases between stages because it may be a data-entry issue
4. If stage duration is missing, assume 4 minutes
5. Fill sourceDescription with what you identified, for example "Cosmed printout with 6 stages"
6. Identify equipment if possible (Cosmed K5, Kvark, Lactate Pro 2, etc.)
7. Confidence: 0.9+ for clear data, 0.5-0.9 for partly uncertain data, <0.5 for very unclear data
8. Write warnings and sourceDescription in English
9. If you find post-test/recovery lactate measurements, include them in postTestMeasurements`

  if (category === 'image') {
    if (imageCount > 1) {
      return `${commonSuffix}

MULTIPLE IMAGES (${imageCount}) - MERGE THEM:
Images are provided in order. IMAGE 1 is ALWAYS the test protocol (handwritten or
printed table with stages, heart rate, lactate, speed/power, and time). Image 2${imageCount > 2 ? ' and 3' : ''} contains
spirometry/metabolic data from a metabolic cart (Cosmed, Cortex, Vyntus, Oxycon, Jaeger, etc.).

IMPORTANT FOR SPIROMETRY IMAGES:
- Images may be rotated 90 degrees. Mentally orient the table so column headers are at the top.
- Jaeger/Vyntus usually shows columns like these; map them to our field names:
    Time / Phase / T (MM:SS)         -> row timestamp
    V'O2/kg or VO2/kg (ml/kg/min)    -> vo2
    V'O2 STPD (ml/min or L/min)      -> use V'O2/kg if both are present
    V'CO2 (ml/min)                   -> vco2
    RER or RQ                        -> rer
    V'E or VE (L/min, BTPS)          -> ve
    BF or Bf (1/min)                 -> respiratoryRate
    %FAT / Fat                       -> fatPercent
    %CHO / CHO                       -> choPercent
- Ignore columns that do not map to our fields (FetO2, FetCO2, VEqO2, EE, PaCO2, etc.).
- Colored bands may indicate warmup/test/recovery sections; use them as clues.

HOW TO MERGE:
1. CRITICAL: stages[] must contain exactly as many stages as IMAGE 1 contains.
   Count the rows in IMAGE 1 first. Never skip a stage because metabolic data is missing or unusual.
2. Use IMAGE 1 as authoritative for heartRate, lactate, speed/power/pace,
   incline, durationMinutes, and durationSeconds.
3. SPIROMETRY IS AUTHORITATIVE for vo2, rer, ve, vco2, respiratoryRate,
   fatPercent, and choPercent, even if handwritten VO2 values also appear in the protocol.
4. Identify each stage end time from IMAGE 1, such as handwritten time markers.
5. In IMAGE 2${imageCount > 2 ? '/3' : ''}, find the time window matching each stage END TIME.
   Use the steady-state value from the final 30-60 seconds of the stage.
6. Read numbers exactly as shown. If VO2 shows "27" or "27.4", use that number.
   Never use scientific notation such as "2.7e-7".
7. If a metabolic time window is missing, leave only the metabolic fields blank.
   Always keep the stage object with protocol data.
8. Set sourceDescription = "Protocol + spirometry (${imageCount} images). Read
   spirometry columns: <list>." List exactly which columns you could identify and read.
9. Warn specifically why metabolic data is missing, for example:
   - "The spirometry image is unclear/blank on the right side; RER and VE could not be read."
   - "Image 2 only shows graphs, no numeric table; no metabolic data extracted."
   - "Stage 5 has 5 min duration but spirometry has no matching 20:00-25:00 window."
- For handwriting, be extra careful with digits that can be confused (1/7, 5/6, 3/8).
- Warn if any image is blurry, glared, or partially cropped.`
    }

    return `${commonSuffix}

IMAGE-SPECIFIC:
- Handle printouts, handwritten tables, and screenshots
- Read column headers so fields are mapped correctly
- For handwriting, be extra careful with digits that can be confused (1/7, 5/6, 3/8)
- Warn if the image is blurry, glared, or partially cropped`
  }

  if (category === 'document') {
    return `${commonSuffix}

DOCUMENT-SPECIFIC:
- The text below was extracted from a PDF or CSV document
- Identify table structure and column headers
- CSV files may use semicolon (;) separators`
  }

  return `${commonSuffix}

AUDIO-SPECIFIC:
- The speaker may dictate test results in English or Swedish
- Format may be: "Stage 1, speed 8, heart rate 120, lactate 1.2"
- If a value is repeated or corrected, use the latest/corrected value
- Warn about gaps or unclear parts in the dictation
- Spoken decimal comma means decimal point, for example "one comma five" = 1.5`
}

function buildPrompt(
  testType: string,
  category: 'image' | 'document' | 'audio',
  imageCount = 1,
  locale: AppLocale = 'en'
): string {
  if (locale === 'en') {
    return buildEnglishPrompt(testType, category, imageCount)
  }

  const outputLanguage = locale === 'sv' ? 'Swedish' : 'English'
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
- stages[]: durationMinutes + durationSeconds är ADDITIVA komponenter av total
  stegduration (totalSeconds = durationMinutes*60 + durationSeconds). Ett 4-minuters
  steg = {durationMinutes: 4, durationSeconds: 0}. ALDRIG {durationMinutes: 4,
  durationSeconds: 240} — det blir 8 min totalt och dubbelräknar tiden.
  heartRate (slag/min), lactate (mmol/L), vo2 (ml/kg/min, valfritt)
  + speed (km/h) för löpning, power (watt) för cykling, pace (min/km) för skidåkning
  + cadence (rpm) för cykling, incline för löpning (valfritt)
  + METABOL DATA (om tillgänglig från spirometri/Oxycon/Cosmed/Jaeger/Vyntus):
    rer (Respiratory Exchange Ratio, decimaltal mellan 0.70 och 1.30 — kolumn
      kan heta RER / RQ / R), ve (minutventilation L/min — kolumn VE / V'E /
      VE BTPS / MV), vco2 (koldioxidproduktion ml/min — kolumn VCO2 / V'CO2),
      fatPercent (fettförbränning % — kolumn %Fat / Fat% / Fettförbränning),
      choPercent (kolhydratförbränning % — kolumn %CHO / CHO% / Kolhydrat),
      respiratoryRate (andningsfrekvens andetag/min — kolumn BF / Bf / RR / RF).
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
8. Write warnings and sourceDescription in ${outputLanguage}
9. Om du hittar eftermätningar (post-test/recovery-laktat), inkludera dem i postTestMeasurements`

  if (category === 'image') {
    if (imageCount > 1) {
      return `${commonSuffix}

FLERA BILDER (${imageCount} st) — SAMMANFOGA:
Bilderna kommer i ordning. BILD 1 är ALLTID testprotokollet (handskriven/utskriven
tabell med steg, puls, laktat, hastighet/effekt, tid). Bild 2${imageCount > 2 ? ' och 3' : ''} är
spirometri/metaboldata från metabol mätvagn (Cosmed, Cortex, Vyntus, Oxycon, Jaeger etc.).

VIKTIGT OM SPIROMETRIBILDERNA:
- Bilderna kan vara ROTERADE 90° (telefon i liggande, skärm i stående) — orientera
  tabellen mentalt så att kolumnrubrikerna står överst och tidsraderna löper nedåt.
- Jaeger/Vyntus visar typiskt dessa kolumner (matcha mot våra fältnamn):
    Time / Phase / T (MM:SS)         → tidsstämpel för raden
    V'O2/kg eller VO2/kg (ml/kg/min) → vo2
    V'O2 STPD (ml/min eller L/min)   → använd V'O2/kg om båda finns
    V'CO2 (ml/min)                   → vco2
    RER eller RQ                     → rer
    V'E eller VE (L/min, BTPS)       → ve
    BF eller Bf (1/min)              → respiratoryRate
    %FAT / Fat                       → fatPercent
    %CHO / CHO                       → choPercent
- Ignorera kolumner som inte mappar (FetO2, FetCO2, VEqO2, EE, PaCO2 osv.).
- Om bilden har färgade band (t.ex. grön=warmup, gul=test, vit=recovery), använd
  dem som ledtråd för var stegen börjar/slutar.

HUR DU SAMMANFOGAR:
1. KRITISKT: stages[] måste innehålla EXAKT lika många steg som finns i BILD 1.
   Räkna stegen (raderna) i BILD 1 först — om det finns 8 rader i tabellen ska
   stages[] ha 8 element. Hoppa ALDRIG över ett steg bara för att metaboldata
   saknas eller verkar avvikande.
2. Använd BILD 1 som auktoritativ källa för: heartRate, lactate, speed/power/pace,
   incline, durationMinutes, durationSeconds. Dessa kommer från protokollet
   och får INTE skrivas över av spirometridata även om värdena verkar olika.
3. SPIROMETRI ÄR AUKTORITATIV FÖR vo2, rer, ve, vco2, respiratoryRate, fatPercent,
   choPercent — även om protokollet också har handskrivna VO2-värden i sidkolumnen.
   De handskrivna protokoll-VO2 är uppskattningar; spirometriskärmen är den riktiga
   mätningen. Du SKA läsa av spirometribilderna även när protokollet har VO2 ifyllt.
   Hoppa aldrig över spirometri-extraktion bara för att protokollet "redan har" VO2.
4. Identifiera stegens sluttider från BILD 1 (t.ex. "8 min, 12 min, 16 min,
   20 min, 25 min" kan stå som handskrivna tidsmarkeringar vid sidan av tabellen).
5. I BILD 2${imageCount > 2 ? '/3' : ''}: hitta tidsfönstret som matchar varje stegs SLUTTID.
   Ta STEADY-STATE-värdet (de sista 30–60 sekunderna av steget) för:
   vo2, rer, ve, vco2, respiratoryRate, fatPercent, choPercent.
6. SIFFROR: läs av exakt det som står. Om VO2 visar "27" eller "27.4" → använd
   det talet. Använd ALDRIG vetenskaplig notation som "2.7e-7". Om en mätare
   visar L/min så konvertera till ml/kg/min med vikt från BILD 1; men fyll
   hellre inget än att gissa enheten.
7. Om ett stegs tidsfönster saknas i metaboldata — lämna BARA de metabola
   fälten tomma. Behåll alltid stage-objektet med protokolldata.
8. Sätt sourceDescription = "Protokoll + spirometri (${imageCount} bilder). Lästa
   spirometri-kolumner: <lista>." Lista exakt vilka kolumner du kunde identifiera
   och läsa av i spirometribilderna, t.ex. "V'O2/kg, V'CO2, RER, V'E, BF" eller
   "endast V'O2/kg och V'CO2 (RER och V'E var oläsbara)". Detta hjälper användaren
   förstå varför vissa metabola fält är tomma.
9. Varna SPECIFIKT om varför metaboldata saknas. Exempel:
   - "Spirometribilden är otydlig/blank på höger sida — kolumnerna RER och VE
     kunde inte läsas av."
   - "Bild 2 visar bara grafer, ingen numerisk tabell — ingen metaboldata extraherad."
   - "Steg 5 har 5 min duration medan spirometri saknar matchande tidsfönster
     mellan 20:00–25:00."
   Varna inte bara att 'tidssynkronisering är osäker' — säg vad som faktiskt
   gick fel så användaren vet om de behöver fota om eller mata in manuellt.
- Om handskrivet: var extra noga med siffror som kan förväxlas (1/7, 5/6, 3/8).
- Varna om någon bild är suddig, bländad, eller delvis avskuren.`
    }

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
  let locale: AppLocale = 'en'

  try {
    const user = await requireCoach()
    locale = user.language === 'sv' ? 'sv' : 'en'

    // Subscription gate
    const denied = await requireCoachFeatureAccess(user.id, 'smart_test_import')
    if (denied) return denied

    // Rate limit: 10 requests per 60 seconds
    const rateLimited = await rateLimitJsonResponse('ai:test-import', user.id, {
      limit: 10,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    // Parse FormData — accept either a single 'file' (legacy) or multiple 'files'
    const formData = await request.formData()
    const multiFiles = formData.getAll('files').filter((v): v is File => v instanceof File)
    const singleFile = formData.get('file')
    const files: File[] = multiFiles.length > 0
      ? multiFiles
      : singleFile instanceof File ? [singleFile] : []
    const testType = formData.get('testType') as string | null
    const clientId = formData.get('clientId') as string | null

    if (files.length === 0) {
      return NextResponse.json(
        { error: t(locale, 'No file uploaded', 'Ingen fil uppladdad') },
        { status: 400 }
      )
    }

    if (!testType || !['RUNNING', 'CYCLING', 'SKIING'].includes(testType)) {
      return NextResponse.json(
        { error: t(locale, 'Invalid test type', 'Ogiltig testtyp') },
        { status: 400 }
      )
    }

    // All files must share a category (all images, or one doc, or one audio).
    // Multi-file is only meaningful for images (protocol + spirometri).
    const categories = files.map((f) => getMediaCategory(f.type))
    if (categories.some((c) => c === null)) {
      return NextResponse.json(
        {
          error: t(
            locale,
            'This file type is not supported. Use an image (JPEG/PNG/WebP/HEIC), document (PDF/CSV), or audio (WebM/MP4/WAV/OGG).',
            'Filtypen stöds inte. Använd bild (JPEG/PNG/WebP/HEIC), dokument (PDF/CSV), eller ljud (WebM/MP4/WAV/OGG).'
          ),
        },
        { status: 400 }
      )
    }
    const category = categories[0]!
    if (categories.some((c) => c !== category)) {
      return NextResponse.json(
        {
          error: t(
            locale,
            'Do not mix file types in the same import. Use all images, one document, or one audio file.',
            'Blanda inte olika filtyper i samma import (alla bilder, eller ett dokument, eller ett ljud).'
          ),
        },
        { status: 400 }
      )
    }
    if (files.length > 1 && category !== 'image') {
      return NextResponse.json(
        { error: t(locale, 'Only images can be uploaded several at a time.', 'Endast bilder kan laddas upp flera åt gången.') },
        { status: 400 }
      )
    }
    if (files.length > 3) {
      return NextResponse.json(
        { error: t(locale, 'Maximum 3 images per import.', 'Max 3 bilder per import.') },
        { status: 400 }
      )
    }

    // Validate each file's size against its category's limit
    const maxSize = getMaxSize(category)
    const oversized = files.find((f) => f.size > maxSize)
    if (oversized) {
      return NextResponse.json(
        {
          error: t(
            locale,
            `The file cannot be larger than ${maxSize / (1024 * 1024)}MB.`,
            `Filen får inte vara större än ${maxSize / (1024 * 1024)}MB.`
          ),
        },
        { status: 400 }
      )
    }

    // Validate client access if provided
    if (clientId) {
      const hasAccess = await canAccessClient(user.id, clientId)
      if (!hasAccess) {
        return NextResponse.json(
          { error: t(locale, 'Client not found or access denied', 'Klienten hittades inte eller saknar behörighet') },
          { status: 404 }
        )
      }

      const athleteDenied = await requireFeatureAccess(clientId, 'lactate_ocr', {
        callerUserId: user.id,
      })
      if (athleteDenied) return athleteDenied

      const allowanceDenied = await requireAiAllowance(clientId)
      if (allowanceDenied) return allowanceDenied
    }

    // Get Google API key
    const googleKey = await getResolvedGoogleKey(user.id)
    if (!googleKey) {
      return NextResponse.json(
        { error: t(locale, 'Google/Gemini API key is missing. Configure it in AI settings.', 'Google/Gemini API-nyckel saknas. Konfigurera i AI-inställningar.') },
        { status: 400 }
      )
    }

    // Initialize Gemini
    const google = createGoogleGenerativeAI({ apiKey: googleKey })
    const prompt = buildPrompt(testType, category, files.length, locale)
    const aiContext = {
      userId: user.id,
      clientId,
      category: `test_import_${category}`,
    }

    let result
    const file = files[0]

    if (category === 'image') {
      // Encode every image and send as separate image parts in one request
      // so Gemini can cross-reference them (protocol times ↔ metabolic rows).
      const imageParts = await Promise.all(
        files.map(async (f) => {
          const buf = await f.arrayBuffer()
          const b64 = Buffer.from(buf).toString('base64')
          return {
            type: 'image' as const,
            image: `data:${f.type};base64,${b64}`,
          }
        })
      )

      // Single-photo OCR works fine on Flash. Multi-photo requires
      // cross-referencing handwritten protocol times against dense
      // Jaeger/Vyntus tables — 2.5 Pro handles this reliably (verified
      // at 9-stage extraction). 3.1 Pro Preview returned 500 on the
      // user's API key, so stick with the GA Pro for multi-image.
      const imageModel = files.length > 1 ? GEMINI_MODELS.PRO : GEMINI_MODELS.FLASH

      result = await withAiContext(aiContext, () => generateObject({
        model: withGoogleLogging(google(imageModel)),
        schema: TestImportResultSchema,
        messages: [
          {
            role: 'user',
            content: [
              ...imageParts,
              { type: 'text', text: prompt },
            ],
          },
        ],
      }))
    } else if (category === 'document') {
      // For PDFs and CSVs: extract text and send as text prompt
      const arrayBuffer = await file.arrayBuffer()

      if (file.type === 'text/csv') {
        const text = new TextDecoder('utf-8').decode(arrayBuffer)
        result = await withAiContext(aiContext, () => generateObject({
          model: withGoogleLogging(google(GEMINI_MODELS.FLASH)),
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
        }))
      } else {
        // PDF: send as file part to Gemini (it handles PDFs natively)
        const base64 = Buffer.from(arrayBuffer).toString('base64')
        result = await withAiContext(aiContext, () => generateObject({
          model: withGoogleLogging(google(GEMINI_MODELS.FLASH)),
          schema: TestImportResultSchema,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'file',
                  data: base64,
                  mediaType: 'application/pdf',
                },
                { type: 'text', text: prompt },
              ],
            },
          ],
        }))
      }
    } else {
      // Audio: send as inline data to Gemini multimodal
      const arrayBuffer = await file.arrayBuffer()
      const base64 = Buffer.from(arrayBuffer).toString('base64')

      result = await withAiContext(aiContext, () => generateObject({
        model: withGoogleLogging(google(GEMINI_MODELS.FLASH)),
        schema: TestImportResultSchema,
        messages: [
          {
            role: 'user',
              content: [
                {
                  type: 'file',
                  data: base64,
                  mediaType: file.type,
              },
              { type: 'text', text: prompt },
            ],
          },
        ],
      }))
    }

    // Log extraction summary in prod too — helps debug "metabolic data
    // came back empty" without needing the user to share screenshots.
    const stages = result.object.stages
    const metabolicCounts = {
      vo2: stages.filter((s) => s.vo2 != null).length,
      rer: stages.filter((s) => s.rer != null).length,
      ve: stages.filter((s) => s.ve != null).length,
      vco2: stages.filter((s) => s.vco2 != null).length,
      respiratoryRate: stages.filter((s) => s.respiratoryRate != null).length,
      fatPercent: stages.filter((s) => s.fatPercent != null).length,
      choPercent: stages.filter((s) => s.choPercent != null).length,
    }
    logger.info('Test import result', {
      category,
      fileCount: files.length,
      model: category === 'image' && files.length > 1
        ? GEMINI_MODELS.PRO
        : GEMINI_MODELS.FLASH,
      confidence: result.object.confidence,
      stageCount: stages.length,
      equipment: result.object.detectedEquipment,
      metabolicCounts,
      sourceDescription: result.object.sourceDescription,
      warnings: result.object.warnings,
    })

    return NextResponse.json({
      success: true,
      result: result.object,
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    // AI SDK errors (schema validation, API errors, etc.) carry useful
    // structured fields — flatten them so they make it into the log.
    const e = error as {
      name?: string
      message?: string
      cause?: unknown
      text?: string
      value?: unknown
      errors?: unknown
      statusCode?: number
    }
    logger.error('Test import error', {
      name: e?.name,
      message: e?.message,
      statusCode: e?.statusCode,
      cause: e?.cause,
      // generateObject attaches the raw text / attempted value / Zod errors:
      aiRawText: typeof e?.text === 'string' ? e.text.slice(0, 2000) : undefined,
      aiValue: e?.value,
      aiZodErrors: e?.errors,
    }, error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json(
      {
        error: t(locale, 'Could not extract test data', 'Kunde inte extrahera testdata'),
        details:
          process.env.NODE_ENV === 'production'
            ? undefined
            : (error instanceof Error ? error.message : 'Unknown error'),
      },
      { status: 500 }
    )
  }
}
