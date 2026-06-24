import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser, getRequestedBusinessScope } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { canAccessCoachPlatform } from '@/lib/user-capabilities'
import { getStaffPermissions } from '@/lib/permissions/assistant-coach'
import { rateLimitJsonResponse } from '@/lib/api/rate-limit'
import { isAiAssistantOperationsEnabled } from '@/lib/ai/capabilities/feature-gate'
import { createAiActionDraftForTool } from '@/lib/ai/capabilities/action-drafts'
import { buildCoachMessageAction } from '@/lib/ai/coach-message-actions'
import { buildCoachDailyBriefingPreview } from '@/lib/ai/coach-briefing-actions'
import {
  buildCreateAndAssignCardioWorkoutPreview,
  buildModifyCardioAssignmentPreview,
  buildModifyTeamCardioAssignmentsPreview,
  buildRepeatPreviousCardioWorkoutPreview,
} from '@/lib/ai/coach-cardio-actions'
import {
  buildPrepareCoachMessageDraftPreview,
  CREATE_AND_ASSIGN_CARDIO_WORKOUT_TOOL_NAME,
  getCoachLiveVoiceActionDraftSchema,
  isCoachLiveVoiceActionDraftToolName,
  MODIFY_CARDIO_ASSIGNMENT_TOOL_NAME,
  MODIFY_TEAM_CARDIO_ASSIGNMENTS_TOOL_NAME,
  PREPARE_COACH_MESSAGE_DRAFT_TOOL_NAME,
  PREPARE_COACH_DAILY_BRIEFING_TOOL_NAME,
  REPEAT_PREVIOUS_CARDIO_WORKOUT_TOOL_NAME,
  type CoachLiveVoiceActionDraftToolName,
  type CoachLiveVoiceCreateAndAssignCardioInput,
  type CoachLiveVoiceDailyBriefingInput,
  type CoachLiveVoiceModifyCardioInput,
  type CoachLiveVoiceModifyTeamCardioInput,
  type CoachLiveVoiceRepeatPreviousCardioInput,
} from '@/lib/ai/coach-live-voice-tools'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const requestSchema = z.object({
  toolName: z.string().min(1).max(120),
  arguments: z.unknown(),
  callId: z.string().max(200).optional(),
  businessSlug: z.string().trim().min(1).max(120).optional(),
})

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

function parseToolArguments(value: unknown): unknown {
  if (typeof value !== 'string') return value
  return JSON.parse(value)
}

async function resolveBusiness(businessSlug?: string): Promise<{ id: string; slug: string } | null> {
  if (!businessSlug) return null
  return prisma.business.findUnique({
    where: { slug: businessSlug },
    select: { id: true, slug: true },
  })
}

