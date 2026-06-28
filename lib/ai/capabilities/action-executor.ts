import 'server-only'

import type { AIActionDraft, Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { getStaffPermissions } from '@/lib/permissions/assistant-coach'
import { checkAthleteFeatureAccess } from '@/lib/subscription/feature-access'
import { getConsentStatus } from '@/lib/agent/gdpr/consent-manager'
import { logAgentAudit } from '@/lib/agent/gdpr/audit-logger'
import type { AuditAction } from '@/lib/agent/types'
import { createChatTools } from '@/lib/ai/chat-tools'
import { createCoachChatTools } from '@/lib/ai/coach-chat-tools'
import {
  findAiCapability,
  getAvailableAiCapabilities,
  type AiCapabilityRole,
} from './registry'
import { isAiAssistantOperationsEnabled } from './feature-gate'
import {
  sendCoachMessageAction,
  type PrepareCoachMessageDraftInput,
} from '@/lib/ai/coach-message-actions'
import {
  executeImportedWorkoutDraft,
  mergeImportedWorkoutDraftInput,
} from '@/lib/ai/athlete-workout-import'

type AppLocale = 'en' | 'sv'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? {})) as Prisma.InputJsonValue
}

async function auditExecution(
  draft: AIActionDraft,
  action: AuditAction,
  details: Record<string, unknown>
): Promise<void> {
  if (!draft.clientId) return
  try {
    await logAgentAudit({
      clientId: draft.clientId,
      action,
      resource: 'AIActionDraft',
      details: {
        draftId: draft.id,
        capabilityId: draft.capabilityId,
        ...details,
      },
      actorType: draft.actorRole as AiCapabilityRole,
      actorId: draft.actorUserId,
    })
  } catch (error) {
    logger.warn('Failed to audit AI action execution', { draftId: draft.id }, error)
  }
}

async function validateDraftCanExecute(
  draft: AIActionDraft,
  actorUserId: string,
  locale: AppLocale
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  if (draft.actorUserId !== actorUserId) {
    return { ok: false, status: 404, error: t(locale, 'Action not found.', 'Åtgärden hittades inte.') }
  }

  if (draft.status !== 'PENDING') {
    return { ok: false, status: 400, error: t(locale, 'This action is no longer pending.', 'Denna åtgärd väntar inte längre.') }
  }

  if (draft.expiresAt < new Date()) {
    await prisma.aIActionDraft.update({
      where: { id: draft.id },
      data: { status: 'EXPIRED' },
    })
    return { ok: false, status: 400, error: t(locale, 'This action has expired.', 'Denna åtgärd har gått ut.') }
  }

  const betaEnabled = await isAiAssistantOperationsEnabled(draft.businessId)
  if (!betaEnabled) {
    return {
      ok: false,
      status: 403,
      error: t(locale, 'AI action operations are not enabled for this business.', 'AI-åtgärder är inte aktiverade för denna verksamhet.'),
    }
  }

  const role = draft.actorRole as AiCapabilityRole
  const capability = findAiCapability(draft.capabilityId, role)
  if (!capability) {
    return { ok: false, status: 400, error: t(locale, 'This AI action is no longer registered.', 'Denna AI-åtgärd är inte längre registrerad.') }
  }

  if (role === 'COACH') {
    const staffPermissions = await getStaffPermissions(actorUserId, draft.businessSlug || undefined)
    const available = getAvailableAiCapabilities({
      role: 'COACH',
      operationsEnabled: true,
      staffPermissions,
      hasAthleteConsent: true,
    })
    if (!available.some((item) => item.id === draft.capabilityId)) {
      return { ok: false, status: 403, error: t(locale, 'You no longer have permission for this AI action.', 'Du har inte längre behörighet för denna AI-åtgärd.') }
    }
  }

  if (capability.requiresAthleteConsent && draft.clientId) {
    const consent = await getConsentStatus(draft.clientId)
    if (!consent.hasRequiredConsent) {
      return { ok: false, status: 403, error: t(locale, 'Athlete consent is required for this action.', 'Atletsamtycke krävs för denna åtgärd.') }
    }
  }

  if (capability.requiresAthleteProgramGeneration && draft.clientId) {
    const access = await checkAthleteFeatureAccess(draft.clientId, 'program_generation', locale)
    if (!access.allowed) {
      return {
        ok: false,
        status: 403,
        error: access.reason || t(locale, 'Program generation is not available.', 'Programgenerering är inte tillgänglig.'),
      }
    }
  }

  return { ok: true }
}

