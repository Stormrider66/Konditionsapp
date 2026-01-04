/**
 * Ergometer Zone Calculator
 *
 * Calculates training zones for all ergometer types based on:
 * - Critical Power (CP) model
 * - FTP (Functional Threshold Power)
 * - MAP (Maximal Aerobic Power)
 * - 2K/1K time trial averages
 * - 4×4min interval test
 *
 * Outputs 6-zone power model with optional pace (Concept2) and HR zones.
 */

import { ErgometerType } from '@prisma/client'
import { ZONE_DEFINITIONS, isConcept2 } from '../constants'
import { wattsToPace, formatPace, getPaceRangeForPowerZone } from './pace-power-conversion'
import type {
  ErgometerZoneResult,
  ErgometerZoneDefinition,
  ZoneCalculationInput,
  ConfidenceLevel,
} from '../types'

// ==================== MAIN ZONE CALCULATOR ====================

/**
 * Calculate training zones for an ergometer based on threshold data
 *
 * @param input - Zone calculation parameters
 * @returns Complete zone definitions with power (and pace for Concept2)
 */
export function calculateErgometerZones(
  input: ZoneCalculationInput
): ErgometerZoneResult {
  const { ergometerType, thresholdMethod, thresholdValue, wPrime, peakPower, hrAtThreshold } = input

  const recommendations: string[] = []

  // Select zone definition based on method
  const zoneDefinitions = thresholdMethod === 'MAP'
    ? ZONE_DEFINITIONS.MAP_BASED
    : ZONE_DEFINITIONS.CP_BASED

  // Calculate power zones
  const zones: ErgometerZoneDefinition[] = zoneDefinitions.map(zoneDef => {
    // Calculate power targets
    const powerMin = Math.round((zoneDef.percentMin / 100) * thresholdValue)
    const powerMax = zoneDef.zone === 6
      ? peakPower || Math.round(1.5 * thresholdValue)  // Zone 6 caps at peak power or 150%
      : Math.round((zoneDef.percentMax / 100) * thresholdValue)

    // Calculate pace for Concept2 machines
    let paceMin: number | undefined
    let paceMax: number | undefined
    if (isConcept2(ergometerType)) {
      const paceRange = getPaceRangeForPowerZone(powerMin, powerMax)
      paceMin = paceRange.paceMin  // Faster (higher power)
      paceMax = paceRange.paceMax  // Slower (lower power)
    }

    // Calculate HR zones if threshold HR provided
    let hrMin: number | undefined
    let hrMax: number | undefined
    if (hrAtThreshold) {
      const hrZones = calculateHRZonesFromThreshold(hrAtThreshold, zoneDef.zone)
      hrMin = hrZones.hrMin
      hrMax = hrZones.hrMax
    }

    return {
      zone: zoneDef.zone,
      name: zoneDef.name,
      nameSwedish: 'nameSwedish' in zoneDef ? zoneDef.nameSwedish : getSwedishZoneName(zoneDef.name),
      powerMin,
      powerMax,
      percentMin: zoneDef.percentMin,
      percentMax: zoneDef.percentMax,
      paceMin,
      paceMax,
      hrMin,
      hrMax,
      description: 'description' in zoneDef ? zoneDef.description : getZoneDescription(zoneDef.zone),
      descriptionSwedish: 'descriptionSwedish' in zoneDef ? zoneDef.descriptionSwedish : undefined,
      typicalDuration: 'typicalDuration' in zoneDef ? zoneDef.typicalDuration : getTypicalDuration(zoneDef.zone),
    }
  })

  // Adjust zone 6 ceiling based on available data
  if (wPrime && peakPower) {
    // If we have W' and peak power, we can better define the anaerobic zone
    recommendations.push(`Anaerobic capacity (W'): ${(wPrime / 1000).toFixed(1)}kJ`)
  }

  // Generate method-specific recommendations
  switch (thresholdMethod) {
    case 'CP':
      recommendations.push(
        `Zones based on Critical Power (${thresholdValue}W)`,
        'CP represents the highest sustainable power (~30-60 min)'
      )
      break
    case 'FTP':
      recommendations.push(
        `Zones based on FTP (${thresholdValue}W)`,
        'FTP represents ~1 hour sustainable power'
      )
      break
    case 'MAP':
      recommendations.push(
        `Zones based on MAP (${thresholdValue}W)`,
        'MAP represents maximal aerobic power (~4-6 min all-out)'
      )
      break
    case '2K_AVG':
      recommendations.push(
        `Zones based on 2K average power (${thresholdValue}W)`,
        '2K represents ~6-8 min maximal effort'
      )
      break
    case 'INTERVAL':
      recommendations.push(
        `Zones based on 4×4min interval average (${thresholdValue}W)`,
        'Estimated threshold from interval performance'
      )
      break
  }

  // Add Concept2 specific info
  if (isConcept2(ergometerType)) {
    const thresholdPace = wattsToPace(thresholdValue)
    recommendations.push(`Threshold pace: ${formatPace(thresholdPace)}/500m`)
  }

  return {
    zones,
    zoneModel: '6_ZONE',
    source: `${thresholdMethod} @ ${thresholdValue}W`,
    recommendations,
  }
}

