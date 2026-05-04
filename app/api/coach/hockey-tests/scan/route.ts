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
import { logger } from '@/lib/logger'

const HOCKEY_TEST_SCAN_PROMPT = `Du är expert på att läsa fysiska testresultat för ishockeyspelare.

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
  "vo2max": 58.5,
  "lt1HeartRate": 145,
  "lt1SpeedKmh": 11.5,
  "lt1Lactate": 2.0,
  "lt2HeartRate": 176,
  "lt2SpeedKmh": 15.2,
  "lt2Lactate": 4.0,
  "maxHeartRate": 194,
  "maxLactate": 11.8,
  "rampDurationSec": 735,
  "peakSpeedKmh": 18.5,
  "rerMax": 1.15,
  "veMax": 165,
  "breathingFrequencyMax": 58,
  "economyMlKgKm": 205,
  "hrRecovery1Min": 32,
  "hrRecovery2Min": 48,
  "lactateClearance3Min": 2.1,
  "lactateClearance5Min": 3.4,
  "lactateClearance10Min": 5.8,
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
- VO2max i ml/kg/min
- LT1/LT2 puls i slag/min, fart i km/h och laktat i mmol/L
- rampDurationSec i sekunder
- HR recovery anges som pulsfallet i slag/min efter 1 och 2 minuter
- lactateClearance anges som fall i mmol/L efter 3, 5 och 10 minuter
- confidence: 0-1, hur säker du är på utläsningen
- athleteName: om du kan läsa spelarens namn från dokumentet
- testDate: om du kan läsa datum (YYYY-MM-DD format)

Om bilden är otydlig, gör ditt bästa och sänk confidence-värdet.`

export async function POST(req: NextRequest) {
  try {
    const user = await requireCoach()

    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'Ingen fil uppladdad' }, { status: 400 })
    }

    const googleKey = await getResolvedGoogleKey(user.id)
    if (!googleKey) {
      return NextResponse.json({ error: 'Ingen Google AI-nyckel konfigurerad' }, { status: 400 })
    }

    // Convert file to base64
    const buffer = await file.arrayBuffer()
    const base64 = Buffer.from(buffer).toString('base64')

    const client = createGoogleGenAIClient(googleKey)

    const result = await generateContent(
      client,
      'gemini-2.5-pro-preview-06-05',
      [
        { text: HOCKEY_TEST_SCAN_PROMPT },
        { inlineData: { mimeType: file.type || 'image/jpeg', data: base64 } },
      ],
    )

    if (!result.text) {
      return NextResponse.json({ error: 'AI returnerade inget svar' }, { status: 500 })
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Hockey test scan error:', error)
    return NextResponse.json({ error: 'Kunde inte analysera bilden' }, { status: 500 })
  }
}
