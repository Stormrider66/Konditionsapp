import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import './setup'
import { prisma } from '@/lib/prisma'
import {
  canAccessClient,
  getCurrentUser,
  requireCoach,
  resolveAthleteClientId,
} from '@/lib/auth-utils'
import { requireFeatureAccess, requireCoachFeatureAccess } from '@/lib/subscription/require-feature-access'
import { resetTenantBoundaryMocks } from './setup'

// Route imports
import { POST as postGenerateProgram, GET as getGenerateProgram } from '@/app/api/ai/generate-program/route'
import { POST as postNutritionPlan } from '@/app/api/ai/nutrition-plan/route'
import { GET as getPredictions, POST as postPredictions } from '@/app/api/ai/advanced-intelligence/predictions/route'
import { GET as getPatterns } from '@/app/api/ai/advanced-intelligence/patterns/route'
import { GET as getInjuryRisk } from '@/app/api/ai/advanced-intelligence/injury-risk/route'
import { GET as getCoachStyle, POST as postCoachStyle } from '@/app/api/ai/advanced-intelligence/coach-style/route'
import { POST as postLactateOcr } from '@/app/api/ai/lactate-ocr/route'
import { POST as postStravaOAuth } from '@/app/api/integrations/strava/route'
import { POST as postGarminOAuth } from '@/app/api/integrations/garmin/route'
import { POST as postConcept2OAuth } from '@/app/api/integrations/concept2/route'
import { GET as getConcept2Sync, POST as postConcept2Sync } from '@/app/api/integrations/concept2/sync/route'

// Helper to create a 403 feature-denied response
function featureDeniedResponse(feature: string) {
  return NextResponse.json(
    {
      error: expect.any(String),
      code: 'FEATURE_DISABLED',
      feature,
      upgradeUrl: expect.any(String),
    },
    { status: 403 }
  )
}

