/**
 * Live HR zones for cardio focus mode.
 *
 * Source priority:
 * 1. LACTATE_TEST — the athlete's latest completed test has threshold HR data
 *    (LT1/LT2); zones come from the canonical individualized calculation in
 *    lib/calculations/zones.ts.
 * 2. MAX_HR_PERCENT — Garmin-style default bands in 10% steps
 *    (50-60-70-80-90-100% of max HR). Max HR resolves manual override →
 *    latest test max → Tanaka/Gulati age estimate → 185.
 */

import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { calculateIndividualizedZones } from '@/lib/calculations/zones'
import { usableTestQualityReviewWhere } from '@/lib/testing/test-quality-review'

export interface LiveHrZone {
  zone: number // 1-5
  hrMin: number
  hrMax: number
}

export interface LiveHrZones {
  source: 'LACTATE_TEST' | 'MAX_HR_PERCENT'
  maxHr: number
  zones: LiveHrZone[]
}

const GARMIN_DEFAULT_BANDS = [
  { zone: 1, min: 0.5, max: 0.6 },
  { zone: 2, min: 0.6, max: 0.7 },
  { zone: 3, min: 0.7, max: 0.8 },
  { zone: 4, min: 0.8, max: 0.9 },
  { zone: 5, min: 0.9, max: 1.0 },
] as const

export async function resolveAthleteHrZones(clientId: string): Promise<LiveHrZones | null> {
  try {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        manualMaxHR: true,
        birthDate: true,
        gender: true,
        tests: {
          where: {
            status: 'COMPLETED',
            ...usableTestQualityReviewWhere,
          },
          orderBy: { testDate: 'desc' },
          take: 1,
          select: {
            maxHR: true,
            testType: true,
            aerobicThreshold: true,
            anaerobicThreshold: true,
          },
        },
      },
    })
    if (!client) return null

    const test = client.tests[0]
    const age = client.birthDate
      ? Math.floor((Date.now() - new Date(client.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      : 35
    const ageEstimate = client.gender === 'FEMALE'
      ? Math.round(206 - 0.88 * age) // Gulati
      : Math.round(208 - 0.7 * age) // Tanaka
    const maxHr = client.manualMaxHR ?? test?.maxHR ?? (client.birthDate ? ageEstimate : 185)

    type ThresholdJson = { hr?: number; value?: number; unit?: string } | null
    const lt1Json = test?.aerobicThreshold as ThresholdJson
    const lt2Json = test?.anaerobicThreshold as ThresholdJson

    if (lt1Json?.hr || lt2Json?.hr) {
      // Units only matter for the speed/power zone fields, which the live HR
      // display does not use — HR bounds are unit-independent.
      const zones = calculateIndividualizedZones({
        maxHR: maxHr,
        lt1: lt1Json?.hr ? { hr: lt1Json.hr, value: lt1Json.value ?? 0 } : undefined,
        lt2: lt2Json?.hr ? { hr: lt2Json.hr, value: lt2Json.value ?? 0 } : undefined,
        age,
        gender: client.gender ?? 'MALE',
        testType: test?.testType ?? 'RUNNING',
      })
      return {
        source: 'LACTATE_TEST',
        maxHr,
        zones: zones.map((z) => ({ zone: z.zone, hrMin: z.hrMin, hrMax: z.hrMax })),
      }
    }

    return {
      source: 'MAX_HR_PERCENT',
      maxHr,
      zones: GARMIN_DEFAULT_BANDS.map((band) => ({
        zone: band.zone,
        hrMin: Math.round(maxHr * band.min),
        hrMax: Math.round(maxHr * band.max),
      })),
    }
  } catch (error) {
    logger.error('Failed to resolve athlete HR zones', { clientId }, error)
    return null
  }
}
