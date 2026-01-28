# Data Moat System Documentation

## Overview

The Data Moat System is a platform-wide strategic data infrastructure designed to create a sustainable competitive advantage through proprietary data assets. Unlike features that can be copied, data moats become more valuable over time and create network effects where each new user improves the platform for all users.

**Scope**: This system applies to ALL platform customers - from individual coaches to enterprise multi-tenant businesses. Every coach, athlete, and business contributes anonymized data that improves predictions, recommendations, and insights for everyone.

**Value Proposition**:
- Individual coaches benefit from patterns learned across thousands of athletes
- Enterprise businesses (like Star by Thomson) get industry benchmarks
- Athletes receive more accurate predictions as the dataset grows

---

## System Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                          DATA MOAT SYSTEM                              │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐              │
│   │   CAPTURE    │   │   PROCESS    │   │  INTELLIGENCE│              │
│   │   LAYER      │   │   LAYER      │   │    LAYER     │              │
│   └──────┬───────┘   └──────┬───────┘   └──────┬───────┘              │
│          │                  │                  │                       │
│          ▼                  ▼                  ▼                       │
│   ┌──────────────────────────────────────────────────────┐            │
│   │                    DATA STORE                         │            │
│   │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐    │            │
│   │  │Decisions│ │Predictions│ │Outcomes│ │Patterns │    │            │
│   │  └─────────┘ └─────────┘ └─────────┘ └─────────┘    │            │
│   └──────────────────────────────────────────────────────┘            │
│                              │                                         │
│                              ▼                                         │
│   ┌──────────────────────────────────────────────────────┐            │
│   │                   VALUE DELIVERY                      │            │
│   │  • Accuracy Proof    • Recommendations   • Benchmarks │            │
│   └──────────────────────────────────────────────────────┘            │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Core Components

### 1. Coach Decision Tracking System

#### Purpose
Capture the expertise of coaches when they modify AI suggestions, creating a feedback loop that makes AI smarter over time.

#### How It Works

```
┌─────────────────────────────────────────────────────────────┐
│                  COACH DECISION FLOW                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   AI Generates Suggestion                                   │
│          │                                                  │
│          ▼                                                  │
│   ┌─────────────────┐                                       │
│   │ Coach Reviews   │                                       │
│   └────────┬────────┘                                       │
│            │                                                │
│      ┌─────┴─────┐                                          │
│      ▼           ▼                                          │
│   Accepts    Modifies                                       │
│      │           │                                          │
│      │     ┌─────┴─────┐                                    │
│      │     │  Capture  │                                    │
│      │     │  Decision │                                    │
│      │     └─────┬─────┘                                    │
│      │           │                                          │
│      │     ┌─────┴─────────────────┐                        │
│      │     │ • What was changed    │                        │
│      │     │ • Why (category)      │                        │
│      │     │ • Context (HRV, etc.) │                        │
│      │     │ • Confidence level    │                        │
│      │     └───────────────────────┘                        │
│      │           │                                          │
│      ▼           ▼                                          │
│   ┌─────────────────────┐                                   │
│   │   Track Outcome     │                                   │
│   │   (was it better?)  │                                   │
│   └─────────────────────┘                                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Data Model

```typescript
interface CoachDecision {
  id: string;

  // Context
  coachId: string;
  athleteId: string;
  timestamp: Date;

  // Original AI suggestion
  aiSuggestionType: "workout" | "zone" | "program" | "recovery" | "load";
  aiSuggestionData: JSON; // Full AI suggestion
  aiConfidence: number;   // AI's confidence in suggestion

  // Modification
  modificationData: JSON;        // What coach changed to
  modificationMagnitude: number; // How different (0-1 scale)

  // Reasoning
  reasonCategory: DecisionReason;
  reasonNotes?: string;
  coachConfidence: number; // Coach's confidence in change

  // Athlete context at decision time
  athleteContext: {
    hrvScore?: number;
    sleepScore?: number;
    fatigueLevel?: number;
    stressLevel?: number;
    recentTrainingLoad: number;
    daysUntilEvent?: number;
    injuryStatus?: string;
  };

  // Outcome tracking (filled later)
  outcomeId?: string;
  outcomeAssessment?: "better" | "same" | "worse" | "unknown";

  // Quality
  validated: boolean;
  usedForTraining: boolean; // Used to improve AI
}

