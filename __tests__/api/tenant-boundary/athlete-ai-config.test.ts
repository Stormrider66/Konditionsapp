import { beforeEach, describe, expect, it, vi } from 'vitest'
import './setup'
import { prisma } from '@/lib/prisma'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { getResolvedAiKeys } from '@/lib/user-api-keys'
import { resetTenantBoundaryMocks } from './setup'
import { GET as getAthleteAiConfig } from '@/app/api/athlete/ai-config/route'

describe('Athlete AI config regression', () => {
  beforeEach(() => {
    resetTenantBoundaryMocks()
  })

  it('enables AI for direct athletes via admin key fallback', async () => {
    vi.mocked(resolveAthleteClientId).mockResolvedValue({
      user: { id: 'athlete-1', role: 'ATHLETE' } as any,
      clientId: 'client-1',
      isCoachInAthleteMode: false,
    })

    vi.mocked(prisma.client.findUnique).mockResolvedValue({
      id: 'client-1',
      userId: 'athlete-1',
      sportProfile: {
        preferredAIModelId: null,
      },
    } as any)

    vi.mocked(prisma.user.findFirst).mockResolvedValue({ id: 'admin-1' } as any)
    vi.mocked(prisma.userApiKey.findUnique).mockResolvedValue(null as any)
    vi.mocked(prisma.businessMember.findFirst).mockResolvedValue(null as any)
    vi.mocked(getResolvedAiKeys).mockResolvedValue({
      anthropicKey: null,
      googleKey: 'google-key',
      openaiKey: null,
    })

    const response = await getAthleteAiConfig()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.hasAIAccess).toBe(true)
    expect(body.configuredProviders).toEqual({
      hasAnthropic: false,
      hasGoogle: true,
      hasOpenai: false,
    })
    expect(body.availableIntents.map((i: { intent: string }) => i.intent)).toEqual([
      'fast',
      'balanced',
      'powerful',
    ])

    expect(getResolvedAiKeys).toHaveBeenCalledWith('admin-1')
  })

  it('applies business-level athlete model restrictions and default intent', async () => {
    vi.mocked(resolveAthleteClientId).mockResolvedValue({
      user: { id: 'athlete-2', role: 'ATHLETE' } as any,
      clientId: 'client-2',
      isCoachInAthleteMode: false,
    })

    vi.mocked(prisma.client.findUnique).mockResolvedValue({
      id: 'client-2',
      userId: 'coach-1',
      sportProfile: {
        preferredAIModelId: null,
      },
    } as any)

    vi.mocked(prisma.userApiKey.findUnique).mockResolvedValue({
      allowedAthleteModelIds: [],
      athleteDefaultModelId: null,
    } as any)

    vi.mocked(prisma.businessMember.findFirst).mockResolvedValue({
      business: {
        aiKeys: {
          anthropicKeyValid: false,
          googleKeyValid: true,
          openaiKeyValid: false,
          allowedAthleteModelIds: ['powerful'],
          athleteDefaultModelId: 'powerful',
        },
      },
    } as any)

    vi.mocked(getResolvedAiKeys).mockResolvedValue({
      anthropicKey: null,
      googleKey: 'google-key',
      openaiKey: null,
    })

    const response = await getAthleteAiConfig()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.hasAIAccess).toBe(true)
    expect(body.intent).toBe('powerful')
    expect(body.availableIntents.map((i: { intent: string }) => i.intent)).toEqual(['powerful'])
    expect(body.configuredProviders).toEqual({
      hasAnthropic: false,
      hasGoogle: true,
      hasOpenai: false,
    })

    expect(getResolvedAiKeys).toHaveBeenCalledWith('coach-1')
  })
})