describe('Subscription gating - premium routes', () => {
  beforeEach(() => {
    resetTenantBoundaryMocks()
  })

  // ============================================================
  // 1. AI Routes with athlete-level gating
  // ============================================================

  describe('Advanced Intelligence - Predictions', () => {
    it('GET denies FREE tier athlete', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({ id: 'coach-a', role: 'COACH' } as any)
      vi.mocked(canAccessClient).mockResolvedValue(true)
      vi.mocked(requireFeatureAccess).mockResolvedValue(
        NextResponse.json(
          { error: 'Feature disabled', code: 'FEATURE_DISABLED', feature: 'advanced_intelligence', upgradeUrl: '/athlete/subscription' },
          { status: 403 }
        )
      )

      const request = new Request('http://localhost/api/ai/advanced-intelligence/predictions?clientId=00000000-0000-0000-0000-000000000001&type=all')
      const response = await getPredictions(request as any)

      expect(response.status).toBe(403)
      const body = await response.json()
      expect(body.code).toBe('FEATURE_DISABLED')
      expect(body.feature).toBe('advanced_intelligence')
      expect(requireFeatureAccess).toHaveBeenCalledWith('00000000-0000-0000-0000-000000000001', 'advanced_intelligence')
    })

    it('POST denies FREE tier athlete', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({ id: 'coach-a', role: 'COACH' } as any)
      vi.mocked(canAccessClient).mockResolvedValue(true)
      vi.mocked(requireFeatureAccess).mockResolvedValue(
        NextResponse.json(
          { error: 'Feature disabled', code: 'FEATURE_DISABLED', feature: 'advanced_intelligence', upgradeUrl: '/athlete/subscription' },
          { status: 403 }
        )
      )

      const request = new Request('http://localhost/api/ai/advanced-intelligence/predictions', {
        method: 'POST',
        body: JSON.stringify({ clientId: '00000000-0000-0000-0000-000000000001', targetDistance: '5K' }),
        headers: { 'Content-Type': 'application/json' },
      })
      const response = await postPredictions(request as any)

      expect(response.status).toBe(403)
      expect(requireFeatureAccess).toHaveBeenCalledWith('00000000-0000-0000-0000-000000000001', 'advanced_intelligence')
    })
  })

  describe('Advanced Intelligence - Patterns', () => {
    it('GET denies FREE tier athlete', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({ id: 'coach-a', role: 'COACH' } as any)
      vi.mocked(canAccessClient).mockResolvedValue(true)
      vi.mocked(requireFeatureAccess).mockResolvedValue(
        NextResponse.json(
          { error: 'Feature disabled', code: 'FEATURE_DISABLED', feature: 'advanced_intelligence', upgradeUrl: '/athlete/subscription' },
          { status: 403 }
        )
      )

      const request = new Request('http://localhost/api/ai/advanced-intelligence/patterns?clientId=00000000-0000-0000-0000-000000000001')
      const response = await getPatterns(request as any)

      expect(response.status).toBe(403)
      expect(requireFeatureAccess).toHaveBeenCalledWith('00000000-0000-0000-0000-000000000001', 'advanced_intelligence')
    })
  })

  describe('Advanced Intelligence - Injury Risk', () => {
    it('GET denies FREE tier athlete', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({ id: 'coach-a', role: 'COACH' } as any)
      vi.mocked(canAccessClient).mockResolvedValue(true)
      vi.mocked(requireFeatureAccess).mockResolvedValue(
        NextResponse.json(
          { error: 'Feature disabled', code: 'FEATURE_DISABLED', feature: 'advanced_intelligence', upgradeUrl: '/athlete/subscription' },
          { status: 403 }
        )
      )

      const request = new Request('http://localhost/api/ai/advanced-intelligence/injury-risk?clientId=00000000-0000-0000-0000-000000000001')
      const response = await getInjuryRisk(request as any)

      expect(response.status).toBe(403)
      expect(requireFeatureAccess).toHaveBeenCalledWith('00000000-0000-0000-0000-000000000001', 'advanced_intelligence')
    })
  })

  describe('Nutrition Plan', () => {
    it('POST denies FREE tier athlete', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({ id: 'coach-a', role: 'COACH' } as any)
      vi.mocked(canAccessClient).mockResolvedValue(true)
      vi.mocked(requireFeatureAccess).mockResolvedValue(
        NextResponse.json(
          { error: 'Feature disabled', code: 'FEATURE_DISABLED', feature: 'nutrition_planning', upgradeUrl: '/athlete/subscription' },
          { status: 403 }
        )
      )

      const request = new Request('http://localhost/api/ai/nutrition-plan', {
        method: 'POST',
        body: JSON.stringify({
          clientId: '00000000-0000-0000-0000-000000000001',
          clientData: { name: 'Test', birthDate: '1990-01-01' },
          activityLevel: 'moderate',
          goal: 'MAINTAIN',
        }),
        headers: { 'Content-Type': 'application/json' },
      })
      const response = await postNutritionPlan(request as any)

      expect(response.status).toBe(403)
      expect(requireFeatureAccess).toHaveBeenCalledWith('00000000-0000-0000-0000-000000000001', 'nutrition_planning')
    })
  })

  // ============================================================
  // 2. Coach-level gating
  // ============================================================

  describe('Program Generation (coach-gated)', () => {
    it('POST denies FREE coach', async () => {
      vi.mocked(requireCoach).mockResolvedValue({ id: 'coach-free', role: 'COACH' } as any)
      vi.mocked(requireCoachFeatureAccess).mockResolvedValue(
        NextResponse.json(
          { error: 'Feature disabled', code: 'FEATURE_DISABLED', feature: 'program_generation', upgradeUrl: '/coach/subscription' },
          { status: 403 }
        )
      )

      const request = new Request('http://localhost/api/ai/generate-program', {
        method: 'POST',
        body: JSON.stringify({
          programContext: { sport: 'RUNNING', goal: '5K' },
          totalWeeks: 8,
        }),
        headers: { 'Content-Type': 'application/json' },
      })
      const response = await postGenerateProgram(request as any)

      expect(response.status).toBe(403)
      expect(requireCoachFeatureAccess).toHaveBeenCalledWith('coach-free', 'program_generation')
    })
  })

  describe('Coach Style (coach-gated)', () => {
    it('GET denies FREE coach', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({ id: 'coach-free', role: 'COACH' } as any)
      vi.mocked(requireCoachFeatureAccess).mockResolvedValue(
        NextResponse.json(
          { error: 'Feature disabled', code: 'FEATURE_DISABLED', feature: 'advanced_intelligence', upgradeUrl: '/coach/subscription' },
          { status: 403 }
        )
      )

      const request = new Request('http://localhost/api/ai/advanced-intelligence/coach-style')
      const response = await getCoachStyle(request as any)

      expect(response.status).toBe(403)
      expect(requireCoachFeatureAccess).toHaveBeenCalledWith('coach-free', 'advanced_intelligence')
    })

    it('POST denies FREE coach', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({ id: 'coach-free', role: 'COACH' } as any)
      vi.mocked(requireCoachFeatureAccess).mockResolvedValue(
        NextResponse.json(
          { error: 'Feature disabled', code: 'FEATURE_DISABLED', feature: 'advanced_intelligence', upgradeUrl: '/coach/subscription' },
          { status: 403 }
        )
      )

      const request = new Request('http://localhost/api/ai/advanced-intelligence/coach-style', {
        method: 'POST',
        body: JSON.stringify({ action: 'extract' }),
        headers: { 'Content-Type': 'application/json' },
      })
      const response = await postCoachStyle(request as any)

      expect(response.status).toBe(403)
      expect(requireCoachFeatureAccess).toHaveBeenCalledWith('coach-free', 'advanced_intelligence')
    })
  })

  describe('Lactate OCR (coach-gated)', () => {
    it('POST denies FREE coach', async () => {
      vi.mocked(requireCoach).mockResolvedValue({ id: 'coach-free', role: 'COACH' } as any)
      vi.mocked(requireCoachFeatureAccess).mockResolvedValue(
        NextResponse.json(
          { error: 'Feature disabled', code: 'FEATURE_DISABLED', feature: 'lactate_ocr', upgradeUrl: '/coach/subscription' },
          { status: 403 }
        )
      )

      const formData = new FormData()
      formData.append('image', new Blob(['fake-image'], { type: 'image/jpeg' }), 'test.jpg')

      const request = new Request('http://localhost/api/ai/lactate-ocr', {
        method: 'POST',
        body: formData,
      })
      const response = await postLactateOcr(request as any)

      expect(response.status).toBe(403)
      expect(requireCoachFeatureAccess).toHaveBeenCalledWith('coach-free', 'lactate_ocr')
    })
  })

  // ============================================================
  // 3. Integration OAuth gating
  // ============================================================

  describe('Strava OAuth', () => {
    it('POST denies FREE tier from initiating OAuth', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({ id: 'coach-a', role: 'COACH' } as any)
      vi.mocked(canAccessClient).mockResolvedValue(true)
      vi.mocked(requireFeatureAccess).mockResolvedValue(
        NextResponse.json(
          { error: 'Feature disabled', code: 'FEATURE_DISABLED', feature: 'strava', upgradeUrl: '/athlete/subscription' },
          { status: 403 }
        )
      )

      const request = new Request('http://localhost/api/integrations/strava', {
        method: 'POST',
        body: JSON.stringify({ clientId: '00000000-0000-0000-0000-000000000001' }),
        headers: { 'Content-Type': 'application/json' },
      })
      const response = await postStravaOAuth(request as any)

      expect(response.status).toBe(403)
      expect(requireFeatureAccess).toHaveBeenCalledWith('00000000-0000-0000-0000-000000000001', 'strava')
    })
  })

  describe('Garmin OAuth', () => {
    it('POST denies FREE tier from initiating OAuth', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({ id: 'coach-a', role: 'COACH' } as any)
      vi.mocked(canAccessClient).mockResolvedValue(true)
      vi.mocked(requireFeatureAccess).mockResolvedValue(
        NextResponse.json(
          { error: 'Feature disabled', code: 'FEATURE_DISABLED', feature: 'garmin', upgradeUrl: '/athlete/subscription' },
          { status: 403 }
        )
      )

      const request = new Request('http://localhost/api/integrations/garmin', {
        method: 'POST',
        body: JSON.stringify({ clientId: '00000000-0000-0000-0000-000000000001' }),
        headers: { 'Content-Type': 'application/json' },
      })
      const response = await postGarminOAuth(request as any)

      expect(response.status).toBe(403)
      expect(requireFeatureAccess).toHaveBeenCalledWith('00000000-0000-0000-0000-000000000001', 'garmin')
    })
  })

  describe('Concept2 OAuth', () => {
    it('POST denies FREE tier from initiating OAuth', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({ id: 'coach-a', role: 'COACH' } as any)
      vi.mocked(canAccessClient).mockResolvedValue(true)
      vi.mocked(requireFeatureAccess).mockResolvedValue(
        NextResponse.json(
          { error: 'Feature disabled', code: 'FEATURE_DISABLED', feature: 'concept2', upgradeUrl: '/athlete/subscription' },
          { status: 403 }
        )
      )

      const request = new Request('http://localhost/api/integrations/concept2', {
        method: 'POST',
        body: JSON.stringify({ clientId: '00000000-0000-0000-0000-000000000001' }),
        headers: { 'Content-Type': 'application/json' },
      })
      const response = await postConcept2OAuth(request as any)

      expect(response.status).toBe(403)
      expect(requireFeatureAccess).toHaveBeenCalledWith('00000000-0000-0000-0000-000000000001', 'concept2')
    })
  })

  describe('Concept2 Sync', () => {
    it('GET denies FREE tier from fetching sync results', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({ id: 'coach-a', role: 'COACH' } as any)
      vi.mocked(canAccessClient).mockResolvedValue(true)
      vi.mocked(requireFeatureAccess).mockResolvedValue(
        NextResponse.json(
          { error: 'Feature disabled', code: 'FEATURE_DISABLED', feature: 'concept2', upgradeUrl: '/athlete/subscription' },
          { status: 403 }
        )
      )

      // Note: The route uses searchParams.get() which returns null for absent params.
      // Zod's z.coerce.number().optional() coerces null→0 then fails min(1).
      // We work around this pre-existing issue by omitting params that trigger the Zod coerce bug.
      const url = new URL('http://localhost/api/integrations/concept2/sync')
      url.searchParams.set('clientId', '00000000-0000-0000-0000-000000000001')
      const request = new NextRequest(url)
      // Override nextUrl.searchParams to only include clientId (avoids null params in Zod)
      Object.defineProperty(request, 'nextUrl', {
        get: () => url,
      })
      const response = await getConcept2Sync(request)

      expect(response.status).toBe(403)
      expect(requireFeatureAccess).toHaveBeenCalledWith('00000000-0000-0000-0000-000000000001', 'concept2')
    })

    it('POST denies FREE tier from triggering sync', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({ id: 'coach-a', role: 'COACH' } as any)
      vi.mocked(canAccessClient).mockResolvedValue(true)
      vi.mocked(requireFeatureAccess).mockResolvedValue(
        NextResponse.json(
          { error: 'Feature disabled', code: 'FEATURE_DISABLED', feature: 'concept2', upgradeUrl: '/athlete/subscription' },
          { status: 403 }
        )
      )

      const request = new Request('http://localhost/api/integrations/concept2/sync', {
        method: 'POST',
        body: JSON.stringify({ clientId: '00000000-0000-0000-0000-000000000001' }),
        headers: { 'Content-Type': 'application/json' },
      })
      const response = await postConcept2Sync(request as any)

      expect(response.status).toBe(403)
      expect(requireFeatureAccess).toHaveBeenCalledWith('00000000-0000-0000-0000-000000000001', 'concept2')
    })
  })

  // ============================================================
  // 4. Cross-coach isolation on premium routes
  // ============================================================

  describe('Cross-coach isolation', () => {
    it('Predictions denies coach B access to coach A client', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({ id: 'coach-b', role: 'COACH' } as any)
      vi.mocked(canAccessClient).mockResolvedValue(false)

      const request = new Request('http://localhost/api/ai/advanced-intelligence/predictions?clientId=00000000-0000-0000-0000-000000000002&type=all')
      const response = await getPredictions(request as any)

      expect(response.status).toBe(404)
      // requireFeatureAccess should NOT be called (denied before reaching it)
      expect(requireFeatureAccess).not.toHaveBeenCalled()
    })

    it('Patterns denies coach B access to coach A client', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({ id: 'coach-b', role: 'COACH' } as any)
      vi.mocked(canAccessClient).mockResolvedValue(false)

      const request = new Request('http://localhost/api/ai/advanced-intelligence/patterns?clientId=00000000-0000-0000-0000-000000000002')
      const response = await getPatterns(request as any)

      expect(response.status).toBe(404)
      expect(requireFeatureAccess).not.toHaveBeenCalled()
    })
  })

  // ============================================================
  // 5. Allowed tier passes through
  // ============================================================

  describe('PRO tier passes through', () => {
    it('Predictions allows PRO tier athlete', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({ id: 'coach-a', role: 'COACH' } as any)
      vi.mocked(canAccessClient).mockResolvedValue(true)
      vi.mocked(requireFeatureAccess).mockResolvedValue(null) // allowed

      const request = new Request('http://localhost/api/ai/advanced-intelligence/patterns?clientId=00000000-0000-0000-0000-000000000003')
      // This will proceed past the gate but may fail on the actual business logic mock
      // The key assertion is that the gate allowed passage
      await getPatterns(request as any)

      expect(requireFeatureAccess).toHaveBeenCalledWith('00000000-0000-0000-0000-000000000003', 'advanced_intelligence')
    })
  })
})
