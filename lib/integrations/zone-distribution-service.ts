/**
 * Zone Distribution Service
 *
 * Processes and stores HR zone distribution for activities from Strava and Garmin.
 * Handles:
 * - Processing zone distribution from HR stream data
 * - Storing results in ActivityHRZoneDistribution
 * - Recalculating zones when athlete's zone thresholds change
 * - Aggregating zone data for summaries
 */

import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { TrainingZone } from '@/types'
import {
  calculateHRZoneDistribution,
  calculateFromGarminZones,
  estimateZoneFromAvgHR,
  createZoneConfigSnapshot,
  ZoneDistribution,
} from '@/lib/calculations/hr-zone-distribution'
import { calculateIndividualizedZones, IndividualizedThresholdInput } from '@/lib/calculations/zones'

/**
 * Process zone distribution for a Strava activity
 *
 * @param stravaActivityId - ID of the Strava activity in our database
 * @param zones - Athlete's training zones
 * @param maxHR - Athlete's max HR
 */
export async function processStravaActivityZones(
  stravaActivityId: string,
  zones: TrainingZone[],
  maxHR: number
): Promise<ZoneDistribution | null> {
  try {
    const activity = await prisma.stravaActivity.findUnique({
      where: { id: stravaActivityId },
      select: {
        id: true,
        hrStream: true,
        hrStreamFetched: true,
        averageHeartrate: true,
        movingTime: true,
      },
    })

    if (!activity) {
      logger.warn('Strava activity not found', { stravaActivityId })
      return null
    }

    let distribution: ZoneDistribution

    // Priority 1: Use HR stream data if available
    if (activity.hrStream && Array.isArray(activity.hrStream)) {
      distribution = calculateHRZoneDistribution(activity.hrStream as number[], zones)
      distribution.source = 'STRAVA_STREAM'
    }
    // Priority 2: Estimate from average HR
    else if (activity.averageHeartrate && activity.movingTime) {
      distribution = estimateZoneFromAvgHR(
        activity.averageHeartrate,
        activity.movingTime,
        zones
      )
      distribution.source = 'ESTIMATED'
    }
    // No HR data available
    else {
      return null
    }

    // Store the zone distribution
    const zoneConfig = createZoneConfigSnapshot(zones, maxHR)

    await prisma.activityHRZoneDistribution.upsert({
      where: { stravaActivityId },
      update: {
        zone1Seconds: distribution.zone1Seconds,
        zone2Seconds: distribution.zone2Seconds,
        zone3Seconds: distribution.zone3Seconds,
        zone4Seconds: distribution.zone4Seconds,
        zone5Seconds: distribution.zone5Seconds,
        totalTrackedSeconds: distribution.totalTrackedSeconds,
        zoneSource: distribution.source,
        zoneConfig: zoneConfig as object,
        calculatedAt: new Date(),
      },
      create: {
        stravaActivityId,
        zone1Seconds: distribution.zone1Seconds,
        zone2Seconds: distribution.zone2Seconds,
        zone3Seconds: distribution.zone3Seconds,
        zone4Seconds: distribution.zone4Seconds,
        zone5Seconds: distribution.zone5Seconds,
        totalTrackedSeconds: distribution.totalTrackedSeconds,
        zoneSource: distribution.source,
        zoneConfig: zoneConfig as object,
      },
    })

    return distribution
  } catch (error) {
    logger.error('Failed to process Strava activity zones', { stravaActivityId }, error)
    return null
  }
}

/**
 * Process zone distribution for a Garmin activity
 *
 * @param garminActivityId - ID of the Garmin activity in our database
 * @param zones - Athlete's training zones
 * @param maxHR - Athlete's max HR
 */
