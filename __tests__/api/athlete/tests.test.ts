import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  resolveAthleteClientId: vi.fn(),
  testFindMany: vi.fn(),
  testFindUnique: vi.fn(),
  sportProfileFindUnique: vi.fn(),
}))

vi.mock('@/lib/auth-utils', () => ({
  resolveAthleteClientId: mocks.resolveAthleteClientId,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    test: { findMany: mocks.testFindMany, findUnique: mocks.testFindUnique },
    sportProfile: { findUnique: mocks.sportProfileFindUnique },
  },
}))

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}))

import { GET as listTests } from '@/app/api/athlete/tests/route'
import { GET as getTest } from '@/app/api/athlete/tests/[id]/route'

beforeEach(() => {
  vi.clearAllMocks()
  mocks.resolveAthleteClientId.mockResolvedValue({
    user: { id: 'user-1', language: 'en' },
    clientId: 'client-1',
    isCoachInAthleteMode: false,
  })
  mocks.sportProfileFindUnique.mockResolvedValue({
    primarySport: 'RUNNING',
    secondarySports: [],
  })
})

describe('GET /api/athlete/tests', () => {
  it('returns 401 when unauthenticated', async () => {
    mocks.resolveAthleteClientId.mockResolvedValue(null)
    const res = await listTests(new NextRequest('http://localhost/api/athlete/tests'))
    expect(res.status).toBe(401)
  })

  it('returns tests with latest stats and vo2max improvement', async () => {
    mocks.testFindMany.mockResolvedValue([
      { id: 't-2', testDate: new Date('2026-06-01'), testType: 'RUNNING', vo2max: 56.2, maxHR: 192, maxLactate: 9.1, notes: null },
      { id: 't-1', testDate: new Date('2026-03-01'), testType: 'RUNNING', vo2max: 54.0, maxHR: 193, maxLactate: 8.4, notes: null },
    ])

    const res = await listTests(new NextRequest('http://localhost/api/athlete/tests'))
    expect(res.status).toBe(200)
    const body = await res.json()

    expect(body.success).toBe(true)
    expect(body.data.tests).toHaveLength(2)
    expect(body.data.stats).toMatchObject({
      totalTests: 2,
      latestVo2max: 56.2,
      latestMaxHR: 192,
    })
    expect(body.data.stats.vo2maxImprovement).toBeCloseTo(2.2)
    expect(body.data.primarySport).toBe('RUNNING')

    expect(mocks.testFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { clientId: 'client-1', status: 'COMPLETED' },
      })
    )
  })

  it('reports null improvement when fewer than two tests have vo2max', async () => {
    mocks.testFindMany.mockResolvedValue([
      { id: 't-1', testDate: new Date('2026-06-01'), testType: 'RUNNING', vo2max: 56.2, maxHR: 192, maxLactate: null, notes: null },
    ])
    const res = await listTests(new NextRequest('http://localhost/api/athlete/tests'))
    const body = await res.json()
    expect(body.data.stats.vo2maxImprovement).toBeNull()
  })
})

describe('GET /api/athlete/tests/[id]', () => {
  const makeParams = (id: string) => ({ params: Promise.resolve({ id }) })

  it('returns the test with stages and derived calculations', async () => {
    mocks.testFindUnique.mockResolvedValue({
      id: 't-1',
      clientId: 'client-1',
      testDate: new Date('2026-06-01'),
      testType: 'RUNNING',
      vo2max: 56.2,
      maxHR: 192,
      maxLactate: 9.1,
      aerobicThreshold: { heartRate: 155 },
      anaerobicThreshold: { heartRate: 178 },
      trainingZones: [{ zone: 1 }],
      testStages: [
        { id: 's-2', sequence: 2, lactate: 2.4 },
        { id: 's-1', sequence: 1, lactate: 1.1 },
      ],
      client: { height: 180, weight: 75 },
    })

    const res = await getTest(
      new NextRequest('http://localhost/api/athlete/tests/t-1'),
      makeParams('t-1')
    )
    expect(res.status).toBe(200)
    const body = await res.json()

    expect(body.data.test.id).toBe('t-1')
    expect(body.data.test.testStages).toHaveLength(2)
    expect(body.data.test.client).toBeUndefined() // client payload stripped
    expect(body.data.calculations.bmi).toBeCloseTo(23.1)
    expect(body.data.calculations.anaerobicThreshold).toEqual({ heartRate: 178 })
  })

  it("404s on another athlete's test", async () => {
    mocks.testFindUnique.mockResolvedValue({
      id: 't-9',
      clientId: 'someone-else',
      testStages: [],
      client: { height: 180, weight: 75 },
    })
    const res = await getTest(
      new NextRequest('http://localhost/api/athlete/tests/t-9'),
      makeParams('t-9')
    )
    expect(res.status).toBe(404)
  })
})
