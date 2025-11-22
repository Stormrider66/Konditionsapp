# Injury & Cross-Training Implementation Tracker

**Start Date**: 2025-01-22
**Target Completion**: 6 weeks
**Status**: 🟡 In Progress

---

## 📋 Overview

This document tracks the implementation of automated injury response and cross-training systems triggered by athlete daily check-ins.

### Systems Being Built
1. **Injury Response Dashboard** - Auto-detect injuries, modify workouts, alert coaches
2. **Cross-Training Auto-Substitution** - Convert running to cross-training during injuries
3. **Field Test Analysis Center** - Analyze non-lab threshold tests
4. **Norwegian Method Audit** - Clean up unused standalone code

---

## 🔧 Pre-Implementation Tasks

### Norwegian Method Code Audit ✅ COMPLETED
- [x] Audit `lib/training-engine/generators/norwegian-singles-generator.ts` (654 lines)
  - [x] Check if referenced in program generator - **USED** by API endpoints
  - [x] Check if any API routes use it - **YES**: `/api/norwegian-singles/generate`
  - [x] Document findings in code review - **ALL CODE ACTIVELY USED**
- [x] Audit `lib/training-engine/sessions/norwegian-*.ts` files
  - [x] Verify usage in `determineWorkoutDistribution()` - **USED** in methodology config
  - [x] List files that can be safely removed - **NONE** - all files in use
- [x] Audit `/api/norwegian-singles/*` routes (if they exist)
  - [x] Check for any frontend calls - **YES**: Program generation form
  - [x] Check database usage - **YES**: Stores Norwegian programs
- [x] Create cleanup PR (if safe to remove)
  - **NOT NEEDED** - All Norwegian code is actively used (100% usage rate)
  - Two complementary approaches: Integrated (program builder) + Standalone (API)
  - **RECOMMENDATION**: KEEP ALL CODE

**Audit Results**:
- ✅ All 6 Norwegian files actively used (3,200 lines)
- ✅ 2 API endpoints in production use
- ✅ Complete integration with program generator
- ✅ Database models store Norwegian programs
- ✅ UI form offers Norwegian methodology selection
- **Decision**: No cleanup needed - Norwegian system is production-ready

---

## 📦 Phase 1: Core Automation Backend (Week 1-2) ✅ 85% COMPLETE

### API Endpoints
- [x] `POST /api/injury/process-checkin` - Process daily check-in for injury triggers ✅
  - [x] Handle pain level ≥5 detection
  - [x] Handle readiness <5.5 detection
  - [x] Handle sleep <5 hours detection (critical fatigue)
  - [x] Handle stress ≥8 detection (extreme stress)
  - [x] Call `processInjuryDetection()` cascade
  - [x] Create `InjuryAssessment` record
  - [x] Generate `WorkoutModification` records (next 14 days)
  - [x] Send coach notification (in-app via Message model)
  - [x] Return auto-triggered actions summary
  - **File**: `app/api/injury/process-checkin/route.ts` (380 lines)

- [x] `GET /api/injury/alerts` - Fetch active injury alerts for coach ✅
  - [x] Filter by severity (CRITICAL/HIGH/MEDIUM/LOW)
  - [x] Filter by status (ACTIVE/MONITORING/RESOLVED/ALL)
  - [x] Filter by clientId (optional)
  - [x] Include athlete info
  - [x] Include auto-triggered actions count (workoutsModified)
  - [x] Calculate estimated return weeks
  - [x] Sort by status and date
  - [x] Summary statistics
  - **File**: `app/api/injury/alerts/route.ts` (195 lines)

- [x] `PUT /api/injury/alerts/[id]/resolve` - Resolve or monitor injury alert ✅
  - [x] Update injury status (ACTIVE → MONITORING → RESOLVED)
  - [x] Set resolved timestamp
  - [x] Add coach notes
  - [x] Verify coach authorization
  - **File**: `app/api/injury/alerts/[id]/resolve/route.ts` (105 lines)

- [x] `GET /api/training-load/warnings` - Get ACWR warnings ✅
  - [x] Filter for ACWR ≥1.3
  - [x] Categorize risk (CRITICAL/DANGER/CAUTION)
  - [x] Provide recommended actions
  - [x] Sort by risk level and ACWR
  - [x] Summary statistics
  - **File**: `app/api/training-load/warnings/route.ts` (155 lines)

- [x] `GET /api/workouts/modifications` - Get auto-modified workouts ✅
  - [x] Filter unreviewed workouts
  - [x] Filter by clientId (optional)
  - [x] Filter by date range (default 14 days)
  - [x] Detect auto-generated modifications
  - [x] Categorize modification actions
  - [x] Summary statistics
  - **File**: `app/api/workouts/modifications/route.ts` (185 lines)