enum DecisionReason {
  ATHLETE_FEEDBACK = "ATHLETE_FEEDBACK",
  FATIGUE_OBSERVED = "FATIGUE_OBSERVED",
  HRV_LOW = "HRV_LOW",
  SLEEP_POOR = "SLEEP_POOR",
  INJURY_CONCERN = "INJURY_CONCERN",
  SCHEDULE_CONFLICT = "SCHEDULE_CONFLICT",
  PROGRESSION_ADJUSTMENT = "PROGRESSION_ADJUSTMENT",
  WEATHER_CONDITIONS = "WEATHER_CONDITIONS",
  EQUIPMENT_UNAVAILABLE = "EQUIPMENT_UNAVAILABLE",
  COACH_INTUITION = "COACH_INTUITION",
  ATHLETE_PREFERENCE = "ATHLETE_PREFERENCE",
  TECHNIQUE_FOCUS = "TECHNIQUE_FOCUS",
  MENTAL_FRESHNESS = "MENTAL_FRESHNESS",
  OTHER = "OTHER"
}
```

#### Usage Examples

**Example 1: Workout Modification**
```typescript
// AI suggests 5x1000m @ Zone 4
const aiSuggestion = {
  type: "interval_workout",
  intervals: { count: 5, distance: 1000, zone: 4 },
  totalLoad: 85
};

// Coach modifies to 4x1000m @ Zone 3
const coachDecision: CoachDecision = {
  aiSuggestionData: aiSuggestion,
  modificationData: {
    type: "interval_workout",
    intervals: { count: 4, distance: 1000, zone: 3 },
    totalLoad: 65
  },
  reasonCategory: DecisionReason.HRV_LOW,
  reasonNotes: "HRV dropped 15% overnight, reducing intensity",
  athleteContext: {
    hrvScore: 42, // normally 55
    sleepScore: 68,
    fatigueLevel: 7
  }
};
```

**Example 2: Zone Override**
```typescript
// AI calculates LT2 @ 310W
const aiZone = { lt2Power: 310, confidence: 0.85 };

// Coach sets LT2 @ 295W
const coachDecision: CoachDecision = {
  aiSuggestionType: "zone",
  aiSuggestionData: aiZone,
  modificationData: { lt2Power: 295 },
  reasonCategory: DecisionReason.COACH_INTUITION,
  reasonNotes: "Athlete struggles at calculated zones, historically needs 5% lower",
  coachConfidence: 0.9
};
```

#### Analytics Generated

From collected decisions, the system generates:

1. **Override Rate by Category**
   - "Coaches override AI zone calculations 23% of the time"
   - "HRV-related modifications are 3x more common than other reasons"

2. **Outcome Analysis**
   - "Coach modifications led to better outcomes 67% of the time"
   - "AI suggestions were optimal 78% when athlete context was normal"

3. **Pattern Detection**
   - "Elite coaches reduce volume 2 weeks before races more than AI suggests"
   - "For athletes over 45, coaches add 20% more recovery time"

---

### 2. Prediction Tracking System

#### Purpose
Log every AI prediction with enough context to validate accuracy later, enabling continuous improvement and credibility.

#### How It Works

```
┌─────────────────────────────────────────────────────────────┐
│                 PREDICTION LIFECYCLE                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌─────────────────┐                                       │
│   │  AI Makes       │                                       │
│   │  Prediction     │                                       │
│   └────────┬────────┘                                       │
│            │                                                │
│            ▼                                                │
│   ┌─────────────────────────────────────────┐               │
│   │  PREDICTION LOG                         │               │
│   │  • Prediction type & value              │               │
│   │  • Confidence interval                  │               │
│   │  • Model version                        │               │
│   │  • Input data snapshot                  │               │
│   │  • Timestamp                            │               │
│   └────────┬────────────────────────────────┘               │
│            │                                                │
│            │         Time passes...                         │
│            │                                                │
│            ▼                                                │
│   ┌─────────────────┐                                       │
│   │  Outcome        │   ← Race result, test, performance    │
│   │  Occurs         │                                       │
│   └────────┬────────┘                                       │
│            │                                                │
│            ▼                                                │
│   ┌─────────────────────────────────────────┐               │
│   │  VALIDATION RECORD                      │               │
│   │  • Actual outcome value                 │               │
│   │  • Error calculation                    │               │
│   │  • Environmental factors                │               │
│   │  • Validation quality score             │               │
│   └────────┬────────────────────────────────┘               │
│            │                                                │
│            ▼                                                │
│   ┌─────────────────────────────────────────┐               │
│   │  ACCURACY METRICS                       │               │
│   │  • Mean absolute error                  │               │
│   │  • Calibration score                    │               │
│   │  • Segment-specific accuracy            │               │
│   └─────────────────────────────────────────┘               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Data Model

