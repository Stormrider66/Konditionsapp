# Data Moat Implementation Plan

## Executive Summary

This document outlines the phased implementation plan for building the platform's proprietary data moat - a defensible competitive advantage based on unique data assets that improve with every user and cannot be easily replicated by competitors.

**Important**: This system is platform-wide and applies to ALL customers (individual coaches, teams, and enterprise businesses like Star by Thomson). The value increases as more users contribute data, creating network effects that benefit everyone.

**Timeline**: 12 weeks (3 months)
**Goal**: Transform from feature-based competition to data-based competitive advantage

---

## Strategic Objectives

| Objective | Success Metric | Target |
|-----------|---------------|--------|
| Track coach decisions | Decision capture rate | >80% of AI modifications |
| Validate predictions | Predictions with outcomes | >60% linked |
| Measure training effectiveness | Training periods with outcomes | >50% tracked |
| Build cross-athlete intelligence | Pattern confidence | n>100 per pattern |
| Prove platform value | Published accuracy stats | <5% prediction error |

---

## Phase 1: Decision & Prediction Tracking (Weeks 1-4)

### 1.1 Coach Decision Capture System

**Objective**: Capture every modification coaches make to AI suggestions with structured reasoning.

#### Database Models
```
CoachDecision
├── Original AI suggestion
├── Coach modification
├── Reasoning category + notes
├── Athlete context (HRV, fatigue, etc.)
├── Outcome tracking link
└── Quality score (validated?)
```

#### Implementation Tasks

| Task | Priority | Effort | Owner |
|------|----------|--------|-------|
| Add `CoachDecision` model to Prisma schema | P0 | 2h | Backend |
| Create `/api/coach-decisions` CRUD endpoints | P0 | 4h | Backend |
| Build decision capture modal component | P0 | 6h | Frontend |
| Integrate modal into workout edit flow | P0 | 4h | Frontend |
| Add decision analytics dashboard | P1 | 8h | Full-stack |
| Backfill from existing `coachNotes` text | P2 | 4h | Backend |

#### Decision Reasoning Categories
```typescript
enum DecisionReason {
  ATHLETE_FEEDBACK = "Athlete reported issue",
  FATIGUE_OBSERVED = "Observed fatigue signs",
  HRV_LOW = "HRV below threshold",
  SLEEP_POOR = "Poor sleep reported",
  INJURY_CONCERN = "Injury prevention",
  SCHEDULE_CONFLICT = "Scheduling constraint",
  PROGRESSION_ADJUSTMENT = "Progression too fast/slow",
  WEATHER_CONDITIONS = "Weather/conditions",
  EQUIPMENT_UNAVAILABLE = "Equipment not available",
  COACH_INTUITION = "Coach experience/intuition",
  OTHER = "Other reason"
}
```

#### UI Integration Points
1. **Workout Editor**: When coach modifies AI-generated workout
2. **Program Builder**: When coach adjusts AI periodization
3. **Zone Calculator**: When coach overrides calculated zones
4. **Recovery Recommendations**: When coach ignores recovery advice

---

### 1.2 Prediction Logging System

**Objective**: Log every AI prediction with enough context to validate later.

#### Database Models
```
AIPrediction
├── Prediction type (race_time, threshold, injury_risk, etc.)
├── Predicted value + confidence interval
├── Model version + parameters
├── Input data snapshot
├── Athlete context at prediction time
├── Created timestamp
└── Validation link (filled later)

PredictionValidation
├── Linked prediction
├── Actual outcome
├── Error calculation
├── Validation timestamp
├── Validation source (manual, auto-import)
└── Notes
```

#### Prediction Types to Track

| Type | Current Location | Validation Source |
|------|------------------|-------------------|
| Race time prediction | `PredictedGoal` model | `RaceResult` import |
| Threshold prediction | AI zone calculation | Next lactate test |
| Injury risk | `InjuryRiskAssessment` | `Injury` records |
| Readiness score | Daily check-in AI | Workout performance |
| Progression rate | Strength AI | Actual 1RM tests |
| Taper timing | Periodization AI | Race result quality |

#### Implementation Tasks

