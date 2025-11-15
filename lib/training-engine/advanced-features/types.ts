/**
 * Advanced Features - Shared Types
 *
 * TypeScript interfaces for all advanced feature modules
 */

// ============================================================================
// TARGET TIME ESTIMATION
// ============================================================================

export interface TargetTimeInput {
  distance: number;           // meters (5000, 10000, 21097.5, 42195)
  targetTime: number;         // seconds
  runnerLevel: 'BEGINNER' | 'RECREATIONAL' | 'ADVANCED' | 'ELITE';
  maxHR?: number;            // Optional for HR zone estimation
}

export interface PersonalBestInput {
  distance: number;
  time: number;              // seconds
  date: Date;
  conditions: 'EXCELLENT' | 'GOOD' | 'POOR';
}

export interface ImprovementGoal {
  targetTime: number;        // seconds
  targetDate: Date;
  weeksAvailable: number;
}

export interface ThresholdEstimate {
  method: 'TARGET_TIME_ONLY' | 'PB_WITH_IMPROVEMENT';
  confidence: 'LOW' | 'MEDIUM' | 'MEDIUM_HIGH' | 'HIGH';

  LT1: {
    pace: number;            // sec/km
    heartRate?: number;      // bpm (if maxHR provided)
    confidence: string;
  };

  LT2: {
    pace: number;
    heartRate?: number;
    confidence: string;
  };

  warnings: ValidationWarning[];
  validationProtocol: ValidationSchedule;
  conservatismAdjustments?: ConservatismSettings;
}

export interface ValidationWarning {
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'INFO';
  message: string;
  action: string;
  risk?: string;
}

export interface ValidationSchedule {
  week2?: ValidationTest;
  week4?: ValidationTest;
  week6?: ValidationTest;
  week8?: ValidationTest;
  week10?: ValidationTest;
  week12?: ValidationTest;
  finalWeek?: ValidationTest;
}

export interface ValidationTest {
  test: string;
  purpose: string;
  critical: boolean;
  expectedResult?: string;
  action_if_failed?: string;
}

export interface ConservatismSettings {
  note: string;
  LT1_upper: number;       // Reduced zone width
  LT2_upper: number;
  weeklyVolume: number;    // Start lower than standard
  progressionRate: number; // Slower progression
}

// ============================================================================
// ENVIRONMENTAL ADJUSTMENTS
// ============================================================================

export interface EnvironmentalConditions {
  temperature: number;      // Celsius
  humidity: number;         // Percentage
  windSpeed: number;        // km/h
  windDirection: 'HEADWIND' | 'TAILWIND' | 'CROSSWIND' | 'CALM';
  altitude: number;         // meters above sea level
  airPressure?: number;     // hPa
}

export interface EnvironmentalAdjustment {
  paceAdjustment: number;   // sec/km (positive = slower)
  hrAdjustment: number;     // bpm (positive = higher)
  performanceImpact: number; // % impact (positive = slower)
  warnings: string[];
  recommendations: string[];
}

// ============================================================================
// METHODOLOGY BLENDING
// ============================================================================

export type MethodologyType = 'LYDIARD' | 'NORWEGIAN' | 'CANOVA' | 'POLARIZED' | 'PYRAMIDAL';

export interface MethodologyTransition {
  fromMethodology: MethodologyType;
  toMethodology: MethodologyType;
  transitionType: 'SEQUENTIAL' | 'BLENDED' | 'HANDOFF';
  compatibility: 'HIGH' | 'MODERATE' | 'LOW';
  bridgeWeeks: number;
  prerequisites: string[];
  progressMarkers: string[];
}

export interface TransitionProtocol {
  week: number;
  volumeAdjustment: number;    // % change from previous week
  intensityDistribution: {
    zone1_2: number;           // % easy running
    zone3: number;             // % moderate
    zone4_5: number;           // % hard
  };
  qualityFocus: string;
  notes: string;
}

// ============================================================================
// RACE-DAY PROTOCOLS
// ============================================================================

