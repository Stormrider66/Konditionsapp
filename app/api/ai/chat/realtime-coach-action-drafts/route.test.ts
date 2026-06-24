import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

const mockGetCurrentUser = vi.hoisted(() => vi.fn())
const mockGetRequestedBusinessScope = vi.hoisted(() => vi.fn())
const mockCanAccessCoachPlatform = vi.hoisted(() => vi.fn())
const mockGetStaffPermissions = vi.hoisted(() => vi.fn())
const mockRateLimitJsonResponse = vi.hoisted(() => vi.fn())
const mockIsAiAssistantOperationsEnabled = vi.hoisted(() => vi.fn())
const mockCreateAiActionDraftForTool = vi.hoisted(() => vi.fn())
const mockBuildCoachMessageAction = vi.hoisted(() => vi.fn())

const mockPrisma = vi.hoisted(() => ({
  business: { findUnique: vi.fn() },
}))

vi.mock('@/lib/auth-utils', () => ({
  getCurrentUser: mockGetCurrentUser,
  getRequestedBusinessScope: mockGetRequestedBusinessScope,
}))

vi.mock('@/lib/user-capabilities', () => ({
  canAccessCoachPlatform: mockCanAccessCoachPlatform,
}))

vi.mock('@/lib/permissions/assistant-coach', () => ({
  getStaffPermissions: mockGetStaffPermissions,
}))

vi.mock('@/lib/api/rate-limit', () => ({
  rateLimitJsonResponse: mockRateLimitJsonResponse,
}))

vi.mock('@/lib/ai/capabilities/feature-gate', () => ({
  isAiAssistantOperationsEnabled: mockIsAiAssistantOperationsEnabled,
}))

vi.mock('@/lib/ai/capabilities/action-drafts', () => ({
  createAiActionDraftForTool: mockCreateAiActionDraftForTool,
}))

vi.mock('@/lib/ai/coach-message-actions', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/ai/coach-message-actions')>()
  return {
    ...actual,
    buildCoachMessageAction: mockBuildCoachMessageAction,
  }
})

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn() },
}))

import { POST } from './route'

function request(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/ai/chat/realtime-coach-action-drafts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('realtime coach action draft route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetCurrentUser.mockResolvedValue({ id: 'coach-1', language: 'en' })
    mockGetRequestedBusinessScope.mockReturnValue({ businessSlug: 'skelleftea' })
    mockCanAccessCoachPlatform.mockResolvedValue(true)
    mockGetStaffPermissions.mockResolvedValue({
      canViewAthletes: true,
      isTeamScoped: false,
      assignedTeamIds: [],
    })
    mockRateLimitJsonResponse.mockResolvedValue(null)
    mockPrisma.business.findUnique.mockResolvedValue({ id: 'business-1', slug: 'skelleftea' })
    mockIsAiAssistantOperationsEnabled.mockResolvedValue(true)
    mockBuildCoachMessageAction.mockResolvedValue({
      success: true,
      message: 'Prepared message',
      resolvedRecipients: [{ clientId: 'client-1', name: 'Henrik', teamName: 'A Team', receiverUserId: 'athlete-user-1' }],
      action: {
        title: 'Send message to Henrik',
        description: 'The message will be sent in the app message feed when you confirm.',
        targetLabel: 'Henrik',
        subject: 'Nice work',
        content: 'Great bike session today.',
        recipients: [{ clientId: 'client-1', name: 'Henrik', teamName: 'A Team' }],
        recipientCount: 1,
        confirmLabel: 'Send message',
        reviewHref: '/coach/messages',
      },
    })
    mockCreateAiActionDraftForTool.mockImplementation(async (capabilityId, _input, _context, preview) => ({
      success: true,
      message: 'Prepared action',
      action: {
        type: 'aiCapabilityAction',
        id: 'draft-1',
        capabilityId,
        title: preview.title,
        description: preview.description,
        targetLabel: preview.targetLabel,
        subject: preview.subject,
        body: preview.body,
        details: preview.details ?? [],
        recipients: preview.recipients,
        recipientCount: preview.recipientCount,
        requiresConfirmation: true,
        confirmLabel: preview.confirmLabel,
        cancelLabel: 'Cancel',
        confirmEndpoint: '/api/ai/actions/draft-1/confirm',
        cancelEndpoint: '/api/ai/actions/draft-1/cancel',
      },
    }))
  })

  it('creates a confirmation-card draft for a coach message', async () => {
    const response = await POST(request({
      toolName: 'prepareCoachMessageDraft',
      callId: 'call-message-1',
      arguments: {
        recipientType: 'ATHLETE',
        athleteName: 'Henrik',
        subject: 'Nice work',
        content: 'Great bike session today.',
      },
    }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.callId).toBe('call-message-1')
    expect(body.action.type).toBe('aiCapabilityAction')
    expect(body.action.capabilityId).toBe('prepareCoachMessageDraft')
    expect(body.action.body).toBe('Great bike session today.')
    expect(mockCreateAiActionDraftForTool).toHaveBeenCalledWith(
      'prepareCoachMessageDraft',
      expect.objectContaining({
        recipientType: 'ATHLETE',
        athleteName: 'Henrik',
      }),
      expect.objectContaining({
        actorUserId: 'coach-1',
        actorRole: 'COACH',
        surface: 'coach_chat',
        businessId: 'business-1',
        businessSlug: 'skelleftea',
      }),
      expect.objectContaining({
        title: 'Send message to Henrik',
        body: 'Great bike session today.',
      })
    )
  })

  it('blocks drafts when coach action confirmations are disabled', async () => {
    mockIsAiAssistantOperationsEnabled.mockResolvedValue(false)

    const response = await POST(request({
      toolName: 'prepareCoachMessageDraft',
      arguments: {
        recipientType: 'ATHLETE',
        athleteName: 'Henrik',
        content: 'Great bike session today.',
      },
    }))
    const body = await response.json()

    expect(response.status).toBe(403)
    expect(body.success).toBe(false)
    expect(mockCreateAiActionDraftForTool).not.toHaveBeenCalled()
  })

  it('rejects unsupported coach live voice actions', async () => {
    const response = await POST(request({
      toolName: 'sendDirectly',
      arguments: {},
    }))
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.success).toBe(false)
    expect(mockCreateAiActionDraftForTool).not.toHaveBeenCalled()
  })

  it('returns rate limit response before preparing a draft', async () => {
    mockRateLimitJsonResponse.mockResolvedValue(NextResponse.json({ success: false, error: 'Too many' }, { status: 429 }))

    const response = await POST(request({
      toolName: 'prepareCoachMessageDraft',
      arguments: {
        recipientType: 'ATHLETE',
        athleteName: 'Henrik',
        content: 'Great bike session today.',
      },
    }))
    const body = await response.json()

    expect(response.status).toBe(429)
    expect(body.error).toBe('Too many')
    expect(mockCreateAiActionDraftForTool).not.toHaveBeenCalled()
  })
})