| Task | Priority | Effort | Owner |
|------|----------|--------|-------|
| Add `AIPrediction` model | P0 | 2h | Backend |
| Add `PredictionValidation` model | P0 | 1h | Backend |
| Create prediction logging middleware | P0 | 4h | Backend |
| Integrate into existing AI endpoints | P0 | 6h | Backend |
| Build auto-validation from race imports | P1 | 8h | Backend |
| Create prediction accuracy dashboard | P1 | 8h | Full-stack |

---

### 1.3 Outcome Tracking Foundation

**Objective**: Link training inputs to performance outputs systematically.

#### Race Result Enhancement
```
RaceResult (enhanced)
├── Existing fields...
├── linkedPredictionId   // Link to prediction made
├── trainingPeriodId     // Link to training block
├── satisfactionScore    // 1-5 athlete satisfaction
├── goalAchieved         // boolean
├── conditionFactors     // heat, altitude, illness, etc.
└── coachAnalysis        // structured post-race analysis
```

#### Implementation Tasks

| Task | Priority | Effort | Owner |
|------|----------|--------|-------|
| Enhance `RaceResult` model | P0 | 2h | Backend |
| Create post-race analysis form | P0 | 6h | Frontend |
| Auto-link predictions to results | P1 | 4h | Backend |
| Build Strava race detection | P1 | 6h | Backend |
| Add race result import from timing APIs | P2 | 12h | Backend |

---

## Phase 2: Training-Performance Correlation (Weeks 5-8)

### 2.1 Training Period Outcome Tracking

**Objective**: Measure effectiveness of training programs and periods.

#### Database Models
```
TrainingPeriodOutcome
├── Training period (program/phase reference)
├── Start/end dates
├── Goal metrics (target race time, FTP gain, etc.)
├── Actual metrics achieved
├── Training load summary
├── Compliance percentage
├── Outcome classification (exceeded/met/missed/abandoned)
├── Contributing factors
└── Coach assessment

TrainingFingerprint
├── Period reference
├── Zone distribution (% in each zone)
├── Weekly volume average
├── Intensity distribution
├── Session type breakdown
├── Recovery patterns
├── Key workout types
└── Periodization pattern
```

#### Correlation Analysis
```typescript
interface TrainingCorrelation {
  // Input features
  zoneDistribution: Record<Zone, number>;
  weeklyVolume: number;
  intensityVariability: number;
  longSessionRatio: number;
  strengthSessionsPerWeek: number;
  restDaysPerWeek: number;

  // Athlete features
  trainingAge: number;
  baselineFitness: number;
  ageGroup: string;

  // Outcome
  improvementPercent: number;
  goalAchieved: boolean;
  injuryOccurred: boolean;
}
```

#### Implementation Tasks

| Task | Priority | Effort | Owner |
|------|----------|--------|-------|
| Add `TrainingPeriodOutcome` model | P0 | 2h | Backend |
| Add `TrainingFingerprint` model | P0 | 2h | Backend |
| Build fingerprint generation algorithm | P0 | 8h | Backend |
| Create period outcome tracking UI | P0 | 8h | Frontend |
| Build correlation analysis engine | P1 | 16h | Backend |
| Generate "what worked" reports | P1 | 12h | Full-stack |

---

### 2.2 Exercise Effectiveness Tracking

**Objective**: Measure which exercises actually improve target metrics.

#### Database Models
```
ExerciseEffectiveness
├── Exercise reference
├── Athlete reference
├── Target metric (vertical jump, 5K time, etc.)
├── Baseline measurement
├── Training period
├── Volume/intensity used
├── Post-period measurement
├── Improvement amount
├── Confounding factors
└── Effectiveness score

ExerciseOutcomePattern
├── Exercise reference
├── Target metric
├── Sample size (n athletes)
├── Average improvement
├── Standard deviation
├── Confidence interval
├── Athlete type modifiers
└── Last updated
```

#### Implementation Tasks

| Task | Priority | Effort | Owner |
|------|----------|--------|-------|
| Add `ExerciseEffectiveness` model | P1 | 2h | Backend |
| Add `ExerciseOutcomePattern` model | P1 | 2h | Backend |
| Track exercise → metric correlations | P1 | 8h | Backend |
| Build effectiveness dashboard | P2 | 8h | Full-stack |
| Generate exercise recommendations | P2 | 12h | Backend |

