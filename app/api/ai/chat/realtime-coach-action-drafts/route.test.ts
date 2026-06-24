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
const mockBuildCoachDailyBriefingPreview = vi.hoisted(() => vi.fn())
const mockBuildCreateAndAssignCardioWorkoutPreview = vi.hoisted(() => vi.fn())
const mockBuildModifyCardioAssignmentPreview = vi.hoisted(() => vi.fn())
const mockBuildRepeatPreviousCardioWorkoutPreview = vi.hoisted(() => vi.fn())
const mockBuildModifyTeamCardioAssignmentsPreview = vi.hoisted(() => vi.fn())

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

vi.mock('@/lib/ai/coach-briefing-actions', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/ai/coach-briefing-actions')>()
  return {
    ...actual,
    buildCoachDailyBriefingPreview: mockBuildCoachDailyBriefingPreview,
  }
})

vi.mock('@/lib/ai/coach-cardio-actions', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/ai/coach-cardio-actions')>()
  return {
    ...actual,
    buildCreateAndAssignCardioWorkoutPreview: mockBuildCreateAndAssignCardioWorkoutPreview,
    buildModifyCardioAssignmentPreview: mockBuildModifyCardioAssignmentPreview,
    buildRepeatPreviousCardioWorkoutPreview: mockBuildRepeatPreviousCardioWorkoutPreview,
    buildModifyTeamCardioAssignmentsPreview: mockBuildModifyTeamCardioAssignmentsPreview,
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
      canCreateEvents: true,
      canAccessStudios: true,
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
    mockBuildCreateAndAssignCardioWorkoutPreview.mockResolvedValue({
      success: true,
      preview: {
        title: 'Assign 10 x 3 min Wattbike',
        description: 'Creates a cardio session and assigns it to Henrik.',
        targetLabel: 'Henrik',
        details: [
          'Workout: 10 x 3 min Wattbike',
          'Date: 2026-06-24',
          'Structure: 10 x 3 min / 1 min rest',
          'Intensity: RPE 8',
          'Estimated total: 55 min',
        ],
        recipients: [{ clientId: 'client-1', name: 'Henrik', teamName: 'A Team' }],
        recipientCount: 1,
        confirmLabel: 'Create and assign',
        reviewHref: '/coach/cardio',
      },
    })
    mockBuildCoachDailyBriefingPreview.mockResolvedValue({
      success: true,
      preview: {
        title: 'Coach briefing - 2026-06-24',
        description: 'Review 2 athletes needing attention.',
        targetLabel: 'A Team',
        details: ['Date: 2026-06-24', 'Attention list: 2'],
        recipients: [{ clientId: 'client-1', name: 'Henrik', teamName: 'A Team' }],
        recipientCount: 1,
        confirmLabel: 'Mark reviewed',
        reviewHref: '/coach/dashboard',
      },
    })
    mockBuildModifyCardioAssignmentPreview.mockResolvedValue({
      success: true,
      preview: {
        title: 'Modify Wattbike intervals',
        description: 'Prepares changes for Henrik.',
        targetLabel: 'Henrik',
        details: ['Athlete: Henrik', 'New date: 2026-06-26', 'Reason: Low readiness'],
        recipients: [{ clientId: 'client-1', name: 'Henrik', teamName: 'A Team' }],
        recipientCount: 1,
        confirmLabel: 'Modify assignment',
        reviewHref: '/coach/cardio',
      },
    })
    mockBuildRepeatPreviousCardioWorkoutPreview.mockResolvedValue({
      success: true,
      preview: {
        title: 'Repeat Threshold Wattbike',
        description: 'Copies the previous cardio structure.',
        targetLabel: 'Henrik',
        details: ['Source workout: Threshold Wattbike', 'Adjustment: Easier than source'],
        recipients: [{ clientId: 'client-1', name: 'Henrik', teamName: 'A Team' }],
        recipientCount: 1,
        confirmLabel: 'Repeat and assign',
        reviewHref: '/coach/cardio',
      },
    })
    mockBuildModifyTeamCardioAssignmentsPreview.mockResolvedValue({
      success: true,
      preview: {
        title: 'Modify 3 cardio assignments',
        description: 'Prepares calendar changes for low readiness.',
        targetLabel: 'A Team - low readiness',
        details: ['Assignments: 3', 'Structure: 30 min steady'],
        recipients: [{ clientId: 'client-1', name: 'Henrik', teamName: 'A Team' }],
        recipientCount: 3,
        confirmLabel: 'Modify assignments',
        reviewHref: '/coach/cardio',
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

  it('creates a confirmation-card draft for a cardio workout assignment', async () => {
    const response = await POST(request({
      toolName: 'createAndAssignCardioWorkout',
      callId: 'call-cardio-1',
      arguments: {
        targetType: 'ATHLETE',
        athleteName: 'Henrik',
        date: '2026-06-24',
        name: '10 x 3 min Wattbike',
        workoutType: 'INTERVAL',
        sport: 'CYCLING',
        equipment: 'WATTBIKE',
        rounds: 10,
        workDurationSeconds: 180,
        restDurationSeconds: 60,
        intensity: 'RPE 8',
      },
    }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.callId).toBe('call-cardio-1')
    expect(body.action.capabilityId).toBe('createAndAssignCardioWorkout')
    expect(body.action.details).toContain('Estimated total: 55 min')
    expect(mockBuildCreateAndAssignCardioWorkoutPreview).toHaveBeenCalled()
    expect(mockCreateAiActionDraftForTool).toHaveBeenCalledWith(
      'createAndAssignCardioWorkout',
      expect.objectContaining({
        targetType: 'ATHLETE',
        athleteName: 'Henrik',
      }),
      expect.objectContaining({
        actorUserId: 'coach-1',
        actorRole: 'COACH',
      }),
      expect.objectContaining({
        title: 'Assign 10 x 3 min Wattbike',
        recipientCount: 1,
      })
    )
  })

  it('creates a confirmation-card draft for a cardio assignment modification', async () => {
    const response = await POST(request({
      toolName: 'modifyCardioAssignment',
      arguments: {
        athleteName: 'Henrik',
        currentDate: '2026-06-24',
        sessionName: 'Wattbike intervals',
        newDate: '2026-06-26',
        reason: 'Low readiness',
      },
    }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.action.capabilityId).toBe('modifyCardioAssignment')
    expect(body.action.confirmLabel).toBe('Modify assignment')
    expect(mockBuildModifyCardioAssignmentPreview).toHaveBeenCalled()
  })

  it('creates a confirmation-card draft for a coach daily briefing', async () => {
    const response = await POST(request({
      toolName: 'prepareCoachDailyBriefing',
      arguments: {
        date: '2026-06-24',
        teamName: 'A Team',
        focus: 'MORNING',
      },
    }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.action.capabilityId).toBe('prepareCoachDailyBriefing')
    expect(body.action.confirmLabel).toBe('Mark reviewed')
    expect(mockBuildCoachDailyBriefingPreview).toHaveBeenCalled()
  })

  it('creates a confirmation-card draft for repeating a previous cardio workout', async () => {
    const response = await POST(request({
      toolName: 'repeatPreviousCardioWorkout',
      arguments: {
        targetType: 'ATHLETE',
        athleteName: 'Henrik',
        date: '2026-06-25',
        adjustment: 'EASIER',
      },
    }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.action.capabilityId).toBe('repeatPreviousCardioWorkout')
    expect(body.action.confirmLabel).toBe('Repeat and assign')
    expect(mockBuildRepeatPreviousCardioWorkoutPreview).toHaveBeenCalled()
  })

  it('creates a confirmation-card draft for batch planned-cardio changes', async () => {
    const response = await POST(request({
      toolName: 'modifyTeamCardioAssignments',
      arguments: {
        targetType: 'TEAM',
        teamName: 'A Team',
        teamTarget: 'LOW_READINESS',
        currentDate: '2026-06-24',
        workoutType: 'STEADY',
        durationSeconds: 1800,
        intensity: 'Easy Z1-Z2',
        reason: 'Low readiness',
      },
    }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.action.capabilityId).toBe('modifyTeamCardioAssignments')
    expect(body.action.recipientCount).toBe(3)
    expect(mockBuildModifyTeamCardioAssignmentsPreview).toHaveBeenCalled()
  })

  it('blocks cardio action drafts without workout assignment permissions', async () => {
    mockGetStaffPermissions.mockResolvedValue({
      canViewAthletes: true,
      canCreateEvents: false,
      canAccessStudios: true,
      isTeamScoped: false,
      assignedTeamIds: [],
    })

    const response = await POST(request({
      toolName: 'createAndAssignCardioWorkout',
      arguments: {
        targetType: 'ATHLETE',
        athleteName: 'Henrik',
        date: '2026-06-24',
        name: '10 x 3 min Wattbike',
        workoutType: 'INTERVAL',
        sport: 'CYCLING',
        equipment: 'WATTBIKE',
        rounds: 10,
        workDurationSeconds: 180,
        restDurationSeconds: 60,
        intensity: 'RPE 8',
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