// ==================== ZONE CALCULATIONS BY METHOD ====================

/**
 * Calculate zones from Critical Power model
 */
export function calculateZonesFromCP(
  cp: number,
  wPrime: number,
  peakPower?: number,
  ergometerType: ErgometerType = 'WATTBIKE'
): ErgometerZoneResult {
  return calculateErgometerZones({
    ergometerType,
    thresholdMethod: 'CP',
    thresholdValue: cp,
    wPrime,
    peakPower,
  })
}

/**
 * Calculate zones from FTP test
 *
 * @param avgPower20min - Average power from 20-minute test
 * @param correctionFactor - 0.90 for non-cyclists, 0.95 for cyclists
 */
export function calculateZonesFromFTP(
  avgPower20min: number,
  correctionFactor: number = 0.95,
  ergometerType: ErgometerType = 'WATTBIKE',
  peakPower?: number
): ErgometerZoneResult {
  const ftp = Math.round(avgPower20min * correctionFactor)

  const result = calculateErgometerZones({
    ergometerType,
    thresholdMethod: 'FTP',
    thresholdValue: ftp,
    peakPower,
  })

  result.recommendations.push(
    `20-min avg: ${avgPower20min}W × ${correctionFactor} = FTP ${ftp}W`
  )

  return result
}

/**
 * Calculate zones from 2K time trial
 */
export function calculateZonesFrom2K(
  avgPower2K: number,
  ergometerType: ErgometerType = 'CONCEPT2_ROW'
): ErgometerZoneResult {
  // 2K average power is approximately 105-110% of threshold
  // So threshold ≈ 90-95% of 2K power
  const thresholdEstimate = Math.round(avgPower2K * 0.92)

  const result = calculateErgometerZones({
    ergometerType,
    thresholdMethod: '2K_AVG',
    thresholdValue: thresholdEstimate,
  })

  result.recommendations.push(
    `2K avg: ${avgPower2K}W → Estimated threshold: ${thresholdEstimate}W (92%)`
  )

  return result
}

/**
 * Calculate zones from 1K time trial (SkiErg)
 */
export function calculateZonesFrom1K(
  avgPower1K: number,
  ergometerType: ErgometerType = 'CONCEPT2_SKIERG'
): ErgometerZoneResult {
  // 1K is shorter (~3-4 min), so avg power is higher relative to threshold
  // Threshold ≈ 85-88% of 1K power
  const thresholdEstimate = Math.round(avgPower1K * 0.86)

  const result = calculateErgometerZones({
    ergometerType,
    thresholdMethod: '2K_AVG', // Use same method label for consistency
    thresholdValue: thresholdEstimate,
  })

  result.recommendations.unshift(
    `1K avg: ${avgPower1K}W → Estimated threshold: ${thresholdEstimate}W (86%)`
  )

  return result
}

/**
 * Calculate zones from 4×4min interval test
 */
export function calculateZonesFromIntervalTest(
  avgIntervalPower: number,
  consistency: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR',
  ergometerType: ErgometerType = 'CONCEPT2_ROW'
): ErgometerZoneResult {
  // Estimation factor depends on pacing quality
  let factor: number
  let confidence: ConfidenceLevel

  switch (consistency) {
    case 'EXCELLENT':
      factor = 0.97  // Well-paced = close to true threshold
      confidence = 'HIGH'
      break
    case 'GOOD':
      factor = 0.95
      confidence = 'HIGH'
      break
    case 'FAIR':
      factor = 0.92
      confidence = 'MEDIUM'
      break
    case 'POOR':
      factor = 0.90
      confidence = 'LOW'
      break
  }

  const thresholdEstimate = Math.round(avgIntervalPower * factor)

  const result = calculateErgometerZones({
    ergometerType,
    thresholdMethod: 'INTERVAL',
    thresholdValue: thresholdEstimate,
  })

  result.recommendations.push(
    `4×4min avg: ${avgIntervalPower}W × ${factor} = Est. threshold: ${thresholdEstimate}W`,
    `Pacing consistency: ${consistency}`
  )

  return result
}

/**
 * Calculate zones from MAP ramp test
 */
export function calculateZonesFromMAP(
  mapWatts: number,
  ergometerType: ErgometerType = 'ASSAULT_BIKE'
): ErgometerZoneResult {
  return calculateErgometerZones({
    ergometerType,
    thresholdMethod: 'MAP',
    thresholdValue: mapWatts,
  })
}

// ==================== HR ZONE CALCULATIONS ====================

/**
 * Calculate HR zones based on threshold HR
 *
 * Uses relationship between HR and power zones
 * Note: HR zones lag power - these are approximations
 */
