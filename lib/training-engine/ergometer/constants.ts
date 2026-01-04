/**
 * Ergometer Field Testing System - Constants
 *
 * Zone percentages, conversion factors, benchmark data, and validation thresholds
 * Based on research: docs/training-engine/Standardization_Field_Testing_Protocols_Ergometer_Conditioning.md
 */

import { ErgometerType, ErgometerTestProtocol } from '@prisma/client'

// ==================== ZONE DEFINITIONS ====================

/**
 * Standard 6-zone model based on % of Critical Power (CP) or FTP
 * Used across all ergometer types
 */
export const ZONE_DEFINITIONS = {
  CP_BASED: [
    {
      zone: 1,
      name: 'Recovery',
      nameSwedish: 'Återhämtning',
      percentMin: 0,
      percentMax: 55,
      description: 'Active recovery, warm-up, cool-down',
      descriptionSwedish: 'Aktiv återhämtning, uppvärmning, nedvarvning',
      typicalDuration: '10-60 min continuous',
    },
    {
      zone: 2,
      name: 'Endurance',
      nameSwedish: 'Uthållighet',
      percentMin: 56,
      percentMax: 75,
      description: 'Aerobic base building, fat oxidation',
      descriptionSwedish: 'Aerob basträning, fettförbränning',
      typicalDuration: '30-120 min continuous',
    },
    {
      zone: 3,
      name: 'Tempo',
      nameSwedish: 'Tempo',
      percentMin: 76,
      percentMax: 90,
      description: 'Sustained work, lactate clearance training',
      descriptionSwedish: 'Uthålligt arbete, laktatclearance',
      typicalDuration: '10-30 min intervals',
    },
    {
      zone: 4,
      name: 'Threshold',
      nameSwedish: 'Tröskel',
      percentMin: 91,
      percentMax: 105,
      description: 'Critical Power / FTP intensity, race pace',
      descriptionSwedish: 'Kritisk effekt / FTP-intensitet, tävlingstempo',
      typicalDuration: '8-20 min intervals',
    },
    {
      zone: 5,
      name: 'VO2max',
      nameSwedish: 'VO2max',
      percentMin: 106,
      percentMax: 120,
      description: 'High-intensity intervals, VO2max development',
      descriptionSwedish: 'Högintensiva intervaller, VO2max-utveckling',
      typicalDuration: '2-8 min intervals',
    },
    {
      zone: 6,
      name: 'Anaerobic',
      nameSwedish: 'Anaerob',
      percentMin: 121,
      percentMax: 200,
      description: 'Sprint, glycolytic capacity, neuromuscular power',
      descriptionSwedish: 'Sprint, glykolytisk kapacitet, neuromuskulär kraft',
      typicalDuration: '10-60 sec sprints',
    },
  ],

  // Alternative zone model based on % of MAP (Maximal Aerobic Power)
  MAP_BASED: [
    { zone: 1, name: 'Recovery', percentMin: 0, percentMax: 45 },
    { zone: 2, name: 'Endurance', percentMin: 45, percentMax: 60 },
    { zone: 3, name: 'Tempo', percentMin: 60, percentMax: 75 },
    { zone: 4, name: 'Threshold', percentMin: 75, percentMax: 85 },
    { zone: 5, name: 'VO2max', percentMin: 85, percentMax: 100 },
    { zone: 6, name: 'Anaerobic', percentMin: 100, percentMax: 150 },
  ],
} as const

// ==================== CONCEPT2 CONSTANTS ====================

/**
 * Concept2 pace to watts conversion constant
 * Formula: Watts = 2.80 / (pace/500m in seconds / 500)³
 *
 * Rearranged: pace = 500 × (2.80 / watts)^(1/3)
 */
export const CONCEPT2_PACE_CONSTANT = 2.80

/**
 * Standard drag factor ranges for Concept2 machines
 */