```typescript
interface AIPrediction {
  id: string;

  // Prediction details
  predictionType: PredictionType;
  predictedValue: number | string | JSON;
  confidenceScore: number;         // 0-1
  confidenceInterval?: {
    lower: number;
    upper: number;
  };

  // Model info
  modelVersion: string;
  modelParameters: JSON;

  // Input snapshot (for reproducibility)
  inputDataSnapshot: {
    athleteMetrics: JSON;
    trainingHistory: JSON;
    relevantTests: JSON;
  };

  // Context
  athleteId: string;
  coachId?: string;
  createdAt: Date;
  validUntil?: Date; // Prediction has expiry

  // Validation (filled later)
  validationId?: string;
  validated: boolean;

  // Usage
  displayedToUser: boolean;
  userAction?: "accepted" | "ignored" | "modified";
}

enum PredictionType {
  RACE_TIME = "RACE_TIME",
  THRESHOLD_POWER = "THRESHOLD_POWER",
  THRESHOLD_PACE = "THRESHOLD_PACE",
  VO2MAX_ESTIMATE = "VO2MAX_ESTIMATE",
  INJURY_RISK = "INJURY_RISK",
  READINESS_SCORE = "READINESS_SCORE",
  RECOVERY_TIME = "RECOVERY_TIME",
  IMPROVEMENT_RATE = "IMPROVEMENT_RATE",
  PEAK_TIMING = "PEAK_TIMING",
  OPTIMAL_TAPER = "OPTIMAL_TAPER"
}

interface PredictionValidation {
  id: string;
  predictionId: string;

  // Actual outcome
  actualValue: number | string | JSON;
  occurredAt: Date;

  // Error metrics
  absoluteError: number;
  percentageError: number;
  withinConfidenceInterval: boolean;

  // Context that may explain error
  environmentalFactors: {
    weather?: string;
    altitude?: number;
    illness?: boolean;
    courseType?: string;
  };

  // Validation quality
  validationSource: "auto_import" | "manual_entry" | "device_sync";
  validationQuality: number; // 0-1, how reliable is this validation

  // Analysis
  errorExplanation?: string;
  usedForRetraining: boolean;
}
```

#### Prediction Types & Validation Sources

| Prediction Type | Validation Source | Auto-Link Method |
|-----------------|-------------------|------------------|
| Race Time | Race results | Strava race detection, manual entry |
| Threshold Power | Next FTP test | Ergometer tests, ramp tests |
| Threshold Pace | Next lactate test | Lactate test results |
| VO2max Estimate | Lab VO2max test | Test records |
| Injury Risk | Injury records | Injury log entries |
| Readiness Score | Workout performance | RPE vs planned, completion rate |
| Recovery Time | Next quality session | Training log analysis |
| Improvement Rate | Season comparison | Before/after metrics |
| Peak Timing | Race performance | Race results quality |

#### Accuracy Calculations

```typescript
interface AccuracyMetrics {
  predictionType: PredictionType;
  timeRange: { start: Date; end: Date };

  // Core metrics
  sampleSize: number;
  meanAbsoluteError: number;
  meanPercentageError: number;
  rootMeanSquareError: number;

  // Calibration
  calibrationScore: number; // How well confidence matches accuracy
  confidenceIntervalCoverage: number; // % actually within CI

  // Segmentation
  byAthleteLevel: Record<string, AccuracyMetrics>;
  byTimeHorizon: Record<string, AccuracyMetrics>;
  bySport: Record<string, AccuracyMetrics>;

  // Trends
  accuracyTrend: "improving" | "stable" | "declining";
  lastUpdated: Date;
}
```

---

### 3. Training-Performance Correlation System

#### Purpose
Measure which training approaches actually lead to performance improvements, creating evidence-based recommendations.

#### How It Works