---

### 2.3 Test-to-Performance Validation

**Objective**: Prove that your test metrics actually predict performance.

#### Validation Pipeline
```
Lactate Test → Threshold Values → Zone Training → Race Performance
     ↓              ↓                  ↓              ↓
  Captured      Predicted          Tracked       Validated
```

#### Database Models
```
TestPredictiveValidation
├── Test reference
├── Predicted metric (race time from threshold)
├── Prediction date
├── Validation event (race)
├── Actual result
├── Prediction error
├── Environmental factors
└── Validation quality score
```

#### Implementation Tasks

| Task | Priority | Effort | Owner |
|------|----------|--------|-------|
| Add `TestPredictiveValidation` model | P1 | 2h | Backend |
| Build test → race prediction algorithm | P1 | 8h | Backend |
| Auto-validate when race results arrive | P1 | 4h | Backend |
| Calculate prediction accuracy by test type | P1 | 4h | Backend |
| Display accuracy on test reports | P2 | 4h | Frontend |

---

## Phase 3: Cross-Athlete Intelligence (Weeks 9-10)

### 3.1 Anonymous Benchmarking

**Objective**: "Athletes like you" comparisons without exposing individual data.

#### Database Models
```
AthleteCohort
├── Cohort definition (age, sport, level, etc.)
├── Sample size
├── Metric averages
├── Metric distributions
├── Last updated
└── Confidence level

BenchmarkComparison
├── Athlete reference
├── Cohort reference
├── Metric compared
├── Athlete value
├── Cohort percentile
├── Recommendation
└── Generated timestamp
```

#### Cohort Definitions
```typescript
interface CohortCriteria {
  sport: SportType;
  ageRange: [number, number];
  experienceLevel: "beginner" | "intermediate" | "advanced" | "elite";
  weeklyVolume: [number, number]; // hours
  primaryGoal: GoalType;
}
```

#### Implementation Tasks

| Task | Priority | Effort | Owner |
|------|----------|--------|-------|
| Add `AthleteCohort` model | P1 | 2h | Backend |
| Build cohort aggregation job | P1 | 8h | Backend |
| Create percentile calculation | P1 | 4h | Backend |
| Build "athletes like you" UI | P1 | 8h | Frontend |
| Add recommendations based on cohort | P2 | 8h | Backend |

---

### 3.2 Performance Pattern Library

**Objective**: Identify patterns that predict success across athletes.

#### Database Models
```
PerformancePattern
├── Pattern name/description
├── Pattern criteria (training characteristics)
├── Outcome correlation
├── Sample size
├── Effect size
├── Confidence level
├── Athlete type applicability
├── Discovered date
└── Validation status

AthletePatternMatch
├── Athlete reference
├── Pattern reference
├── Match score
├── Recommendation
├── Applied (boolean)
└── Outcome if applied
```

#### Example Patterns
```typescript
const examplePatterns = [
  {
    name: "High Responder to Polarized Training",
    criteria: {
      zoneDistribution: { zone1: ">75%", zone4plus: ">15%" },
      consistency: ">85%",
    },
    outcome: "14% higher improvement rate",
    applicability: ["endurance", "age>30"],
  },
  {
    name: "Recovery-Sensitive Athlete",
    criteria: {
      hrvVariability: ">15%",
      performanceDropAfterHighLoad: true,
    },
    recommendation: "Add extra recovery day after hard weeks",
    outcome: "40% fewer overtraining incidents",
  },
];
```

#### Implementation Tasks

| Task | Priority | Effort | Owner |
|------|----------|--------|-------|
| Add `PerformancePattern` model | P2 | 2h | Backend |
| Build pattern detection algorithm | P2 | 16h | Backend |
| Create pattern matching for athletes | P2 | 8h | Backend |
| Build pattern library UI | P2 | 8h | Frontend |
| Generate pattern-based recommendations | P2 | 8h | Backend |

---

## Phase 4: AI Learning Loop (Weeks 11-12)

### 4.1 Feedback Integration

**Objective**: Use collected data to improve AI recommendations.

