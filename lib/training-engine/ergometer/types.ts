/**
 * Ergometer Field Testing System - TypeScript Types
 *
 * Types for ergometer-based conditioning tests supporting:
 * - Wattbike, Concept2 Row/SkiErg/BikeErg, Assault/Air Bikes
 * - Team sports (hockey, football, handball) and functional fitness (HYROX, CrossFit)
 */

import { ErgometerType, ErgometerTestProtocol, SportType } from '@prisma/client'

// Re-export Prisma enums for convenience
export { ErgometerType, ErgometerTestProtocol }

// ==================== CONFIDENCE & QUALITY ====================

export type ConfidenceLevel = 'VERY_HIGH' | 'HIGH' | 'MEDIUM' | 'LOW'
export type ModelFitQuality = 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR'
export type BenchmarkTier = 'ELITE' | 'ADVANCED' | 'INTERMEDIATE' | 'BEGINNER'

// ==================== EQUIPMENT SETTINGS ====================

export interface EquipmentSettings {
  // Concept2 settings
  dragFactor?: number        // 80-200 (Row: 110-130, Ski: 80-100, Bike: 80-130)
  damperSetting?: number     // 1-10

  // Wattbike settings
  airResistance?: number     // 1-10
  magnetResistance?: number  // 1-4

  // Air bike brand (stored, not converted)
  bikeBrand?: 'ASSAULT' | 'ECHO' | 'SCHWINN' | string
}

export interface EnvironmentalConditions {
  temperature?: number       // Celsius
  humidity?: number          // Percentage (0-100)
  altitude?: number          // Meters above sea level
}

// ==================== SPORT PROFILE SETTINGS ====================

export interface ErgometerSettings {
  preferredModalities: ErgometerType[]
  equipmentAccess: {
    wattbike: boolean
    concept2Row: boolean
    concept2SkiErg: boolean
    concept2BikeErg: boolean
    assaultBike: boolean
    echoBike: boolean
  }
  dragFactorPreferences: {
    row?: number        // 100-140 typical
    skiErg?: number     // 80-110 typical
    bikeErg?: number    // 80-130 typical
  }
  airBikeBrand?: 'ASSAULT' | 'ECHO' | 'SCHWINN'

  // Sport-specific ergometer priorities
  primaryErgometer?: ErgometerType
  trainingGoals?: 'THRESHOLD_POWER' | 'PEAK_POWER' | 'WORK_CAPACITY' | 'RSA'
}

// ==================== TEST RAW DATA STRUCTURES ====================

/**
 * 2K Time Trial raw data (Row/Ski/BikeErg)
 */
export interface TT2KRawData {
  distance: 2000
  time: number              // Total time in seconds
  splits: number[]          // 500m split times in seconds
  avgPace: number           // sec/500m
  avgPower: number          // Watts
  avgStrokeRate: number     // strokes/min
  hrData?: number[]         // HR samples
  avgHR?: number
  maxHR?: number
}

/**
 * 1K Time Trial raw data (SkiErg standard)
 */
export interface TT1KRawData {
  distance: 1000
  time: number              // Total time in seconds
  splits: number[]          // 250m or 500m split times
  avgPace: number           // sec/500m
  avgPower: number          // Watts
  avgStrokeRate: number     // strokes/min
  hrData?: number[]
  avgHR?: number
  maxHR?: number
}

/**
 * 10-minute max calories raw data (Air Bike)
 */
export interface TT10MinRawData {
  duration: 600             // 10 minutes in seconds
  totalCalories: number
  caloriesPerMinute: number[]  // Per-minute calories
  avgRPM: number
  peakRPM: number
  avgPower?: number         // If available
  hrData?: number[]
  avgHR?: number
  maxHR?: number
}

/**
 * 20-minute FTP test raw data (Wattbike)
 */
export interface TT20MinRawData {
  duration: 1200            // 20 minutes in seconds
  avgPower: number          // Watts
  normalizedPower?: number  // NP
  powerSamples?: number[]   // 1-second power data
  hrData?: number[]
  avgHR?: number
  maxHR?: number
  avgCadence?: number
}

/**
 * Peak power test raw data (6s or 30s)
 */
export interface PeakPowerRawData {
  duration: 6 | 30          // seconds
  peakPower: number         // Watts (instantaneous max)
  avgPower: number          // Watts (average over duration)
  powerSamples?: number[]   // 1-second samples
  peakRPM?: number
  avgRPM?: number
}