```
┌─────────────────────────────────────────────────────────────┐
│              TRAINING-PERFORMANCE CORRELATION               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   TRAINING PERIOD                                           │
│   ┌─────────────────────────────────────────────────┐       │
│   │  Week 1  │  Week 2  │  ...  │  Week 12  │       │       │
│   │  ████    │  ████    │       │  ████     │       │       │
│   └─────────────────────────────────────────────────┘       │
│                         │                                   │
│                         ▼                                   │
│   TRAINING FINGERPRINT                                      │
│   ┌─────────────────────────────────────────────────┐       │
│   │  Zone Distribution: Z1:65% Z2:20% Z3:5% Z4:8%   │       │
│   │  Weekly Volume: 10.5 hrs                        │       │
│   │  Long Sessions: 25%                             │       │
│   │  Interval Sessions: 2.3/week                    │       │
│   │  Strength Sessions: 1.5/week                    │       │
│   │  Rest Days: 1.2/week                            │       │
│   │  Build:Recovery Ratio: 3:1                      │       │
│   │  Compliance: 87%                                │       │
│   └─────────────────────────────────────────────────┘       │
│                         │                                   │
│                         ▼                                   │
│   OUTCOME                                                   │
│   ┌─────────────────────────────────────────────────┐       │
│   │  Goal: Marathon < 3:30                          │       │
│   │  Result: 3:24:33 ✓                              │       │
│   │  Improvement: 8.2%                              │       │
│   │  Satisfaction: 5/5                              │       │
│   └─────────────────────────────────────────────────┘       │
│                         │                                   │
│                         ▼                                   │
│   CORRELATION STORED                                        │
│   ┌─────────────────────────────────────────────────┐       │
│   │  Fingerprint + Athlete Profile → Outcome        │       │
│   │  Added to pattern library                       │       │
│   └─────────────────────────────────────────────────┘       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Data Model

```typescript
interface TrainingFingerprint {
  id: string;
  trainingPeriodId: string;
  athleteId: string;

  // Time period
  startDate: Date;
  endDate: Date;
  durationWeeks: number;

  // Volume metrics
  totalVolume: number;           // hours or km
  weeklyVolumeAvg: number;
  weeklyVolumeStdDev: number;
  volumeProgression: number;     // % increase over period

  // Intensity distribution
  zoneDistribution: {
    zone1: number;  // % time
    zone2: number;
    zone3: number;
    zone4: number;
    zone5: number;
  };
  intensityScore: number;        // Weighted intensity
  polarizationIndex: number;     // How polarized (0-1)

  // Session characteristics
  longSessionRatio: number;      // % volume in long sessions
  intervalSessionsPerWeek: number;
  strengthSessionsPerWeek: number;
  restDaysPerWeek: number;
  doubleSessionDays: number;

  // Periodization
  buildRecoveryRatio: string;    // "3:1", "2:1", etc
  peakWeekNumber: number;        // Highest load week
  taperLength: number;           // Days
  taperReduction: number;        // % volume reduction

  // Compliance & quality
  plannedVsActual: number;       // Compliance %
  missedSessionsCount: number;
  modifiedSessionsCount: number;

  // Recovery indicators
  avgHRV: number;
  hrvTrend: number;              // Change over period
  avgSleepScore: number;
  reportedFatigueAvg: number;

  // Context
  athleteProfile: {
    age: number;
    trainingAge: number;
    baselineFitness: number;
    previousBestPerformance?: number;
  };

  generatedAt: Date;
}

interface TrainingPeriodOutcome {
  id: string;
  trainingFingerprintId: string;
  athleteId: string;

  // Goals
  primaryGoal: {
    type: "race_time" | "threshold" | "body_comp" | "strength" | "general";
    targetValue: number | string;
    targetDate: Date;
  };
  secondaryGoals?: Array<{ type: string; target: any }>;

  // Results
  primaryOutcome: {
    achievedValue: number | string;
    achievedDate: Date;
    achievement: "exceeded" | "met" | "missed" | "abandoned";
    percentageOfGoal: number;
  };
  secondaryOutcomes?: Array<{ type: string; result: any }>;

  // Improvement metrics
  improvementFromBaseline: number;  // %
  improvementVsExpected: number;    // vs model prediction

  // Quality metrics
  injuryDuringPeriod: boolean;
  illnessDuringPeriod: boolean;
  majorLifeStress: boolean;

  // Assessment
  coachAssessment?: {
    overallRating: 1 | 2 | 3 | 4 | 5;
    whatWorked: string[];
    whatDidnt: string[];
    wouldRepeat: boolean;
  };
  athleteAssessment?: {
    satisfactionRating: 1 | 2 | 3 | 4 | 5;
    perceivedEffort: 1 | 2 | 3 | 4 | 5;
    wouldRepeat: boolean;
  };

  // For correlation analysis
  correlationFactors: {
    mostInfluentialPositive: string[];
    mostInfluentialNegative: string[];
    unexplainedVariance: number;
  };

  validatedAt: Date;
  usedForPatternDetection: boolean;
}
```

#### Correlation Analysis

```typescript
interface TrainingCorrelation {
  // Identifies which training characteristics correlate with outcomes
  characteristic: string;  // e.g., "zone1Percentage", "taperLength"