#### Feedback Pipeline
```
Coach Decision
     ↓
Outcome Tracked
     ↓
Pattern Extracted
     ↓
AI Prompt Refined
     ↓
Better Suggestions
     ↓
Coach Decision
    [LOOP]
```

#### Database Models
```
AIFeedbackLoop
├── Decision/prediction reference
├── Outcome reference
├── Lesson learned
├── Prompt adjustment
├── Model version affected
├── Impact measurement
└── Applied timestamp

AIModelVersion
├── Version identifier
├── Training data snapshot
├── Accuracy metrics
├── Active (boolean)
├── A/B test results
└── Deployment date
```

#### Implementation Tasks

| Task | Priority | Effort | Owner |
|------|----------|--------|-------|
| Add `AIFeedbackLoop` model | P2 | 2h | Backend |
| Add `AIModelVersion` model | P2 | 2h | Backend |
| Build feedback aggregation job | P2 | 8h | Backend |
| Create AI prompt refinement system | P2 | 12h | Backend |
| Implement A/B testing framework | P3 | 16h | Backend |

---

### 4.2 Accuracy Dashboard

**Objective**: Public-facing proof of platform effectiveness.

#### Metrics to Display
```typescript
interface AccuracyDashboard {
  racePredictions: {
    total: number;
    meanAbsoluteError: string; // "2.3%"
    within5Percent: string; // "87%"
    byDistance: Record<string, AccuracyMetric>;
  };
  thresholdPredictions: {
    total: number;
    meanError: string; // "3.2 watts"
    correlation: number; // 0.94
  };
  injuryPredictions: {
    sensitivity: string; // "78%"
    specificity: string; // "85%"
    falsePositiveRate: string;
  };
  programOutcomes: {
    goalAchievementRate: string; // "72%"
    averageImprovement: string; // "+6.4%"
    sampleSize: number;
  };
}
```

#### Implementation Tasks

| Task | Priority | Effort | Owner |
|------|----------|--------|-------|
| Build accuracy calculation jobs | P1 | 8h | Backend |
| Create accuracy API endpoints | P1 | 4h | Backend |
| Build public accuracy dashboard | P1 | 12h | Frontend |
| Add accuracy badges to reports | P2 | 4h | Frontend |
| Create accuracy marketing materials | P3 | 4h | Marketing |

---

## Technical Architecture

### Data Flow Diagram
```
┌─────────────────────────────────────────────────────────────────┐
│                        DATA COLLECTION                          │
├─────────────────────────────────────────────────────────────────┤
│  Tests    Workouts    Decisions    Races    Check-ins    Sync   │
│    ↓         ↓           ↓           ↓          ↓          ↓    │
└────┬─────────┬───────────┬───────────┬──────────┬──────────┬────┘
     │         │           │           │          │          │
     ▼         ▼           ▼           ▼          ▼          ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DATA PROCESSING                            │
├─────────────────────────────────────────────────────────────────┤
│  Fingerprinting  │  Correlation  │  Pattern Detection  │  Agg   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DATA STORAGE                               │
├─────────────────────────────────────────────────────────────────┤
│  PostgreSQL (transactional)  │  Analytics tables  │  Patterns   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      INTELLIGENCE LAYER                         │
├─────────────────────────────────────────────────────────────────┤
│  Benchmarks  │  Predictions  │  Recommendations  │  Accuracy    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      USER INTERFACES                            │
├─────────────────────────────────────────────────────────────────┤
│  Coach Dashboard  │  Athlete Portal  │  Reports  │  Public Stats│
└─────────────────────────────────────────────────────────────────┘
```

### Background Jobs

| Job | Frequency | Purpose |
|-----|-----------|---------|
| `fingerprint-training-periods` | Daily | Generate training fingerprints |
| `validate-predictions` | Daily | Link predictions to outcomes |
| `aggregate-cohorts` | Weekly | Update cohort benchmarks |
| `detect-patterns` | Weekly | Find new performance patterns |
| `calculate-accuracy` | Weekly | Update accuracy metrics |
| `refine-ai-prompts` | Monthly | Improve AI based on feedback |

### API Endpoints (New)

