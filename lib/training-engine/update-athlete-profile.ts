// lib/training-engine/update-athlete-profile.ts
// Shared helper for updating athlete profile from race-based VDOT

import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import type { VDOTResult } from '@/lib/training-engine/calculations/vdot'

/**
 * Update athlete profile with race-based VDOT and training zones.
 * Creates the profile if it doesn't exist.
 * Marks all other race results as not used for zones.
 */
export async function updateAthleteProfileFromRace(
  clientId: string,
  raceResultId: string,
  vdotResult: VDOTResult
) {
  // Get or create athlete profile
  let profile = await prisma.athleteProfile.findUnique({
    where: { clientId },
  })

  if (!profile) {
    profile = await prisma.athleteProfile.create({
      data: {
        clientId,
        category: 'RECREATIONAL',
        currentVDOT: vdotResult.vdot,
        vdotSource: 'RACE_PERFORMANCE',
        vdotConfidence: vdotResult.confidence,
        vdotLastUpdated: new Date(),
        vdotAgeAdjusted: vdotResult.adjustments.ageAdjusted,
        vdotGenderAdjusted: vdotResult.adjustments.genderAdjusted,
        danielsZones: vdotResult.trainingPaces as unknown as Prisma.InputJsonValue,
        zonesLastUpdated: new Date(),
        zonesPrimarySource: 'VDOT',
      },
    })
  } else {
    await prisma.athleteProfile.update({
      where: { clientId },
      data: {
        currentVDOT: vdotResult.vdot,
        vdotSource: 'RACE_PERFORMANCE',
        vdotConfidence: vdotResult.confidence,
        vdotLastUpdated: new Date(),
        vdotAgeAdjusted: vdotResult.adjustments.ageAdjusted,
        vdotGenderAdjusted: vdotResult.adjustments.genderAdjusted,
        danielsZones: vdotResult.trainingPaces as unknown as Prisma.InputJsonValue,
        zonesLastUpdated: new Date(),
        zonesPrimarySource: 'VDOT',
      },
    })
  }

  // Mark other race results as not used for zones
  await prisma.raceResult.updateMany({
    where: {
      clientId,
      id: { not: raceResultId },
    },
    data: {
      usedForZones: false,
    },
  })

  return profile
}