export async function processGarminActivityZones(
  garminActivityId: string,
  zones: TrainingZone[],
  maxHR: number
): Promise<ZoneDistribution | null> {
  try {
    const activity = await prisma.garminActivity.findUnique({
      where: { id: garminActivityId },
      select: {
        id: true,
        hrZoneSeconds: true,
        averageHeartrate: true,
        duration: true,
      },
    })

    if (!activity) {
      logger.warn('Garmin activity not found', { garminActivityId })
      return null
    }

    let distribution: ZoneDistribution

    // Priority 1: Use Garmin's pre-calculated zone data
    if (activity.hrZoneSeconds && typeof activity.hrZoneSeconds === 'object') {
      const garminZones = activity.hrZoneSeconds as {
        zone1?: number
        zone2?: number
        zone3?: number
        zone4?: number
        zone5?: number
      }
      distribution = calculateFromGarminZones(garminZones)
      distribution.source = 'GARMIN_ZONES'
    }
    // Priority 2: Estimate from average HR
    else if (activity.averageHeartrate && activity.duration) {
      distribution = estimateZoneFromAvgHR(
        activity.averageHeartrate,
        activity.duration,
        zones
      )
      distribution.source = 'ESTIMATED'
    }
    // No HR data available
    else {
      return null
    }

    // Store the zone distribution
    const zoneConfig = createZoneConfigSnapshot(zones, maxHR)

    await prisma.activityHRZoneDistribution.upsert({
      where: { garminActivityId },
      update: {
        zone1Seconds: distribution.zone1Seconds,
        zone2Seconds: distribution.zone2Seconds,
        zone3Seconds: distribution.zone3Seconds,
        zone4Seconds: distribution.zone4Seconds,
        zone5Seconds: distribution.zone5Seconds,
        totalTrackedSeconds: distribution.totalTrackedSeconds,
        zoneSource: distribution.source,
        zoneConfig: zoneConfig as object,
        calculatedAt: new Date(),
      },
      create: {
        garminActivityId,
        zone1Seconds: distribution.zone1Seconds,
        zone2Seconds: distribution.zone2Seconds,
        zone3Seconds: distribution.zone3Seconds,
        zone4Seconds: distribution.zone4Seconds,
        zone5Seconds: distribution.zone5Seconds,
        totalTrackedSeconds: distribution.totalTrackedSeconds,
        zoneSource: distribution.source,
        zoneConfig: zoneConfig as object,
      },
    })

    return distribution
  } catch (error) {
    logger.error('Failed to process Garmin activity zones', { garminActivityId }, error)
    return null
  }
}

/**
 * Get athlete's training zones from their most recent test or profile
 */