export const CONCEPT2_DRAG_FACTORS = {
  ROW: {
    min: 90,
    max: 200,
    standardMale: 120,      // 110-130 typical for testing
    standardFemale: 110,
    lightweightMale: 110,
    heavyweightMale: 130,
  },
  SKIERG: {
    min: 70,
    max: 200,
    standardMale: 95,       // 80-100 typical
    standardFemale: 85,
    recommended: 90,
  },
  BIKEERG: {
    min: 70,
    max: 200,
    standardMale: 100,      // 80-130 typical
    standardFemale: 90,
  },
} as const

/**
 * SkiErg to Row power ratio
 * SkiErg power ≈ 85-90% of Row power for same athlete at same effort
 */
export const SKIERG_TO_ROW_RATIO = {
  min: 0.85,
  max: 0.90,
  average: 0.875,
}

// ==================== WATTBIKE CONSTANTS ====================

/**
 * FTP correction factors for non-cyclists
 * Non-cyclists often test higher than true FTP due to large W'
 */
export const FTP_CORRECTION_FACTORS = {
  cyclist: 0.95,            // Standard 20-min test correction
  trainedNonCyclist: 0.92,  // Team sport athletes with some cycling
  untrained: 0.90,          // Pure team sport athletes, no cycling background
} as const

// ==================== CRITICAL POWER MODEL ====================

/**
 * Typical W' (anaerobic work capacity) values by modality
 * Units: Kilojoules (kJ)
 */
export const TYPICAL_W_PRIME_VALUES = {
  CYCLING: {
    recreational: { min: 12, max: 18 },
    trained: { min: 15, max: 25 },
    elite: { min: 20, max: 35 },
  },
  ROWING: {
    recreational: { min: 15, max: 25 },
    trained: { min: 20, max: 35 },
    elite: { min: 30, max: 45 },
  },
  SKIERG: {
    recreational: { min: 12, max: 20 },
    trained: { min: 18, max: 30 },
    elite: { min: 25, max: 40 },
  },
  AIR_BIKE: {
    recreational: { min: 18, max: 28 },
    trained: { min: 25, max: 40 },
    elite: { min: 35, max: 55 },
  },
} as const

/**
 * R² thresholds for CP model quality assessment
 */
export const CP_MODEL_R2_THRESHOLDS = {
  EXCELLENT: 0.95,
  GOOD: 0.90,
  FAIR: 0.85,
  POOR: 0,      // Below 0.85
} as const

/**
 * Minimum trial requirements for multi-trial CP
 */
export const CP_TRIAL_REQUIREMENTS = {
  minTrials: 2,
  recommendedTrials: 3,
  optimalTrials: 4,
  minDurationSeconds: 180,   // 3 minutes
  maxDurationSeconds: 900,   // 15 minutes
  optimalDistanceRatio: { min: 2.5, max: 4.0 },  // Ratio between longest and shortest trial
  minRecoveryHours: 48,      // Between trials
} as const

// ==================== INTERVAL TEST CONSTANTS ====================

/**
 * 4×4min interval test parameters
 */
export const INTERVAL_4X4_PARAMS = {
  intervalDuration: 240,     // 4 minutes in seconds
  restDuration: 180,         // 3 minutes in seconds
  intervals: 4,
  totalDuration: 1530,       // 4×4 + 3×3 = 25.5 minutes

  // Analysis thresholds
  consistencyThresholds: {
    excellent: 3,            // <3% power variation
    good: 5,                 // <5% power variation
    fair: 10,                // <10% power variation
    poor: 10,                // >10% power variation
  },

  // CP estimation from 4×4
  cpEstimationFactor: 0.95,  // CP ≈ 95% of avg power when well-paced
} as const

// ==================== VALIDATION THRESHOLDS ====================

/**
 * Test validation thresholds
 */
