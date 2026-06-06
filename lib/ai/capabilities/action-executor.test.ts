import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  prisma: {
    aIActionDraft: {
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  },
  isAiAssistantOperationsEnabled: vi.fn(),
  getConsentStatus: vi.fn(),
  checkAthleteFeatureAccess: vi.fn(),
  logAgentAudit: vi.fn(),
  executeLogMeal: vi.fn(),
  createChatTools: vi.fn(),
  createCoachChatTools: vi.fn(),
  getStaffPermissions: vi.fn(),
  sendCoachMessageAction: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({ prisma: mocks.prisma }))
vi.mock('@/lib/ai/capabilities/feature-gate', () => ({
  isAiAssistantOperationsEnabled: mocks.isAiAssistantOperationsEnabled,
}))
vi.mock('@/lib/agent/gdpr/consent-manager', () => ({
  getConsentStatus: mocks.getConsentStatus,
}))
vi.mock('@/lib/subscription/feature-access', () => ({
  checkAthleteFeatureAccess: mocks.checkAthleteFeatureAccess,
}))
vi.mock('@/lib/agent/gdpr/audit-logger', () => ({
  logAgentAudit: mocks.logAgentAudit,
}))
vi.mock('@/lib/ai/chat-tools', () => ({
  createChatTools: mocks.createChatTools,
}))
vi.mock('@/lib/ai/coach-chat-tools', () => ({
  createCoachChatTools: mocks.createCoachChatTools,
}))
vi.mock('@/lib/permissions/assistant-coach', () => ({
  getStaffPermissions: mocks.getStaffPermissions,
}))
vi.mock('@/lib/ai/coach-message-actions', () => ({
  sendCoachMessageAction: mocks.sendCoachMessageAction,
}))

import { confirmAiActionDraft } from './action-executor'

function pendingAthleteDraft(overrides: Record<string, unknown> = {}) {
  return {
    id: 'draft-1',
    capabilityId: 'logMeal',
    actorUserId: 'athlete-user-1',
    actorRole: 'ATHLETE',
    surface: 'athlete_chat',
    actionType: 'write',
    riskLevel: 'medium',
    businessId: 'business-1',
    businessSlug: 'business',
    clientId: 'client-1',
    teamId: null,
    conversationId: 'conversation-1',
    input: { description: 'stored meal input' },
    preview: {},
    result: null,
    status: 'PENDING',
    errorMessage: null,
    expiresAt: new Date(Date.now() + 60_000),
    confirmedAt: null,
    executedAt: null,
    cancelledAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

describe('confirmAiActionDraft', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.isAiAssistantOperationsEnabled.mockResolvedValue(true)
    mocks.getConsentStatus.mockResolvedValue({ hasRequiredConsent: true })
    mocks.checkAthleteFeatureAccess.mockResolvedValue({ allowed: true })
    mocks.logAgentAudit.mockResolvedValue(undefined)
    mocks.prisma.aIActionDraft.updateMany.mockResolvedValue({ count: 1 })
    mocks.prisma.aIActionDraft.update.mockResolvedValue({})
    mocks.executeLogMeal.mockResolvedValue({ success: true, mealId: 'meal-1' })
    mocks.createChatTools.mockReturnValue({
      logMeal: { execute: mocks.executeLogMeal },
    })
  })

  it('executes the stored input for the authenticated actor', async () => {
    const draft = pendingAthleteDraft()
    mocks.prisma.aIActionDraft.findUnique.mockResolvedValue(draft)

    const result = await confirmAiActionDraft('draft-1', 'athlete-user-1', 'en')

    expect(result).toMatchObject({ success: true })
    expect(mocks.executeLogMeal).toHaveBeenCalledWith({ description: 'stored meal input' })
    expect(mocks.prisma.aIActionDraft.updateMany).toHaveBeenCalledWith({
      where: { id: 'draft-1', status: 'PENDING' },
      data: expect.objectContaining({ status: 'CONFIRMED' }),
    })
    expect(mocks.prisma.aIActionDraft.update).toHaveBeenLastCalledWith({
      where: { id: 'draft-1' },
      data: expect.objectContaining({
        status: 'EXECUTED',
        result: { success: true, mealId: 'meal-1' },
      }),
    })
  })

  it('rejects actions owned by another actor', async () => {
    mocks.prisma.aIActionDraft.findUnique.mockResolvedValue(pendingAthleteDraft())

    const result = await confirmAiActionDraft('draft-1', 'other-user', 'en')

    expect(result).toMatchObject({ success: false, status: 404 })
    expect(mocks.executeLogMeal).not.toHaveBeenCalled()
  })

  it('expires stale actions before execution', async () => {
    mocks.prisma.aIActionDraft.findUnique.mockResolvedValue(
      pendingAthleteDraft({ expiresAt: new Date(Date.now() - 60_000) })
    )

    const result = await confirmAiActionDraft('draft-1', 'athlete-user-1', 'en')

    expect(result).toMatchObject({ success: false, status: 400 })
    expect(mocks.prisma.aIActionDraft.update).toHaveBeenCalledWith({
      where: { id: 'draft-1' },
      data: { status: 'EXPIRED' },
    })
    expect(mocks.executeLogMeal).not.toHaveBeenCalled()
  })
})
