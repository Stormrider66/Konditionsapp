import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PaceSelection } from '@/lib/training-engine/calculations/pace-selector'

const mockSelectOptimalPaces = vi.hoisted(() => vi.fn())
const mockPrisma = vi.hoisted(() => ({
  client: {
    findUnique: vi.fn(),
  },
  raceResult: {
    findMany: vi.fn(),
  },
  test: {
    findFirst: vi.fn(),
  },
}))

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

vi.mock('@/lib/training-engine/calculations/pace-selector', () => ({
  selectOptimalPaces: mockSelectOptimalPaces,
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

import { fetchElitePacesServer } from './elite-pace-integration'

function mockPaceSelection(): PaceSelection {
  return {
    marathonPace: { kmh: 14, pace: '4:17' },
    thresholdPace: { kmh: 15, pace: '4:00' },
    easyPace: { minKmh: 10, maxKmh: 12, minPace: '6:00', maxPace: '5:00' },
    intervalPace: { kmh: 16, pace: '3:45' },
    repetitionPace: { kmh: 18, pace: '3:20' },
    zones: {
      daniels: {
        easy: { minKmh: 10, maxKmh: 12, minPace: '6:00', maxPace: '5:00' },
        marathon: { kmh: 14, pace: '4:17' },
        threshold: { kmh: 15, pace: '4:00' },
        interval: { kmh: 16, pace: '3:45' },
        repetition: { kmh: 18, pace: '3:20' },
      },
      canova: {
        fundamental: { kmh: 11, pace: '5:27', percentOfMP: 78 },
        progressive: {
          minKmh: 12,
          maxKmh: 14,
          minPace: '5:00',
          maxPace: '4:17',
          percentOfMP: '85-100%',
        },
        marathon: { kmh: 14, pace: '4:17', percentOfMP: 100 },
        specific: { kmh: 14.5, pace: '4:08', percentOfMP: 104 },
        threshold: { kmh: 15, pace: '4:00', percentOfMP: 107 },
        fiveK: { kmh: 16, pace: '3:45', percentOfMP: 114 },
        oneK: { kmh: 18, pace: '3:20', percentOfMP: 129 },
      },
      norwegian: {
        green: {
          minKmh: 10,
          maxKmh: 12,
          minPace: '6:00',
          maxPace: '5:00',
          lactate: '<2 mmol/L',
        },
        threshold: { kmh: 15, pace: '4:00', lactate: '2-4 mmol/L' },
        red: {
          minKmh: 16,
          maxKmh: 18,
          minPace: '3:45',
          maxPace: '3:20',
          lactate: '>4 mmol/L',
        },
      },
      hrBased: {
        zone1: { minHR: 100, maxHR: 120, description: 'Recovery' },
        zone2: { minHR: 121, maxHR: 140, description: 'Easy' },
        zone3: { minHR: 141, maxHR: 155, description: 'Steady' },
        zone4: { minHR: 156, maxHR: 170, description: 'Threshold' },
        zone5: { minHR: 171, maxHR: 190, description: 'High' },
      },
    },
    primarySource: 'PROFILE_ESTIMATION',
    confidence: 'LOW',
    athleteClassification: {
      level: 'INTERMEDIATE',
      compressionFactor: 0.82,
      metabolicType: 'BALANCED',
    },
    validationResults: {
      sourcesAvailable: {
        vdot: false,
        lactate: false,
        hrData: false,
        profile: true,
      },
      consistencyChecks: {
        marathonPaceConsistent: true,
        thresholdPaceConsistent: true,
      },
      dataQuality: {},
    },
    warnings: [],
    errors: [],
  } as unknown as PaceSelection
}

describe('fetchElitePacesServer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.client.findUnique.mockResolvedValue({
      id: 'client-1',
      name: 'Runner One',
      birthDate: new Date('1995-06-01T00:00:00.000Z'),
      gender: 'MALE',
      athleteProfile: {
        typicalWeeklyKm: 70,
        yearsRunning: 6,
        rhrBaseline: 44,
      },
    })
    mockPrisma.raceResult.findMany.mockResolvedValue([])
    mockPrisma.test.findFirst.mockResolvedValue(null)
    mockSelectOptimalPaces.mockReturnValue(mockPaceSelection())
  })

  it('ignores tests that are still waiting for quality review', async () => {
    const result = await fetchElitePacesServer('client-1')

    expect(result).toMatchObject({
      source: 'PROFILE_ESTIMATION',
      confidence: 'LOW',
    })
    expect(mockPrisma.test.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          clientId: 'client-1',
          testType: 'RUNNING',
          qualityReviewStatus: { not: 'REVIEW_REQUIRED' },
        },
      })
    )
  })
})
