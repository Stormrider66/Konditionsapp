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
import type { AIModel as PrismaAIModel, AIProvider } from '@prisma/client'

// Transform database model to match the expected interface in DefaultModelSelector
function transformModel(dbModel: PrismaAIModel) {
  return {
    id: dbModel.id,
    provider: dbModel.provider,
    modelId: dbModel.modelId,
    displayName: dbModel.displayName,
    name: dbModel.displayName,
    description: dbModel.description,
    capabilities: {
      reasoning: 'excellent' as const,
      speed: 'medium' as const,
      contextWindow: dbModel.maxTokens || 128000,
      maxOutputTokens: dbModel.maxOutputTokens || 8192,
    },
    pricing: {
      // Convert from per 1K tokens to per 1M tokens
      input: (dbModel.inputCostPer1k || 0) * 1000,
      output: (dbModel.outputCostPer1k || 0) * 1000,
    },
    recommended: dbModel.isDefault,
    bestForLongOutput: (dbModel.maxOutputTokens || 0) >= 32000,
  }
}

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
      const validProviders: AIProvider[] = [];
      if (userSettings.googleKeyValid) validProviders.push('GOOGLE');
      if (userSettings.anthropicKeyValid) validProviders.push('ANTHROPIC');
      if (userSettings.openaiKeyValid) validProviders.push('OPENAI');

      if (validProviders.length > 0) {
        // Find a default model for an available provider
        effectiveModel = await prisma.aIModel.findFirst({
          where: {
            provider: { in: validProviders },
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
      defaultModel: effectiveModel ? transformModel(effectiveModel) : null,
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
      // Try to find by database ID first, then by modelId (string identifier)
      let model = await prisma.aIModel.findUnique({
        where: { id: modelId },
      });

      if (!model) {
        // Try by exact modelId (e.g., "gemini-3-flash-preview")
        model = await prisma.aIModel.findUnique({
          where: { modelId: modelId },
        });
      }

      if (!model) {
        // Try by modelId starting with the input (e.g., "gemini-3-flash" matches "gemini-3-flash-preview")
        model = await prisma.aIModel.findFirst({
          where: {
            modelId: { startsWith: modelId },
            isActive: true,
          },
        });
      }

      if (!model) {
        // Final attempt: search by display name or partial match
        model = await prisma.aIModel.findFirst({
          where: {
            OR: [
              { displayName: { contains: modelId, mode: 'insensitive' } },
              { modelId: { contains: modelId, mode: 'insensitive' } },
            ],
            isActive: true,
          },
        });
      }

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

      // Update or create user settings with the database UUID
      await prisma.userApiKey.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          defaultModelId: model.id, // Use database UUID, not input string
        },
        update: {
          defaultModelId: model.id, // Use database UUID, not input string
        },
      });
    } else {
      // Clear the default model
      await prisma.userApiKey.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          defaultModelId: null,
        },
        update: {
          defaultModelId: null,
        },
      });
    }

    // Fetch the updated model
    const updatedSettings = await prisma.userApiKey.findUnique({
      where: { userId: user.id },
      include: {
        defaultModel: true,
      },
    });

    return NextResponse.json({
      success: true,
      defaultModel: updatedSettings?.defaultModel ? transformModel(updatedSettings.defaultModel) : null,
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
