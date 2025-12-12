/**
 * Lactate Meter OCR API
 *
 * POST /api/ai/lactate-ocr
 *
 * Uses Gemini 3 Pro's multimodal OCR capabilities to extract lactate readings
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
import { requireCoach } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { GEMINI_MODELS, getGeminiThinkingOptions } from '@/lib/ai/gemini-config';
import { LactateMeterOCRSchema } from '@/lib/validations/gemini-schemas';
import { decryptSecret } from '@/lib/crypto/secretbox';

export async function POST(request: NextRequest) {
  try {
    const user = await requireCoach();

    // Get form data with image
    const formData = await request.formData();
    const imageFile = formData.get('image') as File | null;
    const clientId = formData.get('clientId') as string | null;
    const testStageContext = formData.get('testStageContext') as string | null;

    if (!imageFile) {
      return NextResponse.json(
        { error: 'Ingen bild uppladdad' },
        { status: 400 }
      );
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
    if (!validTypes.includes(imageFile.type)) {
      return NextResponse.json(
        { error: 'Ogiltigt bildformat. Använd JPEG, PNG, WebP eller HEIC.' },
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
        { error: 'Google API-nyckel saknas. Konfigurera i Inställningar.' },
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
      const client = await prisma.client.findFirst({
        where: { id: clientId, userId: user.id },
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
    const result = await generateObject({
      model: google(GEMINI_MODELS.VIDEO_ANALYSIS),
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
              text: `Du är en expert på att läsa av laktatmätare. Analysera denna bild och extrahera laktatvärdet.
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
- Maximal ansträngning: 8-20+ mmol/L`,
            },
          ],
        },
      ],
    });

    // Log for debugging
    console.log('Lactate OCR result:', {
      lactateValue: result.object.reading.lactateValue,
      confidence: result.object.reading.confidence,
      brand: result.object.deviceInfo.detectedBrand,
    });

    return NextResponse.json({
      success: true,
      result: result.object,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Lactate OCR error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      {
        error: 'Kunde inte läsa av laktatmätaren',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
