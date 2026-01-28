# Data Moat API Specifications

## Overview

This document specifies all API endpoints required for the Data Moat system. All endpoints follow RESTful conventions and return JSON responses.

**Base URL**: `/api/data-moat`

**Authentication**: All endpoints require authentication via Supabase Auth JWT token.

**Authorization**: Endpoints respect user roles (COACH, ATHLETE, ADMIN).

---

## 1. Coach Decisions API

### Create Decision Record

Records when a coach modifies an AI suggestion.

```
POST /api/data-moat/coach-decisions
```

**Request Body**:
```typescript
{
  // Required
  athleteId: string;
  aiSuggestionType: AISuggestionType;
  aiSuggestionData: object;
  modificationData: object;
  reasonCategory: DecisionReason;

  // Optional
  aiConfidence?: number;           // 0-1
  modificationMagnitude?: number;  // 0-1, auto-calculated if not provided
  reasonNotes?: string;
  coachConfidence?: number;        // 0-1
  athleteContext?: {
    hrvScore?: number;
    sleepScore?: number;
    fatigueLevel?: number;
    stressLevel?: number;
    recentTrainingLoad?: number;
    daysUntilEvent?: number;
    injuryStatus?: string;
  };
  workoutId?: string;
  programId?: string;
}
```

**Response** (201 Created):
```typescript
{
  id: string;
  createdAt: string;
  coachId: string;
  athleteId: string;
  aiSuggestionType: string;
  reasonCategory: string;
  modificationMagnitude: number;
  // ... all fields
}
```

**Error Responses**:
- `400 Bad Request` - Invalid input
- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - Not authorized for this athlete

---

### List Decisions

Get decisions with filtering options.

```
GET /api/data-moat/coach-decisions
```

**Query Parameters**:
| Param | Type | Description |
|-------|------|-------------|
| `coachId` | string | Filter by coach |
| `athleteId` | string | Filter by athlete |
| `reasonCategory` | string | Filter by reason |
| `aiSuggestionType` | string | Filter by suggestion type |
| `startDate` | ISO date | Filter from date |
| `endDate` | ISO date | Filter to date |
| `validated` | boolean | Filter by validation status |
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 20, max: 100) |

