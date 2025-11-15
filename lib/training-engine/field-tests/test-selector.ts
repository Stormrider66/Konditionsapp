/**
 * Field Test Selection System
 *
 * Intelligent test selection based on athlete profile, available time,
 * equipment, and testing goals
 */

export interface AthleteTestProfile {
  level: 'BEGINNER' | 'RECREATIONAL' | 'ADVANCED' | 'ELITE'
  equipment: {
    hrMonitor: boolean
    gps: boolean
    track: boolean
    lactateMeter: boolean
  }
  location: 'TRACK' | 'ROAD' | 'TREADMILL'
  timeAvailable: number // minutes
  goals: string[] // 'precise_threshold', 'track_progress', 'race_prep'
  previousTests: string[] // History of completed tests
}

export interface TestRecommendation {
  primary: string
  secondary?: string
  rationale: string
  confidence: 'VERY_HIGH' | 'HIGH' | 'MEDIUM' | 'LOW'
  timeline?: string
  alternatives?: TestAlternative[]
}

export interface TestAlternative {
  test: string
  reason: string
  tradeoffs: string
}

/**
 * Select optimal field test based on athlete profile
 */
export function selectOptimalFieldTest(profile: AthleteTestProfile): TestRecommendation {
  const { level, equipment, location, timeAvailable, goals } = profile

  // Decision tree based on SKILL_ENHANCED_PART2.md Section 12.8

  // High precision threshold determination
  if (goals.includes('precise_threshold') && timeAvailable >= 30 && location === 'TRACK') {
    return {
      primary: '30-minute time trial',
      rationale: 'Gold standard for LT2 determination (r=0.96 with MLSS)',
      confidence: 'VERY_HIGH',
      alternatives: [
        {
          test: 'Critical Velocity test',
          reason: 'If time permits (3 trials over 7-10 days)',
          tradeoffs: "More time-intensive but provides additional insights (D')",
        },
      ],
    }
  }

  // Beginner without equipment
  if (level === 'BEGINNER' && !equipment.hrMonitor) {
    return {
      primary: 'Talk test',
      secondary: '5K race pace estimation',
      rationale: 'Accessible without equipment, validated against lab testing',
      confidence: 'MEDIUM',
      alternatives: [
        {
          test: 'Timed run test',
          reason: 'If GPS available',
          tradeoffs: 'Less precise but provides baseline',
        },
      ],
    }
  }

  // Heart rate monitor available with adequate time
  if (equipment.hrMonitor && timeAvailable >= 60) {
    return {
      primary: 'HR drift test for LT1',
      secondary: '20-minute TT for LT2',
      rationale: 'Comprehensive threshold mapping with equipment available',
      confidence: 'HIGH',
      timeline: 'Complete both tests within 1 week',
    }
  }

  // Road running with time constraints
  if (location === 'ROAD' && timeAvailable < 30) {
    return {
      primary: '20-minute TT',
      rationale: 'Practical for road runners with time constraints',
      confidence: 'HIGH',
      alternatives: [
        {
          test: 'Race-based estimation',
          reason: 'If recent 10K race available',
          tradeoffs: 'Less controlled but uses real performance data',
        },
      ],
    }
  }

  // Progress tracking with adequate time
  if (goals.includes('track_progress') && timeAvailable >= 90) {
    return {
      primary: 'Critical Velocity test (3 time trials)',
      rationale: 'Mathematical model provides detailed insights and progress tracking',
      confidence: 'VERY_HIGH',
      timeline: 'Spread over 7-10 days',
      alternatives: [
        {
          test: '30-minute TT',
          reason: 'If single-session test preferred',
          tradeoffs: 'Less detailed but faster to complete',
        },
      ],
    }
  }

  // Default recommendation
  return {
    primary: '20-minute TT + HR drift test',
    rationale: 'Balanced approach providing both LT2 and LT1 determination',
    confidence: 'HIGH',
    timeline: 'Complete within 1 week',
  }
}

/**
 * Generate comprehensive field testing protocol
 */
