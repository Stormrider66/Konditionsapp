/**
 * API Key Validation
 *
 * POST /api/settings/api-keys/validate - Validate an API key before saving
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCoach } from '@/lib/auth-utils';
import OpenAI from 'openai';
import { rateLimitJsonResponse } from '@/lib/api/rate-limit';
import { logger } from '@/lib/logger'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

interface ValidateKeyRequest {
  provider: 'anthropic' | 'google' | 'openai';
  key: string;
}

// POST - Validate a single API key
export async function POST(request: NextRequest) {
  let locale = resolveRequestLocale(request)

  try {
    const user = await requireCoach();
    locale = resolveRequestLocale(request, user.language)

    // Rate limit key validation attempts per user
    const rateLimited = await rateLimitJsonResponse('settings:api-keys:validate', user.id, {
      limit: 10,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    const body: ValidateKeyRequest = await request.json();
    const { provider, key } = body;

    if (!provider || !key) {
      return NextResponse.json(
        { error: t(locale, 'Provider and key are required', 'Leverantör och nyckel krävs') },
        { status: 400 }
      );
    }

    let valid = false;
    let error: string | undefined;
    let details: Record<string, unknown> | undefined;

    switch (provider) {
      case 'openai':
        try {
          const openai = new OpenAI({ apiKey: key });
          const models = await openai.models.list();
          valid = true;
          details = {
            modelCount: models.data.length,
            availableModels: models.data
              .slice(0, 5)
              .map((m) => m.id),
          };
        } catch (e) {
          valid = false;
          error = e instanceof Error ? e.message : t(locale, 'Invalid OpenAI API key', 'Ogiltig OpenAI API-nyckel');
        }
        break;

      case 'anthropic':
        // Validate format first
        if (!key.startsWith('sk-ant-')) {
          valid = false;
          error = t(locale, 'Invalid Anthropic API key format. Keys should start with sk-ant-', 'Ogiltigt format på Anthropic API-nyckel. Nycklar ska börja med sk-ant-');
        } else {
          // Try to make an API call
          try {
            const response = await fetch('https://api.anthropic.com/v1/messages', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-api-key': key,
                'anthropic-version': '2023-06-01',
              },
              body: JSON.stringify({
                model: 'claude-3-haiku-20240307',
                max_tokens: 1,
                messages: [{ role: 'user', content: 'Hi' }],
              }),
            });

            if (response.ok) {
              valid = true;
              details = { provider: 'Anthropic', status: 'Active' };
            } else {
              const errorData = await response.json();
              valid = false;
              error = errorData.error?.message || `API returned ${response.status}`;
            }
          } catch (e) {
            valid = false;
            error = e instanceof Error ? e.message : t(locale, 'Failed to validate Anthropic key', 'Kunde inte validera Anthropic-nyckeln');
          }
        }
        break;

      case 'google':
        // Google/Gemini API validation
        if (key.length < 20) {
          valid = false;
          error = t(locale, 'Invalid Google API key format', 'Ogiltigt format på Google API-nyckel');
        } else {
          try {
            const response = await fetch(
              `https://generativelanguage.googleapis.com/v1/models?key=${key}`
            );

            if (response.ok) {
              const data = await response.json();
              valid = true;
              details = {
                provider: 'Google AI',
                modelCount: data.models?.length || 0,
              };
            } else {
              const errorData = await response.json();
              valid = false;
              error = errorData.error?.message || `API returned ${response.status}`;
            }
          } catch (e) {
            valid = false;
            error = e instanceof Error ? e.message : t(locale, 'Failed to validate Google key', 'Kunde inte validera Google-nyckeln');
          }
        }
        break;

      default:
        return NextResponse.json(
          { error: t(locale, `Invalid provider: ${provider}`, `Ogiltig leverantör: ${provider}`) },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      provider,
      valid,
      error,
      details,
    });
  } catch (error) {
    logger.error('Validate API key error', {}, error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 });
    }

    return NextResponse.json(
      { error: t(locale, 'Failed to validate API key', 'Kunde inte validera API-nyckel') },
      { status: 500 }
    );
  }
}
