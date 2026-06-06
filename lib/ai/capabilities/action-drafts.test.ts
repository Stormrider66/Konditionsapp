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

import { wrapToolsWithAiActionDrafts } from './action-drafts'

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
})
