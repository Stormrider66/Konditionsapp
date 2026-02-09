/**
 * Generative Chart API
 *
 * POST /api/ai/generate-chart
 *
 * Uses Gemini to generate Recharts configurations from natural language queries.
 * Example: "Show me the athlete's training load trend with ACWR"
 */

import { NextRequest, NextResponse } from 'next/server';
import { canAccessClient, requireCoach } from '@/lib/auth-utils';
import { generateChartFromQuery, type GenerateChartRequest } from '@/lib/ai/generative-charts';
import { rateLimitJsonResponse } from '@/lib/api/rate-limit';
import { logger } from '@/lib/logger'

interface RequestBody {
  clientId: string;
  query: string;
  dataContext?: 'training_load' | 'wellness' | 'performance' | 'comparison' | 'all';
  startDate?: string;
  endDate?: string;
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireCoach();

    const rateLimited = await rateLimitJsonResponse('ai:generate-chart', user.id, {
      limit: 10,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    const body: RequestBody = await request.json();

    const { clientId, query, dataContext, startDate, endDate } = body;

    if (!clientId) {
      return NextResponse.json(
        { error: 'clientId is required' },
        { status: 400 }
      );
    }

    if (!query) {
      return NextResponse.json(
        { error: 'query is required' },
        { status: 400 }
      );
    }

    const hasAccess = await canAccessClient(user.id, clientId)
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Client not found or access denied' },
        { status: 404 }
      );
    }

    // Build request
    const chartRequest: GenerateChartRequest = {
      coachUserId: user.id,
      clientId,
      query,
      dataContext: dataContext || 'all',
    };

    if (startDate && endDate) {
      chartRequest.timeRange = {
        start: new Date(startDate),
        end: new Date(endDate),
      };
    }

    // Generate chart
    const result = await generateChartFromQuery(chartRequest);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to generate chart' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      chart: result.chart,
      query: result.query,
      generatedAt: result.generatedAt,
    });
  } catch (error) {
    logger.error('Generate chart error', {}, error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
