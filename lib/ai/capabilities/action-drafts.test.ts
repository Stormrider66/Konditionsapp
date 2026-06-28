import { beforeEach, describe, expect, it, vi } from 'vitest'
import { tool } from 'ai'
import { z } from 'zod'

const mocks = vi.hoisted(() => ({
  prisma: {
    aIActionDraft: {
      create: vi.fn(),
    },
  },
  getConsentStatus: vi.fn(),
  logAgentAudit: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({ prisma: mocks.prisma }))
vi.mock('@/lib/agent/gdpr/consent-manager', () => ({
  getConsentStatus: mocks.getConsentStatus,
}))
vi.mock('@/lib/agent/gdpr/audit-logger', () => ({
  logAgentAudit: mocks.logAgentAudit,
}))

import { createAiActionDraftForTool, wrapToolsWithAiActionDrafts } from './action-drafts'

describe('AI action drafts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getConsentStatus.mockResolvedValue({ hasRequiredConsent: true })
    mocks.logAgentAudit.mockResolvedValue(undefined)
    mocks.prisma.aIActionDraft.create.mockResolvedValue({
      id: 'draft-1',
    })
  })

  it('wraps confirmed tools so they create drafts instead of executing immediately', async () => {
    const originalExecute = vi.fn()
    const tools = {
      logMeal: tool({
        description: 'Log meal',
        inputSchema: z.object({ description: z.string() }),
        execute: originalExecute,
      }),
    }

    const wrapped = wrapToolsWithAiActionDrafts(
      tools,
      {
        enabled: true,
        actorUserId: 'athlete-user-1',
        actorRole: 'ATHLETE',
        surface: 'athlete_chat',
        businessId: 'business-1',
        clientId: 'client-1',
        locale: 'en',
      },
      ['logMeal']
    )

    const execute = wrapped.logMeal.execute as unknown as (input: unknown) => Promise<unknown>
    const result = await execute({ description: 'banana and yogurt' })

    expect(originalExecute).not.toHaveBeenCalled()
    expect(mocks.prisma.aIActionDraft.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          capabilityId: 'logMeal',
          actorUserId: 'athlete-user-1',
          clientId: 'client-1',
          input: { description: 'banana and yogurt' },
        }),
      })
    )
    expect(result).toMatchObject({
      success: true,
      action: {
        type: 'aiCapabilityAction',
        id: 'draft-1',
        capabilityId: 'logMeal',
        confirmEndpoint: '/api/ai/actions/draft-1/confirm',
      },
    })
  })

  it('does not wrap tools when operations are disabled', () => {
    const tools = {
      logMeal: tool({
        description: 'Log meal',
        inputSchema: z.object({ description: z.string() }),
        execute: vi.fn(),
      }),
    }

    const wrapped = wrapToolsWithAiActionDrafts(
      tools,
      {
        enabled: false,
        actorUserId: 'athlete-user-1',
        actorRole: 'ATHLETE',
        surface: 'athlete_chat',
      },
      ['logMeal']
    )

    expect(wrapped).toBe(tools)
  })

  it('labels Garmin workout drafts with the real delivery action', async () => {
    const result = await createAiActionDraftForTool(
      'createCardioWorkout',
      {
        name: 'Threshold bike',
        pushToGarmin: true,
        stations: [{ equipment: 'BIKE', durationSeconds: 180 }],
      },
      {
        enabled: true,
        actorUserId: 'athlete-user-1',
        actorRole: 'ATHLETE',
        surface: 'athlete_chat',
        businessId: 'business-1',
        clientId: 'client-1',
        locale: 'en',
      }
    )

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.action.confirmLabel).toBe('Create and send to Garmin')
    expect(result.action.details).toContain('Garmin: send to watch')
    expect(mocks.prisma.aIActionDraft.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          preview: expect.objectContaining({
            confirmLabel: 'Create and send to Garmin',
            details: expect.arrayContaining(['Garmin: send to watch']),
          }),
        }),
      })
    )
  })

  it('preserves suggested follow-ups and selected recipient context', async () => {
    const result = await createAiActionDraftForTool(
      'prepareCoachDailyBriefing',
      { date: '2026-06-24' },
      {
        enabled: true,
        actorUserId: 'coach-user-1',
        actorRole: 'COACH',
        surface: 'coach_chat',
        businessId: 'business-1',
        businessSlug: 'skelleftea',
        locale: 'en',
      },
      {
        title: 'Coach briefing',
        description: 'Review athletes.',
        targetLabel: 'A Team',
        details: ['Attention list: 2'],
        recipients: [
          { clientId: 'client-1', name: 'Henrik', teamName: 'A Team' },
          { clientId: 'client-2', name: 'Anna', teamName: 'A Team' },
        ],
        recipientCount: 2,
        suggestedFollowUps: ['Draft a short check-in message to these athletes.'],
        followUpContext: {
          hints: ['Use teamTarget SELECTED.'],
        },
      }
    )

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.action.suggestedFollowUps).toEqual(['Draft a short check-in message to these athletes.'])
    expect(result.action.followUpContext).toMatchObject({
      selectedClientIds: ['client-1', 'client-2'],
      selectedNames: ['Henrik', 'Anna'],
      targetLabel: 'A Team',
      capabilityId: 'prepareCoachDailyBriefing',
      hints: ['Use teamTarget SELECTED.'],
    })
    expect(mocks.prisma.aIActionDraft.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          preview: expect.objectContaining({
            suggestedFollowUps: ['Draft a short check-in message to these athletes.'],
          }),
        }),
      })
    )
  })
})