- [x] `PUT /api/workouts/modifications/[id]/review` - Review workout modification ✅
  - [x] Mark as reviewed by coach
  - [x] Add coach notes
  - [x] Approve or flag for adjustment
  - [x] Verify coach authorization
  - **File**: `app/api/workouts/modifications/[id]/review/route.ts` (100 lines)

- [ ] `GET /api/injury/alerts/[id]` - Get single injury alert details (NOT NEEDED YET)
  - Dashboard shows inline details, dedicated endpoint can be added later if needed

### Database Schema Updates
- [x] Using existing `Message` model for notifications ✅
  - Fields already include: senderId, recipientId, subject, content, priority, read, sentAt
  - No new model needed

- [ ] Update `WorkoutModification` model (FUTURE ENHANCEMENT)
  - Currently using Workout.notes for review tracking
  - Can add dedicated fields in Phase 2 if needed

- [x] InjuryAssessment model already supports detection ✅
  - Existing fields: status, detectedAt, painLevel, painTiming
  - System uses existing `InjuryAssessment` model from injury-management integration
  - No schema changes needed

### Integration Points
- [x] Hook into `DailyMetrics` API ✅
  - [x] After check-in saved, check pain/readiness/sleep/stress thresholds
  - [x] If triggered, call `/api/injury/process-checkin` internally
  - [x] Return injury response in API response
  - **Updated**: `app/api/daily-metrics/route.ts` (lines 390-443)

- [x] Updated `DailyCheckInForm` component ✅
  - [x] Display injury auto-response alert when triggered
  - [x] Show modified workouts count
  - [x] Show coach notification status
  - [x] Show program adjustment reasoning
  - [x] Show next steps for coach
  - **Updated**: `components/athlete/DailyCheckInForm.tsx` (lines 77, 145-146, 488-536)

- [ ] Hook into `WorkoutLog` API (FUTURE PHASE)
  - Can add post-workout pain detection in Phase 2

- [ ] Background Jobs Setup (FUTURE PHASE)
  - [ ] Nightly ACWR calculation for all active athletes
  - [ ] Email digest for pending injury approvals (send to coaches)

---

## 🎨 Phase 2: Injury Dashboard UI (Week 2-3) ✅ 40% COMPLETE

### Coach Components

#### 1. Injury Alert Center ✅ COMPLETED
**File**: `components/coach/injury/InjuryAlertCenter.tsx` (680 lines)

- [x] Component structure ✅
  - [x] Fetch alerts from API with SWR
  - [x] Fetch ACWR warnings from API
  - [x] Fetch modified workouts from API
  - [x] 30-second refresh interval for real-time updates
  - [x] Tab-based navigation (Alerts, ACWR, Modifications)

- [x] Summary Dashboard ✅
  - [x] Active injuries count + critical count
  - [x] ACWR warnings count + critical count
  - [x] Auto-modified workouts count + unreviewed count
  - [x] Total unreviewed badge (prominently displayed)

- [x] Alert Card Design (`InjuryAlertCard`) ✅
  - [x] Athlete name with severity badge
  - [x] Injury type and pain level (X/10)
  - [x] Detection timestamp (relative time in Swedish)
  - [x] Status badge (ACTIVE/MONITORING/RESOLVED)
  - [x] Color-coded border (severity-based)
  - [x] Key metrics: workouts modified, estimated return weeks, rehab phase
  - [x] Quick actions: View athlete, Mark as resolved
  - [x] Resolve button with loading state

- [x] ACWR Warning Card (`ACWRWarningCard`) ✅
  - [x] Athlete name with risk badge
  - [x] ACWR value display
  - [x] Risk level (CRITICAL/DANGER/CAUTION)
  - [x] Recommended action in alert box
  - [x] Link to monitoring dashboard

- [x] Modified Workout Card (`ModifiedWorkoutCard`) ✅
  - [x] Athlete name + auto-generated badge
  - [x] Workout date (Swedish format with weekday)
  - [x] Modification type badge (color-coded)
  - [x] Original type → Modified type flow
  - [x] Reasoning in alert box
  - [x] Review/approve button with loading state
  - [x] Visual distinction for unreviewed items

- [x] Empty States ✅
  - [x] No active injuries: "Inga aktiva skadevarningar" with checkmark icon
  - [x] No ACWR warnings: "Inga ACWR-varningar" with positive message
  - [x] No modifications: "Inga modifierade pass"

- [x] Loading & Error States ✅
  - [x] Loading message during data fetch
  - [x] Tab badges with notification dots
  - [x] Automatic sorting by urgency/risk
  - [x] Swedish locale for dates

**Total Lines**: 680 (exceeded estimate due to 3 comprehensive sub-components)

---