async function createCoachActionDraft(
  toolName: CoachLiveVoiceActionDraftToolName,
  input: unknown,
  params: {
    coachUserId: string
    businessId: string | null
    businessSlug?: string
    locale: AppLocale
  }
) {
  switch (toolName) {
    case PREPARE_COACH_MESSAGE_DRAFT_TOOL_NAME: {
      const messageResult = await buildCoachMessageAction(
        params.coachUserId,
        input as Parameters<typeof buildCoachMessageAction>[1],
        params.businessSlug,
        params.locale,
      )
      if (!messageResult.success) return messageResult

      return createAiActionDraftForTool(
        PREPARE_COACH_MESSAGE_DRAFT_TOOL_NAME,
        input,
        {
          enabled: true,
          actorUserId: params.coachUserId,
          actorRole: 'COACH',
          surface: 'coach_chat',
          businessId: params.businessId,
          businessSlug: params.businessSlug ?? null,
          locale: params.locale,
        },
        buildPrepareCoachMessageDraftPreview(messageResult.action, input as Parameters<typeof buildCoachMessageAction>[1])
      )
    }
    case PREPARE_COACH_DAILY_BRIEFING_TOOL_NAME: {
      const preview = await buildCoachDailyBriefingPreview(
        params.coachUserId,
        input as CoachLiveVoiceDailyBriefingInput,
        params.businessSlug,
        params.locale,
      )
      if (!preview.success) return preview
      return createAiActionDraftForTool(
        PREPARE_COACH_DAILY_BRIEFING_TOOL_NAME,
        input,
        {
          enabled: true,
          actorUserId: params.coachUserId,
          actorRole: 'COACH',
          surface: 'coach_chat',
          businessId: params.businessId,
          businessSlug: params.businessSlug ?? null,
          locale: params.locale,
        },
        preview.preview,
      )
    }
    case CREATE_AND_ASSIGN_CARDIO_WORKOUT_TOOL_NAME: {
      const preview = await buildCreateAndAssignCardioWorkoutPreview(
        params.coachUserId,
        input as CoachLiveVoiceCreateAndAssignCardioInput,
        params.businessSlug,
        params.locale,
      )
      if (!preview.success) return preview
      return createAiActionDraftForTool(
        CREATE_AND_ASSIGN_CARDIO_WORKOUT_TOOL_NAME,
        input,
        {
          enabled: true,
          actorUserId: params.coachUserId,
          actorRole: 'COACH',
          surface: 'coach_chat',
          businessId: params.businessId,
          businessSlug: params.businessSlug ?? null,
          locale: params.locale,
        },
        preview.preview,
      )
    }
    case MODIFY_CARDIO_ASSIGNMENT_TOOL_NAME: {
      const preview = await buildModifyCardioAssignmentPreview(
        params.coachUserId,
        input as CoachLiveVoiceModifyCardioInput,
        params.businessSlug,
        params.locale,
      )
      if (!preview.success) return preview
      return createAiActionDraftForTool(
        MODIFY_CARDIO_ASSIGNMENT_TOOL_NAME,
        input,
        {
          enabled: true,
          actorUserId: params.coachUserId,
          actorRole: 'COACH',
          surface: 'coach_chat',
          businessId: params.businessId,
          businessSlug: params.businessSlug ?? null,
          locale: params.locale,
        },
        preview.preview,
      )
    }
    case REPEAT_PREVIOUS_CARDIO_WORKOUT_TOOL_NAME: {
      const preview = await buildRepeatPreviousCardioWorkoutPreview(
        params.coachUserId,
        input as CoachLiveVoiceRepeatPreviousCardioInput,
        params.businessSlug,
        params.locale,
      )
      if (!preview.success) return preview
      return createAiActionDraftForTool(
        REPEAT_PREVIOUS_CARDIO_WORKOUT_TOOL_NAME,
        input,
        {
          enabled: true,
          actorUserId: params.coachUserId,
          actorRole: 'COACH',
          surface: 'coach_chat',
          businessId: params.businessId,
          businessSlug: params.businessSlug ?? null,
          locale: params.locale,
        },
        preview.preview,
      )
    }
    case MODIFY_TEAM_CARDIO_ASSIGNMENTS_TOOL_NAME: {
      const preview = await buildModifyTeamCardioAssignmentsPreview(
        params.coachUserId,
        input as CoachLiveVoiceModifyTeamCardioInput,
        params.businessSlug,
        params.locale,
      )
      if (!preview.success) return preview
      return createAiActionDraftForTool(
        MODIFY_TEAM_CARDIO_ASSIGNMENTS_TOOL_NAME,
        input,
        {
          enabled: true,
          actorUserId: params.coachUserId,
          actorRole: 'COACH',
          surface: 'coach_chat',
          businessId: params.businessId,
          businessSlug: params.businessSlug ?? null,
          locale: params.locale,
        },
        preview.preview,
      )
    }
  }
}