export interface RaceDayProtocol {
  distance: string;
  warmup: WarmupProtocol;
  pacing: PacingStrategy;
  fueling: FuelingProtocol;
  mental: MentalStrategy;
  recovery: RecoveryProtocol;
}

export interface WarmupProtocol {
  duration: number;          // minutes
  structure: WarmupPhase[];
  distanceSpecific: string[];
  timing: string;           // "15-30 min before start"
}

export interface WarmupPhase {
  phase: string;
  duration: number;         // minutes
  intensity: string;
  purpose: string;
  paceGuidance: string;
}

export interface PacingStrategy {
  strategy: 'EVEN' | 'NEGATIVE_SPLIT' | 'POSITIVE_SPLIT' | 'VARIABLE';
  splits: PacingSplit[];
  contingencies: PacingContingency[];
}

export interface PacingSplit {
  segment: string;          // "0-5K", "5-10K", etc.
  targetPace: number;       // sec/km
  effort: string;           // "Controlled", "Steady", "Progressive"
  keyPoints: string[];
}

export interface PacingContingency {
  situation: string;
  action: string;
  riskAssessment: string;
}

export interface FuelingProtocol {
  preRace: {
    timing: string;
    carbohydrates: string;
    recommendations: string[];
  };
  duringRace: {
    strategy: string;
    rationale: string;
    hydration?: string;
  };
  postRace: {
    immediate: string;
    purpose: string;
  };
}

export interface MentalStrategy {
  strategy: 'ASSOCIATIVE' | 'DISSOCIATIVE' | 'MIXED';
  focus: string;
  techniques: string[];
  raceSpecific: string[];
}

export interface RecoveryProtocol {
  immediate: string[];
  firstWeek: string[];
  returnToTraining: string;
}

// ============================================================================
// MULTI-RACE PLANNING
// ============================================================================

export interface Race {
  name: string;
  date: Date;
  distance: string;
  classification: 'A' | 'B' | 'C';
  targetTime?: number;
}

export interface RaceClassification {
  classification: 'A' | 'B' | 'C';
  definition: string;
  characteristics: string[];
  frequency: string;
  spacing: string;
  examples: string[];
}

export interface SeasonPlan {
  totalWeeks: number;
  aRaces: Race[];
  bRaces: Race[];
  cRaces: Race[];
  trainingBlocks: TrainingBlock[];
  recoveryPeriods: RecoveryPeriod[];
  warnings: string[];
}

export interface TrainingBlock {
  startWeek: number;
  endWeek: number;
  startDate?: Date;
  endDate?: Date;
  targetRace: Race;
  phases: BlockPhase[];
  integratedRaces: Race[]; // B/C races within this block
}

export interface BlockPhase {
  phase: 'RECOVERY' | 'BASE' | 'BUILD' | 'PEAK' | 'TAPER';
  weeks: number;
  focus: string;
  volume: string;        // "50-70% of peak", "Progressive to 90%"
  intensity: string;     // "Easy only", "Add threshold work"
}

export interface RecoveryPeriod {
  afterRace: string;
  beforeRace: string;
  daysAvailable: number;
  daysNeeded: number;
  adequate: boolean;
  protocol: string[];
}

// ============================================================================
// RACE ACCEPTANCE
// ============================================================================

export interface RaceDecisionInput {
  proposedRace: Race;
  currentStatus: {
    daysSinceLastRace: number;
    ACWR: number;
    phaseGoals: string[];
    motivationLevel: 'low' | 'moderate' | 'high';
  };
  upcomingARace?: Race;
}

export interface RaceDecision {
  race: Race;
  factors: DecisionFactor[];
  finalRecommendation: 'SKIP_RACE' | 'LIKELY_SKIP' | 'ACCEPT_AS_TRAINING_RUN' | 'ACCEPT_WITH_TAPER';
  reasoning: string;
}

export interface DecisionFactor {
  factor: string;
  weight: 'LOW' | 'MEDIUM' | 'HIGH';
  recommendation: 'SKIP' | 'ACCEPT' | 'CONSIDER';
  reasoning: string;
}