```
POST   /api/coach-decisions              Create decision record
GET    /api/coach-decisions              List decisions (with filters)
GET    /api/coach-decisions/analytics    Decision analytics

POST   /api/predictions                  Log prediction
GET    /api/predictions/accuracy         Get accuracy metrics
POST   /api/predictions/:id/validate     Validate prediction

POST   /api/training-periods/:id/outcome Record period outcome
GET    /api/training-periods/analysis    Get correlation analysis

GET    /api/benchmarks/cohort            Get cohort comparison
GET    /api/benchmarks/patterns          Get applicable patterns

GET    /api/accuracy/public              Public accuracy dashboard
GET    /api/accuracy/detailed            Detailed accuracy (auth)
```

---

## Resource Requirements

### Development Team

| Role | Allocation | Duration |
|------|------------|----------|
| Backend Developer | 100% | 12 weeks |
| Frontend Developer | 75% | 12 weeks |
| Data Engineer | 50% | 8 weeks (Phase 2-4) |
| Product Manager | 25% | 12 weeks |

### Infrastructure

| Resource | Purpose | Cost Estimate |
|----------|---------|---------------|
| Additional DB storage | Historical data | +$50/mo |
| Background job worker | Processing | +$100/mo |
| Analytics queries | Correlation analysis | +$50/mo |

---

## Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Low data entry compliance | High | High | Auto-capture where possible, gamify completion |
| Insufficient sample sizes | Medium | High | Start with aggregate patterns, build over time |
| Privacy concerns | Medium | High | Anonymize all cross-athlete data, clear consent |
| Accuracy claims backfire | Low | High | Conservative confidence intervals, clear methodology |
| Scope creep | Medium | Medium | Strict phase gates, MVP each phase |

---

## Success Metrics by Phase

### Phase 1 Complete When:
- [ ] >50% of AI modifications have decision records
- [ ] >80% of AI predictions are logged
- [ ] >30% of race results linked to predictions

**Phase 1 Implementation Status (Updated 2026-01-22):**
| Task | Status | Notes |
|------|--------|-------|
| `CoachDecision` Prisma model | ✅ Done | Full model with enums |
| `AIPrediction` model | ✅ Done | With confidence intervals |
| `PredictionValidation` model | ✅ Done | Error metrics included |
| `/api/data-moat/coach-decisions` CRUD | ✅ Done | GET/POST with filters |
| `/api/data-moat/coach-decisions/[id]` | ✅ Done | GET/PATCH/DELETE |
| `/api/data-moat/coach-decisions/[id]/outcome` | ✅ Done | Outcome recording |
| `/api/data-moat/coach-decisions/analytics` | ✅ Done | Full analytics dashboard |
| `/api/data-moat/predictions` CRUD | ✅ Done | GET/POST with filters |
| `/api/data-moat/predictions/[id]` | ✅ Done | GET/PATCH/DELETE |
| `/api/data-moat/predictions/[id]/validate` | ✅ Done | Validation with error calc |
| `/api/data-moat/predictions/accuracy` | ✅ Done | Accuracy metrics by type |
| `/api/data-moat/consent/[athleteId]` | ✅ Done | Consent management |
| `CoachDecisionModal` component | ✅ Done | With useCoachDecision hook |
| Integrate modal into workout flow | ✅ Done | In DraftWorkoutEditor.tsx |
| Prediction logging middleware | ✅ Done | `lib/data-moat/prediction-logger.ts` |
| Prediction logging in AI endpoints | ✅ Done | injury-risk, predictions routes |
| Enhance RaceResult model | ✅ Done | linkedPredictionId, satisfactionScore, etc. |
| Post-race analysis form | ✅ Done | `PostRaceAnalysisForm.tsx` |
| `/api/race-results/[id]/analysis` | ✅ Done | GET/POST with validation |

**Files Created/Modified:**
- `lib/data-moat/prediction-logger.ts` - Prediction logging utility
- `components/data-moat/PostRaceAnalysisForm.tsx` - Post-race analysis UI
- `app/api/race-results/[id]/analysis/route.ts` - Analysis API endpoint
- `app/api/ai/advanced-intelligence/injury-risk/route.ts` - Added prediction logging
- `app/api/ai/advanced-intelligence/predictions/route.ts` - Added prediction logging
- `prisma/schema.prisma` - Enhanced RaceResult, AIPrediction models