export const VALIDATION_THRESHOLDS = {
  // Power sanity checks (watts)
  minPower: 50,
  maxPower: 2500,

  // HR sanity checks
  minHR: 80,
  maxHR: 220,

  // RPE validation
  minRPE: 1,
  maxRPE: 10,

  // Concept2 pace sanity (sec/500m)
  minPace: 60,       // Sub 1:00/500m (very fast)
  maxPace: 300,      // 5:00/500m (very slow)

  // Stroke rate (strokes/min)
  minStrokeRate: 15,
  maxStrokeRate: 45,

  // Air bike RPM
  minRPM: 30,
  maxRPM: 150,

  // Calories per minute (air bike)
  minCalPerMin: 3,
  maxCalPerMin: 50,
} as const

/**
 * Test reliability (Coefficient of Variation)
 * Used to determine if performance change is "meaningful"
 */
export const TEST_RELIABILITY_CV = {
  PEAK_POWER_6S: { cv: 3.0, meaningfulChange: 5 },
  PEAK_POWER_30S: { cv: 4.0, meaningfulChange: 6 },
  TT_2K: { cv: 1.5, meaningfulChange: 2 },
  TT_10MIN: { cv: 2.5, meaningfulChange: 4 },
  TT_20MIN: { cv: 2.0, meaningfulChange: 3 },
  CP_3MIN: { cv: 3.0, meaningfulChange: 5 },
  INTERVAL_4X4: { cv: 2.5, meaningfulChange: 4 },
} as const

// ==================== BENCHMARK CONSTANTS ====================

/**
 * Concept2 Rower 2K benchmarks
 * Times in seconds, watts average
 */
export const ROW_2K_BENCHMARKS = {
  MALE: {
    ELITE: { timeMax: 360, powerMin: 400, wattsPerKg: 5.0 },       // <6:00
    ADVANCED: { timeMax: 390, powerMin: 350, wattsPerKg: 4.2 },    // 6:00-6:30
    INTERMEDIATE: { timeMax: 435, powerMin: 280, wattsPerKg: 3.5 }, // 6:30-7:15
    BEGINNER: { timeMax: 600, powerMin: 150, wattsPerKg: 2.0 },    // >7:15
  },
  FEMALE: {
    ELITE: { timeMax: 405, powerMin: 320, wattsPerKg: 4.5 },       // <6:45
    ADVANCED: { timeMax: 435, powerMin: 270, wattsPerKg: 3.8 },    // 6:45-7:15
    INTERMEDIATE: { timeMax: 480, powerMin: 220, wattsPerKg: 3.0 }, // 7:15-8:00
    BEGINNER: { timeMax: 600, powerMin: 120, wattsPerKg: 1.8 },    // >8:00
  },
} as const

/**
 * SkiErg 1K benchmarks
 * Times in seconds
 */
export const SKIERG_1K_BENCHMARKS = {
  MALE: {
    ELITE: { timeMax: 180, paceMax: 90 },       // <3:00, <1:30/500m
    ADVANCED: { timeMax: 210, paceMax: 105 },   // 3:00-3:30
    INTERMEDIATE: { timeMax: 240, paceMax: 120 }, // 3:30-4:00
    BEGINNER: { timeMax: 300, paceMax: 150 },   // >4:00
  },
  FEMALE: {
    ELITE: { timeMax: 210, paceMax: 105 },      // <3:30, <1:45/500m
    ADVANCED: { timeMax: 240, paceMax: 120 },   // 3:30-4:00
    INTERMEDIATE: { timeMax: 270, paceMax: 135 }, // 4:00-4:30
    BEGINNER: { timeMax: 330, paceMax: 165 },   // >4:30
  },
} as const

/**
 * Air Bike 10-minute calorie benchmarks
 * Based on functional fitness / CrossFit standards
 */
