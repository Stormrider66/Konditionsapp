import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import './setup'
import { prisma } from '@/lib/prisma'
import { canAccessClient, requireCoach } from '@/lib/auth-utils'
import { canAccessAthlete as canAccessAthleteScoped } from '@/lib/auth/athlete-access'
import { resetTenantBoundaryMocks } from './setup'
import { GET as getPatterns } from '@/app/api/data-moat/patterns/route'
import { POST as postCoachDecision } from '@/app/api/data-moat/coach-decisions/route'
import { GET as getTrainingOutcomes } from '@/app/api/data-moat/training-outcomes/route'
import { GET as getCohortBenchmark } from '@/app/api/data-moat/cohorts/benchmark/route'
import { GET as getPredictionsAccuracy } from '@/app/api/data-moat/predictions/accuracy/route'
import { GET as getCoachDecisionAnalytics } from '@/app/api/data-moat/coach-decisions/analytics/route'
import { GET as getTrainingOutcomeAnalytics } from '@/app/api/data-moat/training-outcomes/analytics/route'
import { GET as getPredictions } from '@/app/api/data-moat/predictions/route'
import { POST as postPredictions } from '@/app/api/data-moat/predictions/route'

describe('Tenant boundary - data-moat', () => {
  beforeEach(() => {
    resetTenantBoundaryMocks()
  })

  it('GET /api/data-moat/patterns returns 403 for ATHLETE role', async () => {
    vi.mocked(requireCoach).mockRejectedValue(new Error('Access denied. Coach access required.'))

    const response = await getPatterns(new NextRequest('http://localhost/api/data-moat/patterns') as any)
    expect(response.status).toBe(403)
    expect(prisma.performancePattern.findMany).not.toHaveBeenCalled()
  })

  it('GET /api/data-moat/patterns?athleteId returns 404 when coach lacks athlete access', async () => {
    vi.mocked(requireCoach).mockResolvedValue({ id: 'coach-a', role: 'COACH' } as any)
    vi.mocked(canAccessClient).mockResolvedValue(false)

    const request = new NextRequest('http://localhost/api/data-moat/patterns?athleteId=athlete-b')
    const response = await getPatterns(request as any)

    expect(response.status).toBe(404)
    expect(prisma.performancePattern.findMany).not.toHaveBeenCalled()
    expect(prisma.performancePattern.count).not.toHaveBeenCalled()
  })

  it('POST /api/data-moat/coach-decisions returns 404 for inaccessible athleteId', async () => {
    vi.mocked(requireCoach).mockResolvedValue({ id: 'coach-a', role: 'COACH' } as any)
    vi.mocked(canAccessClient).mockResolvedValue(false)

    const request = new Request('http://localhost/api/data-moat/coach-decisions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        athleteId: 'cm1234567890abcde12345',
        aiSuggestionType: 'WORKOUT',
        aiSuggestionData: { load: 'reduce' },
        modificationData: { changed: true },
        reasonCategory: 'COACH_INTUITION',
      }),
    })
    const response = await postCoachDecision(request as any)

    expect(response.status).toBe(404)
    expect(prisma.coachDecision.create).not.toHaveBeenCalled()
  })

  it('GET /api/data-moat/training-outcomes returns 404 for inaccessible athlete filter', async () => {
    vi.mocked(requireCoach).mockResolvedValue({ id: 'coach-a', role: 'COACH' } as any)
    vi.mocked(canAccessClient).mockResolvedValue(false)

    const request = new NextRequest(
      'http://localhost/api/data-moat/training-outcomes?athleteId=cm1234567890abcde12345'
    )
    const response = await getTrainingOutcomes(request as any)

    expect(response.status).toBe(404)
    expect(prisma.trainingPeriodOutcome.findMany).not.toHaveBeenCalled()
    expect(prisma.trainingPeriodOutcome.count).not.toHaveBeenCalled()
  })

  it('GET /api/data-moat/cohorts/benchmark returns 403 for ATHLETE role', async () => {
    vi.mocked(requireCoach).mockRejectedValue(new Error('Access denied. Coach access required.'))

    const request = new NextRequest(
      'http://localhost/api/data-moat/cohorts/benchmark?athleteId=cm1234567890abcde12345'
    )
    const response = await getCohortBenchmark(request as any)

    expect(response.status).toBe(403)
    expect(prisma.client.findUnique).not.toHaveBeenCalled()
  })

  it('GET /api/data-moat/training-outcomes returns 403 for ATHLETE role', async () => {
    vi.mocked(requireCoach).mockRejectedValue(new Error('Access denied. Coach access required.'))

    const response = await getTrainingOutcomes(
      new NextRequest('http://localhost/api/data-moat/training-outcomes') as any
    )
    expect(response.status).toBe(403)
    expect(prisma.trainingPeriodOutcome.findMany).not.toHaveBeenCalled()
  })

  it('GET /api/data-moat/predictions/accuracy returns 404 for inaccessible athlete filter', async () => {
    vi.mocked(requireCoach).mockResolvedValue({ id: 'coach-a', role: 'COACH' } as any)
    vi.mocked(canAccessClient).mockResolvedValue(false)

    const request = new NextRequest(
      'http://localhost/api/data-moat/predictions/accuracy?athleteId=cm1234567890abcde12345'
    )
    const response = await getPredictionsAccuracy(request as any)

    expect(response.status).toBe(404)
    expect(prisma.aIPrediction.findMany).not.toHaveBeenCalled()
  })

  it('GET /api/data-moat/coach-decisions/analytics returns 404 for inaccessible athlete filter', async () => {
    vi.mocked(requireCoach).mockResolvedValue({ id: 'coach-a', role: 'COACH' } as any)
    vi.mocked(canAccessClient).mockResolvedValue(false)

    const request = new NextRequest(
      'http://localhost/api/data-moat/coach-decisions/analytics?athleteId=cm1234567890abcde12345'
    )
    const response = await getCoachDecisionAnalytics(request as any)

    expect(response.status).toBe(404)
    expect(prisma.coachDecision.findMany).not.toHaveBeenCalled()
  })

  it('GET /api/data-moat/training-outcomes/analytics returns 404 for inaccessible athlete filter', async () => {
    vi.mocked(requireCoach).mockResolvedValue({ id: 'coach-a', role: 'COACH' } as any)
    vi.mocked(canAccessClient).mockResolvedValue(false)

    const request = new NextRequest(
      'http://localhost/api/data-moat/training-outcomes/analytics?athleteId=cm1234567890abcde12345'
    )
    const response = await getTrainingOutcomeAnalytics(request as any)

    expect(response.status).toBe(404)
    expect(prisma.trainingPeriodOutcome.findMany).not.toHaveBeenCalled()
  })

  it('GET /api/data-moat/predictions returns 403 for inaccessible athlete filter', async () => {
    vi.mocked(canAccessAthleteScoped).mockResolvedValue({ allowed: false } as any)

    const request = new NextRequest(
      'http://localhost/api/data-moat/predictions?athleteId=cm1234567890abcde12345'
    )
    const response = await getPredictions(request as any)

    expect(response.status).toBe(403)
    expect(prisma.aIPrediction.findMany).not.toHaveBeenCalled()
    expect(prisma.aIPrediction.count).not.toHaveBeenCalled()
  })

  it('POST /api/data-moat/predictions returns 403 for inaccessible athlete', async () => {
    vi.mocked(canAccessAthleteScoped).mockResolvedValue({ allowed: false } as any)

    const request = new Request('http://localhost/api/data-moat/predictions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        athleteId: 'cm1234567890abcde12345',
        predictionType: 'READINESS_SCORE',
        predictedValue: { value: 78 },
        confidenceScore: 0.83,
        modelVersion: 'test-v1',
        inputDataSnapshot: { sample: true },
      }),
    })
    const response = await postPredictions(request as any)

    expect(response.status).toBe(403)
    expect(prisma.aIPrediction.create).not.toHaveBeenCalled()
  })
})
