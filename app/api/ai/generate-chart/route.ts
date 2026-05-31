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
import { requireAiAllowance } from '@/lib/ai/billing/require-ai-allowance'
import { withAiContext } from '@/lib/ai/usage-logger'
import { logger } from '@/lib/logger'

interface RequestBody {
  clientId: string;
  query: string;
  dataContext?: 'training_load' | 'wellness' | 'performance' | 'comparison' | 'all';
  startDate?: string;
  endDate?: string;
}

type AppLocale = 'en' | 'sv'

export async function POST(request: NextRequest) {
  let locale: AppLocale = 'en'

  try {
    const user = await requireCoach();
    locale = getUserLocale(user.language)

    const rateLimited = await rateLimitJsonResponse('ai:generate-chart', user.id, {
      limit: 10,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    const body: RequestBody = await request.json();

    const { clientId, query, dataContext, startDate, endDate } = body;

    if (!clientId) {
      return NextResponse.json(
        { error: t(locale, 'clientId is required', 'clientId är obligatoriskt') },
        { status: 400 }
      );
    }

    if (!query) {
      return NextResponse.json(
        { error: t(locale, 'query is required', 'query är obligatoriskt') },
        { status: 400 }
      );
    }

    const hasAccess = await canAccessClient(user.id, clientId)
    if (!hasAccess) {
      return NextResponse.json(
        { error: t(locale, 'Client not found or access denied', 'Atleten hittades inte eller saknar behörighet') },
        { status: 404 }
      );
    }

    const allowanceDenied = await requireAiAllowance(clientId)
    if (allowanceDenied) return allowanceDenied

    // Build request
    const chartRequest: GenerateChartRequest = {
      coachUserId: user.id,
      clientId,
      query,
      locale,
      dataContext: dataContext || 'all',
    };

    if (startDate && endDate) {
      chartRequest.timeRange = {
        start: new Date(startDate),
        end: new Date(endDate),
      };
    }

    // Generate chart
    const result = await withAiContext(
      { userId: user.id, clientId, category: 'athlete_generative_chart' },
      () => generateChartFromQuery(chartRequest),
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || t(locale, 'Failed to generate chart', 'Kunde inte skapa diagrammet') },
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
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 });
    }

    return NextResponse.json(
      { error: t(locale, 'Internal server error', 'Internt serverfel') },
      { status: 500 }
    );
  }
}

function getUserLocale(language: string | null | undefined): AppLocale {
  return language === 'sv' ? 'sv' : 'en'
}

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}
