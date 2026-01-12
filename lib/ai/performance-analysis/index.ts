/**
 * Deep Performance Analysis
 *
 * AI-powered analysis system for physiological test data.
 * Provides test analysis, comparison, trend analysis, and training correlations.
 */

// Types
export * from './types'

// Services
export { analyzeTest } from './test-analyzer'
export { compareTests } from './test-comparator'
export { analyzeTrends } from './trend-analyzer'
export { analyzeTrainingCorrelation } from './training-correlator'

// Context builder (for advanced usage)
export {
  buildAnalysisContext,
  buildComparisonContext,
  buildTrendContext,
} from './context-builder'
