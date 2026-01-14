/**
 * Sport-Specific Test Calculations
 *
 * Comprehensive calculation library for all sport-specific physical tests.
 */

// Power Tests
export {
  calculateJumpPower,
  calculateRSI,
  calculateFlightTime,
  calculateJumpHeightFromFlightTime,
  calculateLongJumpPowerIndex,
  classifyVerticalJump,
  estimateSpikeJumpFromCMJ,
  classifyMedicineBallThrow,
  type JumpPowerFormula,
} from './power-tests'

// Speed Tests
export {
  calculateSpeed,
  calculateAcceleration,
  calculateMaxVelocity,
  analyzeSprintSplits,
  analyzeRSA,
  classifySprintPerformance,
  sprintSpeedKmh,
  type SprintSplit,
  type SprintAnalysis,
} from './speed-tests'

// Agility Tests
export {
  classifyTTest,
  classifyIllinoisAgility,
  classifyProAgility,
  classifyLaneAgility,
  classifyAgilityTest,
  calculateCODDeficit,
  calculateReactiveAgilityIndex,
  getAgilityTestDescription,
  type AgilityTestType,
  type AgilityResult,
} from './agility-tests'

// Strength Tests
export {
  estimateOneRepMax,
  calculateWeightForReps,
  calculateRelativeStrength,
  classifyStrength,
  calculateStrengthRatios,
  calculateWilksScore,
  getTrainingWeights,
  type OneRepMaxFormula,
  type StrengthExercise,
  type StrengthResult,
} from './strength-tests'

// Endurance Tests
export {
  calculateYoYoDistance,
  estimateVO2maxFromYoYoIR1,
  estimateVO2maxFromYoYoIR2,
  analyzeYoYoIR1,
  classifyYoYoIR1,
  calculateBeepTestDistance,
  estimateVO2maxFromBeepTest,
  analyzeBeepTest,
  classifyBeepTest,
  estimateVO2maxFromCooperTest,
  analyzeCooperTest,
  classifyCooperTest,
  type YoYoResult,
  type BeepTestResult,
  type CooperTestResult,
} from './endurance-tests'

// Swimming Tests
export {
  calculateCSS,
  generateSwimZones,
  calculateSWOLF,
  classifySWOLF,
  formatSwimPace,
  calculateSwimPace,
  estimateVO2maxFromSwim,
  calculateStrokeRate,
  classifyCSS,
  type SwimZone,
  type CSSResult,
} from './swimming-tests'

// HYROX Tests
export {
  classifyStationPerformance,
  analyzeStationResult,
  estimateRaceTime,
  classifyOverallRaceTime,
  getStationWeight,
  getWallBallReps,
  formatStationTime,
  getStationDescription,
  type HYROXStation,
  type HYROXCategory,
  type HYROXDivision,
  type HYROXStationResult,
  type HYROXRaceEstimate,
} from './hyrox-tests'
