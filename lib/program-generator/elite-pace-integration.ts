// lib/program-generator/elite-pace-integration.ts
// Integration layer between elite pace selector and program generator

import {
  type PaceSelection,
  type RacePerformance,
  type AthleteProfileData,
  type LactateTestData,
  selectOptimalPaces
} from '@/lib/training-engine/calculations/pace-selector'
import { type ZonePaces } from './zone-calculator'
import { prisma } from '@/lib/prisma'

/**
 * Enhanced zone paces with all training systems
 */
export interface EliteZonePaces {
  // Legacy 5-zone system (for backwards compatibility)
  legacy: ZonePaces

  // Daniels system (most versatile)
  daniels: {
    easy: { minPace: string; maxPace: string; minKmh: number; maxKmh: number }
    marathon: { pace: string; kmh: number }
    threshold: { pace: string; kmh: number }
    interval: { pace: string; kmh: number }
    repetition: { pace: string; kmh: number }
  }

  // Canova system (marathon-specific)
  canova: {
    fundamental: { pace: string; kmh: number }
    progressive: { minPace: string; maxPace: string }
    marathon: { pace: string; kmh: number }
    specific: { pace: string; kmh: number }
    threshold: { pace: string; kmh: number }
    fiveK: { pace: string; kmh: number }
    oneK: { pace: string; kmh: number }
  }

  // Norwegian system (polarized)
  norwegian: {
    green: { minPace: string; maxPace: string; minKmh: number; maxKmh: number }
    threshold: { pace: string; kmh: number }
    red: { minPace: string; maxPace: string; minKmh: number; maxKmh: number }
  }

  // Core paces for easy reference
  core: {
    easy: string
    marathon: string
    threshold: string
    interval: string
  }

  // Metadata
  source: 'VDOT' | 'LACTATE_RATIO' | 'HR_ESTIMATION' | 'PROFILE_ESTIMATION'
  confidence: 'VERY_HIGH' | 'HIGH' | 'MEDIUM' | 'LOW'
  athleteLevel: 'ELITE' | 'SUB_ELITE' | 'ADVANCED' | 'INTERMEDIATE' | 'RECREATIONAL'
  metabolicType?: string
}

/**
 * Fetch elite paces from API for a client (client-side)
 */
export async function fetchElitePaces(clientId: string): Promise<EliteZonePaces | null> {
  try {
    const response = await fetch(`/api/clients/${clientId}/paces`)

    if (!response.ok) {
      console.error('Failed to fetch elite paces:', response.statusText)
      return null
    }

    const paceData: PaceSelection & { clientInfo: any; dataSources: any } = await response.json()

    return convertPaceSelectionToEliteZones(paceData)
  } catch (error) {
    console.error('Error fetching elite paces:', error)
    return null
  }
}

/**
 * Fetch elite paces directly using Prisma (server-side)
 * Use this in server-side code like program generators
 */
export async function fetchElitePacesServer(clientId: string): Promise<EliteZonePaces | null> {
  try {
    // Get client data
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: {
        athleteProfile: true,
      },
    })

    if (!client) {
      console.error('[fetchElitePacesServer] Client not found:', clientId)
      return null
    }

    // Calculate age
    const birthDate = new Date(client.birthDate)
    const now = new Date()
    const age = Math.floor(
      (now.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
    )

    // Build athlete profile data
    const profileData: AthleteProfileData = {
      age,
      gender: client.gender as 'MALE' | 'FEMALE',
      weeklyKm: client.athleteProfile?.typicalWeeklyKm || 50,
      trainingAge: client.athleteProfile?.yearsRunning || 2,
      restingHR: client.athleteProfile?.rhrBaseline ?? undefined,
      maxHR: undefined,
    }

    // Get race performances (most recent 5)
    const raceResults = await prisma.raceResult.findMany({
      where: { clientId },
      orderBy: { raceDate: 'desc' },
      take: 5,
    })

    const races: RacePerformance[] = raceResults.map((race) => ({
      distance: race.distance as '5K' | '10K' | 'HALF_MARATHON' | 'MARATHON' | 'CUSTOM',
      timeMinutes: race.timeMinutes,
      customDistanceKm: race.customDistanceKm || undefined,
      date: new Date(race.raceDate),
      age,
      gender: client.gender as 'MALE' | 'FEMALE',
    }))

    // Get most recent lactate test (from Test model)
    const latestTest = await prisma.test.findFirst({
      where: {
        clientId,
        testType: 'RUNNING',
      },
      orderBy: { testDate: 'desc' },
      include: {
        testStages: {
          orderBy: { sequence: 'asc' },
        },
      },
    })

    let lactateTest: LactateTestData | undefined = undefined
    if (latestTest && latestTest.testStages.length >= 4) {
      const hasLactate = latestTest.testStages.some((stage) => stage.lactate > 0)

      if (hasLactate && latestTest.maxHR) {
        lactateTest = {
          testStages: latestTest.testStages.map((stage) => ({
            sequence: stage.sequence,
            speed: stage.speed || 0,
            heartRate: stage.heartRate,
            lactate: stage.lactate,
          })),
          maxHR: latestTest.maxHR,
        }

        if (latestTest.maxHR) {
          profileData.maxHR = latestTest.maxHR
        }
      }
    }

    // Call pace selector
    const paceSelection = selectOptimalPaces(
      profileData,
      races.length > 0 ? races : undefined,
      lactateTest
    )

    console.log(`[fetchElitePacesServer] Pace selection for ${client.name}:`)
    console.log(`  Source: ${paceSelection.primarySource}`)
    console.log(`  Confidence: ${paceSelection.confidence}`)
    console.log(`  Has lactate test: ${!!lactateTest}`)
    console.log(`  Has race results: ${races.length > 0}`)

    return convertPaceSelectionToEliteZones(paceSelection)
  } catch (error) {
    console.error('[fetchElitePacesServer] Error:', error)
    return null
  }
}