export const AIR_BIKE_10MIN_BENCHMARKS = {
  MALE: {
    ELITE: { caloriesMin: 200, calPerBodyLb: 1.2 },      // >200 cal
    ADVANCED: { caloriesMin: 160, calPerBodyLb: 1.0 },   // 160-200 cal
    INTERMEDIATE: { caloriesMin: 130, calPerBodyLb: 0.8 }, // 130-160 cal
    BEGINNER: { caloriesMin: 80, calPerBodyLb: 0.5 },    // <130 cal
  },
  FEMALE: {
    ELITE: { caloriesMin: 150, calPerBodyLb: 1.0 },      // >150 cal
    ADVANCED: { caloriesMin: 120, calPerBodyLb: 0.85 },  // 120-150 cal
    INTERMEDIATE: { caloriesMin: 95, calPerBodyLb: 0.7 }, // 95-120 cal
    BEGINNER: { caloriesMin: 60, calPerBodyLb: 0.5 },    // <95 cal
  },
} as const

/**
 * Wattbike peak power benchmarks (6-second)
 * Based on team sport athlete data
 */
export const WATTBIKE_PEAK_POWER_BENCHMARKS = {
  MALE: {
    ELITE: { powerMin: 1500, wattsPerKg: 19 },
    ADVANCED: { powerMin: 1200, wattsPerKg: 16 },
    INTERMEDIATE: { powerMin: 900, wattsPerKg: 12 },
    BEGINNER: { powerMin: 600, wattsPerKg: 8 },
  },
  FEMALE: {
    ELITE: { powerMin: 1000, wattsPerKg: 16 },
    ADVANCED: { powerMin: 800, wattsPerKg: 13 },
    INTERMEDIATE: { powerMin: 600, wattsPerKg: 10 },
    BEGINNER: { powerMin: 400, wattsPerKg: 6 },
  },
} as const

// ==================== SPORT-SPECIFIC RECOMMENDATIONS ====================

/**
 * Primary ergometer recommendations by sport
 */
export const SPORT_ERGOMETER_PRIORITIES: Record<string, {
  primary: ErgometerType
  secondary: ErgometerType[]
  focusTests: ErgometerTestProtocol[]
  rationale: string
}> = {
  TEAM_ICE_HOCKEY: {
    primary: 'WATTBIKE',
    secondary: ['CONCEPT2_ROW', 'ASSAULT_BIKE'],
    focusTests: ['PEAK_POWER_6S', 'PEAK_POWER_30S', 'CP_3MIN_ALL_OUT'],
    rationale: 'Wattbike mimics skating stride (hip/knee extension). Focus on peak power and W\' for shift-based demands.',
  },
  TEAM_FOOTBALL: {
    primary: 'CONCEPT2_ROW',
    secondary: ['CONCEPT2_BIKEERG', 'ASSAULT_BIKE'],
    focusTests: ['TT_2K', 'INTERVAL_4X4', 'CP_3MIN_ALL_OUT'],
    rationale: 'Row/BikeErg provides off-feet aerobic work. 4×4min test assesses sustained power for 90-min matches.',
  },
  TEAM_HANDBALL: {
    primary: 'CONCEPT2_SKIERG',
    secondary: ['ASSAULT_BIKE', 'WATTBIKE'],
    focusTests: ['TT_1K', 'PEAK_POWER_30S', 'INTERVAL_4X4'],
    rationale: 'SkiErg emphasizes upper body while sparing lower limbs. Court sport needs RSA.',
  },
  HYROX: {
    primary: 'CONCEPT2_SKIERG',
    secondary: ['CONCEPT2_ROW', 'ASSAULT_BIKE'],
    focusTests: ['TT_1K', 'TT_2K', 'TT_10MIN'],
    rationale: 'Race includes 1K Ski and 1K Row. Time trial tests match race station demands.',
  },
  GENERAL_FITNESS: {
    primary: 'ASSAULT_BIKE',
    secondary: ['CONCEPT2_ROW', 'CONCEPT2_SKIERG'],
    focusTests: ['TT_10MIN', 'PEAK_POWER_30S', 'INTERVAL_4X4'],
    rationale: 'Air bike tests work capacity across energy systems. Common in CrossFit programming.',
  },
} as const