  // Statistical measures
  correlationCoefficient: number;  // -1 to 1
  pValue: number;                  // Statistical significance
  effectSize: number;              // Practical significance
  sampleSize: number;

  // Segmentation
  athleteSegment?: string;         // "age40+", "beginner", etc
  goalType?: string;               // "marathon", "10K", etc

  // Interpretation
  direction: "positive" | "negative";
  interpretation: string;
  confidence: "high" | "medium" | "low";

  // Example
  // "For marathon runners age 40+, increasing zone 1 volume from 60% to 75%
  //  correlated with 4.2% faster race times (r=0.67, p<0.01, n=234)"
}
```

---

### 4. Cross-Athlete Benchmarking System

#### Purpose
Enable "athletes like you" comparisons without exposing individual data.

#### How It Works

```
┌─────────────────────────────────────────────────────────────┐
│                 BENCHMARKING SYSTEM                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   INDIVIDUAL ATHLETE                                        │
│   ┌─────────────────────────────────────────────────┐       │
│   │  Age: 42   Sport: Running   Level: Intermediate │       │
│   │  VO2max: 48   Weekly Hours: 8   Goal: Marathon  │       │
│   └─────────────────────────────────────────────────┘       │
│                         │                                   │
│                         ▼                                   │
│   COHORT MATCHING                                           │
│   ┌─────────────────────────────────────────────────┐       │
│   │  Find athletes with similar:                    │       │
│   │  • Age range (40-45)                            │       │
│   │  • Sport (running)                              │       │
│   │  • Experience level (intermediate)              │       │
│   │  • Training volume (6-10 hrs/week)              │       │
│   │  • Goal type (marathon)                         │       │
│   └─────────────────────────────────────────────────┘       │
│                         │                                   │
│                         ▼                                   │
│   AGGREGATED BENCHMARKS (n=487 athletes)                    │
│   ┌─────────────────────────────────────────────────┐       │
│   │  Metric          │  You   │ Avg   │ %ile │ Top  │       │
│   │  ─────────────────────────────────────────────  │       │
│   │  VO2max          │  48    │ 46    │ 62%  │ 58   │       │
│   │  Weekly volume   │  8h    │ 9.2h  │ 38%  │ 14h  │       │
│   │  Zone 1 %        │  58%   │ 68%   │ 25%  │ 82%  │       │
│   │  Marathon time   │  3:45  │ 3:52  │ 58%  │ 3:12 │       │
│   │  Improvement/yr  │  4%    │ 3.2%  │ 71%  │ 8%   │       │
│   └─────────────────────────────────────────────────┘       │
│                         │                                   │
│                         ▼                                   │
│   RECOMMENDATIONS                                           │
│   ┌─────────────────────────────────────────────────┐       │
│   │  "Athletes in your cohort who improved >5%      │       │
│   │   typically trained 10+ hours/week with 70%+    │       │
│   │   in Zone 1. Consider adding 2 hours of easy    │       │
│   │   running per week."                            │       │
│   └─────────────────────────────────────────────────┘       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Data Model

```typescript
interface AthleteCohort {
  id: string;

  // Definition
  name: string;  // "Marathon runners, 40-50, intermediate"
  criteria: {
    sport: SportType;
    ageRange: [number, number];
    experienceLevel: string;
    weeklyVolumeRange: [number, number];
    goalType?: string;
    gender?: string;
  };

  // Population
  athleteCount: number;
  activeInLast90Days: number;

  // Aggregated metrics (anonymized)
  metrics: {
    vo2max: DistributionStats;
    threshold: DistributionStats;
    weeklyVolume: DistributionStats;
    zoneDistribution: Record<string, DistributionStats>;
    improvementRate: DistributionStats;
    injuryRate: DistributionStats;
    // ... more metrics
  };

  // Patterns observed in this cohort
  commonPatterns: string[];  // IDs of PerformancePatterns

  // Quality
  lastUpdated: Date;
  confidenceLevel: "high" | "medium" | "low";
  minimumSampleMet: boolean;
}

interface DistributionStats {
  mean: number;
  median: number;
  stdDev: number;
  percentiles: {
    p10: number;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
  };
  min: number;
  max: number;
  sampleSize: number;
}

interface BenchmarkComparison {
  id: string;
  athleteId: string;
  cohortId: string;

  // Comparisons
  comparisons: Array<{
    metric: string;
    athleteValue: number;
    cohortPercentile: number;
    cohortAverage: number;
    cohortTop10: number;
    interpretation: string;
    recommendation?: string;
  }>;

  // Summary
  overallAssessment: string;
  strengths: string[];
  improvementAreas: string[];

  generatedAt: Date;
}
```