### Phase 2 Complete When:
- [ ] >40% of completed programs have outcome records
- [ ] Training fingerprints generated for all active periods
- [ ] First "what worked" reports generated

**Phase 2 Implementation Status (Updated 2026-01-22):**
| Task | Status | Notes |
|------|--------|-------|
| `TrainingPeriodOutcome` model | ✅ Done | With all fields from plan |
| `TrainingFingerprint` model | ✅ Done | Zone distribution, volume patterns |
| `ExerciseEffectiveness` model | ✅ Done | Individual athlete tracking |
| `ExerciseOutcomePattern` model | ✅ Done | Aggregated patterns |
| `TestPredictiveValidation` model | ✅ Done | Test → performance validation |
| `TrainingOutcome` enum | ✅ Done | 6 outcome classifications |
| `/api/data-moat/training-outcomes` | ✅ Done | GET/POST endpoints |
| Fingerprint generator | ✅ Done | `lib/data-moat/fingerprint-generator.ts` |
| Correlation analysis engine | ✅ Done | `lib/data-moat/correlation-engine.ts` |
| "What worked" reports | ✅ Done | `/api/data-moat/training-outcomes/[id]/report` |
| Training outcome analytics | ✅ Done | `/api/data-moat/training-outcomes/analytics` |
| Exercise effectiveness tracking | ✅ Done | `/api/data-moat/exercise-effectiveness` |

**Files Created:**
- `app/api/data-moat/training-outcomes/route.ts` - Training outcomes CRUD API
- `app/api/data-moat/training-outcomes/[id]/report/route.ts` - "What Worked" report generation
- `app/api/data-moat/training-outcomes/analytics/route.ts` - Training analytics & correlations
- `app/api/data-moat/exercise-effectiveness/route.ts` - Exercise effectiveness CRUD
- `lib/data-moat/fingerprint-generator.ts` - Fingerprint generation utility
- `lib/data-moat/correlation-engine.ts` - Correlation analysis & "What Worked" reports

**Schema Changes:**
- Added `TrainingPeriodOutcome`, `TrainingFingerprint`, `ExerciseEffectiveness`, `ExerciseOutcomePattern`, `TestPredictiveValidation` models
- Added relations to `Client`, `User`, `TrainingProgram`, `Exercise`

### Phase 3 Complete When:
- [ ] Cohort benchmarks for top 10 athlete segments
- [ ] >5 validated performance patterns identified
- [ ] "Athletes like you" feature live

**Phase 3 Implementation Status (Updated 2026-01-22):**
| Task | Status | Notes |
|------|--------|-------|
| `AthleteCohort` model | ✅ Done | Anonymized benchmarks with percentiles |
| `BenchmarkComparison` model | ✅ Done | Athlete vs cohort tracking |
| `PerformancePattern` model | ✅ Done | Pattern storage with confidence levels |
| `AthletePatternMatch` model | ✅ Done | Pattern-athlete linking |
| `ExperienceLevel` enum | ✅ Done | BEGINNER → ELITE |
| `GoalType` enum | ✅ Done | 7 goal types |
| `PatternConfidence` enum | ✅ Done | PRELIMINARY → VERY_HIGH |
| `/api/data-moat/cohorts` | ✅ Done | GET/POST cohort management |
| `/api/data-moat/cohorts/benchmark` | ✅ Done | "Athletes like you" benchmarking |
| Pattern detection algorithm | ✅ Done | `lib/data-moat/pattern-detection.ts` |
| `/api/data-moat/patterns` | ✅ Done | GET patterns, POST detection trigger |
| Pattern matching for athletes | ✅ Done | Match athletes to detected patterns |

**Files Created:**
- `app/api/data-moat/cohorts/route.ts` - Cohort management API
- `app/api/data-moat/cohorts/benchmark/route.ts` - "Athletes like you" benchmarking
- `app/api/data-moat/patterns/route.ts` - Pattern discovery API
- `lib/data-moat/pattern-detection.ts` - Pattern detection algorithm

**Pattern Types Implemented:**
- Volume progression patterns (gradual, block, consistent, aggressive)
- Intensity distribution patterns (polarized 80/20, pyramidal, threshold-focused, high-intensity)
- Periodization patterns (by training period type)
- Recovery patterns (optimal, minimal, high rest day frequency)