/**
 * 7-stroke max power raw data (Concept2)
 */
export interface SevenStrokeRawData {
  strokes: Array<{
    strokeNumber: number
    power: number           // Watts
    pace: number            // sec/500m
  }>
  peakPower: number         // Max from any stroke
  avgPower: number          // Average of 7 strokes
}

/**
 * 3-minute all-out test raw data (CP model)
 */
export interface CP3MinRawData {
  duration: 180             // 3 minutes in seconds
  powerSamples: number[]    // 1-second power samples (180 values)
  endPower: number          // Average of last 30 seconds = CP
  totalWork: number         // Joules (sum of all power samples)
  workAboveCP: number       // W' in Joules
  hrData?: number[]
  maxHR?: number
}

/**
 * Multi-trial CP test raw data
 */
export interface CPMultiTrialRawData {
  trials: Array<{
    duration: number        // seconds (e.g., 180, 720 for 3-min, 12-min)
    avgPower: number        // Watts
    totalWork?: number      // Joules
    date?: string           // ISO date if trials on different days
  }>
}

/**
 * 4x4min interval test raw data
 */
export interface Interval4x4RawData {
  intervals: Array<{
    intervalNumber: number  // 1-4
    duration: number        // seconds (should be 240)
    avgPower: number        // Watts
    avgPace?: number        // sec/500m (Concept2)
    avgHR: number           // bpm
    maxHR?: number
    avgStrokeRate?: number
  }>
  restDuration: number      // seconds (should be 180)
  totalDuration: number     // Total test time including rest
}

/**
 * MAP ramp test raw data
 */
export interface MAPRampRawData {
  startPower: number        // Starting watts
  increment: number         // Watts per minute
  stages: Array<{
    minute: number
    targetPower: number     // Watts
    actualPower: number     // Watts achieved
    hr?: number             // bpm
    completed: boolean      // Did athlete complete this minute?
  }>
  mapWatts: number          // Highest completed minute average
  peakPower?: number        // Absolute peak reached
  maxHR?: number
  timeToExhaustion: number  // Total seconds
}

// Union type for all raw data formats
export type ErgometerRawData =
  | TT2KRawData
  | TT1KRawData
  | TT10MinRawData
  | TT20MinRawData
  | PeakPowerRawData
  | SevenStrokeRawData
  | CP3MinRawData
  | CPMultiTrialRawData
  | Interval4x4RawData
  | MAPRampRawData

// ==================== CALCULATION INPUTS ====================

export interface CPCalculationInput {
  method: 'THREE_MIN_ALL_OUT' | 'MULTI_TRIAL'

  // For 3-minute all-out
  powerSamples?: number[]   // 180 x 1-second samples

  // For multi-trial
  trials?: Array<{
    duration: number        // seconds
    avgPower: number        // watts
  }>
}

export interface ZoneCalculationInput {
  ergometerType: ErgometerType
  thresholdMethod: 'CP' | 'FTP' | 'MAP' | '2K_AVG' | 'INTERVAL'
  thresholdValue: number    // CP, FTP, MAP, or 2K avg watts
  wPrime?: number           // For CP-based zones (Joules)
  peakPower?: number        // For anaerobic zone ceiling
  hrAtThreshold?: number    // For HR zone correlation
}

// ==================== CALCULATION RESULTS ====================

export interface CPModelResult {
  criticalPower: number     // Watts
  wPrime: number            // Joules
  wPrimeKJ: number          // kJ (for display)

  // Model quality
  r2?: number               // R-squared (0-1) for multi-trial
  confidence: ConfidenceLevel
  modelFit: ModelFitQuality

  // Recommendations
  warnings: string[]
  recommendations: string[]
}

export interface IntervalTestResult {
  avgPower: number          // Average across all intervals
  consistency: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR'
  decoupling: number        // % power drop from first to last interval

  // Per-interval analysis
  intervalPowers: number[]
  hrDrift: number           // % HR increase from first to last

  // Threshold estimation
  estimatedCP: number       // ~95% of avg power for well-paced test
  confidence: ConfidenceLevel

  warnings: string[]
  recommendations: string[]
}