export async function getAthleteZones(clientId: string): Promise<{
  zones: TrainingZone[]
  maxHR: number
} | null> {
  try {
    // Get client with their test results
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: {
        tests: {
          where: { status: 'COMPLETED' },
          orderBy: { testDate: 'desc' },
          take: 1,
          select: {
            id: true,
            testDate: true,
            testType: true,
            maxHR: true,
            aerobicThreshold: true,
            anaerobicThreshold: true,
            trainingZones: true,
          },
        },
      },
    })

    if (!client) {
      return null
    }

    // Get maxHR from most recent test or estimate from age
    const latestTest = client.tests[0]
    let maxHR = latestTest?.maxHR ?? 185 // Default fallback

    // If no maxHR from test, estimate from age
    if (!latestTest?.maxHR && client.birthDate) {
      const age = Math.floor(
        (Date.now() - new Date(client.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
      )
      // Tanaka formula
      maxHR = Math.round(208 - 0.7 * age)
    }

    // Parse threshold JSON fields from test
    type ThresholdJson = { hr?: number; value?: number; unit?: string } | null
    const aerobicThreshold = latestTest?.aerobicThreshold as ThresholdJson
    const anaerobicThreshold = latestTest?.anaerobicThreshold as ThresholdJson

    // Create threshold objects for zone calculation
    // Unit must be one of: 'km/h' | 'watt' | 'min/km'
    type ValidUnit = 'km/h' | 'watt' | 'min/km'
    const validUnits: ValidUnit[] = ['km/h', 'watt', 'min/km']
    const parseUnit = (u?: string): ValidUnit | undefined =>
      u && validUnits.includes(u as ValidUnit) ? (u as ValidUnit) : undefined

    const lt1: IndividualizedThresholdInput | undefined = aerobicThreshold?.hr
      ? { hr: aerobicThreshold.hr, value: aerobicThreshold.value ?? 0, unit: parseUnit(aerobicThreshold.unit) }
      : undefined
    const lt2: IndividualizedThresholdInput | undefined = anaerobicThreshold?.hr
      ? { hr: anaerobicThreshold.hr, value: anaerobicThreshold.value ?? 0, unit: parseUnit(anaerobicThreshold.unit) }
      : undefined

    // Calculate age from birthDate
    const age = client.birthDate
      ? Math.floor((Date.now() - new Date(client.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      : 35 // default age

    // Calculate zones using convenience function (doesn't require full Client type)
    const zones = calculateIndividualizedZones({
      maxHR,
      lt1,
      lt2,
      age,
      gender: client.gender ?? 'MALE',
      testType: latestTest?.testType ?? 'RUNNING',
    })

    return {
      zones,
      maxHR,
    }
  } catch (error) {
    logger.error('Failed to get athlete zones', { clientId }, error)
    return null
  }
}

/**
 * Process all activities for a client that don't have zone distribution yet
 *
 * @param clientId - Client ID
 * @param limit - Max activities to process
 */
export async function processClientActivityZones(
  clientId: string,
  limit: number = 100
): Promise<{ processed: number; errors: number }> {
  const result = { processed: 0, errors: 0 }

  // Get athlete's zones
  const athleteZones = await getAthleteZones(clientId)
  if (!athleteZones) {
    logger.warn('Could not get athlete zones for client', { clientId })
    return result
  }

  const { zones, maxHR } = athleteZones

  // Process Strava activities without zone distribution
  const stravaActivities = await prisma.stravaActivity.findMany({
    where: {
      clientId,
      zoneDistribution: null,
      OR: [
        { hrStreamFetched: true },
        { averageHeartrate: { not: null } },
      ],
    },
    select: { id: true },
    take: limit,
    orderBy: { startDate: 'desc' },
  })

  for (const activity of stravaActivities) {
    const distribution = await processStravaActivityZones(activity.id, zones, maxHR)
    if (distribution) {
      result.processed++
    } else {
      result.errors++
    }
  }

  // Process Garmin activities without zone distribution
  // Use averageHeartrate check - activities with hrZoneSeconds will also have averageHeartrate
  const garminActivities = await prisma.garminActivity.findMany({
    where: {
      clientId,
      zoneDistribution: null,
      averageHeartrate: { not: null },
    },
    select: { id: true },
    take: limit - result.processed,
    orderBy: { startDate: 'desc' },
  })

  for (const activity of garminActivities) {
    const distribution = await processGarminActivityZones(activity.id, zones, maxHR)
    if (distribution) {
      result.processed++
    } else {
      result.errors++
    }
  }

  logger.info('Processed client activity zones', { clientId, ...result })
  return result
}

/**
 * Recalculate zone distribution for all activities when zones change
 *
 * @param clientId - Client ID
 * @param newZones - Updated training zones
 * @param maxHR - Updated max HR
 */
export async function recalculateZonesForClient(
  clientId: string,
  newZones: TrainingZone[],
  maxHR: number
): Promise<{ updated: number; errors: number }> {
  const result = { updated: 0, errors: 0 }

  // Get all activities with existing zone distribution
  const stravaActivities = await prisma.stravaActivity.findMany({
    where: {
      clientId,
      zoneDistribution: { isNot: null },
    },
    select: { id: true },
  })

  for (const activity of stravaActivities) {
    const distribution = await processStravaActivityZones(activity.id, newZones, maxHR)
    if (distribution) {
      result.updated++
    } else {
      result.errors++
    }
  }

  const garminActivities = await prisma.garminActivity.findMany({
    where: {
      clientId,
      zoneDistribution: { isNot: null },
    },
    select: { id: true },
  })

  for (const activity of garminActivities) {
    const distribution = await processGarminActivityZones(activity.id, newZones, maxHR)
    if (distribution) {
      result.updated++
    } else {
      result.errors++
    }
  }

  logger.info('Recalculated zones for client', { clientId, ...result })
  return result
}

/**
 * Get aggregated zone distribution for a date range
 *
 * @param clientId - Client ID
 * @param startDate - Start date
 * @param endDate - End date
 */
export async function getAggregatedZoneDistribution(
  clientId: string,
  startDate: Date,
  endDate: Date
): Promise<{
  zone1Minutes: number
  zone2Minutes: number
  zone3Minutes: number
  zone4Minutes: number
  zone5Minutes: number
  totalMinutes: number
  activityCount: number
}> {
  // Get Strava activities with zone distribution
  const stravaDistributions = await prisma.activityHRZoneDistribution.findMany({
    where: {
      stravaActivity: {
        clientId,
        startDate: {
          gte: startDate,
          lte: endDate,
        },
      },
    },
  })

  // Get Garmin activities with zone distribution
  const garminDistributions = await prisma.activityHRZoneDistribution.findMany({
    where: {
      garminActivity: {
        clientId,
        startDate: {
          gte: startDate,
          lte: endDate,
        },
      },
    },
  })

  const allDistributions = [...stravaDistributions, ...garminDistributions]

  const totals = allDistributions.reduce(
    (acc, dist) => ({
      zone1: acc.zone1 + dist.zone1Seconds,
      zone2: acc.zone2 + dist.zone2Seconds,
      zone3: acc.zone3 + dist.zone3Seconds,
      zone4: acc.zone4 + dist.zone4Seconds,
      zone5: acc.zone5 + dist.zone5Seconds,
      total: acc.total + dist.totalTrackedSeconds,
    }),
    { zone1: 0, zone2: 0, zone3: 0, zone4: 0, zone5: 0, total: 0 }
  )

  return {
    zone1Minutes: Math.round(totals.zone1 / 60),
    zone2Minutes: Math.round(totals.zone2 / 60),
    zone3Minutes: Math.round(totals.zone3 / 60),
    zone4Minutes: Math.round(totals.zone4 / 60),
    zone5Minutes: Math.round(totals.zone5 / 60),
    totalMinutes: Math.round(totals.total / 60),
    activityCount: allDistributions.length,
  }
}
