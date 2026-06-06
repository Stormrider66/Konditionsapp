import 'server-only'

import { tool } from 'ai'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { getConsentStatus } from '@/lib/agent/gdpr/consent-manager'
import { logAgentAudit } from '@/lib/agent/gdpr/audit-logger'
import type { AuditAction } from '@/lib/agent/types'
import {
  findAiCapability,
  type AiCapabilityDefinition,
  type AiCapabilityRole,
  type AiCapabilitySurface,
} from './registry'

type AppLocale = 'en' | 'sv'

export interface AiActionDraftContext {
  enabled: boolean
  actorUserId: string
  actorRole: AiCapabilityRole
  surface: AiCapabilitySurface
  businessId?: string | null
  businessSlug?: string | null
  clientId?: string | null
  teamId?: string | null
  conversationId?: string | null
  locale?: AppLocale
}

export interface AiActionPreviewInput {
  title?: string
  description?: string
  targetLabel?: string
  subject?: string | null
  body?: string | null
  details?: string[]
  recipients?: Array<{ clientId: string; name: string; teamName: string | null }>
  recipientCount?: number
  reviewHref?: string
  confirmLabel?: string
}

export interface AiCapabilityAction {
  type: 'aiCapabilityAction'
  id: string
  capabilityId: string
  title: string
  description: string
  targetLabel?: string
  subject?: string | null
  body?: string | null
  details: string[]
  recipients?: Array<{ clientId: string; name: string; teamName: string | null }>
  recipientCount?: number
  requiresConfirmation: true
  confirmLabel: string
  cancelLabel: string
  confirmEndpoint: string
  cancelEndpoint: string
  reviewHref?: string
}

export type AiActionDraftToolResult =
  | {
      success: true
      action: AiCapabilityAction
      message: string
    }
  | {
      success: false
      error: string
      needsClarification?: boolean
    }

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? {})) as Prisma.InputJsonValue
}

function getStringField(input: unknown, keys: string[]): string | undefined {
  if (!input || typeof input !== 'object') return undefined
  const record = input as Record<string, unknown>
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return undefined
}

function getClientId(input: unknown, context: AiActionDraftContext): string | null {
  return context.clientId || getStringField(input, ['clientId', 'athleteId']) || null
}

function getTeamId(input: unknown, context: AiActionDraftContext): string | null {
  return context.teamId || getStringField(input, ['teamId']) || null
}

function formatDetailValue(value: unknown): string | null {
  if (value == null || value === '') return null
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  if (Array.isArray(value)) return `${value.length} items`
  return null
}

function buildDefaultPreview(
  capability: AiCapabilityDefinition,
  input: unknown,
  locale: AppLocale
): Required<Pick<AiActionPreviewInput, 'title' | 'description' | 'details'>> & AiActionPreviewInput {
  const targetLabel = getStringField(input, [
    'title',
    'name',
    'athleteName',
    'teamName',
    'goal',
    'description',
    'mealType',
    'type',
  ])
  const body = getStringField(input, ['content', 'notes', 'description', 'goal', 'injuryType'])

  const details = input && typeof input === 'object'
    ? Object.entries(input as Record<string, unknown>)
        .slice(0, 8)
        .map(([key, value]) => {
          const formatted = formatDetailValue(value)
          return formatted ? `${key}: ${formatted}` : null
        })
        .filter((item): item is string => Boolean(item))
    : []

  return {
    title: capability.label,
    description: t(
      locale,
      `Review this ${capability.label.toLowerCase()} action before it runs.`,
      `Granska åtgärden "${capability.label}" innan den körs.`
    ),
    targetLabel,
    body,
    details,
    confirmLabel: capability.confirmLabel,
    reviewHref: capability.reviewHref,
  }
}

function toClientAction(
  id: string,
  capability: AiCapabilityDefinition,
  preview: AiActionPreviewInput,
  locale: AppLocale
): AiCapabilityAction {
  return {
    type: 'aiCapabilityAction',
    id,
    capabilityId: capability.id,
    title: preview.title || capability.label,
    description: preview.description || capability.description,
    targetLabel: preview.targetLabel,
    subject: preview.subject,
    body: preview.body,
    details: preview.details || [],
    recipients: preview.recipients,
    recipientCount: preview.recipientCount,
    requiresConfirmation: true,
    confirmLabel: preview.confirmLabel || capability.confirmLabel || t(locale, 'Confirm', 'Bekräfta'),
    cancelLabel: t(locale, 'Cancel', 'Avbryt'),
    confirmEndpoint: `/api/ai/actions/${id}/confirm`,
    cancelEndpoint: `/api/ai/actions/${id}/cancel`,
    reviewHref: preview.reviewHref || capability.reviewHref,
  }
}

async function auditDraft(
  clientId: string | null,
  actorRole: AiCapabilityRole,
  actorUserId: string,
  action: AuditAction,
  draftId: string,
  capabilityId: string,
  details: Record<string, unknown>
): Promise<void> {
  if (!clientId) return
  try {
    await logAgentAudit({
      clientId,
      action,
      resource: 'AIActionDraft',
      details: {
        draftId,
        capabilityId,
        ...details,
      },
      actorType: actorRole,
      actorId: actorUserId,
    })
  } catch (error) {
    logger.warn('Failed to audit AI action draft', { draftId, capabilityId }, error)
  }
}