#### 2. Auto-Modified Workouts View
**File**: `components/coach/injury/AutoModifiedWorkouts.tsx`

- [ ] Component structure
  - [ ] Fetch modifications from API
  - [ ] Group by athlete
  - [ ] 14-day calendar view

- [ ] Modification Card Design
  - [ ] Date + day of week
  - [ ] Original workout (type, duration, intensity, zones)
  - [ ] Arrow/divider
  - [ ] Modified workout (with modification reason)
  - [ ] Modification type badge (EASY/REST/CROSS_TRAIN/REDUCED)
  - [ ] Approve/Reject checkbox

- [ ] Bulk Actions
  - [ ] "Approve All for [Athlete Name]" button
  - [ ] "Approve All" button (all athletes)
  - [ ] Confirmation dialog

- [ ] Comparison View
  - [ ] Side-by-side original vs modified
  - [ ] TSS comparison
  - [ ] Zone comparison
  - [ ] Volume reduction %

**Estimated**: 320-350 lines

---

#### 3. Injury Progress Timeline
**File**: `components/coach/injury/InjuryProgressTimeline.tsx`

- [ ] Component structure
  - [ ] Athlete selector dropdown
  - [ ] Fetch injury history for selected athlete
  - [ ] Timeline visualization

- [ ] Timeline Design (Recharts or custom)
  - [ ] Horizontal timeline with phases
  - [ ] Phase 1 (Walking) → Phase 2 (Walk-Run) → ... → Phase 5 (Full Training)
  - [ ] Current phase highlighted
  - [ ] Completion checkmarks for past phases
  - [ ] Expected completion date for current phase

- [ ] Phase Details Panel
  - [ ] Phase name and description
  - [ ] Completion criteria (e.g., "Pain-free walking 30+ min")
  - [ ] Progress indicators (% complete)
  - [ ] Days in current phase / Expected days
  - [ ] Next phase unlock countdown

- [ ] Daily Pain Chart
  - [ ] Line chart: Pain level (0-10) over time
  - [ ] Data from daily check-ins
  - [ ] Threshold lines (pain=3, pain=5)
  - [ ] Date range selector (7 days, 30 days, all time)

- [ ] Return-to-Running Prediction
  - [ ] Estimated return date
  - [ ] Confidence level (based on compliance and pain trends)
  - [ ] Milestone dates

**Estimated**: 400-450 lines

---

#### 4. ACWR Injury Risk Monitor
**File**: `components/coach/injury/ACWRRiskMonitor.tsx`

- [ ] Component structure
  - [ ] Fetch ACWR data for all athletes
  - [ ] Zone-based categorization

- [ ] Risk Zone Cards
  - [ ] 🟢 OPTIMAL (0.8-1.3): Count + athlete list
  - [ ] 🟡 CAUTION (1.3-1.5): Count + athlete list
  - [ ] 🔴 DANGER (1.5-2.0): Count + athlete list
  - [ ] ⚫ CRITICAL (>2.0): Count + athlete list
  - [ ] ⬇️ DETRAINING (<0.8): Count + athlete list

- [ ] Per-Athlete ACWR Chart
  - [ ] Select athlete from list
  - [ ] Line chart: 7-day acute load (blue), 28-day chronic load (green), ACWR ratio (red)
  - [ ] Zone shading (color background for OPTIMAL/CAUTION/DANGER)
  - [ ] 30-day timeline

- [ ] Auto-Intervention Log
  - [ ] List of automatic load reductions triggered by ACWR >1.3
  - [ ] Date, athlete, ACWR value, action taken
  - [ ] "Load reduced by 30% for next 3 days"

- [ ] Alert Notifications
  - [ ] Real-time alerts when athlete enters DANGER zone
  - [ ] Recommendation: "Reduce intensity by 40-50%, add extra rest day"

**Estimated**: 380-420 lines

---

### Coach Dashboard Integration
**File**: `components/coach/CoachDashboard.tsx` (modify existing)

- [ ] Add Injury Overview Card
  - [ ] Active injuries count with severity breakdown
  - [ ] CRITICAL count (red badge)
  - [ ] "Review Alerts" button → `/coach/injuries`

- [ ] Add ACWR Alert Card
  - [ ] Athletes in DANGER/CRITICAL zones count
  - [ ] "View Risk Monitor" button → `/coach/injuries/acwr`

- [ ] Add Pending Approvals Card
  - [ ] Count of auto-modifications pending approval
  - [ ] "Review Modifications" button → `/coach/injuries/modifications`

**Estimated**: 100-150 lines (additions)

---

## 🏊 Phase 3: Cross-Training Integration (Week 3-4)

### API Endpoints

- [ ] `GET /api/cross-training/substitutions/[clientId]` - Fetch auto-substitutions
  - [ ] Filter by date range (next 7 days, next 14 days)
  - [ ] Include original workout data
  - [ ] Include converted workout data
  - [ ] Include TSS comparison
  - [ ] Include fitness retention projection