function calculateHRZonesFromThreshold(
  thresholdHR: number,
  zone: number
): { hrMin: number; hrMax: number } {
  // Typical HR zone boundaries relative to threshold HR
  // Threshold HR (zone 4) ≈ 88-95% of max HR
  const hrZonePercents: Record<number, { min: number; max: number }> = {
    1: { min: 50, max: 65 },    // Recovery
    2: { min: 65, max: 75 },    // Endurance
    3: { min: 75, max: 85 },    // Tempo
    4: { min: 85, max: 95 },    // Threshold
    5: { min: 95, max: 100 },   // VO2max
    6: { min: 100, max: 110 },  // Anaerobic (can exceed max briefly)
  }

  // Estimate max HR from threshold HR (threshold ≈ 90% of max)
  const estimatedMaxHR = thresholdHR / 0.90

  const zonePercent = hrZonePercents[zone]
  return {
    hrMin: Math.round(estimatedMaxHR * (zonePercent.min / 100)),
    hrMax: Math.round(estimatedMaxHR * (zonePercent.max / 100)),
  }
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Get Swedish zone name
 */
function getSwedishZoneName(englishName: string): string {
  const translations: Record<string, string> = {
    'Recovery': 'Återhämtning',
    'Endurance': 'Uthållighet',
    'Tempo': 'Tempo',
    'Threshold': 'Tröskel',
    'VO2max': 'VO2max',
    'Anaerobic': 'Anaerob',
  }
  return translations[englishName] || englishName
}

/**
 * Get zone description
 */
function getZoneDescription(zone: number): string {
  const descriptions: Record<number, string> = {
    1: 'Active recovery, warm-up, cool-down',
    2: 'Aerobic base building, fat oxidation',
    3: 'Sustained work, lactate clearance training',
    4: 'Threshold intensity, race pace',
    5: 'High-intensity intervals, VO2max development',
    6: 'Sprint, glycolytic capacity, neuromuscular power',
  }
  return descriptions[zone] || ''
}

/**
 * Get typical duration for zone
 */
function getTypicalDuration(zone: number): string {
  const durations: Record<number, string> = {
    1: '10-60 min continuous',
    2: '30-120 min continuous',
    3: '10-30 min intervals',
    4: '8-20 min intervals',
    5: '2-8 min intervals',
    6: '10-60 sec sprints',
  }
  return durations[zone] || ''
}

// ==================== ZONE LOOKUP UTILITIES ====================

/**
 * Get zone for a given power output
 */
export function getZoneForPower(
  power: number,
  zones: ErgometerZoneDefinition[]
): ErgometerZoneDefinition | null {
  for (const zone of zones) {
    if (power >= zone.powerMin && power <= zone.powerMax) {
      return zone
    }
  }

  // If above all zones, return highest
  const highestZone = zones.reduce((max, z) => z.zone > max.zone ? z : max, zones[0])
  if (power > highestZone.powerMax) {
    return highestZone
  }

  return null
}

/**
 * Get zone for a given pace (Concept2 only)
 */
export function getZoneForPace(
  paceSeconds: number,
  zones: ErgometerZoneDefinition[]
): ErgometerZoneDefinition | null {
  for (const zone of zones) {
    if (zone.paceMin !== undefined && zone.paceMax !== undefined) {
      // Note: lower pace = faster = higher zone
      if (paceSeconds >= zone.paceMin && paceSeconds <= zone.paceMax) {
        return zone
      }
    }
  }
  return null
}

/**
 * Format zone for display
 */
export function formatZoneDisplay(zone: ErgometerZoneDefinition, includeHR = false): string {
  let display = `Z${zone.zone} ${zone.name}: ${zone.powerMin}-${zone.powerMax}W`

  if (zone.paceMin !== undefined && zone.paceMax !== undefined) {
    display += ` (${formatPace(zone.paceMin)}-${formatPace(zone.paceMax)}/500m)`
  }

  if (includeHR && zone.hrMin !== undefined && zone.hrMax !== undefined) {
    display += ` [${zone.hrMin}-${zone.hrMax}bpm]`
  }

  return display
}

/**
 * Calculate time in zone from power data
 */
export function calculateTimeInZones(
  powerSamples: number[],
  zones: ErgometerZoneDefinition[]
): Map<number, number> {
  const timeInZone = new Map<number, number>()

  // Initialize all zones to 0
  zones.forEach(z => timeInZone.set(z.zone, 0))

  // Count samples in each zone (assumes 1-second samples)
  for (const power of powerSamples) {
    const zone = getZoneForPower(power, zones)
    if (zone) {
      const current = timeInZone.get(zone.zone) || 0
      timeInZone.set(zone.zone, current + 1)
    }
  }

  return timeInZone
}

/**
 * Calculate zone distribution as percentages
 */
export function calculateZoneDistribution(
  powerSamples: number[],
  zones: ErgometerZoneDefinition[]
): Array<{ zone: number; name: string; seconds: number; percent: number }> {
  const timeInZone = calculateTimeInZones(powerSamples, zones)
  const totalTime = powerSamples.length

  return zones.map(z => ({
    zone: z.zone,
    name: z.name,
    seconds: timeInZone.get(z.zone) || 0,
    percent: Math.round(((timeInZone.get(z.zone) || 0) / totalTime) * 1000) / 10,
  }))
}