**Response** (200 OK):
```typescript
{
  data: CoachDecision[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

---

### Get Decision by ID

```
GET /api/data-moat/coach-decisions/:id
```

**Response** (200 OK):
```typescript
{
  id: string;
  // ... all decision fields
  athlete: { id: string; name: string; };
  coach: { id: string; name: string; };
  workout?: { id: string; name: string; };
}
```

---

### Update Decision Outcome

Update the outcome assessment after the decision's effect is known.

```
PATCH /api/data-moat/coach-decisions/:id/outcome
```

**Request Body**:
```typescript
{
  outcomeAssessment: "BETTER_THAN_AI" | "SAME_AS_AI" | "WORSE_THAN_AI" | "UNKNOWN";
  outcomeNotes?: string;
}
```

**Response** (200 OK):
```typescript
{
  id: string;
  outcomeAssessment: string;
  outcomeNotes: string;
  outcomeValidatedAt: string;
  // ... updated decision
}
```

---

### Get Decision Analytics

Aggregated analytics for coach decisions.

```
GET /api/data-moat/coach-decisions/analytics
```

**Query Parameters**:
| Param | Type | Description |
|-------|------|-------------|
| `coachId` | string | Filter by coach |
| `athleteId` | string | Filter by athlete |
| `startDate` | ISO date | Start of period |
| `endDate` | ISO date | End of period |

**Response** (200 OK):
```typescript
{
  summary: {
    totalDecisions: number;
    overrideRate: number;        // % of AI suggestions modified
    avgModificationMagnitude: number;
  };
  byReason: {
    [reason: string]: {
      count: number;
      percentage: number;
      avgOutcomeScore: number;   // Based on outcome assessments
    };
  };
  bySuggestionType: {
    [type: string]: {
      count: number;
      overrideRate: number;
    };
  };
  outcomeComparison: {
    betterThanAI: number;
    sameAsAI: number;
    worseThanAI: number;
    unknown: number;
    coachWinRate: number;       // % where coach was better
  };
  trends: {
    weeklyDecisions: Array<{ week: string; count: number; }>;
    overrideRateTrend: Array<{ week: string; rate: number; }>;
  };
  period: {
    start: string;
    end: string;
  };
}
```

---

## 2. Predictions API

### Log Prediction

Record an AI prediction for later validation.

```
POST /api/data-moat/predictions
```

**Request Body**:
```typescript
{
  // Required
  athleteId: string;
  predictionType: PredictionType;
  predictedValue: any;           // Type depends on predictionType
  confidenceScore: number;       // 0-1
  modelVersion: string;
  inputDataSnapshot: object;

  // Optional
  confidenceInterval?: {
    lower: number;
    upper: number;
  };
  modelParameters?: object;
  validUntil?: string;           // ISO date
  displayedToUser?: boolean;
}
```

**Response** (201 Created):
```typescript
{
  id: string;
  createdAt: string;
  predictionType: string;
  predictedValue: any;
  confidenceScore: number;
  athleteId: string;
  // ...
}
```

---

### Validate Prediction

Link a prediction to its actual outcome.

```
POST /api/data-moat/predictions/:id/validate
```

**Request Body**:
```typescript
{
  // Required
  actualValue: any;
  occurredAt: string;            // ISO date
  validationSource: ValidationSource;

  // Optional
  environmentalFactors?: {
    weather?: string;
    altitude?: number;
    illness?: boolean;
    courseType?: string;
    temperature?: number;
    humidity?: number;
  };
  validationQuality?: number;    // 0-1, defaults to based on source
  errorExplanation?: string;
}
```

**Response** (200 OK):
```typescript
{
  prediction: {
    id: string;
    predictedValue: any;
    // ...
  };
  validation: {
    id: string;
    actualValue: any;
    absoluteError: number;
    percentageError: number;
    withinConfidenceInterval: boolean;
    // ...
  };
}
```

---

### Get Prediction Accuracy

Get accuracy metrics for predictions.

```
GET /api/data-moat/predictions/accuracy
```

**Query Parameters**:
| Param | Type | Description |
|-------|------|-------------|
| `predictionType` | string | Filter by type |
| `athleteId` | string | Filter by athlete |
| `segment` | string | Segment (e.g., "age:40-50", "sport:running") |
| `startDate` | ISO date | Start of period |
| `endDate` | ISO date | End of period |

**Response** (200 OK):
```typescript
{
  metrics: {
    predictionType: string;
    sampleSize: number;
    meanAbsoluteError: number;
    meanPercentageError: number;
    rmse: number;
    calibrationScore: number;
    confidenceIntervalCoverage: number;
    percentiles: {
      p10: number;
      p25: number;
      p50: number;
      p75: number;
      p90: number;
    };
    trend: "IMPROVING" | "STABLE" | "DECLINING";
  };
  bySegment?: {
    [segment: string]: {
      sampleSize: number;
      meanAbsoluteError: number;
      // ...
    };
  };
  period: {
    start: string;
    end: string;
  };
}
```

---

### List Predictions

```
GET /api/data-moat/predictions
```

**Query Parameters**:
| Param | Type | Description |
|-------|------|-------------|
| `athleteId` | string | Filter by athlete |
| `predictionType` | string | Filter by type |
| `validated` | boolean | Filter by validation status |
| `startDate` | ISO date | Created after |
| `endDate` | ISO date | Created before |
| `page` | number | Page number |
| `limit` | number | Items per page |

**Response** (200 OK):
```typescript
{
  data: Array<{
    id: string;
    predictionType: string;
    predictedValue: any;
    confidenceScore: number;
    validated: boolean;
    validation?: {
      actualValue: any;
      percentageError: number;
    };
    createdAt: string;
  }>;
  pagination: { ... };
}
```

---

## 3. Training Periods API

### Create Training Fingerprint

Generate a fingerprint for a training period.

```
POST /api/data-moat/training-periods/fingerprint
```

**Request Body**:
```typescript
{
  athleteId: string;
  startDate: string;        // ISO date
  endDate: string;          // ISO date
  trainingPeriodId?: string; // Link to TrainingProgram
}
```

**Response** (201 Created):
```typescript
{
  id: string;
  athleteId: string;
  startDate: string;
  endDate: string;
  durationWeeks: number;

  // Volume metrics
  totalVolumeHours: number;
  weeklyVolumeAvg: number;
  volumeProgression: number;

  // Intensity distribution
  zone1Pct: number;
  zone2Pct: number;
  zone3Pct: number;
  zone4Pct: number;
  zone5Pct: number;
  polarizationIndex: number;

  // Session characteristics
  longSessionRatio: number;
  intervalSessionsPerWeek: number;
  strengthSessionsPerWeek: number;
  restDaysPerWeek: number;

  // Periodization
  buildRecoveryRatio: string;
  taperLengthDays: number | null;

  // Compliance
  complianceRate: number;

  // Recovery
  avgHRV: number | null;
  hrvTrend: number | null;
  avgSleepScore: number | null;

  createdAt: string;
}
```

---

### Record Period Outcome

Record the outcome of a training period.

```
POST /api/data-moat/training-periods/:fingerprintId/outcome
```

**Request Body**:
```typescript
{
  // Goal
  goalType: OutcomeGoalType;
  goalTargetValue: any;
  goalTargetDate: string;

  // Result
  achievedValue: any;
  achievedDate?: string;
  achievement: GoalAchievement;

  // Secondary goals
  secondaryGoals?: Array<{
    type: string;
    target: any;
    achieved: any;
  }>;

  // Context
  injuryDuringPeriod?: boolean;
  illnessDuringPeriod?: boolean;
  majorLifeStress?: boolean;
  contextNotes?: string;

  // Coach assessment
  coachOverallRating?: number;        // 1-5
  coachWhatWorked?: string[];
  coachWhatDidnt?: string[];
  coachWouldRepeat?: boolean;

  // Athlete assessment
  athleteSatisfaction?: number;       // 1-5
  athletePerceivedEffort?: number;    // 1-5
  athleteWouldRepeat?: boolean;
}
```

**Response** (201 Created):
```typescript
{
  id: string;
  fingerprintId: string;
  goalType: string;
  achievement: string;
  improvementFromBaseline: number | null;
  // ...
}
```

---

### Get Training Correlation Analysis

Get analysis of what training approaches lead to outcomes.

```
GET /api/data-moat/training-periods/analysis
```

**Query Parameters**:
| Param | Type | Description |
|-------|------|-------------|
| `goalType` | string | Filter by goal type |
| `sport` | string | Filter by sport |
| `ageRange` | string | e.g., "40-50" |
| `minSampleSize` | number | Minimum n (default: 30) |

**Response** (200 OK):
```typescript
{
  correlations: Array<{
    characteristic: string;
    correlationCoefficient: number;
    pValue: number;
    effectSize: number;
    sampleSize: number;
    direction: "positive" | "negative";
    interpretation: string;
    confidence: "high" | "medium" | "low";
  }>;

  recommendations: Array<{
    title: string;
    description: string;
    evidence: string;
    applicableTo: string[];
  }>;

  sampleSize: number;
  filters: { ... };
}
```

---

## 4. Benchmarks API

### Get Cohort Comparison

Get how an athlete compares to similar athletes.

```
GET /api/data-moat/benchmarks/cohort/:athleteId
```

**Query Parameters**:
| Param | Type | Description |
|-------|------|-------------|
| `metrics` | string[] | Specific metrics to compare (optional) |

**Response** (200 OK):
```typescript
{
  athlete: {
    id: string;
    name: string;
  };

  cohort: {
    id: string;
    name: string;
    description: string;
    athleteCount: number;
    criteria: object;
  };

  comparisons: Array<{
    metric: string;
    athleteValue: number;
    cohortAverage: number;
    cohortMedian: number;
    percentile: number;
    cohortTop10: number;
    interpretation: string;
    recommendation?: string;
  }>;

  summary: {
    overallAssessment: string;
    strengths: string[];
    improvementAreas: string[];
  };

  generatedAt: string;
}
```

---

### Get Applicable Patterns

Get performance patterns that match an athlete.

```
GET /api/data-moat/benchmarks/patterns/:athleteId
```

**Response** (200 OK):
```typescript
{
  patterns: Array<{
    pattern: {
      id: string;
      name: string;
      description: string;
      category: string;
      expectedOutcome: {
        metric: string;
        improvement: number;
        timeframe: string;
      };
      recommendation: {
        summary: string;
        actionItems: string[];
      };
      statistics: {
        sampleSize: number;
        effectSize: number;
        confidence: string;
      };
    };
    match: {
      score: number;
      matchedCriteria: string[];
      unmatchedCriteria: string[];
    };
  }>;

  athleteId: string;
  generatedAt: string;
}
```

---

### Apply Pattern Recommendation

Mark that a pattern recommendation was applied.

```
POST /api/data-moat/benchmarks/patterns/:athleteId/:patternId/apply
```

**Request Body**:
```typescript
{
  notes?: string;
}
```

**Response** (200 OK):
```typescript
{
  matchId: string;
  appliedAt: string;
  pattern: { ... };
}
```

---

### Record Pattern Outcome

Record the outcome after applying a pattern recommendation.

```
POST /api/data-moat/benchmarks/patterns/:matchId/outcome
```

**Request Body**:
```typescript
{
  success: boolean;
  notes?: string;
}
```

---

## 5. Public Accuracy API

### Get Public Accuracy Stats

Public endpoint showing platform accuracy metrics.

```
GET /api/data-moat/accuracy/public
```

**Authentication**: None required

**Response** (200 OK):
```typescript
{
  racePredictions: {
    meanError: string;           // "2.3%"
    within5Percent: string;      // "87%"
    sampleSize: number;
    lastUpdated: string;
  };

  thresholdPredictions: {
    meanError: string;           // "3.2 watts"
    correlation: number;         // 0.94
    sampleSize: number;
    lastUpdated: string;
  };

  injuryPredictions: {
    sensitivity: string;         // "78%"
    specificity: string;         // "85%"
    sampleSize: number;
    lastUpdated: string;
  };

  programOutcomes: {
    goalAchievementRate: string; // "72%"
    averageImprovement: string;  // "+6.4%"
    sampleSize: number;
    lastUpdated: string;
  };

  totalAthletes: number;
  totalPredictions: number;
  platformSince: string;
}
```

---

### Get Detailed Accuracy (Authenticated)

Detailed accuracy metrics for coaches/admins.

```
GET /api/data-moat/accuracy/detailed
```

**Query Parameters**:
| Param | Type | Description |
|-------|------|-------------|
| `predictionType` | string | Filter by type |
| `startDate` | ISO date | Start of period |
| `endDate` | ISO date | End of period |

**Response** (200 OK):
```typescript
{
  byPredictionType: {
    [type: string]: {
      sampleSize: number;
      metrics: {
        meanAbsoluteError: number;
        meanPercentageError: number;
        rmse: number;
        calibration: number;
      };
      distribution: {
        histogram: Array<{ range: string; count: number; }>;
        percentiles: { ... };
      };
      trend: {
        direction: string;
        data: Array<{ period: string; accuracy: number; }>;
      };
    };
  };

  overall: {
    totalPredictions: number;
    validatedPredictions: number;
    avgAccuracy: number;
    improvementSinceStart: number;
  };
}
```

---

## 6. Consent API

### Get Consent Settings

```
GET /api/data-moat/consent/:athleteId
```

**Response** (200 OK):
```typescript
{
  athleteId: string;
  anonymizedBenchmarking: boolean;
  patternContribution: boolean;
  predictionValidation: boolean;
  coachDecisionSharing: boolean;
  excludeFromResearch: boolean;
  excludeFromPublicStats: boolean;
  consentVersion: string;
  acceptedAt: string;
}
```

---

### Update Consent Settings

```
PUT /api/data-moat/consent/:athleteId
```

**Request Body**:
```typescript
{
  anonymizedBenchmarking?: boolean;
  patternContribution?: boolean;
  predictionValidation?: boolean;
  coachDecisionSharing?: boolean;
  excludeFromResearch?: boolean;
  excludeFromPublicStats?: boolean;
}
```

**Response** (200 OK):
```typescript
{
  // Updated consent object
}
```

---

## 7. Background Jobs API (Admin Only)

### Trigger Fingerprint Generation

```
POST /api/data-moat/jobs/generate-fingerprints
```

**Request Body**:
```typescript
{
  athleteIds?: string[];   // Specific athletes, or all if empty
  startDate?: string;
  endDate?: string;
}
```

---

### Trigger Cohort Calculation

```
POST /api/data-moat/jobs/calculate-cohorts
```

---

### Trigger Pattern Detection

```
POST /api/data-moat/jobs/detect-patterns
```

---

### Trigger Accuracy Calculation

```
POST /api/data-moat/jobs/calculate-accuracy
```

---

## Error Handling

All endpoints return errors in this format:

```typescript
{
  error: {
    code: string;           // Machine-readable code
    message: string;        // Human-readable message
    details?: object;       // Additional details
  };
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Not authenticated |
| `FORBIDDEN` | 403 | Not authorized |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid input |
| `CONFLICT` | 409 | Resource already exists |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

---

## Rate Limits

| Endpoint Category | Limit |
|-------------------|-------|
| Read operations | 100/minute |
| Write operations | 30/minute |
| Analytics/aggregation | 10/minute |
| Public accuracy | 60/minute |

---

## Webhooks (Future)

For real-time integrations, webhooks will be available for:

- `prediction.validated` - When a prediction outcome is recorded
- `pattern.matched` - When an athlete matches a new pattern
- `accuracy.updated` - When accuracy metrics are recalculated

---

## SDK Examples

### JavaScript/TypeScript

```typescript
import { DataMoatClient } from '@star-performance/data-moat';

const client = new DataMoatClient({ apiKey: 'your-api-key' });

// Log a coach decision
await client.decisions.create({
  athleteId: 'athlete-123',
  aiSuggestionType: 'WORKOUT',
  aiSuggestionData: { ... },
  modificationData: { ... },
  reasonCategory: 'HRV_LOW',
  reasonNotes: 'HRV dropped 15% overnight',
});

// Get accuracy metrics
const accuracy = await client.accuracy.get({
  predictionType: 'RACE_TIME',
});

// Get cohort comparison
const comparison = await client.benchmarks.getCohort('athlete-123');
```

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-22 | Initial specification |