- [ ] `POST /api/cross-training/preferences/[clientId]` - Set modality preferences
  - [ ] Preferred modalities (order of preference)
  - [ ] Equipment availability (has bike, has pool, has AlterG, has elliptical)
  - [ ] Dislikes/limitations
  - [ ] Injury-specific overrides

- [ ] `GET /api/cross-training/fitness-projection/[clientId]` - Calculate retention
  - [ ] Input: Injury duration (weeks), selected modality
  - [ ] Output: Expected VO2max retention %, return timeline

### Coach Components

#### 1. Cross-Training Substitution Schedule
**File**: `components/coach/cross-training/SubstitutionSchedule.tsx`

- [ ] Component structure
  - [ ] Athlete selector
  - [ ] Date range selector (7 days, 14 days)
  - [ ] Fetch substitutions from API

- [ ] 7-Day Calendar View
  - [ ] Each day card:
    - [ ] Original running workout (type, distance, duration, TSS)
    - [ ] Down arrow / conversion symbol
    - [ ] Converted cross-training workout (modality, duration, TSS)
    - [ ] Modality badge with icon (🏊 DWR, 🚴 Cycling, etc.)
    - [ ] TSS comparison: "100 TSS run → 75 TSS cycling"
    - [ ] Retention badge: "75% fitness retention"

- [ ] Weekly Summary Stats
  - [ ] Total running TSS replaced
  - [ ] Total cross-training TSS
  - [ ] Average retention %
  - [ ] Most used modality

- [ ] Quick Edit
  - [ ] Click workout to change modality
  - [ ] Recalculate TSS/duration
  - [ ] Save changes

**Estimated**: 360-400 lines

---

#### 2. Modality Preference Manager
**File**: `components/coach/cross-training/ModalityPreferences.tsx`

- [ ] Component structure
  - [ ] Per-athlete settings
  - [ ] Save to database

- [ ] Preference Form
  - [ ] Modality preference order (drag-and-drop ranking)
    - [ ] 1st choice, 2nd choice, 3rd choice
  - [ ] Equipment availability checkboxes
    - [ ] Has bike
    - [ ] Has pool access
    - [ ] Has elliptical
    - [ ] Has AlterG (rare - anti-gravity treadmill)
    - [ ] Has rowing machine
  - [ ] Limitations/dislikes text area

- [ ] Injury-Specific Overrides
  - [ ] For each injury type (9 types):
    - [ ] Recommended modality (from backend logic)
    - [ ] Override option (coach can change)
  - [ ] Example: "Plantar Fasciitis → DWR recommended (Override: Use cycling)"

- [ ] Preview
  - [ ] Show sample substitution with current preferences
  - [ ] "Running 10km @ 5:00/km → DWR 60 min"

**Estimated**: 320-350 lines

---

#### 3. Fitness Retention Projector
**File**: `components/coach/cross-training/FitnessProjection.tsx`

- [ ] Component structure
  - [ ] Input form: Injury duration (weeks), modality selection
  - [ ] Real-time calculation
  - [ ] Chart visualization

- [ ] Projection Chart (Recharts LineChart)
  - [ ] X-axis: Weeks of injury (0-12 weeks)
  - [ ] Y-axis: VO2max % (60-100%)
  - [ ] Multiple lines:
    - [ ] No training (red) - steep decline
    - [ ] Swimming (orange) - 45% retention
    - [ ] Cycling (yellow) - 75% retention
    - [ ] DWR (green) - 98% retention
  - [ ] Current athlete's baseline VO2max marker

- [ ] Comparison Table
  - [ ] Modality | Retention % | Expected VO2max after 4 weeks | Return Timeline
  - [ ] DWR | 98% | 52.0 ml/kg/min | 1 week return
  - [ ] Cycling | 75% | 48.5 ml/kg/min | 3 week return
  - [ ] Swimming | 45% | 42.0 ml/kg/min | 6 week return

- [ ] Recommendation Engine
  - [ ] Best modality based on:
    - [ ] Injury type compatibility
    - [ ] Equipment availability
    - [ ] Athlete preference
    - [ ] Fitness retention
  - [ ] "For plantar fasciitis with 4-week expected duration: DWR recommended"

**Estimated**: 340-380 lines

---

#### 4. AlterG Progression Tracker (LOW PRIORITY)
**File**: `components/coach/cross-training/AltergProgressionTracker.tsx`

- [ ] Component structure
  - [ ] Only show if athlete has AlterG access
  - [ ] 6-week protocol visualization

- [ ] Progression Timeline
  - [ ] Week 1: 50% body weight → Week 6: 100% body weight
  - [ ] Progress bar for current week
  - [ ] Completion checkmarks

