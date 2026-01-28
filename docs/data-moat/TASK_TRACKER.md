# Data Moat Implementation Task Tracker

**Start Date**: 2026-01-22
**Target Completion**: 12 weeks

---

## Phase 1: Foundation (Weeks 1-4)

### 1.1 Database Schema Setup
- [x] Add Data Moat enums to schema (AISuggestionType, DecisionReason, etc.)
- [x] Add `CoachDecision` model
- [x] Add `AIPrediction` model
- [x] Add `PredictionValidation` model
- [x] Add `DataMoatConsent` model
- [x] Add relations to existing models (User, Client, Workout, TrainingProgram)
- [x] Run migration: `npx prisma db push` (used db push instead of migrate)
- [x] Verify migration successful

### 1.2 Coach Decision API
- [x] Create `app/api/data-moat/coach-decisions/route.ts` (GET list, POST create)
- [x] Create `app/api/data-moat/coach-decisions/[id]/route.ts` (GET, PATCH)
- [x] Create `app/api/data-moat/coach-decisions/[id]/outcome/route.ts` (PATCH)
- [x] Create `app/api/data-moat/coach-decisions/analytics/route.ts` (GET)
- [x] Add input validation with Zod schemas
- [x] Add error handling
- [ ] Test endpoints with sample data

### 1.3 Prediction API
- [x] Create `app/api/data-moat/predictions/route.ts` (GET, POST)
- [x] Create `app/api/data-moat/predictions/[id]/route.ts` (GET)
- [x] Create `app/api/data-moat/predictions/[id]/validate/route.ts` (POST)
- [x] Create `app/api/data-moat/predictions/accuracy/route.ts` (GET)
- [x] Add input validation with Zod schemas
- [x] Add error handling
- [ ] Test endpoints

### 1.4 Consent API
- [x] Create `app/api/data-moat/consent/[athleteId]/route.ts` (GET, PUT)
- [ ] Add default consent creation on athlete signup

### 1.5 UI Components - Coach Decision Capture

#### CoachDecisionModal Component
- [x] Create `components/data-moat/CoachDecisionModal.tsx`
- [x] Implement reason category selection (multi-select)
- [x] Add optional notes textarea
- [x] Add confidence level selector
- [x] Display auto-filled athlete context (HRV, sleep, fatigue)
- [x] Add "Skip" and "Save" buttons
- [x] Style with existing design system (shadcn/ui)

#### UI Integration Points
- [x] **Workout Editor** (`components/ai-studio/DraftWorkoutEditor.tsx`)
  - [x] Detect when workout is AI-generated
  - [x] Detect when modifications are made
  - [x] Show CoachDecisionModal on save if modified
  - [x] Store original AI suggestion for comparison

- [ ] **Program Builder** (AI periodization)
  - [ ] Identify AI program generation location
  - [ ] Add modification detection
  - [ ] Integrate CoachDecisionModal

- [ ] **Zone Calculator** (AI zone calculation)
  - [ ] Identify zone calculation UI location
  - [ ] Detect manual override of AI zones
  - [ ] Integrate CoachDecisionModal

- [ ] **Recovery/Load Recommendations**
  - [ ] Identify where AI recovery advice is shown
  - [ ] Detect when coach ignores/modifies
  - [ ] Integrate CoachDecisionModal

### 1.6 UI Components - Prediction Display

#### Prediction Integration
- [ ] Identify existing race time prediction UI
- [ ] Add prediction logging when predictions are generated
- [ ] Display prediction confidence to user
- [ ] Store prediction ID for later validation

### 1.7 UI Components - Outcome Capture

#### Enhanced Race Result Form
- [x] Locate existing race result form (`components/coach/race-results/RaceResultForm.tsx`)
- [x] Add `linkedPredictionId` field (auto-populated if prediction exists)
- [x] Add `satisfactionScore` rating (1-5 stars)
- [x] Add `goalAchieved` selection (exceeded/met/missed)
- [x] Add conditions form (weather, temperature, course type)
- [x] Show prediction comparison if available
- [x] Auto-validate linked predictions on submission