export interface ErgometerZoneResult {
  zones: ErgometerZoneDefinition[]
  zoneModel: '6_ZONE' | '7_ZONE'
  source: string            // Description of calculation method
  recommendations: string[]
}

export interface ErgometerZoneDefinition {
  zone: number              // 1-6 (or 1-7)
  name: string              // Recovery, Endurance, etc.
  nameSwedish: string       // Återhämtning, Uthållighet, etc.

  // Power targets
  powerMin: number          // Watts
  powerMax: number          // Watts
  percentMin: number        // % of threshold
  percentMax: number        // % of threshold

  // Pace targets (Concept2 only)
  paceMin?: number          // sec/500m (faster)
  paceMax?: number          // sec/500m (slower)

  // HR targets
  hrMin?: number            // bpm
  hrMax?: number            // bpm

  // Training application
  description: string
  descriptionSwedish?: string
  typicalDuration?: string
}

// ==================== BENCHMARK TYPES ====================

export interface BenchmarkClassification {
  tier: BenchmarkTier
  percentile?: number       // 0-100
  comparedTo: string        // Description (e.g., "Male Rowers", "HYROX Pro Women")
  sport?: SportType
}

export interface BenchmarkData {
  ergometerType: ErgometerType
  testProtocol: ErgometerTestProtocol
  gender: 'MALE' | 'FEMALE'
  tier: BenchmarkTier

  // Values (at least one required)
  powerMin?: number
  powerMax?: number
  paceMin?: number          // sec/500m
  paceMax?: number
  timeMin?: number          // seconds
  timeMax?: number
  caloriesMin?: number
  caloriesMax?: number
  wattsPerKg?: number

  description?: string
  source?: string
}

// ==================== API REQUEST/RESPONSE TYPES ====================

export interface CreateErgometerTestRequest {
  clientId: string
  ergometerType: ErgometerType
  testProtocol: ErgometerTestProtocol
  testDate: string          // ISO date

  // Equipment
  dragFactor?: number
  damperSetting?: number
  airResistance?: number
  magnetResistance?: number
  bikeBrand?: string

  // Conditions
  conditions?: EnvironmentalConditions

  // Raw data (protocol-specific)
  rawData: ErgometerRawData

  // Optional HR data
  avgHR?: number
  maxHR?: number

  // Optional metadata
  notes?: string
  rpe?: number              // 1-10
}

export interface ErgometerTestResponse {
  test: {
    id: string
    clientId: string
    ergometerType: ErgometerType
    testProtocol: ErgometerTestProtocol
    testDate: string
    avgPower?: number
    peakPower?: number
    criticalPower?: number
    wPrime?: number
    confidence?: ConfidenceLevel
    valid: boolean
  }

  analysis: {
    // Protocol-specific analysis results
    [key: string]: unknown
  }

  benchmark?: BenchmarkClassification

  validation: {
    valid: boolean
    warnings: string[]
    errors: string[]
  }

  recommendations: string[]
}

export interface CalculateZonesRequest {
  clientId: string
  ergometerType: ErgometerType
  thresholdMethod: 'CP' | 'FTP' | 'MAP' | '2K_AVG' | 'INTERVAL'

  // Provide threshold value directly OR sourceTestId
  thresholdValue?: number
  sourceTestId?: string

  // Optional for enhanced zones
  wPrime?: number
  peakPower?: number
  hrAtThreshold?: number
}

export interface ErgometerZonesResponse {
  zones: ErgometerZoneDefinition[]
  threshold: {
    method: string
    value: number           // Watts
    pace?: number           // sec/500m (Concept2)
    hrAtThreshold?: number
  }
  confidence: ConfidenceLevel
  savedToProfile: boolean
}

// ==================== UTILITY TYPES ====================

/**
 * Concept2 pace/power conversion utilities
 */
export interface PacePowerConversion {
  watts: number
  paceSeconds: number       // sec/500m
  paceFormatted: string     // "1:45.5"
}

/**
 * Test progression tracking
 */
export interface TestProgression {
  clientId: string
  ergometerType: ErgometerType
  tests: Array<{
    id: string
    date: string
    protocol: ErgometerTestProtocol
    avgPower?: number
    criticalPower?: number
    peakPower?: number
    confidence?: ConfidenceLevel
  }>
  trends: {
    cpTrend?: number        // % change over period
    peakPowerTrend?: number
    avgPowerTrend?: number
  }
  recommendations: string[]
}