- [ ] Weekly Protocol Details
  - [ ] Body weight %
  - [ ] Session duration
  - [ ] Pace/intensity
  - [ ] Pain monitoring requirement

- [ ] Advancement Criteria
  - [ ] "Pain-free at current % for 2 sessions → Advance to next %"
  - [ ] Auto-advance toggle (or manual)

- [ ] Pain Tracking
  - [ ] Post-session pain level (0-10)
  - [ ] Chart: Pain level over 6 weeks
  - [ ] Alert if pain increases

**Estimated**: 280-320 lines (DEFER if AlterG uncommon)

---

## 📊 Phase 4: Field Test Analysis (Week 4-5)

**Priority**: MEDIUM (not as common as other features)

### API Endpoints

- [ ] `GET /api/field-tests/[id]/analysis` - Get test analysis with chart data
  - [ ] For 30-Min TT: Split pacing, HR drift, calculated LT2
  - [ ] For Critical Velocity: Time/distance points, regression line, R²
  - [ ] For HR Drift: First half HR, second half HR, drift %
  - [ ] Confidence level, validation warnings/errors

- [ ] `GET /api/field-tests/progression/[clientId]` - Historical progression
  - [ ] All field tests over time
  - [ ] LT2 pace trend
  - [ ] Confidence levels
  - [ ] Comparison to lab tests (if exist)

### Coach Components

#### 1. Field Test Results Analyzer
**File**: `components/coach/field-tests/ResultsAnalyzer.tsx`

- [ ] Component structure
  - [ ] Test type tabs (30-Min TT / Critical Velocity / HR Drift)
  - [ ] Fetch analysis data
  - [ ] Chart visualization

- [ ] 30-Min Time Trial Tab
  - [ ] Pacing Chart (Recharts BarChart)
    - [ ] 10-min splits (0-10, 10-20, 20-30)
    - [ ] Optimal pacing = consistent bars
    - [ ] Highlight: Final 20 min used for LT2
  - [ ] HR Drift Chart (Recharts LineChart)
    - [ ] HR over 30 minutes
    - [ ] Trend line
  - [ ] Calculated Results Card
    - [ ] LT2 Pace: X:XX/km
    - [ ] LT2 HR: XXX bpm
    - [ ] Confidence: HIGH (if drift <5%)

- [ ] Critical Velocity Tab
  - [ ] Scatter Chart (Recharts ScatterChart)
    - [ ] X: Time (seconds)
    - [ ] Y: Distance (meters)
    - [ ] Points: Each trial
    - [ ] Regression line
  - [ ] R² Fit Quality
    - [ ] R² >0.95: VERY_HIGH confidence
    - [ ] R² >0.90: HIGH confidence
    - [ ] R² <0.90: LOW confidence (re-test recommended)
  - [ ] Calculated Results Card
    - [ ] Critical Velocity: X:XX/km
    - [ ] Estimated LT2: X:XX/km

- [ ] HR Drift Tab
  - [ ] HR Comparison (side-by-side bars)
    - [ ] First half avg HR
    - [ ] Second half avg HR
    - [ ] Drift %
  - [ ] Assessment
    - [ ] Drift <5%: "Below LT1 ✅"
    - [ ] Drift >5%: "Above LT1 ⚠️"

**Estimated**: 450-500 lines

---

#### 2. Test-to-Test Progression Chart
**File**: `components/coach/field-tests/ProgressionChart.tsx`

- [ ] Component structure
  - [ ] Athlete selector
  - [ ] Fetch progression data
  - [ ] Chart visualization

- [ ] Progression Chart (Recharts LineChart)
  - [ ] X-axis: Test date
  - [ ] Y-axis: LT2 pace (min/km)
  - [ ] Line: LT2 pace over time (lower = faster = better)
  - [ ] Points: Each test with confidence level (size or color)
    - [ ] Large green dot: HIGH confidence
    - [ ] Medium yellow dot: MEDIUM confidence
    - [ ] Small red dot: LOW confidence (flagged)

- [ ] Comparison Overlay
  - [ ] If athlete has lab tests, show as separate line
  - [ ] Field test line (blue) vs Lab test line (orange)
  - [ ] Divergence analysis: "Field tests align with lab (±3%)"

- [ ] Trend Analysis Box
  - [ ] LT2 improvement: "Improved 12 sec/km over 3 months"
  - [ ] Test frequency: "Tested every 9 weeks (optimal)"
  - [ ] Consistency score: "Pacing quality improved 15%"

**Estimated**: 320-360 lines

---

#### 3. Test Validation Dashboard
**File**: `components/coach/field-tests/ValidationDashboard.tsx`