#### WorkoutOutcomePrompt Component
- [ ] Create `components/data-moat/WorkoutOutcomePrompt.tsx`
- [ ] Show after workout completion
- [ ] Add difficulty vs expected rating
- [ ] Add quick notes field
- [ ] Integrate into workout log flow

### 1.8 UI Components - Consent Settings

#### DataConsentSettings Component
- [ ] Create `components/settings/DataConsentSettings.tsx`
- [ ] Add toggle for each consent type
- [ ] Add privacy policy link
- [ ] Integrate into athlete settings page

### 1.9 Quick Wins (Can do immediately)
- [ ] Add decision reason dropdown to existing workout edit (if exists)
- [ ] Log timestamp when generating race predictions
- [ ] Add "goal achieved?" to race result form
- [ ] Track zone source (AI vs manual)
- [ ] Add satisfaction rating to workout logs

---

## Phase 2: Training-Performance Correlation (Weeks 5-8)

### 2.1 Database Schema - Phase 2
- [ ] Add `TrainingFingerprint` model
- [ ] Add `TrainingPeriodOutcome` model
- [ ] Add `ExerciseEffectiveness` model
- [ ] Add `ExerciseOutcomePattern` model
- [ ] Add `AccuracyMetric` model
- [ ] Run migration: `npx prisma migrate dev --name add_data_moat_phase2`

### 2.2 Training Period API
- [ ] Create `app/api/data-moat/training-periods/fingerprint/route.ts` (POST)
- [ ] Create `app/api/data-moat/training-periods/[id]/outcome/route.ts` (POST)
- [ ] Create `app/api/data-moat/training-periods/analysis/route.ts` (GET)

### 2.3 Fingerprint Generation
- [ ] Create `lib/data-moat/fingerprint-generator.ts`
- [ ] Implement zone distribution calculation
- [ ] Implement volume metrics calculation
- [ ] Implement session type analysis
- [ ] Implement periodization pattern detection
- [ ] Implement compliance calculation
- [ ] Add HRV/recovery metrics integration

### 2.4 Background Jobs
- [ ] Create `app/api/cron/data-moat/generate-fingerprints/route.ts`
- [ ] Create `app/api/cron/data-moat/validate-predictions/route.ts`
- [ ] Set up cron job scheduling (Vercel cron or similar)

### 2.5 UI Components - Training Period Outcome

#### TrainingPeriodOutcomeForm Component
- [ ] Create `components/data-moat/TrainingPeriodOutcomeForm.tsx`
- [ ] Goal assessment section
- [ ] Secondary goals tracking
- [ ] Context checkboxes (injury, illness, stress)
- [ ] Coach assessment section
- [ ] Athlete assessment section
- [ ] Integrate into program completion flow

#### UI Integration Points
- [ ] **Program Completion** - trigger outcome form when program ends
- [ ] **Coach Dashboard** - add "Review Period" action for completed programs
- [ ] **Athlete Dashboard** - prompt for outcome assessment

### 2.6 Accuracy API
- [ ] Create `app/api/data-moat/accuracy/public/route.ts` (no auth)
- [ ] Create `app/api/data-moat/accuracy/detailed/route.ts` (auth required)
- [ ] Create accuracy calculation logic

### 2.7 UI Components - Accuracy Display

#### AccuracyWidget Component
- [ ] Create `components/data-moat/AccuracyWidget.tsx`
- [ ] Display race prediction accuracy
- [ ] Display threshold accuracy
- [ ] Display program success rate
- [ ] Add to coach dashboard
- [ ] Add to public landing page (optional)

---

## Phase 3: Cross-Athlete Intelligence (Weeks 9-10)

### 3.1 Database Schema - Phase 3
- [ ] Add `AthleteCohort` model
- [ ] Add `BenchmarkComparison` model
- [ ] Add `PerformancePattern` model
- [ ] Add `AthletePatternMatch` model
- [ ] Run migration: `npx prisma migrate dev --name add_data_moat_phase3`

