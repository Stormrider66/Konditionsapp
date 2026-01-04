/**
 * Ergometer Calculations Module
 *
 * Exports all calculation functions for ergometer field testing:
 * - Pace/Power conversion (Concept2)
 * - Critical Power model (CP + W')
 * - Interval test analysis (4×4min)
 * - Peak power analysis (6s, 30s, 7-stroke)
 * - Zone calculation
 */

// Pace/Power Conversion (Concept2)
export {
  paceToWatts,
  wattsToPace,
  formatPace,
  parsePace,
  convertPacePower,
  calculatePowerForPaceImprovement,
  calculateSplits,
  calculateAvgWattsFromDistanceTime,
  estimateDistanceFromPowerTime,
  estimateCalories,
  wattsToCalsPerHour,
  getPaceRangeForPowerZone,
} from './pace-power-conversion'

// Critical Power Model
export {
  calculate3MinuteAllOut,
  calculateMultiTrialCP,
  calculateWPrimeBalance,
  estimateTimeToExhaustion,
  estimatePowerForDuration,
  validateWPrime,
} from './critical-power'

// Interval Test Analysis
export {
  analyze4x4IntervalTest,
  analyzeGenericIntervalTest,
  analyzePacingStrategy,
  calculateFatigueIndex,
  analyzeHRPowerCoupling,
} from './interval-test'

// Peak Power Analysis
export {
  analyze6SecondPeakPower,
  analyze7StrokeMaxPower,
  analyze30SecondSprint,
  calculateRelativePower,
  classifyPeakPowerTier,
} from './peak-power'

// Zone Calculation
export {
  calculateErgometerZones,
  calculateZonesFromCP,
  calculateZonesFromFTP,
  calculateZonesFrom2K,
  calculateZonesFrom1K,
  calculateZonesFromIntervalTest,
  calculateZonesFromMAP,
  getZoneForPower,
  getZoneForPace,
  formatZoneDisplay,
  calculateTimeInZones,
  calculateZoneDistribution,
} from './ergometer-zones'
