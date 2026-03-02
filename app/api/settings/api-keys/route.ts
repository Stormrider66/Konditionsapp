/**
 * API Keys Management
 *
 * GET /api/settings/api-keys - Get API key status (not actual keys)
 * POST /api/settings/api-keys - Save/update API keys
 * DELETE /api/settings/api-keys - Remove all API keys
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCoach } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import OpenAI from 'openai';
import { encryptIfPresent } from '@/lib/user-api-keys';
import { rateLimitJsonResponse } from '@/lib/api/rate-limit';
import { logger } from '@/lib/logger'

interface ApiKeyStatus {
  provider: string;
  configured: boolean;
  valid: boolean;
  lastValidated: string | null;
}

interface SaveKeysRequest {
  anthropicKey?: string;
  googleKey?: string;
  openaiKey?: string;
}

// GET - Get API key status (does not return actual keys)
export async function GET() {
  try {
    const user = await requireCoach();

    const rateLimited = await rateLimitJsonResponse('settings:api-keys:get', user.id, {
      limit: 60,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    const apiKeys = await prisma.userApiKey.findUnique({
      where: { userId: user.id },
    });

    const hasPersonalKeys = !!(
      apiKeys?.anthropicKeyValid ||
      apiKeys?.googleKeyValid ||
      apiKeys?.openaiKeyValid
    )

    // If no valid personal keys, check business keys as fallback
    let businessKeys: {
      anthropicKeyEncrypted: string | null
      googleKeyEncrypted: string | null
      openaiKeyEncrypted: string | null
      anthropicKeyValid: boolean
      googleKeyValid: boolean
      openaiKeyValid: boolean
      anthropicKeyLastValidated: Date | null
      googleKeyLastValidated: Date | null
      openaiKeyLastValidated: Date | null
    } | null = null

    if (!hasPersonalKeys) {
      businessKeys = await prisma.businessAiKeys.findFirst({
        where: {
          business: {
            members: {
              some: { userId: user.id, isActive: true },
            },
          },
        },
        select: {
          anthropicKeyEncrypted: true,
          googleKeyEncrypted: true,
          openaiKeyEncrypted: true,
          anthropicKeyValid: true,
          googleKeyValid: true,
          openaiKeyValid: true,
          anthropicKeyLastValidated: true,
          googleKeyLastValidated: true,
          openaiKeyLastValidated: true,
        },
      })
    }

    // Use business keys as fallback if no personal keys
    const effectiveKeys = hasPersonalKeys ? apiKeys : businessKeys

    const status: ApiKeyStatus[] = [
      {
        provider: 'anthropic',
        configured: !!(effectiveKeys as typeof apiKeys)?.anthropicKeyEncrypted,
        valid: effectiveKeys?.anthropicKeyValid ?? false,
        lastValidated: effectiveKeys?.anthropicKeyLastValidated?.toISOString() ?? null,
      },
      {
        provider: 'google',
        configured: !!(effectiveKeys as typeof apiKeys)?.googleKeyEncrypted,
        valid: effectiveKeys?.googleKeyValid ?? false,
        lastValidated: effectiveKeys?.googleKeyLastValidated?.toISOString() ?? null,
      },
      {
        provider: 'openai',
        configured: !!(effectiveKeys as typeof apiKeys)?.openaiKeyEncrypted,
        valid: effectiveKeys?.openaiKeyValid ?? false,
        lastValidated: effectiveKeys?.openaiKeyLastValidated?.toISOString() ?? null,
      },
    ];

    return NextResponse.json({
      success: true,
      keys: status,
      source: hasPersonalKeys ? 'user' : (businessKeys ? 'business' : 'none'),
    });
  } catch (error) {
    logger.error('Get API keys error', {}, error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to get API key status' },
      { status: 500 }
    );
  }
}

// POST - Save/update API keys
export async function POST(request: NextRequest) {
  try {
    const user = await requireCoach();

    const rateLimited = await rateLimitJsonResponse('settings:api-keys:save', user.id, {
      limit: 10,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    const body: SaveKeysRequest = await request.json();
    const { anthropicKey, googleKey, openaiKey } = body;

    if (!anthropicKey && !googleKey && !openaiKey) {
      return NextResponse.json(
        { error: 'At least one API key must be provided' },
        { status: 400 }
      );
    }

    const validationResults: Record<
      string,
      { valid: boolean; error?: string }
    > = {};

    // Validate OpenAI key if provided
    if (openaiKey) {
      try {
        const openai = new OpenAI({ apiKey: openaiKey });
        // Make a simple API call to validate
        await openai.models.list();
        validationResults.openai = { valid: true };
      } catch (error) {
        validationResults.openai = {
          valid: false,
          error:
            error instanceof Error ? error.message : 'Invalid OpenAI API key',
        };
      }
    }

    // Validate Anthropic key if provided
    if (anthropicKey) {
      try {
        // Simple validation - check format (sk-ant-api03-... or sk-ant-...)
        if (!anthropicKey.startsWith('sk-ant-')) {
          validationResults.anthropic = {
            valid: false,
            error: 'Invalid Anthropic API key format. Key should start with sk-ant-',
          };
        } else {
          // Make actual API call to validate by listing models
          const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': anthropicKey,
              'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
              model: 'claude-sonnet-4-6',
              max_tokens: 1,
              messages: [{ role: 'user', content: 'Hi' }],
            }),
          });

          if (response.ok || response.status === 200) {
            validationResults.anthropic = { valid: true };
          } else {
            const errorData = await response.json().catch(() => ({}));
            validationResults.anthropic = {
              valid: false,
              error: errorData.error?.message || `API returned status ${response.status}`,
            };
          }
        }
      } catch (error) {
        validationResults.anthropic = {
          valid: false,
          error:
            error instanceof Error
              ? error.message
              : 'Invalid Anthropic API key',
        };
      }
    }

    // Validate Google key if provided
    if (googleKey) {
      try {
        const googleResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(googleKey)}`
        );

        if (googleResponse.ok) {
          validationResults.google = { valid: true };
        } else {
          const errorData = await googleResponse.json().catch(() => ({}));
          validationResults.google = {
            valid: false,
            error: errorData.error?.message || `API returned status ${googleResponse.status}`,
          };
        }
      } catch (error) {
        validationResults.google = {
          valid: false,
          error:
            error instanceof Error ? error.message : 'Invalid Google API key',
        };
      }
    }

    // Check if any provided keys are invalid
    const invalidKeys = Object.entries(validationResults)
      .filter(([, result]) => !result.valid)
      .map(([provider, result]) => ({
        provider,
        error: result.error,
      }));

    if (invalidKeys.length > 0) {
      return NextResponse.json(
        {
          error: 'One or more API keys are invalid',
          invalidKeys,
        },
        { status: 400 }
      );
    }

    // Upsert API keys
    const now = new Date();
    let anthropicKeyEncrypted: string | null | undefined
    let googleKeyEncrypted: string | null | undefined
    let openaiKeyEncrypted: string | null | undefined

    try {
      anthropicKeyEncrypted = encryptIfPresent(anthropicKey)
      googleKeyEncrypted = encryptIfPresent(googleKey)
      openaiKeyEncrypted = encryptIfPresent(openaiKey)
    } catch (e) {
      return NextResponse.json(
        {
          error:
            e instanceof Error
              ? e.message
              : 'Failed to encrypt API keys. Ensure API_KEY_ENCRYPTION_KEY is configured.',
        },
        { status: 500 }
      )
    }

    await prisma.userApiKey.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        anthropicKeyEncrypted: anthropicKeyEncrypted ?? null,
        googleKeyEncrypted: googleKeyEncrypted ?? null,
        openaiKeyEncrypted: openaiKeyEncrypted ?? null,
        anthropicKeyValid: anthropicKey ? validationResults.anthropic?.valid ?? false : false,
        googleKeyValid: googleKey ? validationResults.google?.valid ?? false : false,
        openaiKeyValid: openaiKey ? validationResults.openai?.valid ?? false : false,
        anthropicKeyLastValidated: anthropicKey ? now : null,
        googleKeyLastValidated: googleKey ? now : null,
        openaiKeyLastValidated: openaiKey ? now : null,
      },
      update: {
        ...(anthropicKey !== undefined
          ? {
              anthropicKeyEncrypted: anthropicKeyEncrypted ?? null,
              anthropicKeyValid: validationResults.anthropic?.valid ?? false,
              anthropicKeyLastValidated: now,
            }
          : {}),
        ...(googleKey !== undefined
          ? {
              googleKeyEncrypted: googleKeyEncrypted ?? null,
              googleKeyValid: validationResults.google?.valid ?? false,
              googleKeyLastValidated: now,
            }
          : {}),
        ...(openaiKey !== undefined
          ? {
              openaiKeyEncrypted: openaiKeyEncrypted ?? null,
              openaiKeyValid: validationResults.openai?.valid ?? false,
              openaiKeyLastValidated: now,
            }
          : {}),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'API keys saved successfully',
      validation: validationResults,
    });
  } catch (error) {
    logger.error('Save API keys error', {}, error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to save API keys' },
      { status: 500 }
    );
  }
}

// DELETE - Remove all API keys
export async function DELETE() {
  try {
    const user = await requireCoach();

    const rateLimited = await rateLimitJsonResponse('settings:api-keys:delete', user.id, {
      limit: 10,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    await prisma.userApiKey.deleteMany({
      where: { userId: user.id },
    });

    return NextResponse.json({
      success: true,
      message: 'All API keys removed',
    });
  } catch (error) {
    logger.error('Delete API keys error', {}, error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to delete API keys' },
      { status: 500 }
    );
  }
}