### 3.2 Benchmarking API
- [ ] Create `app/api/data-moat/benchmarks/cohort/[athleteId]/route.ts`
- [ ] Create `app/api/data-moat/benchmarks/patterns/[athleteId]/route.ts`
- [ ] Create `app/api/data-moat/benchmarks/patterns/[athleteId]/[patternId]/apply/route.ts`

### 3.3 Cohort Calculation
- [ ] Create `lib/data-moat/cohort-calculator.ts`
- [ ] Define cohort criteria
- [ ] Implement cohort aggregation
- [ ] Implement percentile calculation
- [ ] Ensure minimum sample size (n>30)

### 3.4 Pattern Detection
- [ ] Create `lib/data-moat/pattern-detector.ts`
- [ ] Implement correlation analysis
- [ ] Implement pattern validation (require n>100)
- [ ] Create initial seed patterns

### 3.5 Background Jobs - Phase 3
- [ ] Create `app/api/cron/data-moat/calculate-cohorts/route.ts`
- [ ] Create `app/api/cron/data-moat/detect-patterns/route.ts`

### 3.6 UI Components - Benchmarking

#### AthleteBenchmarkCard Component
- [ ] Create `components/data-moat/AthleteBenchmarkCard.tsx`
- [ ] Display metric comparisons with percentiles
- [ ] Show strengths and improvement areas
- [ ] Add insights based on cohort data
- [ ] Integrate into athlete dashboard
- [ ] Integrate into coach athlete view

#### PatternMatchAlert Component
- [ ] Create `components/data-moat/PatternMatchAlert.tsx`
- [ ] Display matched pattern details
- [ ] Show recommendations
- [ ] Add "Apply" and "Dismiss" actions
- [ ] Integrate into dashboard notifications

---

## Phase 4: AI Learning Loop (Weeks 11-12)

### 4.1 Database Schema - Phase 4
- [ ] Add `AIFeedbackEntry` model
- [ ] Add `AIModelVersion` model
- [ ] Run migration: `npx prisma migrate dev --name add_data_moat_phase4`

### 4.2 Feedback Integration
- [ ] Create `lib/data-moat/feedback-aggregator.ts`
- [ ] Analyze coach decision patterns
- [ ] Identify systematic AI improvements
- [ ] Generate feedback entries

### 4.3 Background Jobs - Phase 4
- [ ] Create `app/api/cron/data-moat/calculate-accuracy/route.ts`
- [ ] Create `app/api/cron/data-moat/aggregate-feedback/route.ts`

### 4.4 UI Components - Coach Analytics

#### CoachDecisionAnalytics Component
- [ ] Create `components/data-moat/CoachDecisionAnalytics.tsx`
- [ ] Display decision summary stats
- [ ] Show reasons breakdown chart
- [ ] Display outcome comparison (coach vs AI)
- [ ] Add insights and recommendations
- [ ] Integrate into coach dashboard

#### Public Accuracy Dashboard
- [ ] Create public accuracy page
- [ ] Display all accuracy metrics
- [ ] Add methodology explanation
- [ ] Add sample size and confidence info

---

## UI Integration Summary

### Components to Create
| Component | Location | Status |
|-----------|----------|--------|
| `CoachDecisionModal` | `components/data-moat/` | [ ] |
| `WorkoutOutcomePrompt` | `components/data-moat/` | [ ] |
| `TrainingPeriodOutcomeForm` | `components/data-moat/` | [ ] |
| `AthleteBenchmarkCard` | `components/data-moat/` | [ ] |
| `PatternMatchAlert` | `components/data-moat/` | [ ] |
| `AccuracyWidget` | `components/data-moat/` | [ ] |
| `CoachDecisionAnalytics` | `components/data-moat/` | [ ] |
| `DataConsentSettings` | `components/settings/` | [ ] |