---

### 5. Performance Pattern Library

#### Purpose
Identify and codify patterns that predict success, creating a knowledge base that improves recommendations.

#### How It Works

```
┌─────────────────────────────────────────────────────────────┐
│               PATTERN DETECTION & APPLICATION               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   PATTERN DETECTION (Batch Process)                         │
│   ┌─────────────────────────────────────────────────┐       │
│   │  Analyze 1000s of training periods + outcomes   │       │
│   │                    ↓                            │       │
│   │  Statistical analysis finds correlations        │       │
│   │                    ↓                            │       │
│   │  Validate patterns hold across segments         │       │
│   │                    ↓                            │       │
│   │  Add to Pattern Library                         │       │
│   └─────────────────────────────────────────────────┘       │
│                                                             │
│   PATTERN LIBRARY                                           │
│   ┌─────────────────────────────────────────────────┐       │
│   │  Pattern: "High Z1 Responder"                   │       │
│   │  ────────────────────────────────               │       │
│   │  Criteria: Zone1 >75%, consistent schedule      │       │
│   │  Outcome: 14% better improvement rate           │       │
│   │  Applies to: Endurance athletes, age 35+        │       │
│   │  Confidence: High (n=342, p<0.001)              │       │
│   │  ───────────────────────────────────────────    │       │
│   │                                                 │       │
│   │  Pattern: "Recovery Sensitive"                  │       │
│   │  ────────────────────────────────               │       │
│   │  Criteria: HRV variability >15%, performance    │       │
│   │            drops after high load weeks          │       │
│   │  Recommendation: Add extra recovery day         │       │
│   │  Outcome: 40% fewer overtraining incidents      │       │
│   │  Confidence: Medium (n=156, p<0.01)             │       │
│   └─────────────────────────────────────────────────┘       │
│                         │                                   │
│                         ▼                                   │
│   PATTERN MATCHING (Real-time)                              │
│   ┌─────────────────────────────────────────────────┐       │
│   │  New athlete joins / data updated               │       │
│   │                    ↓                            │       │
│   │  Match against pattern criteria                 │       │
│   │                    ↓                            │       │
│   │  Generate personalized recommendations          │       │
│   └─────────────────────────────────────────────────┘       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Data Model

```typescript
interface PerformancePattern {
  id: string;

  // Identity
  name: string;
  description: string;
  category: "training" | "recovery" | "periodization" | "nutrition" | "lifestyle";

  // Detection criteria
  criteria: {
    // Conditions that identify this pattern
    conditions: Array<{
      metric: string;
      operator: ">" | "<" | "=" | "between" | "includes";
      value: any;
    }>;
    minimumDataPoints: number;
    timeframeDays: number;
  };

  // Evidence
  statistics: {
    sampleSize: number;
    effectSize: number;
    pValue: number;
    confidenceInterval: [number, number];
    lastValidated: Date;
  };

  // Applicability
  applicableTo: {
    sports?: SportType[];
    ageRanges?: Array<[number, number]>;
    experienceLevels?: string[];
    goalTypes?: string[];
    excludeIf?: string[];  // Conditions that invalidate pattern
  };

  // Outcome
  expectedOutcome: {
    metric: string;
    improvement: number;  // % or absolute
    timeframe: string;
  };

  // Recommendation
  recommendation: {
    summary: string;
    actionItems: string[];
    contraindications?: string[];
  };

  // Metadata
  discoveredAt: Date;
  lastUpdated: Date;
  status: "experimental" | "validated" | "deprecated";
  usageCount: number;  // How often applied
  successRate: number; // When applied, how often successful
}

interface AthletePatternMatch {
  id: string;
  athleteId: string;
  patternId: string;

  // Match details
  matchScore: number;      // How well athlete matches pattern (0-1)
  matchedCriteria: string[];
  unmatchedCriteria: string[];

  // Application
  recommendationShown: boolean;
  recommendationApplied: boolean;
  appliedAt?: Date;

  // Outcome tracking
  outcomeTracked: boolean;
  outcomeSuccess?: boolean;
  outcomeNotes?: string;

