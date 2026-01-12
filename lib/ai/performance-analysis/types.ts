/**
 * Deep Performance Analysis Types
 *
 * Type definitions for AI-powered performance analysis system.
 */

// ==================== INPUT TYPES ====================

export interface TestDataForAnalysis {
  id: string
  date: string
  testType: 'RUNNING' | 'CYCLING' | 'SKIING'

  // Core metrics
  vo2max: number | null
  maxHR: number
  maxLactate: number

  // Thresholds
  aerobicThreshold: {
    hr: number
    intensity: number // speed (km/h), power (W), or pace (min/km)
    lactate: number
    percentOfMax: number
  } | null
  anaerobicThreshold: {
    hr: number
    intensity: number
    lactate: number
    percentOfMax: number
  } | null

  // Economy data (running)
  economyData: Array<{
    speed: number
    vo2: number
    economy: number // ml/kg/km
  }>

  // Cycling specific
  cyclingData?: {
    ftp: number
    wattsPerKg: number
    maxPower: number
  }

  // Test stages
  stages: Array<{
    sequence: number
    duration: number
    heartRate: number
    lactate: number
    vo2?: number
    speed?: number
    power?: number
    pace?: number
  }>

  // Calculated classifications
  lactateCurveType?: 'FLAT' | 'MODERATE' | 'STEEP'
  athleteType?: 'UTHALLIGHET' | 'SNABBHET' | 'ALLROUND'
}

export interface TrainingContextForAnalysis {
  periodStart: string
  periodEnd: string
  weekCount: number

  // Volume metrics
  totalSessions: number
  totalDistanceKm: number
  totalDurationHours: number
  avgWeeklyTSS: number
  avgWeeklyDistance: number

  // Intensity distribution
  zoneDistribution: {
    zone1Percent: number
    zone2Percent: number
    zone3Percent: number
    zone4Percent: number
    zone5Percent: number
  }

  // Training types
  trainingTypeDistribution: {
    easyRuns: number
    longRuns: number
    tempoRuns: number
    intervals: number
    recovery: number
  }

  // Strength training
  strengthSessions: number

  // Readiness and recovery
  avgReadiness: number
  avgSleepHours: number
  avgSleepQuality: number

  // Load management
  avgACWR: number
  peakACWR: number
  daysInDangerZone: number

  // Consistency
  completionRate: number // % of planned workouts completed
  longestStreak: number // consecutive training days
}

export interface AthleteProfileForAnalysis {
  id: string
  name: string
  age: number
  gender: 'MALE' | 'FEMALE'

  // Sport context
  sport: string
  experienceYears: number
  weeklyTrainingHours: number

  // Goals
  primaryGoal: string | null
  targetRaces: Array<{
    name: string
    distance: string
    date: string
  }>

  // Historical context
  trainingAgeMonths: number // how long they've been in the system
  totalTestsCompleted: number

  // Current state
  currentACWR: number | null
  currentChronicLoad: number | null
  recentReadiness: number | null
  activeInjury: string | null
}

export interface TestComparisonInput {
  currentTestId: string
  previousTestId: string
  includeTrainingContext?: boolean
}

export interface TrendAnalysisInput {
  clientId: string
  months?: number // default 12
  metrics?: ('vo2max' | 'lt1' | 'lt2' | 'economy' | 'maxHR')[]
}

// ==================== OUTPUT TYPES ====================

export interface PerformanceAnalysisResult {
  analysisType: 'TEST_ANALYSIS' | 'TEST_COMPARISON' | 'TREND_ANALYSIS' | 'TRAINING_CORRELATION'
  generatedAt: string
  confidence: 'HIGH' | 'MEDIUM' | 'LOW'
  dataQuality: 'EXCELLENT' | 'GOOD' | 'LIMITED'

  // AI-generated content
  narrative: string // Main analysis narrative (Swedish)
  executiveSummary: string // 2-3 sentence summary

  // Structured insights
  keyFindings: KeyFinding[]
  strengths: string[]
  developmentAreas: string[]

  // Predictions
  predictions: PerformancePrediction[]

  // Recommendations
  recommendations: TrainingRecommendation[]

  // Metadata
  tokensUsed?: number
  modelUsed?: string
}

export interface KeyFinding {
  category: 'IMPROVEMENT' | 'DECLINE' | 'STRENGTH' | 'WEAKNESS' | 'INSIGHT' | 'WARNING'
  title: string
  description: string
  metric?: string
  value?: number
  change?: number // percentage change if applicable
  significance: 'HIGH' | 'MEDIUM' | 'LOW'
}

export interface PerformancePrediction {
  type: 'RACE_TIME' | 'THRESHOLD' | 'VO2MAX' | 'FITNESS_PEAK'
  title: string
  prediction: string
  confidence: number // 0-1
  basis: string // What the prediction is based on
  timeframe?: string // When this might be achieved
}

