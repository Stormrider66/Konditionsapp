import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { rateLimitJsonResponse } from '@/lib/api/rate-limit'
import { checkAthleteFeatureAccess } from '@/lib/subscription/feature-access'
import { requireAiAllowance } from '@/lib/ai/billing/require-ai-allowance'
import { isAiAssistantOperationsEnabled } from '@/lib/ai/capabilities/feature-gate'
import { createAiActionDraftForTool } from '@/lib/ai/capabilities/action-drafts'
import { createCardioWorkoutInputSchema } from '@/lib/ai/cardio-workout-action'
import { buildCardioFocusModeSegments } from '@/lib/cardio/focus-mode-segments'
import { buildCardioSessionSummary } from '@/lib/cardio/session-summary'
import { buildCardioDebriefAdjustmentDraft } from '@/lib/cardio/debrief-adjustment-draft'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const requestSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let locale: AppLocale = resolveRequestLocale(request)

  try {
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json({ success: false, error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    locale = resolveRequestLocale(request, resolved.user.language)

    const access = await checkAthleteFeatureAccess(resolved.clientId, 'ai_chat', locale)
    if (!access.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: access.reason || t(locale, 'AI chat requires a subscription', 'AI-chat kräver en prenumeration'),
          code: access.code || 'SUBSCRIPTION_REQUIRED',
          upgradeUrl: access.upgradeUrl,
          currentUsage: access.currentUsage,
          limit: access.limit,
        },
        { status: 403 },
      )
    }

    const rateLimited = await rateLimitJsonResponse('cardio:adjustment-draft', resolved.user.id, {
      limit: 8,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    const allowanceDenied = await requireAiAllowance(resolved.clientId)
    if (allowanceDenied) return allowanceDenied

    const { id: assignmentId } = await params
    const body = await request.json().catch(() => ({}))
    const parsedBody = requestSchema.safeParse(body)
    if (!parsedBody.success) {
      return NextResponse.json(
        { success: false, error: t(locale, 'Invalid adjustment request.', 'Ogiltig justeringsförfrågan.') },
        { status: 400 },
      )
    }

    const assignment = await prisma.cardioSessionAssignment.findFirst({
      where: {
        id: assignmentId,
        athleteId: resolved.clientId,
      },
      include: {
        session: {
          select: {
            id: true,
            name: true,
            description: true,
            sport: true,
            segments: true,
          },
        },
        athlete: {
          select: {
            businessId: true,
            business: { select: { slug: true } },
          },
        },
      },
    })

    if (!assignment) {
      return NextResponse.json(
        { success: false, error: t(locale, 'Assignment not found', 'Tilldelningen hittades inte') },
        { status: 404 },
      )
    }

    const operationsEnabled = await isAiAssistantOperationsEnabled(assignment.athlete.businessId)
    if (!operationsEnabled) {
      return NextResponse.json(
        {
          success: false,
          error: t(locale, 'AI action confirmations are not enabled for this organization.', 'AI-bekräftelser är inte aktiverade för den här verksamheten.'),
        },
        { status: 403 },
      )
    }

    const logInclude = {
      segmentLogs: { orderBy: { segmentIndex: 'asc' as const } },
    }
    const log = await prisma.cardioSessionLog.findFirst({
      where: { assignmentId, status: 'COMPLETED' },
      include: logInclude,
      orderBy: { startedAt: 'desc' },
    })

    if (!log) {
      return NextResponse.json(
        { success: false, error: t(locale, 'Complete the workout before preparing an adjustment.', 'Slutför passet innan en justering förbereds.') },
        { status: 400 },
      )
    }

    const summary = buildCardioSessionSummary({
      session: assignment.session,
      log,
      locale,
    })
    const focusSegments = buildCardioFocusModeSegments({
      segments: assignment.session.segments,
      segmentLogs: log.segmentLogs,
      locale,
    })
    const adjustment = buildCardioDebriefAdjustmentDraft({
      summary,
      focusSegments,
      locale,
      targetDate: parsedBody.data.date,
    })

    if (!adjustment) {
      return NextResponse.json(
        { success: false, error: t(locale, 'This workout does not have enough structure to prepare an adjustment.', 'Passet har inte tillräcklig struktur för att förbereda en justering.') },
        { status: 400 },
      )
    }

    const parsedInput = createCardioWorkoutInputSchema.safeParse(adjustment.input)
    if (!parsedInput.success) {
      return NextResponse.json(
        {
          success: false,
          error: t(locale, 'The adjustment details were incomplete.', 'Justeringsdetaljerna var ofullständiga.'),
          details: parsedInput.error.flatten(),
        },
        { status: 400 },
      )
    }

    const draft = await createAiActionDraftForTool(
      'createCardioWorkout',
      parsedInput.data,
      {
        enabled: true,
        actorUserId: resolved.user.id,
        actorRole: 'ATHLETE',
        surface: 'athlete_chat',
        businessId: assignment.athlete.businessId,
        businessSlug: assignment.athlete.business?.slug ?? null,
        clientId: resolved.clientId,
        locale,
      },
      adjustment.preview,
    )

    return NextResponse.json({
      ...draft,
      adjustment: {
        type: adjustment.adjustmentType,
        rationale: adjustment.rationale,
      },
    })
  } catch (error) {
    logger.error('Cardio adjustment draft error', {}, error)
    return NextResponse.json(
      { success: false, error: t(locale, 'Could not prepare the adjustment.', 'Kunde inte förbereda justeringen.') },
      { status: 500 },
    )
  }
}
