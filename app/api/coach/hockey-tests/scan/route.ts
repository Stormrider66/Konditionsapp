/**
 * Hockey Test Photo Scan API
 *
 * POST - Upload a photo of a test result sheet or Muscle Lab printout
 *        and extract hockey test data via Gemini
 */

export const runtime = 'nodejs'
export const maxDuration = 60
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireCoach } from '@/lib/auth-utils'
import { getResolvedGoogleKey } from '@/lib/user-api-keys'
import {
  createGoogleGenAIClient,
  generateContent,
} from '@/lib/ai/google-genai-client'
import { withAiContext } from '@/lib/ai/usage-logger'
import { logger } from '@/lib/logger'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

const HOCKEY_TEST_SCAN_PROMPT_EN = `You are an expert at reading physical test results for ice hockey players.

Analyze the image and extract all test results as JSON. The image may be:
- A printed Muscle Lab test protocol
- A handwritten result sheet
- A screenshot from testing software
- A timing sheet from on-ice tests

Return ONLY valid JSON in this format (omit fields that are not present in the image):

{
  "agility505Left": 6.50,
  "agility505Right": 6.40,
  "sprint5m": 1.10,
  "sprint10m": 1.82,
  "sprint20m": 3.05,
  "sprint30m": 4.20,
  "sprint20mFly": 2.51,
  "sprint30mFly": 3.65,
  "endurance7x40": [5.20, 5.30, 5.35, 5.40, 5.45, 5.50, 5.55],
  "jumpSquatLadder": {"20": 1200, "40": 1100, "60": 950, "80": 800, "100": 650},
  "singleLegJumpLeft": {"30": 450, "35": 430, "40": 410, "45": 380, "50": 350, "55": 320},
  "singleLegJumpRight": {"30": 460, "35": 440, "40": 420, "45": 390, "50": 360, "55": 330},
  "gripStrengthLeft": 55.0,
  "gripStrengthRight": 58.0,
  "standingLongJump": 240,
  "threeJumpLeft": 680,
  "threeJumpRight": 700,
  "athleteName": "Erik Karlsson",
  "testDate": "2026-04-03",
  "confidence": 0.85
}

Notes:
- jumpSquatLadder: key = kg load, value = watts (peak power)
- singleLegJump: key = kg load, value = watts (peak power)
- endurance7x40: array with exactly 7 times in seconds
- Times are in seconds with decimals (6.50, not 6:50)
- Jumps are in cm
- Grip strength is in kg
- confidence: 0-1, how confident you are in the extraction
- athleteName: if you can read the player's name from the document
- testDate: if you can read the date (YYYY-MM-DD format)

If the image is unclear, do your best and lower the confidence value.`

const HOCKEY_TEST_SCAN_PROMPT_SV = `Du är expert på att läsa fysiska testresultat för ishockeyspelare.

Analysera bilden och extrahera alla testresultat som JSON. Bilden kan vara:
- Ett utskrivet testprotokoll från Muscle Lab
- En handskriven resultatlista
- Ett skärmdump från testprogramvara
- En tidtagningslista från istester

Returnera ENBART giltig JSON med detta format (utelämna fält som inte finns i bilden):

{
  "agility505Left": 6.50,
  "agility505Right": 6.40,
  "sprint5m": 1.10,
  "sprint10m": 1.82,
  "sprint20m": 3.05,
  "sprint30m": 4.20,
  "sprint20mFly": 2.51,
  "sprint30mFly": 3.65,
  "endurance7x40": [5.20, 5.30, 5.35, 5.40, 5.45, 5.50, 5.55],
  "jumpSquatLadder": {"20": 1200, "40": 1100, "60": 950, "80": 800, "100": 650},
  "singleLegJumpLeft": {"30": 450, "35": 430, "40": 410, "45": 380, "50": 350, "55": 320},
  "singleLegJumpRight": {"30": 460, "35": 440, "40": 420, "45": 390, "50": 360, "55": 330},
  "gripStrengthLeft": 55.0,
  "gripStrengthRight": 58.0,
  "standingLongJump": 240,
  "threeJumpLeft": 680,
  "threeJumpRight": 700,
  "athleteName": "Erik Karlsson",
  "testDate": "2026-04-03",
  "confidence": 0.85
}

Notera:
- jumpSquatLadder: nyckel = kg belastning, värde = watt (peak power)
- singleLegJump: nyckel = kg belastning, värde = watt (peak power)
- endurance7x40: array med exakt 7 tider i sekunder
- Tider i sekunder med decimaler (6.50, inte 6:50)
- Hopp i cm
- Greppstyrka i kg
- confidence: 0-1, hur säker du är på utläsningen
- athleteName: om du kan läsa spelarens namn från dokumentet
- testDate: om du kan läsa datum (YYYY-MM-DD format)

Om bilden är otydlig, gör ditt bästa och sänk confidence-värdet.`

function getHockeyTestScanPrompt(locale: AppLocale): string {
  return locale === 'sv' ? HOCKEY_TEST_SCAN_PROMPT_SV : HOCKEY_TEST_SCAN_PROMPT_EN
}

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

export async function POST(req: NextRequest) {
  let locale: AppLocale = 'en'

  try {
    const user = await requireCoach()
    locale = resolveRequestLocale(req, user.language)

    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: t(locale, 'No file uploaded', 'Ingen fil uppladdad') }, { status: 400 })
    }

    const googleKey = await getResolvedGoogleKey(user.id)
    if (!googleKey) {
      return NextResponse.json({ error: t(locale, 'No Google AI key configured', 'Ingen Google AI-nyckel konfigurerad') }, { status: 400 })
    }

    // Convert file to base64
    const buffer = await file.arrayBuffer()
    const base64 = Buffer.from(buffer).toString('base64')

    const client = createGoogleGenAIClient(googleKey)

    const result = await withAiContext(
      { userId: user.id, category: 'hockey_test_scan' },
      () => generateContent(
        client,
        'gemini-2.5-pro-preview-06-05',
        [
          { text: getHockeyTestScanPrompt(locale) },
          { inlineData: { mimeType: file.type || 'image/jpeg', data: base64 } },
        ],
      )
    )

    if (!result.text) {
      return NextResponse.json({ error: t(locale, 'AI returned no response', 'AI returnerade inget svar') }, { status: 500 })
    }

    logger.info('Hockey test scan completed', {
      inputTokens: result.usage?.inputTokens,
      outputTokens: result.usage?.outputTokens,
    })

    // Parse JSON from response
    let jsonText = result.text.trim()
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    }

    const parsed = JSON.parse(jsonText)

    return NextResponse.json(parsed)
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    console.error('Hockey test scan error:', error)
    return NextResponse.json({ error: t(locale, 'Could not analyze the image', 'Kunde inte analysera bilden') }, { status: 500 })
  }
}
