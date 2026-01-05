/**
 * Ergometer Performance Predictions
 *
 * Exports for power prediction and improvement projection
 */

export {
  predictPowerForDuration,
  predictTimeForDistance,
  generatePowerCurve,
  generateDistancePredictions,
  analyzePerformance,
  type PowerPredictionInput,
  type PowerPrediction,
  type TimePrediction,
} from './power-prediction';

export {
  projectImprovement,
  generateProjectionCurve,
  type TrainingLoadData,
  type HistoricalTest,
  type ImprovementProjection,
  type ImprovementFactor,
} from './improvement-projection';