- [ ] Component structure
  - [ ] Fetch all tests with validation issues
  - [ ] Filter by test type, confidence level

- [ ] Invalid Tests List
  - [ ] Test cards showing:
    - [ ] Athlete, test type, date
    - [ ] Validation errors (red badges)
      - [ ] "HR not ascending"
      - [ ] "Poor pacing (CV >5%)"
      - [ ] "Insufficient trials (CV)"
      - [ ] "HR drift >10% (suspect)"
    - [ ] Recommendations
      - [ ] "Re-test with better pacing"
      - [ ] "Add 1 more trial for CV"

- [ ] Review Actions
  - [ ] Approve test (override validation)
  - [ ] Flag for re-test
  - [ ] Delete invalid test
  - [ ] Add notes

- [ ] Statistics
  - [ ] Valid tests: X%
  - [ ] Invalid tests: X%
  - [ ] Most common errors

**Estimated**: 280-320 lines

---

#### 4. Test Schedule Planner
**File**: `components/coach/field-tests/TestSchedule.tsx`

- [ ] Component structure
  - [ ] Calendar view of scheduled tests
  - [ ] Athlete readiness checks

- [ ] Calendar View (next 12 weeks)
  - [ ] Scheduled tests (coach manually adds)
  - [ ] Completed tests (green checkmarks)
  - [ ] Overdue tests (red badges)
  - [ ] Recommended test dates (AI-suggested, every 8-12 weeks)

- [ ] Per-Athlete Test Status
  - [ ] Last test date
  - [ ] Days since last test
  - [ ] Recommended test date
  - [ ] Readiness score
    - [ ] ✅ Ready: 48h since last hard workout, readiness >75
    - [ ] ⚠️ Not ready: Tired or recent hard workout
    - [ ] 🚫 Injured: Skip test

- [ ] Batch Scheduling
  - [ ] "Schedule 30-Min TT for 5 athletes next Tuesday"
  - [ ] Send reminders (email + in-app)

**Estimated**: 300-340 lines

---

## 🎯 Phase 5: Dashboard Integration (Week 5-6)

### Main Coach Dashboard Updates
**File**: `components/coach/CoachDashboard.tsx`

- [ ] Layout restructure (if needed)
  - [ ] Current cards + new overview cards
  - [ ] Responsive grid (2-3 columns)

- [ ] Add Overview Cards (lightweight counts)
  - [ ] 🚨 Active Injuries Card
    - [ ] Count with severity breakdown
    - [ ] "3 active (1 CRITICAL, 2 RED)"
    - [ ] Quick link → `/coach/injuries`

  - [ ] ⚠️ ACWR Alerts Card
    - [ ] Athletes in DANGER/CRITICAL zones
    - [ ] "2 athletes at high injury risk"
    - [ ] Quick link → `/coach/injuries/acwr`

  - [ ] 🏊 Cross-Training Card
    - [ ] Athletes on substitution plans
    - [ ] "5 athletes on cross-training"
    - [ ] Quick link → `/coach/cross-training`

  - [ ] 📊 Pending Field Tests Card
    - [ ] Tests due this week
    - [ ] "7 athletes due for testing"
    - [ ] Quick link → `/coach/field-tests`

- [ ] Quick Actions Bar
  - [ ] "Review Injury Alerts" button
  - [ ] "Approve Modifications" button
  - [ ] "View ACWR Risk" button

**Estimated**: 150-200 lines (additions)

---

### Routing & Navigation
**File**: `app/coach/layout.tsx` or navigation component

- [ ] Add new routes
  - [ ] `/coach/injuries` - Injury Alert Center
  - [ ] `/coach/injuries/modifications` - Auto-Modified Workouts
  - [ ] `/coach/injuries/acwr` - ACWR Risk Monitor
  - [ ] `/coach/injuries/[id]` - Injury Progress Timeline (per athlete)
  - [ ] `/coach/cross-training` - Substitution Schedule
  - [ ] `/coach/cross-training/preferences` - Modality Preferences
  - [ ] `/coach/cross-training/projection` - Fitness Projection
  - [ ] `/coach/field-tests` - Test Results Analyzer
  - [ ] `/coach/field-tests/progression` - Historical Progression
  - [ ] `/coach/field-tests/schedule` - Test Planner

- [ ] Update sidebar navigation
  - [ ] Add "Injury Management" section with subsections
  - [ ] Add "Cross-Training" section
  - [ ] Add "Field Tests" section

**Estimated**: 50-100 lines

---

### Performance Optimization

- [ ] Dashboard Overview Caching
  - [ ] Implement SWR with 5-minute cache
  - [ ] Revalidate on focus

- [ ] Pagination
  - [ ] Injury alerts: 20 per page
  - [ ] Field tests: 20 per page
  - [ ] Cross-training schedule: 14 days max