/**
 * Convert PaceSelection to EliteZonePaces format
 */
export function convertPaceSelectionToEliteZones(paceData: PaceSelection): EliteZonePaces {
  // Map Daniels zones to legacy 5-zone system
  const legacy: ZonePaces = {
    zone1: paceData.zones.daniels.easy.maxPace, // Easy
    zone2: paceData.zones.daniels.marathon.pace, // Marathon
    zone3: paceData.zones.daniels.threshold.pace, // Threshold
    zone4: paceData.zones.daniels.interval.pace, // Interval
    zone5: paceData.zones.daniels.repetition.pace, // Repetition
  }

  return {
    legacy,
    daniels: paceData.zones.daniels,
    canova: paceData.zones.canova,
    norwegian: paceData.zones.norwegian,
    core: {
      easy: paceData.easyPace.minPace, // Use slow end of easy pace (more appropriate for easy running)
      marathon: paceData.marathonPace.pace,
      threshold: paceData.thresholdPace.pace,
      interval: paceData.intervalPace.pace,
    },
    source: paceData.primarySource,
    confidence: paceData.confidence,
    athleteLevel: paceData.athleteClassification.level,
    metabolicType: paceData.athleteClassification.metabolicType,
  }
}

/**
 * Get pace for a specific zone based on methodology
 */
export function getZonePaceByMethodology(
  zones: EliteZonePaces,
  methodology: string,
  zoneIdentifier: string | number
): string {
  // For Daniels-based methodologies (Polarized, Pyramidal)
  if (methodology === 'POLARIZED' || methodology === 'PYRAMIDAL') {
    if (typeof zoneIdentifier === 'number') {
      // Legacy zone number (1-5)
      return zones.legacy[`zone${zoneIdentifier}` as keyof ZonePaces]
    } else {
      // Daniels zone name (E, M, T, I, R)
      switch (zoneIdentifier.toUpperCase()) {
        case 'E':
        case 'EASY':
          return zones.daniels.easy.maxPace
        case 'M':
        case 'MARATHON':
          return zones.daniels.marathon.pace
        case 'T':
        case 'THRESHOLD':
          return zones.daniels.threshold.pace
        case 'I':
        case 'INTERVAL':
          return zones.daniels.interval.pace
        case 'R':
        case 'REPETITION':
          return zones.daniels.repetition.pace
        default:
          return zones.daniels.easy.maxPace
      }
    }
  }

  // For Canova methodology
  if (methodology === 'CANOVA') {
    switch (zoneIdentifier.toString().toUpperCase()) {
      case 'FUNDAMENTAL':
        return zones.canova.fundamental.pace
      case 'PROGRESSIVE':
        return zones.canova.progressive.minPace
      case 'MARATHON':
      case 'MP':
        return zones.canova.marathon.pace
      case 'SPECIFIC':
        return zones.canova.specific.pace
      case 'THRESHOLD':
      case 'T':
        return zones.canova.threshold.pace
      case '5K':
      case 'FIVEK':
        return zones.canova.fiveK.pace
      case '1K':
      case 'ONEK':
        return zones.canova.oneK.pace
      default:
        return zones.canova.fundamental.pace
    }
  }

  // For Norwegian methodology
  if (methodology === 'NORWEGIAN' || methodology === 'NORWEGIAN_SINGLES') {
    switch (zoneIdentifier.toString().toUpperCase()) {
      case 'GREEN':
      case 'EASY':
      case '1':
        return zones.norwegian.green.maxPace
      case 'THRESHOLD':
      case 'LT2':
      case '2':
        return zones.norwegian.threshold.pace
      case 'RED':
      case 'HARD':
      case '3':
        return zones.norwegian.red.minPace
      default:
        return zones.norwegian.green.maxPace
    }
  }

  // Fallback to legacy zones
  if (typeof zoneIdentifier === 'number') {
    return zones.legacy[`zone${zoneIdentifier}` as keyof ZonePaces]
  }

  return zones.core.easy
}

/**
 * Get speed (km/h) for a pace string
 */
