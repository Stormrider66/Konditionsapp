/**
 * Tests for the getNextPendingAssignment helper. Uses a hoisted
 * prisma mock so we control exactly what each findFirst call returns
 * and can verify the helper picks the right one.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockPrisma = vi.hoisted(() => ({
  strengthSessionAssignment: {
    findFirst: vi.fn(),
  },
  cardioSessionAssignment: {
    findFirst: vi.fn(),
  },
}))

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

import { getNextPendingAssignment } from '@/lib/training-engine/plan-adjustment/get-next-pending-assignment'

const FIXED_NOW = new Date('2026-04-11T09:00:00Z')
const DAY_MS = 86_400_000

function makeStrength(overrides: { assignedDate: Date; id?: string; name?: string }) {
  return {
    id: overrides.id ?? 'strength-1',
    sessionId: 'strength-session-1',
    athleteId: 'client-1',
    assignedDate: overrides.assignedDate,
    status: 'PENDING',
    notes: null,
    session: { id: 'strength-session-1', name: overrides.name ?? 'Lower body' },
  }
}

function makeCardio(overrides: { assignedDate: Date; id?: string; name?: string }) {
  return {
    id: overrides.id ?? 'cardio-1',
    sessionId: 'cardio-session-1',
    athleteId: 'client-1',
    assignedDate: overrides.assignedDate,
    status: 'PENDING',
    notes: null,
    session: { id: 'cardio-session-1', name: overrides.name ?? 'Zone 2 run' },
  }
}

describe('getNextPendingAssignment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns null when neither table has a pending assignment in the window', async () => {
    mockPrisma.strengthSessionAssignment.findFirst.mockResolvedValue(null)
    mockPrisma.cardioSessionAssignment.findFirst.mockResolvedValue(null)

    const result = await getNextPendingAssignment('client-1', { now: FIXED_NOW })

    expect(result).toBeNull()
  })

  it('returns the strength assignment when only strength is present', async () => {
    mockPrisma.strengthSessionAssignment.findFirst.mockResolvedValue(
      makeStrength({ assignedDate: new Date(FIXED_NOW.getTime() + DAY_MS) })
    )
    mockPrisma.cardioSessionAssignment.findFirst.mockResolvedValue(null)

    const result = await getNextPendingAssignment('client-1', { now: FIXED_NOW })

    expect(result).not.toBeNull()
    expect(result?.kind).toBe('STRENGTH')
    expect(result?.sessionName).toBe('Lower body')
  })

  it('returns the cardio assignment when only cardio is present', async () => {
    mockPrisma.strengthSessionAssignment.findFirst.mockResolvedValue(null)
    mockPrisma.cardioSessionAssignment.findFirst.mockResolvedValue(
      makeCardio({ assignedDate: new Date(FIXED_NOW.getTime() + DAY_MS) })
    )

    const result = await getNextPendingAssignment('client-1', { now: FIXED_NOW })

    expect(result?.kind).toBe('CARDIO')
    expect(result?.sessionName).toBe('Zone 2 run')
  })

  it('picks the earlier of the two when both are present', async () => {
    mockPrisma.strengthSessionAssignment.findFirst.mockResolvedValue(
      makeStrength({ assignedDate: new Date(FIXED_NOW.getTime() + 3 * DAY_MS) })
    )
    mockPrisma.cardioSessionAssignment.findFirst.mockResolvedValue(
      makeCardio({ assignedDate: new Date(FIXED_NOW.getTime() + 1 * DAY_MS) })
    )

    const result = await getNextPendingAssignment('client-1', { now: FIXED_NOW })

    expect(result?.kind).toBe('CARDIO')
  })

  it('breaks ties in favour of strength when both are on the same day', async () => {
    const sameDay = new Date(FIXED_NOW.getTime() + DAY_MS)
    mockPrisma.strengthSessionAssignment.findFirst.mockResolvedValue(
      makeStrength({ assignedDate: sameDay })
    )
    mockPrisma.cardioSessionAssignment.findFirst.mockResolvedValue(
      makeCardio({ assignedDate: sameDay })
    )

    const result = await getNextPendingAssignment('client-1', { now: FIXED_NOW })

    expect(result?.kind).toBe('STRENGTH')
  })

  it('skips strength when the caller restricts kinds to CARDIO only', async () => {
    mockPrisma.strengthSessionAssignment.findFirst.mockResolvedValue(
      makeStrength({ assignedDate: new Date(FIXED_NOW.getTime() + DAY_MS) })
    )
    mockPrisma.cardioSessionAssignment.findFirst.mockResolvedValue(
      makeCardio({ assignedDate: new Date(FIXED_NOW.getTime() + 2 * DAY_MS) })
    )

    const result = await getNextPendingAssignment('client-1', {
      now: FIXED_NOW,
      kinds: ['CARDIO'],
    })

    expect(result?.kind).toBe('CARDIO')
    // Strength findFirst should NOT have been called
    expect(mockPrisma.strengthSessionAssignment.findFirst).not.toHaveBeenCalled()
  })

  it('passes the expected where clause: PENDING status + window + athleteId', async () => {
    mockPrisma.strengthSessionAssignment.findFirst.mockResolvedValue(null)
    mockPrisma.cardioSessionAssignment.findFirst.mockResolvedValue(null)

    await getNextPendingAssignment('client-42', { now: FIXED_NOW, horizonDays: 3 })

    const [strengthCall] =
      mockPrisma.strengthSessionAssignment.findFirst.mock.calls
    expect(strengthCall).toBeDefined()
    const where = (strengthCall[0] as { where: Record<string, unknown> }).where
    expect(where.athleteId).toBe('client-42')
    expect(where.status).toBe('PENDING')
    const dateClause = where.assignedDate as { gte: Date; lte: Date }
    // horizonDays 3 → lte is 3 days after the start-of-today
    const deltaMs = dateClause.lte.getTime() - dateClause.gte.getTime()
    expect(deltaMs).toBe(3 * DAY_MS)
  })
})