**Schema Changes:**
- Added `AthleteCohort`, `BenchmarkComparison`, `PerformancePattern`, `AthletePatternMatch` models
- Added `ExperienceLevel`, `GoalType`, `PatternConfidence` enums
- Added reverse relations to `Client` model for Phase 3

### Phase 4 Complete When:
- [ ] AI prompts updated based on feedback
- [ ] Public accuracy dashboard live
- [ ] <5% race prediction error demonstrated

**Phase 4 Implementation Status (Updated 2026-01-22):**
| Task | Status | Notes |
|------|--------|-------|
| `AIFeedbackLoop` model | ✅ Done | Links decisions/predictions to lessons |
| `AIModelVersion` model | ✅ Done | Version tracking with accuracy metrics |
| `AccuracySnapshot` model | ✅ Done | Periodic accuracy snapshots |
| `AIPromptTemplate` model | ✅ Done | Prompt version management |
| `FeedbackCategory` enum | ✅ Done | 6 feedback categories |
| `LessonStatus` enum | ✅ Done | IDENTIFIED → APPLIED lifecycle |
| `ModelStatus` enum | ✅ Done | DEVELOPMENT → ARCHIVED lifecycle |
| `/api/data-moat/feedback` | ✅ Done | GET/POST feedback loops |
| `/api/data-moat/feedback/aggregate` | ✅ Done | Automatic lesson extraction |
| `/api/data-moat/prompts` | ✅ Done | Prompt template management |
| `/api/data-moat/accuracy` | ✅ Done | Public & detailed accuracy API |
| `/api/data-moat/models` | ✅ Done | Model version management |
| Feedback aggregator | ✅ Done | `lib/data-moat/feedback-aggregator.ts` |
| Accuracy calculator | ✅ Done | `lib/data-moat/accuracy-calculator.ts` |

**Files Created:**
- `app/api/data-moat/feedback/route.ts` - Feedback loop CRUD
- `app/api/data-moat/feedback/aggregate/route.ts` - Automatic lesson extraction
- `app/api/data-moat/prompts/route.ts` - Prompt template management
- `app/api/data-moat/accuracy/route.ts` - Public accuracy dashboard
- `app/api/data-moat/models/route.ts` - Model version management
- `lib/data-moat/feedback-aggregator.ts` - Lesson extraction from decisions/predictions
- `lib/data-moat/accuracy-calculator.ts` - Accuracy metrics calculation

**Key Features:**
- Automatic lesson extraction from coach decisions (by reason, age group, sport)
- Prediction error analysis with systematic bias detection
- Public accuracy dashboard with summary metrics
- Detailed accuracy breakdowns for authenticated users
- Model version tracking with A/B testing support
- Prompt template versioning with activation management
- Accuracy snapshots (daily, weekly, monthly, all-time)

**Schema Changes:**
- Added `AIFeedbackLoop`, `AIModelVersion`, `AccuracySnapshot`, `AIPromptTemplate` models
- Added `FeedbackCategory`, `LessonStatus`, `ModelStatus` enums
- Added feedbackLoops relations to `CoachDecision`, `AIPrediction`, `TrainingPeriodOutcome`, `PerformancePattern`

---

## Appendix: Quick Wins (Week 1)

These can be implemented immediately with minimal effort:

1. **Add decision reason dropdown** to existing workout edit modal
2. **Log prediction timestamp** when generating race predictions
3. **Add "goal achieved?" checkbox** to race result form
4. **Track zone source** (AI-calculated vs manual override)
5. **Add satisfaction rating** to completed workout logs

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-22 | AI Assistant | Initial plan |
| 1.1 | 2026-01-22 | AI Assistant | Phase 1 complete - Coach decisions & prediction logging |
| 1.2 | 2026-01-22 | AI Assistant | Phase 2 complete - Training-performance correlation |
| 1.3 | 2026-01-22 | AI Assistant | Phase 3 complete - Cross-athlete intelligence |
| 1.4 | 2026-01-22 | AI Assistant | Phase 4 complete - AI learning loop & accuracy dashboard |