export function paceToSpeed(pace: string): number {
  const match = pace.match(/(\d+):(\d+)/)
  if (!match) return 0
  const minutes = parseInt(match[1])
  const seconds = parseInt(match[2])
  const totalMinutes = minutes + seconds / 60
  return 60 / totalMinutes
}

/**
 * Get marathon pace in km/h
 */
export function getMarathonPaceKmh(zones: EliteZonePaces): number {
  return zones.daniels.marathon.kmh
}

/**
 * Get threshold pace in km/h
 */
export function getThresholdPaceKmh(zones: EliteZonePaces): number {
  return zones.daniels.threshold.kmh
}

/**
 * Calculate pace as percentage of marathon pace (for Canova)
 */
export function calculatePacePercentOfMarathon(
  zones: EliteZonePaces,
  percentage: number
): string {
  const marathonKmh = zones.daniels.marathon.kmh
  const targetKmh = marathonKmh * (percentage / 100)
  const minPerKm = 60 / targetKmh
  const minutes = Math.floor(minPerKm)
  const seconds = Math.round((minPerKm - minutes) * 60)
  return `${minutes}:${String(seconds).padStart(2, '0')}/km`
}

/**
 * Get easy pace range for long runs
 */
export function getEasyPaceRange(zones: EliteZonePaces): { min: string; max: string } {
  return {
    min: zones.daniels.easy.minPace,
    max: zones.daniels.easy.maxPace,
  }
}

/**
 * Validate elite zones are available
 */
export function validateEliteZones(zones: EliteZonePaces | null): boolean {
  if (!zones) return false
  if (!zones.core.marathon) return false
  if (!zones.core.threshold) return false
  return true
}

/**
 * Get recommended methodology based on athlete classification
 */
export function getRecommendedMethodology(
  athleteLevel: string,
  metabolicType: string | undefined,
  goalType: string
): 'POLARIZED' | 'NORWEGIAN' | 'CANOVA' | 'PYRAMIDAL' {
  // Elite athletes with proper lactate monitoring can use Norwegian
  if (athleteLevel === 'ELITE' && metabolicType) {
    return 'NORWEGIAN'
  }

  // Advanced marathoners benefit from Canova
  if (
    (athleteLevel === 'ELITE' || athleteLevel === 'ADVANCED') &&
    (goalType === 'marathon' || goalType === 'half-marathon')
  ) {
    return 'CANOVA'
  }

  // Intermediate runners do well with Pyramidal
  if (athleteLevel === 'INTERMEDIATE') {
    return 'PYRAMIDAL'
  }

  // Default to Polarized (safest, most researched)
  return 'POLARIZED'
}

/**
 * Get confidence-based warnings
 */
export function getZoneConfidenceWarnings(zones: EliteZonePaces): string[] {
  const warnings: string[] = []

  if (zones.confidence === 'LOW') {
    warnings.push('Training zones have LOW confidence. Consider adding race results or lactate test data.')
  } else if (zones.confidence === 'MEDIUM') {
    warnings.push('Training zones have MEDIUM confidence. Recent race or test would improve accuracy.')
  }

  if (zones.source === 'PROFILE_ESTIMATION') {
    warnings.push('Zones estimated from athlete profile only. Race results or test data recommended.')
  } else if (zones.source === 'HR_ESTIMATION') {
    warnings.push('Zones estimated from heart rate data. Lactate test or race results would improve accuracy.')
  }

  return warnings
}

/**
 * Format zone summary for display/logging
 */
export function formatZoneSummary(zones: EliteZonePaces): string {
  return `
Elite Pace Zones Summary
========================
Source: ${zones.source} (${zones.confidence} confidence)
Athlete Level: ${zones.athleteLevel}
${zones.metabolicType ? `Metabolic Type: ${zones.metabolicType}` : ''}

Core Paces:
- Easy: ${zones.core.easy}
- Marathon: ${zones.core.marathon}
- Threshold: ${zones.core.threshold}
- Interval: ${zones.core.interval}

Daniels Zones:
- E (Easy): ${zones.daniels.easy.minPace} - ${zones.daniels.easy.maxPace}
- M (Marathon): ${zones.daniels.marathon.pace}
- T (Threshold): ${zones.daniels.threshold.pace}
- I (Interval): ${zones.daniels.interval.pace}
- R (Repetition): ${zones.daniels.repetition.pace}

Canova Zones:
- Fundamental: ${zones.canova.fundamental.pace} (${zones.canova.fundamental.kmh.toFixed(1)} km/h)
- Marathon: ${zones.canova.marathon.pace} (${zones.canova.marathon.kmh.toFixed(1)} km/h)
- Threshold: ${zones.canova.threshold.pace} (${zones.canova.threshold.kmh.toFixed(1)} km/h)
- 5K: ${zones.canova.fiveK.pace} (${zones.canova.fiveK.kmh.toFixed(1)} km/h)

Norwegian Zones:
- Green: ${zones.norwegian.green.minPace} - ${zones.norwegian.green.maxPace}
- Threshold: ${zones.norwegian.threshold.pace}
- Red: ${zones.norwegian.red.minPace} - ${zones.norwegian.red.maxPace}
  `.trim()
}
