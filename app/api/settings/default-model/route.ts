/**
 * Default AI Model Settings
 *
 * GET /api/settings/default-model - Get user's default AI model
 * PUT /api/settings/default-model - Set user's default AI model
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCoach } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { logError } from '@/lib/logger-console'

// GET - Get user's default AI model
export async function GET() {
  try {
    const user = await requireCoach();

    const userSettings = await prisma.userApiKey.findUnique({
      where: { userId: user.id },
      include: {
        defaultModel: true,
      },
    });

    // If no default model set, find the first available model the user has a key for
    let effectiveModel = userSettings?.defaultModel;

    if (!effectiveModel && userSettings) {
      // Determine which providers the user has valid keys for
      const validProviders: string[] = [];
      if (userSettings.googleKeyValid) validProviders.push('GOOGLE');
      if (userSettings.anthropicKeyValid) validProviders.push('ANTHROPIC');
      if (userSettings.openaiKeyValid) validProviders.push('OPENAI');

      if (validProviders.length > 0) {
        // Find a default model for an available provider
        effectiveModel = await prisma.aIModel.findFirst({
          where: {
            provider: { in: validProviders as any },
            isActive: true,
          },
          orderBy: [
            { isDefault: 'desc' },
            { displayName: 'asc' },
          ],
        });
      }
    }

    return NextResponse.json({
      success: true,
      defaultModel: effectiveModel,
      isExplicitlySet: !!userSettings?.defaultModelId,
    });
  } catch (error) {
    logError('Get default model error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to get default model' },
      { status: 500 }
    );
  }
}

// PUT - Set user's default AI model
export async function PUT(request: NextRequest) {
  try {
    const user = await requireCoach();
    const body = await request.json();
    const { modelId } = body;

    // Validate model exists and is active
    if (modelId) {
      const model = await prisma.aIModel.findUnique({
        where: { id: modelId },
      });

      if (!model) {
        return NextResponse.json(
          { error: 'Model not found' },
          { status: 404 }
        );
      }

      if (!model.isActive) {
        return NextResponse.json(
          { error: 'Model is not active' },
          { status: 400 }
        );
      }

      // Check if user has a valid API key for this provider
      const userKeys = await prisma.userApiKey.findUnique({
        where: { userId: user.id },
      });

      const hasValidKey =
        (model.provider === 'ANTHROPIC' && userKeys?.anthropicKeyValid) ||
        (model.provider === 'GOOGLE' && userKeys?.googleKeyValid) ||
        (model.provider === 'OPENAI' && userKeys?.openaiKeyValid);

      if (!hasValidKey) {
        return NextResponse.json(
          { error: `Du har ingen giltig API-nyckel för ${model.provider}` },
          { status: 400 }
        );
      }
    }

    // Update or create user settings
    await prisma.userApiKey.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        defaultModelId: modelId || null,
      },
      update: {
        defaultModelId: modelId || null,
      },
    });

    // Fetch the updated model
    const updatedSettings = await prisma.userApiKey.findUnique({
      where: { userId: user.id },
      include: {
        defaultModel: true,
      },
    });

    return NextResponse.json({
      success: true,
      defaultModel: updatedSettings?.defaultModel,
      message: modelId
        ? 'Standardmodell sparad'
        : 'Standardmodell återställd',
    });
  } catch (error) {
    logError('Set default model error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to set default model' },
      { status: 500 }
    );
  }
}