export interface TrainingRecommendation {
  priority: 1 | 2 | 3 // 1 = highest
  category: 'VOLUME' | 'INTENSITY' | 'RECOVERY' | 'TECHNIQUE' | 'STRENGTH' | 'NUTRITION'
  title: string
  description: string
  rationale: string
  implementation: string // How to implement this
  expectedOutcome: string
}

// ==================== TEST COMPARISON TYPES ====================

export interface TestComparisonResult extends PerformanceAnalysisResult {
  analysisType: 'TEST_COMPARISON'

  // Comparison specific
  comparison: {
    testDates: {
      previous: string
      current: string
      daysBetween: number
    }

    // Delta values
    deltas: {
      vo2max: DeltaValue | null
      aerobicThresholdHR: DeltaValue | null
      aerobicThresholdIntensity: DeltaValue | null
      anaerobicThresholdHR: DeltaValue | null
      anaerobicThresholdIntensity: DeltaValue | null
      maxHR: DeltaValue | null
      maxLactate: DeltaValue | null
      economy: DeltaValue | null
    }

    // Training context summary
    trainingBetweenTests?: {
      weeks: number
      totalSessions: number
      avgWeeklyVolume: string
      dominantTrainingType: string
      zoneDistributionSummary: string
    }
  }

  // What drove the changes
  correlationAnalysis?: {
    likelyContributors: Array<{
      factor: string
      impact: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL'
      confidence: number
      explanation: string
    }>
    unexplainedVariance: string | null
  }
}

export interface DeltaValue {
  previous: number
  current: number
  absoluteChange: number
  percentChange: number
  trend: 'IMPROVED' | 'DECLINED' | 'STABLE'
}

// ==================== TREND ANALYSIS TYPES ====================

export interface TrendAnalysisResult extends PerformanceAnalysisResult {
  analysisType: 'TREND_ANALYSIS'

  // Time series data for visualization
  trends: {
    vo2max: TrendDataPoint[]
    aerobicThreshold: TrendDataPoint[]
    anaerobicThreshold: TrendDataPoint[]
    economy: TrendDataPoint[]
  }

  // Statistical analysis
  statistics: {
    vo2max: TrendStatistics | null
    aerobicThreshold: TrendStatistics | null
    anaerobicThreshold: TrendStatistics | null
    economy: TrendStatistics | null
  }

  // Projected future values
  projections: {
    metric: string
    currentValue: number
    projectedValue: number
    projectionDate: string
    confidence: number
    methodology: string
  }[]
}

export interface TrendDataPoint {
  date: string
  value: number
  testId: string
}

export interface TrendStatistics {
  dataPoints: number
  firstValue: number
  lastValue: number
  minValue: number
  maxValue: number
  averageValue: number
  standardDeviation: number
  rateOfChange: number // per month
  trend: 'IMPROVING' | 'STABLE' | 'DECLINING'
  r2: number // coefficient of determination
}

// ==================== TRAINING CORRELATION TYPES ====================

export interface TrainingCorrelationResult extends PerformanceAnalysisResult {
  analysisType: 'TRAINING_CORRELATION'

  correlations: Array<{
    trainingFactor: string // e.g., "Zone 2 volume", "Threshold sessions"
    performanceMetric: string // e.g., "VO2max", "LT2"
    correlationStrength: number // -1 to 1
    significance: 'SIGNIFICANT' | 'MODERATE' | 'WEAK' | 'NONE'
    direction: 'POSITIVE' | 'NEGATIVE'
    interpretation: string
  }>

  // What training works for this athlete
  effectivenessInsights: {
    mostEffectiveTraining: string[]
    leastEffectiveTraining: string[]
    recommendedDistribution: {
      zone1: number
      zone2: number
      zone3: number
      zone4: number
      zone5: number
    }
    methodology: string // e.g., "Based on 8 tests over 18 months"
  }
}

// ==================== CONTEXT FOR AI ====================

export interface PerformanceAnalysisContext {
  test: TestDataForAnalysis
  previousTests: TestDataForAnalysis[]
  trainingContext: TrainingContextForAnalysis | null
  athlete: AthleteProfileForAnalysis
  races: Array<{
    date: string
    distance: string
    time: string
    vdot: number | null
  }>
}

// ==================== API REQUEST/RESPONSE ====================

export interface AnalyzeTestRequest {
  testId: string
  includePredictions?: boolean
  includeRecommendations?: boolean
}

export interface CompareTestsRequest {
  currentTestId: string
  previousTestId: string
  includeTrainingCorrelation?: boolean
}

export interface TrendAnalysisRequest {
  clientId: string
  months?: number
  metrics?: string[]
}

export interface TrainingCorrelationRequest {
  clientId: string
  lookbackMonths?: number
}
