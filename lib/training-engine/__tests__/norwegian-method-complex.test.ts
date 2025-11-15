import { describe, it, expect } from 'vitest'
import { validateNorwegianMethodEligibility } from '@/lib/training-engine/integration/norwegian-validation'

const DAY_MS = 24 * 60 * 60 * 1000

function generateTrainingLoads(avgWeeklyKm: number, weeks = 4) {
  const days = weeks * 7
  const dailyDistance = avgWeeklyKm / 7
  return Array.from({ length: days }, (_, i) => ({
    distance: dailyDistance,
    date: new Date(Date.now() - i * DAY_MS)
  }))
}

function createAthleteFixture(overrides: Partial<any> = {}) {
  const base = {
    yearsRunning: 3,
    hasLactateMeter: true,
    client: {
      userId: 'coach-1',
      tests: [
        {
          testDate: new Date(Date.now() - 14 * DAY_MS)
        }
      ],
      trainingLoads: generateTrainingLoads(65)
    }
  }

  const athlete = { ...base }

  if (overrides.client) {
    athlete.client = {
      ...base.client,
      ...overrides.client
    }
  }

  const finalOverrides = { ...overrides }
  delete finalOverrides.client

  Object.assign(athlete, finalOverrides)
  athlete.client = athlete.client || base.client

  return athlete
  }

function createPrismaMock(athleteData: any) {
  return {
    athleteProfile: {
      findUnique: async () => athleteData
    }
  }
}

describe('Norwegian Method Complex Scenarios', () => {
  it('rejects athlete with insufficient training age', async () => {
    const prisma = createPrismaMock(
      createAthleteFixture({
        yearsRunning: 1
      })
    )

    const result = await validateNorwegianMethodEligibility('athlete-1', prisma as any)

    expect(result.eligible).toBe(false)
    const trainingAgeReq = result.requirements.find(r => r.requirement === 'TRAINING_AGE')
    expect(trainingAgeReq?.met).toBe(false)
    expect(trainingAgeReq?.message).toContain('1 years')
  })

  it('builds 4-phase transition plan for eligible athlete', async () => {
    const prisma = createPrismaMock(
      createAthleteFixture({
        yearsRunning: 3,
        client: {
          trainingLoads: generateTrainingLoads(65)
        }
      })
    )

    const result = await validateNorwegianMethodEligibility('athlete-2', prisma as any)

    expect(result.eligible).toBe(true)
    expect(result.transitionPlan).toBeDefined()
    expect(result.transitionPlan).toHaveLength(4)
    expect(result.transitionPlan?.[0].name).toBe('Threshold Familiarization')
    expect(result.transitionPlan?.[0].thresholdVolume).toBe('8-10 km')
    expect(result.transitionPlan?.[3].name).toBe('Full Norwegian Protocol')
  })

  it('flags borderline aerobic base volume (59km/week)', async () => {
    const prisma = createPrismaMock(
      createAthleteFixture({
        client: {
          trainingLoads: generateTrainingLoads(59)
        }
      })
    )

    const result = await validateNorwegianMethodEligibility('athlete-3', prisma as any)

    expect(result.eligible).toBe(false)
    const volumeReq = result.requirements.find(r => r.requirement === 'AEROBIC_BASE')
    expect(volumeReq?.met).toBe(false)
    expect(volumeReq?.message).toContain('59.0 km/week')
    expect(volumeReq?.message).toContain('60 km/week')
  })
})

