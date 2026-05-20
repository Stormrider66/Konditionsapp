/**
 * Lactate Meter OCR API
 *
 * POST /api/ai/lactate-ocr
 *
 * Uses Gemini 3.1 Pro's multimodal OCR capabilities to extract lactate readings
 * from photos of lactate meters (Lactate Pro 2, Lactate Scout, etc.).
 *
 * Supports:
 * - Digital LCD displays with glare/angles
 * - Handwritten whiteboard readings
 * - Various lactate meter brands
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { canAccessClient, requireCoach } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { GEMINI_MODELS, getGeminiThinkingOptions } from '@/lib/ai/gemini-config';
import { LactateMeterOCRSchema } from '@/lib/validations/gemini-schemas';
import { decryptSecret } from '@/lib/crypto/secretbox';
import { rateLimitJsonResponse } from '@/lib/api/rate-limit';
import { requireCoachFeatureAccess, requireFeatureAccess } from '@/lib/subscription/require-feature-access'
import { logger } from '@/lib/logger'
import { withGoogleLogging } from '@/lib/ai/google'
import { withAiContext } from '@/lib/ai/usage-logger'
import { requireAiAllowance } from '@/lib/ai/billing/require-ai-allowance'

type AppLocale = 'en' | 'sv'

export async function POST(request: NextRequest) {
  let locale: AppLocale = 'en'

  try {
    const user = await requireCoach();
    locale = getUserLocale(user.language)

    // Subscription gate (coach-level)
    const denied = await requireCoachFeatureAccess(user.id, 'lactate_ocr')
    if (denied) return denied

    const rateLimited = await rateLimitJsonResponse('ai:lactate-ocr', user.id, {
      limit: 5,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    // Get form data with image
    const formData = await request.formData();
    const imageFile = formData.get('image') as File | null;
    const clientId = formData.get('clientId') as string | null;
    const testStageContext = formData.get('testStageContext') as string | null;

    if (!imageFile) {
      return NextResponse.json(
        { error: t(locale, 'No image uploaded', 'Ingen bild uppladdad') },
        { status: 400 }
      );
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
    if (!validTypes.includes(imageFile.type)) {
      return NextResponse.json(
        { error: t(locale, 'Invalid image format. Use JPEG, PNG, WebP, or HEIC.', 'Ogiltigt bildformat. Använd JPEG, PNG, WebP eller HEIC.') },
        { status: 400 }
      );
    }

    // Get API key
    const apiKeys = await prisma.userApiKey.findUnique({
      where: { userId: user.id },
    });

    let googleKey: string | undefined
    if (apiKeys?.googleKeyEncrypted) {
      try {
        googleKey = decryptSecret(apiKeys.googleKeyEncrypted)
      } catch {
        googleKey = undefined
      }
    }

    if (!googleKey) {
      return NextResponse.json(
        { error: t(locale, 'Google API key is missing. Configure it in Settings.', 'Google API-nyckel saknas. Konfigurera i Inställningar.') },
        { status: 400 }
      );
    }

    // Convert file to base64
    const arrayBuffer = await imageFile.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');

    // Initialize Gemini
    const google = createGoogleGenerativeAI({
      apiKey: googleKey,
    });

    // Build context for better accuracy
    let contextInfo = '';
    if (clientId) {
      const hasAccess = await canAccessClient(user.id, clientId)
      if (!hasAccess) {
        return NextResponse.json(
          { error: t(locale, 'Client not found or access denied', 'Klienten hittades inte eller åtkomst nekades') },
          { status: 404 }
        )
      }

      // Athlete-level subscription gate
      const athleteDenied = await requireFeatureAccess(clientId, 'lactate_ocr')
      if (athleteDenied) return athleteDenied

      const allowanceDenied = await requireAiAllowance(clientId)
      if (allowanceDenied) return allowanceDenied

      const client = await prisma.client.findUnique({
        where: { id: clientId },
        select: { name: true },
      });
      if (client) {
        contextInfo += `\nAthlete: ${client.name}`;
      }
    }
    if (testStageContext) {
      contextInfo += `\nTest context: ${testStageContext}`;
    }

    // Use generateObject for structured OCR output
    const result = await withAiContext(
      { userId: user.id, clientId, category: 'lactate_ocr' },
      () => generateObject({
        model: withGoogleLogging(google(GEMINI_MODELS.VIDEO_ANALYSIS)),
        schema: LactateMeterOCRSchema,
        providerOptions: getGeminiThinkingOptions('quick'), // Quick thinking for OCR
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
                text: buildLactateOcrPrompt(locale, contextInfo),
              },
            ],
          },
        ],
      }),
    );

    // Debug logging (avoid logging health metrics in production)
    if (process.env.NODE_ENV !== 'production') {
      logger.debug('Lactate OCR parsed', {
        confidence: result.object.reading.confidence,
        brand: result.object.deviceInfo.detectedBrand,
      })
    }

    return NextResponse.json({
      success: true,
      result: result.object,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Lactate OCR error', {}, error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      {
        error: t(locale, 'Could not read the lactate meter', 'Kunde inte läsa laktatmätaren'),
        details:
          process.env.NODE_ENV === 'production'
            ? undefined
            : (error instanceof Error ? error.message : 'Unknown error'),
      },
      { status: 500 }
    );
  }
}

function buildLactateOcrPrompt(locale: AppLocale, contextInfo: string): string {
  if (locale === 'sv') {
    return `Du är en expert på att läsa av laktatmätare. Analysera denna bild och extrahera laktatvärdet.
${contextInfo}

VIKTIGT:
1. Läs av det exakta värdet som visas på displayen
2. Identifiera om det är en Lactate Pro 2, Lactate Scout, eller annan mätare
3. Notera eventuella kvalitetsproblem med bilden (bländning, vinkel, skärpa)
4. Varna om värdet verkar ovanligt (>15 mmol/L är mycket högt, <0.5 är mycket lågt)
5. Om displayen visar ett felmeddelande (LO, HI, E-1, etc.), rapportera det

Typiska laktatvärden:
- Vila: 0.5-2.0 mmol/L
- Aerob tröskel: 2.0-2.5 mmol/L
- Anaerob tröskel: 3.5-5.0 mmol/L
- Maximal ansträngning: 8-20+ mmol/L`
  }

  return `You are an expert at reading lactate meters. Analyze this image and extract the lactate value.
${contextInfo}

IMPORTANT:
1. Read the exact value shown on the display
2. Identify whether it is a Lactate Pro 2, Lactate Scout, or another meter
3. Note any image quality issues (glare, angle, sharpness)
4. Warn if the value appears unusual (>15 mmol/L is very high, <0.5 is very low)
5. If the display shows an error message (LO, HI, E-1, etc.), report it

Typical lactate values:
- Rest: 0.5-2.0 mmol/L
- Aerobic threshold: 2.0-2.5 mmol/L
- Anaerobic threshold: 3.5-5.0 mmol/L
- Maximal effort: 8-20+ mmol/L`
}

function getUserLocale(language: string | null | undefined): AppLocale {
  return language === 'sv' ? 'sv' : 'en'
}

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}
