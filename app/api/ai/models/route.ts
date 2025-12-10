/**
 * AI Models API
 *
 * GET /api/ai/models - Get all available AI models
 */

import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all active AI models
    const models = await prisma.aIModel.findMany({
      where: { isActive: true },
      orderBy: [
        { isDefault: 'desc' },
        { provider: 'asc' },
        { displayName: 'asc' },
      ],
      select: {
        id: true,
        provider: true,
        modelId: true,
        displayName: true,
        description: true,
        capabilities: true,
        isDefault: true,
        maxTokens: true,
        maxOutputTokens: true,
        inputCostPer1k: true,
        outputCostPer1k: true,
      },
    });

    return NextResponse.json({
      success: true,
      models,
    });
  } catch (error) {
    console.error('Get AI models error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch AI models' },
      { status: 500 }
    );
  }
}