- [ ] Lazy Loading
  - [ ] Charts only load when tab/section visible
  - [ ] Use dynamic imports for heavy components

- [ ] Background Jobs (Cron or Queue)
  - [ ] Nightly ACWR calculation (runs at 3am)
  - [ ] Email digest for pending approvals (runs at 8am)
  - [ ] Test reminders (runs daily at 6pm)

**Tools**: Vercel Cron, Bull Queue, or similar

---

## 📧 Notification System

### Email Notifications (via Resend)

- [ ] Injury Detected - High Priority
  - [ ] To: Coach
  - [ ] Subject: "🚨 Injury Detected: [Athlete Name] - [Severity]"
  - [ ] Body: Injury details, auto-triggered actions, link to review

- [ ] ACWR Critical Zone - High Priority
  - [ ] To: Coach
  - [ ] Subject: "⚠️ ACWR Alert: [Athlete Name] at CRITICAL risk"
  - [ ] Body: Current ACWR, recommendations, link to dashboard

- [ ] Pending Modifications Digest - Daily
  - [ ] To: Coach
  - [ ] Subject: "📋 Daily Summary: X modifications pending approval"
  - [ ] Body: List of pending actions, link to approve

- [ ] Field Test Reminder - 2 days before
  - [ ] To: Athlete
  - [ ] Subject: "📊 Field Test Scheduled: [Test Type] on [Date]"
  - [ ] Body: Preparation instructions, readiness check

### In-App Notifications

- [ ] Notification Center Component
  - [ ] Bell icon with unread count badge
  - [ ] Dropdown list of notifications
  - [ ] Mark as read
  - [ ] Click → navigate to relevant page

- [ ] Notification Types
  - [ ] INJURY_DETECTED
  - [ ] ACWR_CRITICAL
  - [ ] MODIFICATION_PENDING
  - [ ] TEST_REMINDER
  - [ ] PHASE_ADVANCED (injury progress)

- [ ] Database Integration
  - [ ] Store in `Notification` model
  - [ ] Mark read/unread
  - [ ] Delete after 30 days

**Estimated**: 200-250 lines (email templates + notification component)

---

## ✅ Testing & Validation

### Integration Tests
- [ ] Injury Detection Flow
  - [ ] Athlete submits daily check-in with pain=7
  - [ ] `processInjuryDetection()` triggered
  - [ ] `InjuryAssessment` created
  - [ ] 14 `WorkoutModification` records created
  - [ ] Coach notification sent (email + in-app)
  - [ ] Coach sees alert in `InjuryAlertCenter`

- [ ] Cross-Training Substitution Flow
  - [ ] Injury detected → cross-training generated
  - [ ] 7-day schedule created
  - [ ] TSS equivalency calculated
  - [ ] Coach sees in `SubstitutionSchedule`
  - [ ] Coach approves
  - [ ] Athlete sees updated workouts

- [ ] ACWR Monitoring Flow
  - [ ] Athlete logs high-volume week
  - [ ] ACWR calculated (nightly job)
  - [ ] ACWR >1.5 detected
  - [ ] Auto-reduction triggered
  - [ ] Coach alerted
  - [ ] Coach sees in `ACWRRiskMonitor`

- [ ] Field Test Analysis Flow
  - [ ] Athlete completes 30-Min TT
  - [ ] Coach submits via `FieldTestForm`
  - [ ] Backend calculates LT2, HR drift
  - [ ] Validation checks run
  - [ ] Results displayed in `ResultsAnalyzer`
  - [ ] Training zones updated (if approved)

### End-to-End Test Scenarios
- [ ] Scenario 1: Plantar Fasciitis Detection
  - [ ] Pain=6, Plantar Fasciitis
  - [ ] Next 5 runs → DWR
  - [ ] AlterG progression (if available)
  - [ ] 5-phase return protocol

- [ ] Scenario 2: ACWR Spike
  - [ ] Athlete increases volume 50% in one week
  - [ ] ACWR jumps to 1.8 (DANGER)
  - [ ] Next 3 workouts auto-reduced by 40%
  - [ ] Coach approves reductions

- [ ] Scenario 3: Field Test Validation Failure
  - [ ] Athlete submits 30-Min TT with poor pacing
  - [ ] Validation errors: "CV >5%, HR drift >10%"
  - [ ] Test flagged as LOW confidence
  - [ ] Coach sees in ValidationDashboard
  - [ ] Coach schedules re-test

---

## 📚 Documentation

- [ ] Update `CLAUDE.md` with new features
  - [ ] Injury management system overview
  - [ ] Cross-training system overview
  - [ ] Field test system overview
  - [ ] API endpoint documentation