export async function createAiActionDraftForTool(
  capabilityId: string,
  input: unknown,
  context: AiActionDraftContext,
  previewOverride?: AiActionPreviewInput
): Promise<AiActionDraftToolResult> {
  const locale = context.locale || 'en'

  if (!context.enabled) {
    return {
      success: false,
      error: t(locale, 'AI action confirmation is not enabled for this business.', 'AI-bekräftelser är inte aktiverade för denna verksamhet.'),
    }
  }

  const capability = findAiCapability(capabilityId, context.actorRole)
  if (!capability) {
    return {
      success: false,
      error: t(locale, 'This AI action is not registered.', 'Denna AI-åtgärd är inte registrerad.'),
    }
  }

  if (!capability.requiresConfirmation) {
    return {
      success: false,
      error: t(locale, 'This AI action does not require confirmation.', 'Denna AI-åtgärd kräver ingen bekräftelse.'),
    }
  }

  const clientId = getClientId(input, context)
  if (capability.requiresAthleteConsent && clientId) {
    const consent = await getConsentStatus(clientId)
    if (!consent.hasRequiredConsent) {
      return {
        success: false,
        error: t(
          locale,
          'Athlete consent is required before this AI action can be prepared.',
          'Atletsamtycke krävs innan denna AI-åtgärd kan förberedas.'
        ),
      }
    }
  }

  const teamId = getTeamId(input, context)
  const preview = {
    ...buildDefaultPreview(capability, input, locale),
    ...previewOverride,
  }
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

  const draft = await prisma.aIActionDraft.create({
    data: {
      capabilityId: capability.id,
      actorUserId: context.actorUserId,
      actorRole: context.actorRole,
      surface: context.surface,
      actionType: capability.actionType,
      riskLevel: capability.riskLevel,
      businessId: context.businessId || null,
      businessSlug: context.businessSlug || null,
      clientId,
      teamId,
      conversationId: context.conversationId || null,
      input: toJson(input),
      preview: toJson(preview),
      expiresAt,
    },
  })

  await auditDraft(clientId, context.actorRole, context.actorUserId, 'AI_ACTION_DRAFTED', draft.id, capability.id, {
    surface: context.surface,
    actionType: capability.actionType,
    riskLevel: capability.riskLevel,
  })

  const action = toClientAction(draft.id, capability, preview, locale)
  return {
    success: true,
    action,
    message: t(
      locale,
      `I prepared "${action.title}". It will not run until you confirm it in the card.`,
      `Jag har förberett "${action.title}". Den körs inte förrän du bekräftar i kortet.`
    ),
  }
}

export function wrapToolsWithAiActionDrafts<T extends Record<string, any>>(
  tools: T,
  context: AiActionDraftContext,
  capabilityIds: string[]
): T {
  if (!context.enabled) return tools

  const wrapped: Record<string, unknown> = { ...tools }
  for (const capabilityId of capabilityIds) {
    const current = tools[capabilityId]
    if (!current?.inputSchema) continue

    wrapped[capabilityId] = tool({
      description: current.description,
      inputSchema: current.inputSchema,
      execute: async (input: unknown) => createAiActionDraftForTool(capabilityId, input, context),
    })
  }

  return wrapped as T
}

export async function cancelAiActionDraft(
  draftId: string,
  actorUserId: string,
  locale: AppLocale = 'en'
): Promise<{ success: true; message: string } | { success: false; error: string; status?: number }> {
  const draft = await prisma.aIActionDraft.findFirst({
    where: { id: draftId, actorUserId },
  })

  if (!draft) {
    return { success: false, status: 404, error: t(locale, 'Action not found.', 'Åtgärden hittades inte.') }
  }

  if (draft.status !== 'PENDING') {
    return { success: false, status: 400, error: t(locale, 'This action is no longer pending.', 'Denna åtgärd väntar inte längre.') }
  }

  await prisma.aIActionDraft.update({
    where: { id: draft.id },
    data: {
      status: 'CANCELLED',
      cancelledAt: new Date(),
    },
  })

  await auditDraft(
    draft.clientId,
    draft.actorRole as AiCapabilityRole,
    actorUserId,
    'AI_ACTION_CANCELLED',
    draft.id,
    draft.capabilityId,
    {}
  )

  return { success: true, message: t(locale, 'Action cancelled.', 'Åtgärden avbröts.') }
}

export function deserializeAiActionPreview(preview: unknown): AiActionPreviewInput {
  return preview && typeof preview === 'object' ? preview as AiActionPreviewInput : {}
}

export function buildClientActionFromDraft(
  draft: {
    id: string
    capabilityId: string
    actorRole: string
    preview: unknown
  },
  locale: AppLocale = 'en'
): AiCapabilityAction | null {
  const capability = findAiCapability(draft.capabilityId, draft.actorRole as AiCapabilityRole)
  if (!capability) return null
  return toClientAction(draft.id, capability, deserializeAiActionPreview(draft.preview), locale)
}
