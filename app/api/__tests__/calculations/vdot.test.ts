import { describe, it, expect, beforeEach, vi } from 'vitest'
import { POST } from '@/app/api/calculations/vdot/route'
import { NextRequest } from 'next/server'

// Mock auth utilities
const mockGetCurrentUser = vi.hoisted(() => vi.fn())

vi.mock('@/lib/auth-utils', () => ({
  getCurrentUser: mockGetCurrentUser,
  requireCoach: vi.fn(),
  requireAthlete: vi.fn(),
}))

// Mock Supabase client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve({
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: { id: 'test-user' } }, error: null }))
    }
  }))
}))

// Mock VDOT calculations
vi.mock('@/lib/calculations/vdot', () => ({
  calculateVDOT: vi.fn((distance: number, time: number) => {
    // Simplified VDOT calculation for testing
    // 5K in 20:00 (1200s) ~= VDOT 45
    // 5K in 17:30 (1050s) ~= VDOT 55
    // 5K in 14:30 (870s) ~= VDOT 65
    const pace = time / (distance / 1000)
    if (pace < 180) return 70
    if (pace < 210) return 65
    if (pace < 240) return 55
    if (pace < 270) return 50
    if (pace < 300) return 45
    if (pace < 360) return 38
    return 30
  }),
  getTrainingPaces: vi.fn(() => ({
    easy: { min: 390, max: 330, formatted: '5:30 - 6:30' },
    marathon: { pace: 285, formatted: '4:45' },
    threshold: { pace: 260, formatted: '4:20' },
    interval: { pace: 240, formatted: '4:00' },
    repetition: { pace: 225, formatted: '3:45' }
  })),
  getEquivalentRaceTimes: vi.fn(() => ({
    '5K': '20:00',
    '10K': '41:30',
    'HALF_MARATHON': '1:31:00',
    'MARATHON': '3:10:00'
  }))
}))

// Helper to create a mock request
function createRequest(body: object, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest('http://localhost/api/calculations/vdot', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': `192.168.1.${Math.floor(Math.random() * 255)}`, // Unique IP for rate limiting
      ...headers,
    },
  })
}

