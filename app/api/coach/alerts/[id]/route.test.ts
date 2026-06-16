import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockRequireCoach = vi.hoisted(() => vi.fn())

const mockPrisma = vi.hoisted(() => ({
  coachAlert: {
    findFirst: vi.fn(),
    update: vi.fn(),
  },
}))

vi.mock('@/lib/auth-utils', () => ({
  requireCoach: mockRequireCoach,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

import { PATCH } from './route'

function request(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/coach/alerts/alert-1', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('coach alert lifecycle route', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-16T10:00:00.000Z'))
    vi.clearAllMocks()
    mockRequireCoach.mockResolvedValue({ id: 'coach-1', language: 'en' })
    mockPrisma.coachAlert.findFirst.mockResolvedValue({
      id: 'alert-1',
      coachId: 'coach-1',
      status: 'ACTIVE',
    })
    mockPrisma.coachAlert.update.mockResolvedValue({
      id: 'alert-1',
      status: 'SNOOZED',
      client: { id: 'client-1', name: 'Alex Athlete' },
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('snoozes an alert with actor and due time', async () => {
    const response = await PATCH(
      request({ action: 'snooze', snoozeHours: 48, note: 'Check again after easy day.' }),
      { params: Promise.resolve({ id: 'alert-1' }) },
    )

    expect(response.status).toBe(200)
    expect(mockPrisma.coachAlert.update).toHaveBeenCalledWith({
      where: { id: 'alert-1' },
      data: {
        status: 'SNOOZED',
        actionNote: 'Check again after easy day.',
        snoozedAt: new Date('2026-06-16T10:00:00.000Z'),
        snoozedUntil: new Date('2026-06-18T10:00:00.000Z'),
        snoozedBy: 'coach-1',
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })
  })

  it('resolves an alert with outcome metadata', async () => {
    await PATCH(
      request({
        action: 'resolve',
        note: 'Reduced next two sessions.',
        outcome: 'TRAINING_ADJUSTED',
        followUpAt: '2026-06-20T08:00:00.000Z',
      }),
      { params: Promise.resolve({ id: 'alert-1' }) },
    )

    expect(mockPrisma.coachAlert.update).toHaveBeenCalledWith({
      where: { id: 'alert-1' },
      data: {
        status: 'RESOLVED',
        actionNote: 'Reduced next two sessions.',
        resolvedAt: new Date('2026-06-16T10:00:00.000Z'),
        resolvedBy: 'coach-1',
        resolutionOutcome: 'TRAINING_ADJUSTED',
        followUpAt: new Date('2026-06-20T08:00:00.000Z'),
        snoozedAt: null,
        snoozedUntil: null,
        snoozedBy: null,
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })
  })
})