- [ ] Create user guides (for coaches)
  - [ ] "How to Review Injury Alerts"
  - [ ] "Understanding ACWR Risk Zones"
  - [ ] "Setting Up Cross-Training Preferences"
  - [ ] "Analyzing Field Test Results"

- [ ] Create API documentation
  - [ ] `/api/injury/*` endpoints
  - [ ] `/api/cross-training/*` endpoints
  - [ ] `/api/field-tests/*` endpoints
  - [ ] Request/response examples

- [ ] Database schema documentation
  - [ ] New models: `Notification`
  - [ ] Updated models: `WorkoutModification`, `InjuryAssessment`
  - [ ] Relationships diagram

---

## 📊 Progress Tracking

### Week 1-2: Core Backend ✅/❌
- [ ] Phase 1 API endpoints complete
- [ ] Database migrations run
- [ ] Background jobs configured
- [ ] Integration tests passing

### Week 2-3: Injury UI ✅/❌
- [ ] InjuryAlertCenter deployed
- [ ] AutoModifiedWorkouts deployed
- [ ] InjuryProgressTimeline deployed
- [ ] ACWRRiskMonitor deployed
- [ ] Coach dashboard updated

### Week 3-4: Cross-Training UI ✅/❌
- [ ] SubstitutionSchedule deployed
- [ ] ModalityPreferences deployed
- [ ] FitnessProjection deployed
- [ ] Integration with injury system tested

### Week 4-5: Field Tests UI ✅/❌
- [ ] ResultsAnalyzer deployed
- [ ] ProgressionChart deployed
- [ ] ValidationDashboard deployed
- [ ] TestSchedule deployed

### Week 5-6: Polish & Deploy ✅/❌
- [ ] Dashboard integration complete
- [ ] Notifications working (email + in-app)
- [ ] Performance optimization done
- [ ] Documentation complete
- [ ] End-to-end tests passing
- [ ] Production deployment

---

## 🗑️ Norwegian Code Cleanup (Post-Audit)

**Status**: Pending audit results

### Files to Potentially Remove
- [ ] `lib/training-engine/generators/norwegian-singles-generator.ts` (if unused)
- [ ] `lib/training-engine/sessions/norwegian-*.ts` (if unused)
- [ ] `/api/norwegian-singles/*` routes (if they exist and unused)

### Files to Keep
- [x] `lib/training-engine/methodologies/norwegian.ts` (core methodology)
- [x] Norwegian session templates used by program generator
- [x] Integration in `determineWorkoutDistribution()`

### Cleanup PR
- [ ] Create branch: `chore/cleanup-norwegian-standalone`
- [ ] Remove unused files
- [ ] Update imports
- [ ] Test program generation (Polarized, Canova, Pyramidal, Norwegian)
- [ ] Update documentation
- [ ] Merge to main

---

## 📈 Success Metrics

### Technical Metrics
- [ ] All API endpoints <500ms response time
- [ ] Dashboard overview loads <1 second
- [ ] Charts render <500ms
- [ ] Email notifications sent within 5 minutes of trigger
- [ ] Background jobs complete in <10 minutes

### User Metrics
- [ ] Coaches can review injury alerts in <30 seconds
- [ ] Auto-modifications approved in <2 minutes
- [ ] Cross-training schedule visible in <10 seconds
- [ ] Field test results analyzed in <1 minute

### Coverage Metrics
- [ ] 80% of injuries auto-detected from daily check-ins
- [ ] 90% of ACWR spikes caught before injury
- [ ] 100% of high-pain reports trigger notifications
- [ ] 95% of auto-modifications approved without override

---

## 🔍 Known Issues & Limitations

### AlterG Equipment
- **Issue**: AlterG is expensive equipment (~$35,000), most athletes won't have access
- **Mitigation**: Make AlterG features optional, hide if athlete doesn't have access
- **Priority**: LOW - Can defer AlterG progression tracker

### Field Test Adoption
- **Issue**: Field tests not as common as daily check-ins or injury reports
- **Mitigation**: Make field test features accessible but not prominent
- **Priority**: MEDIUM - Build after injury/cross-training systems

### Norwegian Method Confusion
- **Issue**: User initially thought Norwegian needed UI, but it's integrated in program builder
- **Resolution**: Audit code, remove standalone generator if unused
- **Action**: Complete audit first, then cleanup

### Email Delivery
- **Issue**: Resend API rate limits, email deliverability
- **Mitigation**: Batch emails (daily digest), implement retry logic
- **Monitoring**: Track email bounce rates, unsubscribes

---

## 📞 Support & Questions

For questions during implementation:
- Technical questions: Check `CLAUDE.md` and existing backend code
- UI/UX questions: Reference existing coach dashboard components
- Database questions: See `prisma/schema.prisma`

**Last Updated**: 2025-01-22
**Next Review**: After Phase 1 completion (Week 2)