  generatedAt: Date;
}
```

#### Example Patterns

```typescript
const examplePatterns: PerformancePattern[] = [
  {
    name: "Polarized Training Responder",
    description: "Athletes who respond exceptionally well to polarized (80/20) training distribution",
    criteria: {
      conditions: [
        { metric: "zone1Percentage", operator: ">", value: 75 },
        { metric: "zone4PlusPercentage", operator: ">", value: 15 },
        { metric: "zone3Percentage", operator: "<", value: 10 },
        { metric: "consistencyScore", operator: ">", value: 0.8 }
      ],
      minimumDataPoints: 60,
      timeframeDays: 90
    },
    statistics: {
      sampleSize: 423,
      effectSize: 0.72,
      pValue: 0.0003,
      confidenceInterval: [0.58, 0.86]
    },
    applicableTo: {
      sports: ["RUNNING", "CYCLING", "TRIATHLON"],
      ageRanges: [[30, 65]],
      experienceLevels: ["intermediate", "advanced"]
    },
    expectedOutcome: {
      metric: "thresholdPower",
      improvement: 8.5,
      timeframe: "12 weeks"
    },
    recommendation: {
      summary: "Increase easy training volume while maintaining intensity of hard sessions",
      actionItems: [
        "Keep 75-80% of training time in Zone 1",
        "Limit Zone 3 'grey zone' work to <10%",
        "Ensure hard sessions are truly hard (Zone 4+)",
        "Add one long easy session per week"
      ]
    }
  },
  {
    name: "Sleep-Sensitive Performer",
    description: "Athletes whose performance is highly correlated with sleep quality",
    criteria: {
      conditions: [
        { metric: "sleepPerformanceCorrelation", operator: ">", value: 0.6 },
        { metric: "avgSleepScore", operator: "<", value: 75 }
      ],
      minimumDataPoints: 30,
      timeframeDays: 60
    },
    expectedOutcome: {
      metric: "consistentPerformance",
      improvement: 23,
      timeframe: "4 weeks"
    },
    recommendation: {
      summary: "Prioritize sleep optimization before increasing training load",
      actionItems: [
        "Target 8+ hours sleep opportunity",
        "Reduce training on nights after poor sleep",
        "Consider sleep tracking if not already"
      ]
    }
  }
];
```

---

### 6. AI Feedback Loop System

#### Purpose
Use collected data to continuously improve AI recommendations, creating a system that gets smarter with every interaction.

#### How It Works

```
┌─────────────────────────────────────────────────────────────┐
│                    AI FEEDBACK LOOP                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌──────────────┐                                          │
│   │ AI Model v1  │                                          │
│   └──────┬───────┘                                          │
│          │                                                  │
│          ▼                                                  │
│   ┌──────────────┐      ┌──────────────┐                    │
│   │ Predictions  │ ──── │ Decisions    │                    │
│   │ Made         │      │ Tracked      │                    │
│   └──────┬───────┘      └──────┬───────┘                    │
│          │                     │                            │
│          └──────────┬──────────┘                            │
│                     ▼                                       │
│          ┌──────────────────────┐                           │
│          │  Outcomes Measured   │                           │
│          └──────────┬───────────┘                           │
│                     │                                       │
│                     ▼                                       │
│          ┌──────────────────────┐                           │
│          │  Analysis:           │                           │
│          │  • Where AI wrong?   │                           │
│          │  • Where coach right?│                           │
│          │  • New patterns?     │                           │
│          └──────────┬───────────┘                           │
│                     │                                       │
│                     ▼                                       │
│          ┌──────────────────────┐                           │
│          │  Update AI Prompts/  │                           │
│          │  Rules/Weights       │                           │
│          └──────────┬───────────┘                           │
│                     │                                       │
│                     ▼                                       │
│   ┌──────────────┐                                          │
│   │ AI Model v2  │  ← Better than v1                        │
│   └──────────────┘                                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Data Model

```typescript
interface AIFeedbackEntry {
  id: string;

  // Source
  sourceType: "prediction" | "decision" | "pattern";
  sourceId: string;

  // Lesson
  lesson: {
    situation: string;      // When this situation occurs
    aiAction: string;       // What AI did/suggested
    betterAction: string;   // What would have been better
    evidence: string;       // How we know it's better
  };

  // Impact
  promptAdjustment?: string;   // How to update prompts
  ruleAdjustment?: string;     // How to update rules
  weightAdjustment?: Record<string, number>;

  // Validation
  confidenceLevel: "high" | "medium" | "low";
  sampleSize: number;
  appliedToModel: boolean;
  appliedAt?: Date;

  createdAt: Date;
}

interface AIModelVersion {
  id: string;
  version: string;

  // Configuration
  baseModel: string;           // "claude-3-opus", etc
  systemPrompt: string;
  rules: JSON;
  weights: JSON;

  // Training data
  feedbackEntriesApplied: string[];  // IDs
  trainingDataCutoff: Date;

  // Performance
  accuracyMetrics: {
    predictionAccuracy: number;
    coachAgreementRate: number;
    outcomeImprovement: number;
  };

  // A/B Testing
  trafficAllocation: number;    // % of requests
  comparisonVersion?: string;   // Version being compared to

  // Status
  status: "testing" | "active" | "deprecated";
  deployedAt?: Date;
  deprecatedAt?: Date;
}
```