async function executeStoredDraft(draft: AIActionDraft, locale: AppLocale): Promise<unknown> {
  const input = draft.input as Record<string, unknown>

  if (draft.actorRole === 'COACH') {
    if (draft.capabilityId === 'prepareCoachMessageDraft') {
      return sendCoachMessageAction(
        draft.actorUserId,
        {
          actionType: 'sendCoachMessage',
          businessSlug: draft.businessSlug || undefined,
          draft: input as PrepareCoachMessageDraftInput,
        },
        draft.businessSlug || undefined,
        locale
      )
    }

    const tools = createCoachChatTools(
      draft.actorUserId,
      draft.businessSlug || undefined,
      locale
    ) as Record<string, { execute?: (input: unknown) => Promise<unknown> }>
    const selected = tools[draft.capabilityId]
    if (!selected?.execute) {
      throw new Error(`No executor registered for ${draft.capabilityId}`)
    }
    return selected.execute(input)
  }

  if (!draft.clientId) {
    throw new Error('Athlete action is missing client scope')
  }

  if (draft.capabilityId === 'createImportedWorkout') {
    return executeImportedWorkoutDraft(draft, locale)
  }

  const tools = createChatTools(
    draft.clientId,
    draft.conversationId || undefined,
    { canGenerateProgram: true },
    locale
  ) as Record<string, { execute?: (input: unknown) => Promise<unknown> }>
  const selected = tools[draft.capabilityId]
  if (!selected?.execute) {
    throw new Error(`No executor registered for ${draft.capabilityId}`)
  }
  return selected.execute(input)
}

export async function confirmAiActionDraft(
  draftId: string,
  actorUserId: string,
  locale: AppLocale = 'en',
  options?: { inputOverride?: unknown }
): Promise<
  | { success: true; result: unknown; message: string }
  | { success: false; status: number; error: string; result?: unknown }
> {
  const draft = await prisma.aIActionDraft.findUnique({ where: { id: draftId } })
  if (!draft) {
    return { success: false, status: 404, error: t(locale, 'Action not found.', 'Åtgärden hittades inte.') }
  }

  const validation = await validateDraftCanExecute(draft, actorUserId, locale)
  if (!validation.ok) return { success: false, status: validation.status, error: validation.error }

  let executableDraft = draft
  let mergedInput: unknown | undefined
  if (options?.inputOverride !== undefined) {
    if (draft.capabilityId !== 'createImportedWorkout') {
      return { success: false, status: 400, error: t(locale, 'This action does not accept edits.', 'Denna åtgärd tar inte emot ändringar.') }
    }

    const merged = mergeImportedWorkoutDraftInput(draft.input, options.inputOverride, locale)
    if (!merged.success) {
      return { success: false, status: 400, error: merged.error }
    }
    mergedInput = merged.input
    executableDraft = {
      ...draft,
      input: toJson(merged.input) as Prisma.JsonValue,
    }
  }

  const claimed = await prisma.aIActionDraft.updateMany({
    where: { id: draft.id, status: 'PENDING' },
    data: {
      status: 'CONFIRMED',
      confirmedAt: new Date(),
      ...(mergedInput !== undefined ? { input: toJson(mergedInput) } : {}),
    },
  })
  if (claimed.count !== 1) {
    return { success: false, status: 409, error: t(locale, 'This action is already being processed.', 'Denna åtgärd bearbetas redan.') }
  }

  try {
    const result = await executeStoredDraft(executableDraft, locale)
    const success = typeof result === 'object' && result !== null && 'success' in result
      ? Boolean((result as { success?: unknown }).success)
      : true

    await prisma.aIActionDraft.update({
      where: { id: draft.id },
      data: {
        status: success ? 'EXECUTED' : 'FAILED',
        executedAt: success ? new Date() : null,
        result: toJson(result),
        errorMessage: success
          ? null
          : (result as { error?: string; message?: string } | null)?.error ||
            (result as { error?: string; message?: string } | null)?.message ||
            t(locale, 'The action failed.', 'Åtgärden misslyckades.'),
      },
    })

    await auditExecution(draft, success ? 'AI_ACTION_EXECUTED' : 'AI_ACTION_FAILED', { result })

    if (!success) {
      return {
        success: false,
        status: 400,
        error:
          (result as { error?: string; message?: string } | null)?.error ||
          (result as { error?: string; message?: string } | null)?.message ||
          t(locale, 'The action failed.', 'Åtgärden misslyckades.'),
        result,
      }
    }

    const resultMessage =
      typeof result === 'object' &&
      result !== null &&
      typeof (result as { message?: unknown }).message === 'string'
        ? (result as { message: string }).message
        : null

    return {
      success: true,
      result,
      message: resultMessage || t(locale, 'Action confirmed and executed.', 'Åtgärden har bekräftats och körts.'),
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : t(locale, 'Unknown error', 'Okänt fel')
    logger.error('Failed to execute AI action draft', { draftId: draft.id, capabilityId: draft.capabilityId }, error)
    await prisma.aIActionDraft.update({
      where: { id: draft.id },
      data: {
        status: 'FAILED',
        errorMessage: message,
        result: toJson({ success: false, error: message }),
      },
    })
    await auditExecution(draft, 'AI_ACTION_FAILED', { error: message })

    return { success: false, status: 500, error: message }
  }
}