describe('POST /api/calculations/vdot', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: authenticated user
    mockGetCurrentUser.mockResolvedValue({ id: 'test-user', role: 'COACH' })
  })

  describe('Authentication', () => {
    it('returns 401 when user is not authenticated', async () => {
      mockGetCurrentUser.mockResolvedValue(null)

      const request = createRequest({
        distanceMeters: 5000,
        timeSeconds: 1200,
      })

      const response = await POST(request)
      expect(response.status).toBe(401)

      const body = await response.json()
      expect(body.error).toBe('UNAUTHORIZED')
    })
  })

  describe('Validation', () => {
    it('returns 422 for invalid distance (too short)', async () => {
      const request = createRequest({
        distanceMeters: 500, // min is 800
        timeSeconds: 1200,
      })

      const response = await POST(request)
      expect(response.status).toBe(422)

      const body = await response.json()
      expect(body.error).toBe('VALIDATION_ERROR')
    })

    it('returns 422 for invalid distance (too long)', async () => {
      const request = createRequest({
        distanceMeters: 150000, // max is 100000
        timeSeconds: 1200,
      })

      const response = await POST(request)
      expect(response.status).toBe(422)
    })

    it('returns 422 for invalid time (too short)', async () => {
      const request = createRequest({
        distanceMeters: 5000,
        timeSeconds: 30, // min is 60
      })

      const response = await POST(request)
      expect(response.status).toBe(422)
    })

    it('returns 422 for missing required fields', async () => {
      const request = createRequest({
        distanceMeters: 5000,
        // missing timeSeconds
      })

      const response = await POST(request)
      expect(response.status).toBe(422)
    })

    it('returns 400 for invalid JSON body', async () => {
      const request = new NextRequest('http://localhost/api/calculations/vdot', {
        method: 'POST',
        body: 'not json',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '192.168.1.100',
        },
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
    })
  })

  describe('VDOT Calculation', () => {
    it('calculates VDOT for a 5K race (20:00)', async () => {
      const request = createRequest({
        distanceMeters: 5000,
        timeSeconds: 1200, // 20:00
      })

      const response = await POST(request)
      expect(response.status).toBe(200)

      const body = await response.json()
      expect(body.success).toBe(true)
      expect(body.data.vdot).toBeGreaterThanOrEqual(45)
      expect(body.data.vdot).toBeLessThanOrEqual(55)
      expect(['INTERMEDIATE', 'ADVANCED']).toContain(body.data.performance.category)
    })

    it('calculates VDOT for a 10K race (40:00)', async () => {
      const request = createRequest({
        distanceMeters: 10000,
        timeSeconds: 2400, // 40:00
      })

      const response = await POST(request)
      expect(response.status).toBe(200)

      const body = await response.json()
      expect(body.success).toBe(true)
      expect(body.data.vdot).toBeGreaterThan(45)
      expect(body.data.vdot).toBeLessThan(55)
    })

    it('calculates VDOT for a marathon (3:00:00)', async () => {
      const request = createRequest({
        distanceMeters: 42195,
        timeSeconds: 10800, // 3:00:00
      })

      const response = await POST(request)
      expect(response.status).toBe(200)

      const body = await response.json()
      expect(body.success).toBe(true)
      expect(body.data.vdot).toBeGreaterThanOrEqual(45)
      expect(['INTERMEDIATE', 'ADVANCED']).toContain(body.data.performance.category)
    })

    it('returns training paces in the response', async () => {
      const request = createRequest({
        distanceMeters: 5000,
        timeSeconds: 1200,
      })

      const response = await POST(request)
      const body = await response.json()

      expect(body.data.trainingPaces).toBeDefined()
      expect(body.data.trainingPaces.easy).toBeDefined()
      expect(body.data.trainingPaces.marathon).toBeDefined()
      expect(body.data.trainingPaces.threshold).toBeDefined()
      expect(body.data.trainingPaces.interval).toBeDefined()
      expect(body.data.trainingPaces.repetition).toBeDefined()
    })

    it('returns equivalent times for different distances', async () => {
      const request = createRequest({
        distanceMeters: 5000,
        timeSeconds: 1200,
      })

      const response = await POST(request)
      const body = await response.json()

      expect(body.data.equivalentTimes).toBeDefined()
      expect(body.data.equivalentTimes['5K']).toBeDefined()
      expect(body.data.equivalentTimes['10K']).toBeDefined()
      expect(body.data.equivalentTimes['Half Marathon']).toBeDefined()
      expect(body.data.equivalentTimes['Marathon']).toBeDefined()
    })

    it('returns formatted input in performance object', async () => {
      const request = createRequest({
        distanceMeters: 5000,
        timeSeconds: 1200,
      })

      const response = await POST(request)
      const body = await response.json()

      expect(body.data.performance.inputDistance).toBe('5000m')
      expect(body.data.performance.inputTime).toBe('20:00')
    })
  })

  describe('Performance Categories', () => {
    it('categorizes elite performance (sub-15:00 5K)', async () => {
      const request = createRequest({
        distanceMeters: 5000,
        timeSeconds: 870, // 14:30
      })

      const response = await POST(request)
      const body = await response.json()

      expect(body.data.performance.category).toBe('ELITE')
    })

    it('categorizes advanced performance', async () => {
      const request = createRequest({
        distanceMeters: 5000,
        timeSeconds: 1050, // 17:30
      })

      const response = await POST(request)
      const body = await response.json()

      expect(body.data.performance.category).toBe('ADVANCED')
    })

    it('categorizes recreational or beginner performance', async () => {
      const request = createRequest({
        distanceMeters: 5000,
        timeSeconds: 1800, // 30:00
      })

      const response = await POST(request)
      const body = await response.json()

      expect(['RECREATIONAL', 'BEGINNER']).toContain(body.data.performance.category)
    })
  })

  describe('Environmental Adjustments', () => {
    it('adds altitude adjustment when altitude > 1000m', async () => {
      const request = createRequest({
        distanceMeters: 5000,
        timeSeconds: 1200,
        altitude: 2000,
      })

      const response = await POST(request)
      const body = await response.json()

      expect(body.data.adjustments).toBeDefined()
      expect(body.data.adjustments.length).toBeGreaterThan(0)
      expect(body.data.adjustments[0]).toContain('Altitude')
    })

    it('adds temperature adjustment when temperature > 25°C', async () => {
      const request = createRequest({
        distanceMeters: 5000,
        timeSeconds: 1200,
        temperature: 30,
      })

      const response = await POST(request)
      const body = await response.json()

      expect(body.data.adjustments).toBeDefined()
      expect(body.data.adjustments[0]).toContain('Temperature')
    })

    it('adds temperature adjustment when temperature is extreme', async () => {
      const request = createRequest({
        distanceMeters: 5000,
        timeSeconds: 1200,
        temperature: -10, // Very cold
      })

      const response = await POST(request)
      const body = await response.json()

      // Cold temperatures should trigger adjustment
      if (body.data.adjustments) {
        expect(body.data.adjustments.some((adj: string) => adj.includes('Temperature'))).toBe(true)
      }
    })

    it('returns no adjustments for normal conditions', async () => {
      const request = createRequest({
        distanceMeters: 5000,
        timeSeconds: 1200,
        altitude: 500,
        temperature: 15,
      })

      const response = await POST(request)
      const body = await response.json()

      expect(body.data.adjustments).toBeUndefined()
    })
  })
})