### Existing Components to Modify
| Component | Modification | Status |
|-----------|--------------|--------|
| Workout Editor | Add AI modification detection, trigger modal | [ ] |
| Program Builder | Add AI modification detection, trigger modal | [ ] |
| Zone Calculator | Add override detection, trigger modal | [ ] |
| Race Result Form | Add prediction link, satisfaction, goal achieved | [ ] |
| Workout Log | Add outcome prompt after completion | [ ] |
| Athlete Settings | Add consent settings section | [ ] |
| Coach Dashboard | Add analytics widget, accuracy widget | [ ] |
| Athlete Dashboard | Add benchmark card, pattern alerts | [ ] |

---

## API Routes Summary

### Phase 1 Routes
| Route | Method | Status |
|-------|--------|--------|
| `/api/data-moat/coach-decisions` | GET, POST | [ ] |
| `/api/data-moat/coach-decisions/[id]` | GET, PATCH | [ ] |
| `/api/data-moat/coach-decisions/[id]/outcome` | PATCH | [ ] |
| `/api/data-moat/coach-decisions/analytics` | GET | [ ] |
| `/api/data-moat/predictions` | GET, POST | [ ] |
| `/api/data-moat/predictions/[id]` | GET | [ ] |
| `/api/data-moat/predictions/[id]/validate` | POST | [ ] |
| `/api/data-moat/predictions/accuracy` | GET | [ ] |
| `/api/data-moat/consent/[athleteId]` | GET, PUT | [ ] |

### Phase 2 Routes
| Route | Method | Status |
|-------|--------|--------|
| `/api/data-moat/training-periods/fingerprint` | POST | [ ] |
| `/api/data-moat/training-periods/[id]/outcome` | POST | [ ] |
| `/api/data-moat/training-periods/analysis` | GET | [ ] |
| `/api/data-moat/accuracy/public` | GET | [ ] |
| `/api/data-moat/accuracy/detailed` | GET | [ ] |

### Phase 3 Routes
| Route | Method | Status |
|-------|--------|--------|
| `/api/data-moat/benchmarks/cohort/[athleteId]` | GET | [ ] |
| `/api/data-moat/benchmarks/patterns/[athleteId]` | GET | [ ] |
| `/api/data-moat/benchmarks/patterns/.../apply` | POST | [ ] |

### Cron Jobs
| Route | Frequency | Status |
|-------|-----------|--------|
| `/api/cron/data-moat/generate-fingerprints` | Daily | [ ] |
| `/api/cron/data-moat/validate-predictions` | Daily | [ ] |
| `/api/cron/data-moat/calculate-cohorts` | Weekly | [ ] |
| `/api/cron/data-moat/detect-patterns` | Weekly | [ ] |
| `/api/cron/data-moat/calculate-accuracy` | Weekly | [ ] |

---

## Progress Summary

| Phase | Total Tasks | Completed | Progress |
|-------|-------------|-----------|----------|
| Phase 1 | ~50 | ~30 | ~60% |
| Phase 2 | ~25 | 0 | 0% |
| Phase 3 | ~20 | 0 | 0% |
| Phase 4 | ~15 | 0 | 0% |
| **Total** | **~110** | **~30** | **~27%** |

---

## Current Focus

**Now working on**: Phase 1 - Foundation

### Completed Today (2026-01-22):
- Database schema setup (all 4 models + enums)
- Coach Decision API (4 endpoints)
- Prediction API (5 endpoints)
- Consent API (1 endpoint)
- CoachDecisionModal component
- DraftWorkoutEditor integration
- RaceResultForm prediction linking

### Next Steps:
- Add default consent creation on athlete signup
- Integrate CoachDecisionModal into Program Builder
- Create WorkoutOutcomePrompt component
- Add DataConsentSettings to athlete settings

---

## Notes & Blockers

- Used `prisma db push` instead of `migrate dev` due to pgvector migration issues
- All Phase 1 API endpoints are complete with Zod validation
- Need to test endpoints with sample data before moving to Phase 2

---

**Last Updated**: 2026-01-22