---

## Data Privacy & Security

### Anonymization Rules

1. **Cross-athlete analytics** never expose individual data
2. **Cohort minimums**: Require n>30 before showing cohort stats
3. **Pattern confidence**: Only surface patterns with n>100
4. **No re-identification**: Remove any combination of fields that could identify individuals

### Consent Management

```typescript
interface DataConsentSettings {
  athleteId: string;

  // Consent levels
  anonymizedBenchmarking: boolean;    // Include in cohort stats
  patternContribution: boolean;       // Use data for pattern detection
  predictionValidation: boolean;      // Track prediction accuracy
  coachDecisionSharing: boolean;      // Share coach decisions (anonymized)

  // Opt-outs
  excludeFromResearch: boolean;
  excludeFromPublicStats: boolean;

  updatedAt: Date;
  consentVersion: string;
}
```

### Data Retention

| Data Type | Retention | Anonymization |
|-----------|-----------|---------------|
| Individual predictions | 2 years | After validation |
| Coach decisions | 3 years | Never (coach-specific) |
| Training fingerprints | 5 years | After 1 year |
| Aggregated patterns | Indefinite | Always anonymized |
| Cohort statistics | Indefinite | Always anonymized |

---

## API Reference

### Coach Decisions API

```typescript
// Create decision record
POST /api/coach-decisions
Body: {
  aiSuggestionType: string;
  aiSuggestionData: JSON;
  modificationData: JSON;
  reasonCategory: DecisionReason;
  reasonNotes?: string;
  athleteId: string;
}
Response: { id: string; ... }

// Get decision analytics
GET /api/coach-decisions/analytics
Query: { coachId?, athleteId?, dateRange?, reasonCategory? }
Response: {
  totalDecisions: number;
  overrideRate: number;
  byReason: Record<string, number>;
  outcomeComparison: { aiWins: number; coachWins: number; tie: number };
}
```

### Predictions API

```typescript
// Log prediction
POST /api/predictions
Body: {
  predictionType: PredictionType;
  predictedValue: any;
  confidenceScore: number;
  confidenceInterval?: { lower: number; upper: number };
  athleteId: string;
  modelVersion: string;
  inputDataSnapshot: JSON;
}
Response: { id: string; ... }

// Validate prediction
POST /api/predictions/:id/validate
Body: {
  actualValue: any;
  occurredAt: Date;
  environmentalFactors?: JSON;
  validationSource: string;
}
Response: { validation: PredictionValidation; }

// Get accuracy metrics
GET /api/predictions/accuracy
Query: { predictionType?, athleteSegment?, dateRange? }
Response: AccuracyMetrics
```

### Benchmarks API

```typescript
// Get cohort comparison
GET /api/benchmarks/cohort/:athleteId
Response: BenchmarkComparison

// Get applicable patterns
GET /api/benchmarks/patterns/:athleteId
Response: { patterns: AthletePatternMatch[]; }
```

### Public Accuracy API

```typescript
// Get public accuracy stats
GET /api/accuracy/public
Response: {
  racePredictionAccuracy: { meanError: string; sampleSize: number; };
  thresholdAccuracy: { meanError: string; sampleSize: number; };
  programSuccessRate: { rate: string; sampleSize: number; };
  lastUpdated: Date;
}
```

---

## Glossary

| Term | Definition |
|------|------------|
| **Coach Decision** | A recorded instance of a coach modifying an AI suggestion |
| **Training Fingerprint** | A standardized summary of training characteristics for a period |
| **Cohort** | A group of similar athletes used for anonymized benchmarking |
| **Performance Pattern** | A validated relationship between training inputs and outcomes |
| **Prediction Validation** | Linking an AI prediction to its actual outcome |
| **Feedback Loop** | The process of using outcomes to improve AI |

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-22 | System | Initial documentation |