export async function POST(request: NextRequest) {
  let locale: AppLocale = resolveRequestLocale(request)

  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    locale = resolveRequestLocale(request, user.language)

    const hasCoachAccess = await canAccessCoachPlatform(user.id)
    if (!hasCoachAccess) {
      return NextResponse.json({ success: false, error: t(locale, 'Coach access required', 'Coachbehörighet krävs') }, { status: 403 })
    }

    const rateLimited = await rateLimitJsonResponse('ai:chat-realtime-coach-action-drafts', user.id, {
      limit: 12,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    const body = await request.json().catch(() => null)
    const parsedRequest = requestSchema.safeParse(body)
    if (!parsedRequest.success || !isCoachLiveVoiceActionDraftToolName(parsedRequest.data.toolName)) {
      return NextResponse.json(
        { success: false, error: t(locale, 'Unsupported coach live voice action.', 'Coachens live voice-åtgärd stöds inte.') },
        { status: 400 }
      )
    }

    const scope = getRequestedBusinessScope(request)
    const businessSlug = parsedRequest.data.businessSlug || scope.businessSlug
    const [business, staffPermissions] = await Promise.all([
      resolveBusiness(businessSlug),
      getStaffPermissions(user.id, businessSlug, { locale }),
    ])

    if (!staffPermissions.canViewAthletes) {
      return NextResponse.json(
        { success: false, error: t(locale, 'You do not have permission to view athletes.', 'Du har inte behörighet att se atleter.') },
        { status: 403 }
      )
    }

    const toolName = parsedRequest.data.toolName
    if (
      (
        toolName === CREATE_AND_ASSIGN_CARDIO_WORKOUT_TOOL_NAME ||
        toolName === MODIFY_CARDIO_ASSIGNMENT_TOOL_NAME ||
        toolName === REPEAT_PREVIOUS_CARDIO_WORKOUT_TOOL_NAME ||
        toolName === MODIFY_TEAM_CARDIO_ASSIGNMENTS_TOOL_NAME
      ) &&
      (!staffPermissions.canCreateEvents || !staffPermissions.canAccessStudios)
    ) {
      return NextResponse.json(
        { success: false, error: t(locale, 'You do not have permission to prepare workout assignment actions.', 'Du har inte behörighet att förbereda tilldelning av pass.') },
        { status: 403 }
      )
    }

    const operationsEnabled = await isAiAssistantOperationsEnabled(business?.id ?? null)
    if (!operationsEnabled) {
      return NextResponse.json(
        {
          success: false,
          error: t(locale, 'AI action confirmations are not enabled for this organization.', 'AI-bekräftelser är inte aktiverade för den här verksamheten.'),
        },
        { status: 403 }
      )
    }

    let rawArguments: unknown
    try {
      rawArguments = parseToolArguments(parsedRequest.data.arguments)
    } catch {
      return NextResponse.json(
        { success: false, error: t(locale, 'The action arguments were not valid JSON.', 'Åtgärdsargumenten var inte giltig JSON.') },
        { status: 400 }
      )
    }

    const parsedInput = getCoachLiveVoiceActionDraftSchema(toolName).safeParse(rawArguments)
    if (!parsedInput.success) {
      return NextResponse.json(
        {
          success: false,
          error: t(locale, 'The action details were incomplete or invalid.', 'Åtgärdsdetaljerna var ofullständiga eller ogiltiga.'),
          details: parsedInput.error.flatten(),
        },
        { status: 400 }
      )
    }

    const draft = await createCoachActionDraft(toolName, parsedInput.data, {
      coachUserId: user.id,
      businessId: business?.id ?? null,
      businessSlug: business?.slug ?? businessSlug,
      locale,
    })

    return NextResponse.json({
      ...draft,
      callId: parsedRequest.data.callId,
    })
  } catch (error) {
    logger.error('Realtime coach action draft error', {}, error)
    return NextResponse.json(
      { success: false, error: t(locale, 'Could not prepare the coach live voice action.', 'Kunde inte förbereda coachens live voice-åtgärd.') },
      { status: 500 }
    )
  }
}