// ==================== RETEST RECOMMENDATIONS ====================

/**
 * Recommended retest intervals by protocol and training status
 */
export const RETEST_INTERVALS = {
  // During base phase or maintenance
  maintenance: {
    threshold: 12,        // weeks
    peakPower: 8,
    cp: 12,
  },
  // During build/peak phase
  intensive: {
    threshold: 6,         // weeks
    peakPower: 4,
    cp: 8,
  },
  // After significant training block
  postBlock: {
    threshold: 1,         // weeks after block completion
    peakPower: 1,
    cp: 2,
  },
} as const

// ==================== HELPER FUNCTIONS ====================

/**
 * Get ergometer display name
 */
export function getErgometerDisplayName(type: ErgometerType): string {
  const names: Record<ErgometerType, string> = {
    WATTBIKE: 'Wattbike',
    CONCEPT2_ROW: 'Concept2 RowErg',
    CONCEPT2_SKIERG: 'Concept2 SkiErg',
    CONCEPT2_BIKEERG: 'Concept2 BikeErg',
    ASSAULT_BIKE: 'Air Bike',
  }
  return names[type]
}

/**
 * Get ergometer display name in Swedish
 */
export function getErgometerDisplayNameSwedish(type: ErgometerType): string {
  const names: Record<ErgometerType, string> = {
    WATTBIKE: 'Wattbike',
    CONCEPT2_ROW: 'Concept2 Roddmaskin',
    CONCEPT2_SKIERG: 'Concept2 SkiErg',
    CONCEPT2_BIKEERG: 'Concept2 Cykelergometer',
    ASSAULT_BIKE: 'Air Bike',
  }
  return names[type]
}

/**
 * Get test protocol display name
 */
export function getProtocolDisplayName(protocol: ErgometerTestProtocol): string {
  const names: Record<ErgometerTestProtocol, string> = {
    PEAK_POWER_6S: '6-Second Peak Power',
    PEAK_POWER_7_STROKE: '7-Stroke Max Power',
    PEAK_POWER_30S: '30-Second Sprint',
    TT_1K: '1K Time Trial',
    TT_2K: '2K Time Trial',
    TT_10MIN: '10-Minute Max Calories',
    TT_20MIN: '20-Minute FTP Test',
    MAP_RAMP: 'MAP Ramp Test',
    CP_3MIN_ALL_OUT: '3-Minute All-Out (CP)',
    CP_MULTI_TRIAL: 'Multi-Trial CP Test',
    INTERVAL_4X4: '4×4min Interval Test',
  }
  return names[protocol]
}

/**
 * Get test protocol display name in Swedish
 */
export function getProtocolDisplayNameSwedish(protocol: ErgometerTestProtocol): string {
  const names: Record<ErgometerTestProtocol, string> = {
    PEAK_POWER_6S: '6-sekunders maxeffekt',
    PEAK_POWER_7_STROKE: '7-tags maxeffekt',
    PEAK_POWER_30S: '30-sekunders sprint',
    TT_1K: '1K tidtest',
    TT_2K: '2K tidtest',
    TT_10MIN: '10-minuters maxkalorier',
    TT_20MIN: '20-minuters FTP-test',
    MAP_RAMP: 'MAP trappstegstest',
    CP_3MIN_ALL_OUT: '3-minuters all-out (CP)',
    CP_MULTI_TRIAL: 'Flerförsöks CP-test',
    INTERVAL_4X4: '4×4min intervalltest',
  }
  return names[protocol]
}

/**
 * Check if ergometer is Concept2 (has pace output)
 */
export function isConcept2(type: ErgometerType): boolean {
  return ['CONCEPT2_ROW', 'CONCEPT2_SKIERG', 'CONCEPT2_BIKEERG'].includes(type)
}
