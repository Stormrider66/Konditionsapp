import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

const mockResolveAthleteClientId = vi.hoisted(() => vi.fn())
const mockRateLimitJsonResponse = vi.hoisted(() => vi.fn())
const mockCheckAthleteFeatureAccess = vi.hoisted(() => vi.fn())
const mockGetConsentStatus = vi.hoisted(() => vi.fn())
const mockRequireAiAllowance = vi.hoisted(() => vi.fn())
const mockIsAiAssistantOperationsEnabled = vi.hoisted(() => vi.fn())
const mockCreateAiActionDraftForTool = vi.hoisted(() => vi.fn())

const mockPrisma = vi.hoisted(() => ({
  client: {
    findUnique: vi.fn(),
  },
}))

vi.mock('@/lib/auth-utils', () => ({
  resolveAthleteClientId: mockResolveAthleteClientId,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

vi.mock('@/lib/api/rate-limit', () => ({
  rateLimitJsonResponse: mockRateLimitJsonResponse,
}))

vi.mock('@/lib/subscription/feature-access', () => ({
  checkAthleteFeatureAccess: mockCheckAthleteFeatureAccess,
}))

vi.mock('@/lib/agent/gdpr/consent-manager', () => ({
  getConsentStatus: mockGetConsentStatus,
}))

vi.mock('@/lib/ai/billing/require-ai-allowance', () => ({
  requireAiAllowance: mockRequireAiAllowance,
}))

vi.mock('@/lib/ai/capabilities/feature-gate', () => ({
  isAiAssistantOperationsEnabled: mockIsAiAssistantOperationsEnabled,
}))

vi.mock('@/lib/ai/capabilities/action-drafts', () => ({
  createAiActionDraftForTool: mockCreateAiActionDraftForTool,
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}))

import { POST } from './route'

function request(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/ai/chat/realtime-action-drafts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('realtime action draft route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockResolveAthleteClientId.mockResolvedValue({
      clientId: 'client-1',
      isCoachInAthleteMode: false,
      user: { id: 'user-1', language: 'en' },
    })
    mockCheckAthleteFeatureAccess.mockResolvedValue({ allowed: true })
    mockRateLimitJsonResponse.mockResolvedValue(null)
    mockRequireAiAllowance.mockResolvedValue(null)
    mockGetConsentStatus.mockResolvedValue({ hasRequiredConsent: true })
    mockPrisma.client.findUnique.mockResolvedValue({
      businessId: 'business-1',
      business: { slug: 'skelleftea' },
    })
    mockIsAiAssistantOperationsEnabled.mockResolvedValue(true)
    mockCreateAiActionDraftForTool.mockImplementation(async (_capabilityId, _input, _context, preview) => ({
      success: true,
      message: 'Prepared action',
      action: {
        type: 'aiCapabilityAction',
        id: 'draft-1',
        capabilityId: 'createCardioWorkout',
        title: preview.title,
        description: preview.description,
        targetLabel: preview.targetLabel,
        body: preview.body,
        details: preview.details,
        requiresConfirmation: true,
        confirmLabel: preview.confirmLabel,
        cancelLabel: 'Cancel',
        confirmEndpoint: '/api/ai/actions/draft-1/confirm',
        cancelEndpoint: '/api/ai/actions/draft-1/cancel',
      },
    }))
  })

  it('creates an AI action draft for a valid live voice cardio workout', async () => {
    const response = await POST(request({
      toolName: 'createCardioWorkout',
      callId: 'call-1',
      arguments: JSON.stringify({
        name: '10 x 3 min Wattbike intervals',
        sport: 'CYCLING',
        date: '2026-06-23',
        rounds: 10,
        restBetweenRoundsSeconds: 60,
        stations: [{ equipment: 'WATTBIKE', durationSeconds: 180, zone: 4 }],
      }),
    }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.callId).toBe('call-1')
    expect(body.action.type).toBe('aiCapabilityAction')
    expect(body.action.details).toContain('Work: 10 x Wattbike · 3 min')
    expect(mockCreateAiActionDraftForTool).toHaveBeenCalledWith(
      'createCardioWorkout',
      expect.objectContaining({
        name: '10 x 3 min Wattbike intervals',
        rounds: 10,
      }),
      expect.objectContaining({
        actorUserId: 'user-1',
        actorRole: 'ATHLETE',
        surface: 'athlete_chat',
        clientId: 'client-1',
        businessId: 'business-1',
        businessSlug: 'skelleftea',
      }),
      expect.objectContaining({
        title: '10 x 3 min Wattbike intervals',
      })
    )
  })

  it('returns clarification instead of drafting repeated intervals without rest or intensity', async () => {
    const response = await POST(request({
      toolName: 'createCardioWorkout',
      arguments: {
        name: '10 x 3 min bike intervals',
        sport: 'CYCLING',
        rounds: 10,
        stations: [{ equipment: 'BIKE', durationSeconds: 180 }],
      },
    }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(false)
    expect(body.needsClarification).toBe(true)
    expect(mockCreateAiActionDraftForTool).not.toHaveBeenCalled()
  })

  it('rejects unsupported live voice tools', async () => {
    const response = await POST(request({
      toolName: 'logMeal',
      arguments: {},
    }))
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.success).toBe(false)
    expect(mockCreateAiActionDraftForTool).not.toHaveBeenCalled()
  })

  it('blocks drafting when athlete consent is missing', async () => {
    mockGetConsentStatus.mockResolvedValue({ hasRequiredConsent: false })

    const response = await POST(request({
      toolName: 'createCardioWorkout',
      arguments: {
        name: 'Bike intervals',
        sport: 'CYCLING',
        rounds: 1,
        stations: [{ equipment: 'BIKE', durationSeconds: 180, zone: 3 }],
      },
    }))
    const body = await response.json()

    expect(response.status).toBe(403)
    expect(body.code).toBe('CONSENT_REQUIRED')
    expect(mockCreateAiActionDraftForTool).not.toHaveBeenCalled()
  })

  it('returns a subscription response before drafting when AI chat is not allowed', async () => {
    mockCheckAthleteFeatureAccess.mockResolvedValue({
      allowed: false,
      reason: 'Upgrade required',
      code: 'FEATURE_DISABLED',
    })

    const response = await POST(request({
      toolName: 'createCardioWorkout',
      arguments: {},
    }))
    const body = await response.json()

    expect(response.status).toBe(403)
    expect(body.error).toBe('Upgrade required')
    expect(mockCreateAiActionDraftForTool).not.toHaveBeenCalled()
  })

  it('returns a rate limit response before reading the body', async () => {
    const limited = NextResponse.json({ success: false, error: 'Too many' }, { status: 429 })
    mockRateLimitJsonResponse.mockResolvedValue(limited)
    const req = request({ toolName: 'createCardioWorkout', arguments: {} })

    const response = await POST(req)
    const body = await response.json()

    expect(response.status).toBe(429)
    expect(body.error).toBe('Too many')
    expect(mockCreateAiActionDraftForTool).not.toHaveBeenCalled()
  })
})
