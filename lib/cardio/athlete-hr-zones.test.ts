import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/prisma', () => ({ prisma: { client: { findUnique: vi.fn() } } }))
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn() } }))

import { prisma } from '@/lib/prisma'
import { resolveAthleteHrZones } from './athlete-hr-zones'

const findUnique = prisma.client.findUnique as unknown as ReturnType<typeof vi.fn>

describe('resolveAthleteHrZones', () => {
  beforeEach(() => {
    findUnique.mockReset()
  })

  it('uses Garmin 10% bands of manual max HR when no test exists', async () => {
    findUnique.mockResolvedValue({
      manualMaxHR: 190,
      birthDate: null,
      gender: 'MALE',
      tests: [],
    })

    const result = await resolveAthleteHrZones('client-1')

    expect(result).toEqual({
      source: 'MAX_HR_PERCENT',
      maxHr: 190,
      zones: [
        { zone: 1, hrMin: 95, hrMax: 114 },
        { zone: 2, hrMin: 114, hrMax: 133 },
        { zone: 3, hrMin: 133, hrMax: 152 },
        { zone: 4, hrMin: 152, hrMax: 171 },
        { zone: 5, hrMin: 171, hrMax: 190 },
      ],
    })
  })

  it('estimates max HR from age (Tanaka) when neither manual nor test max exists', async () => {
    const birthDate = new Date()
    birthDate.setFullYear(birthDate.getFullYear() - 40)
    findUnique.mockResolvedValue({
      manualMaxHR: null,
      birthDate,
      gender: 'MALE',
      tests: [],
    })

    const result = await resolveAthleteHrZones('client-1')

    expect(result?.source).toBe('MAX_HR_PERCENT')
    expect(result?.maxHr).toBe(180) // 208 - 0.7 × 40
  })

  it('switches to lactate-test zones when the latest test has threshold HR', async () => {
    findUnique.mockResolvedValue({
      manualMaxHR: null,
      birthDate: null,
      gender: 'MALE',
      tests: [
        {
          maxHR: 192,
          testType: 'RUNNING',
          aerobicThreshold: { hr: 152, value: 11.5, unit: 'km/h' },
          anaerobicThreshold: { hr: 172, value: 14, unit: 'km/h' },
        },
      ],
    })

    const result = await resolveAthleteHrZones('client-1')

    expect(result?.source).toBe('LACTATE_TEST')
    expect(result?.maxHr).toBe(192)
    expect(result?.zones).toHaveLength(5)
    // Bounds ascend and end at max HR
    const zones = result!.zones
    for (let i = 1; i < zones.length; i++) {
      expect(zones[i].hrMin).toBeGreaterThanOrEqual(zones[i - 1].hrMin)
    }
    expect(zones[4].hrMax).toBe(192)
  })

  it('prefers manual max HR over the test value for the zone ceiling source', async () => {
    findUnique.mockResolvedValue({
      manualMaxHR: 198,
      birthDate: null,
      gender: 'MALE',
      tests: [{ maxHR: 192, testType: 'RUNNING', aerobicThreshold: null, anaerobicThreshold: null }],
    })

    const result = await resolveAthleteHrZones('client-1')

    expect(result?.source).toBe('MAX_HR_PERCENT')
    expect(result?.maxHr).toBe(198)
  })
})