export function generateFieldTestingProtocol(
  recommendation: TestRecommendation,
  athleteProfile: AthleteTestProfile
): FieldTestProtocol {
  const protocol: FieldTestProtocol = {
    testName: recommendation.primary,
    preparation: getTestPreparation(recommendation.primary),
    execution: getTestExecution(recommendation.primary, athleteProfile),
    dataCollection: getDataRequirements(recommendation.primary),
    analysis: getAnalysisProtocol(recommendation.primary),
    validation: getValidationCriteria(recommendation.primary),
    retestGuidance: getRetestGuidance(recommendation.primary),
  }

  return protocol
}

export interface FieldTestProtocol {
  testName: string
  preparation: TestPreparation
  execution: TestExecution
  dataCollection: DataRequirements
  analysis: AnalysisProtocol
  validation: ValidationCriteria
  retestGuidance: RetestGuidance
}

export interface TestPreparation {
  timing: string
  warmup: string
  cooldown: string
  location: string
  weather: string
  equipment: string[]
}

export interface TestExecution {
  pacing: string
  effort: string
  monitoring: string
  target: string
}

export interface DataRequirements {
  required: string[]
  recommended: string[]
  analysis: string
}

export interface AnalysisProtocol {
  method: string
  calculations: string[]
  interpretation: string
}

export interface ValidationCriteria {
  goodTest: string
  invalidTest: string[]
  confidenceFactors: string[]
}

export interface RetestGuidance {
  frequency: string
  improvements: string[]
  progressTracking: string
}

function getTestPreparation(testName: string): TestPreparation {
  const preparations: { [key: string]: TestPreparation } = {
    '30-minute time trial': {
      timing: 'Mid-training week, after 1-2 rest days',
      warmup: '15-20 minutes easy + 4-6 strides with full recovery',
      cooldown: '10-15 minutes easy',
      location: 'Track (preferred) or flat, measured course',
      weather: 'Avoid extreme wind/heat if establishing baseline',
      equipment: ['GPS watch', 'Heart rate monitor (chest strap)', 'Water'],
    },
    '20-minute TT': {
      timing: 'Mid-training week, well-rested',
      warmup: '15 minutes easy + 3-4 strides',
      cooldown: '10 minutes easy',
      location: 'Track or flat road with accurate distance measurement',
      weather: 'Avoid extreme conditions',
      equipment: ['GPS watch', 'Heart rate monitor'],
    },
    'HR drift test': {
      timing: 'Beginning of training week, well-rested',
      warmup: '10 minutes very easy',
      cooldown: '5-10 minutes easy',
      location: 'Flat terrain, no hills',
      weather: 'Moderate conditions (15-20°C ideal)',
      equipment: ['Heart rate monitor (chest strap required)', 'GPS for pace consistency'],
    },
  }

  return (
    preparations[testName] ||
    preparations['20-minute TT']
  )
}

function getTestExecution(testName: string, profile: AthleteTestProfile): TestExecution {
  return {
    pacing: 'Start conservatively, aim for negative split',
    effort: 'Sustainable hard effort, not VO2max',
    monitoring: 'Track splits every 5 minutes',
    target: 'Maintain or slightly increase pace throughout',
  }
}

function getDataRequirements(testName: string): DataRequirements {
  return {
    required: ['Total distance', 'Total time', 'Heart rate data'],
    recommended: ['5-minute splits', 'Environmental conditions'],
    analysis: 'Use final 20 minutes for threshold determination',
  }
}

function getAnalysisProtocol(testName: string): AnalysisProtocol {
  return {
    method: 'Final 20-minute analysis',
    calculations: ['Average pace', 'Average HR', 'Pacing consistency'],
    interpretation: 'Final 20 min pace = LT2 approximation',
  }
}

function getValidationCriteria(testName: string): ValidationCriteria {
  return {
    goodTest: 'Even pace or negative split, stable HR',
    invalidTest: [
      'Started too fast (>30 sec/km fade)',
      'HR instability',
      'Environmental extremes',
    ],
    confidenceFactors: ['Pacing consistency', 'HR stability', 'Environmental conditions'],
  }
}

function getRetestGuidance(testName: string): RetestGuidance {
  return {
    frequency: 'Every 8-12 weeks to track progress',
    improvements: ['Better pacing strategy', 'Optimal conditions', 'Adequate recovery'],
    progressTracking: 'Compare threshold estimates over time',
  }
}
