# API Reference

Complete documentation for all API endpoints in the Konditionstest Training Platform.

**Base URL**: `http://localhost:3000` (development) or your production domain
**Auth**: All endpoints require Supabase Auth JWT in Authorization header
**Response**: JSON with `{ success: boolean, data?: any, error?: string }`

---

## Table of Contents

1. [AI & Chat](#ai--chat) (36 routes)
2. [Athlete Portal](#athlete-portal) (29 routes)
3. [Integrations](#integrations) (12 routes)
4. [Ergometer Testing](#ergometer-testing) (10 routes)
5. [Calendar & Events](#calendar--events) (11 routes)
6. [Clients](#clients) (7 routes)
7. [Tests & Calculations](#tests--calculations) (11 routes)
8. [Training Programs](#training-programs) (7 routes)
9. [Workouts](#workouts) (13 routes)
10. [Strength Training](#strength-training) (13 routes)
11. [Cardio Sessions](#cardio-sessions) (6 routes)
12. [Hybrid/HYROX](#hybridhyrox) (10 routes)
13. [Exercise Library](#exercise-library) (4 routes)
14. [Field Tests](#field-tests) (4 routes)
15. [Race Results](#race-results) (2 routes)
16. [Monitoring & Readiness](#monitoring--readiness) (3 routes)
17. [Injury Management](#injury-management) (4 routes)
18. [Cross-Training](#cross-training) (4 routes)
19. [Messaging](#messaging) (2 routes)
20. [Documents & Knowledge](#documents--knowledge) (6 routes)
21. [Body Composition](#body-composition) (2 routes)
22. [Sport Profile & Tests](#sport-profile--tests) (5 routes)
23. [Video Analysis](#video-analysis) (6 routes)
25. [Nutrition & Meals](#nutrition--meals) (7 routes)
26. [Menstrual Cycle](#menstrual-cycle) (3 routes)
27. [Habits](#habits) (3 routes)
28. [Audio Journal](#audio-journal) (2 routes)
29. [Business & Locations](#business--locations) (7 routes)
30. [Organizations](#organizations) (2 routes)
31. [Teams](#teams) (5 routes)
32. [Match Schedule](#match-schedule) (2 routes)
33. [Payments & Subscriptions](#payments--subscriptions) (6 routes)
34. [Referrals](#referrals) (5 routes)
35. [Settings](#settings) (4 routes)
36. [Auth](#auth) (2 routes)
37. [Coach Dashboard](#coach-dashboard) (6 routes)
38. [System & Admin](#system--admin) (15 routes)

**Total: 285 route files**

---

## AI & Chat

### Core Chat
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ai/chat` | Stream AI responses (Claude/Gemini) with context |
| GET/POST | `/api/ai/conversations` | List/create conversations |
| GET/PUT/DELETE | `/api/ai/conversations/[id]` | CRUD single conversation |
| POST | `/api/ai/conversations/[id]/message` | Send message |

### AI Generation
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ai/generate-program` | Generate training program |
| GET | `/api/ai/generate-program/[sessionId]/progress` | Program generation progress |
| POST | `/api/ai/save-program` | Save AI-generated program to DB |
| POST | `/api/ai/nutrition-plan` | Generate nutrition recommendations |
| POST | `/api/ai/generate-chart` | Generate dynamic charts |
| POST | `/api/ai/lactate-ocr` | Extract lactate values from images |
| GET | `/api/ai/config` | AI configuration |
| GET | `/api/ai/models` | List available models |
| GET/POST | `/api/ai/models/preference` | Model preference |

### AI Budget
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/ai/budget` | AI budget management |
| POST | `/api/ai/budget/reset` | Reset AI budget |
| GET | `/api/ai/budget/usage` | AI usage stats |

### AI WOD (Workout of the Day)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/ai/wod` | Generate readiness-aware daily workout |
| POST | `/api/ai/wod/repeat` | Regenerate WOD variation |

### AI Memory
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/ai/memory/extract` | Extract/store AI memories |
| GET/DELETE | `/api/ai/memory/[clientId]` | Client AI memories |

### Deep Research
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/ai/deep-research` | Deep research sessions |
| GET/PUT | `/api/ai/deep-research/[sessionId]` | Session details |
| GET | `/api/ai/deep-research/[sessionId]/progress` | Research progress |
| POST | `/api/ai/deep-research/[sessionId]/save` | Save research |
| POST | `/api/ai/deep-research/[sessionId]/share` | Share research |

### Performance Analysis
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ai/performance-analysis/analyze-test` | Analyze test results |
| POST | `/api/ai/performance-analysis/compare-tests` | Compare multiple tests |
| POST | `/api/ai/performance-analysis/training-correlation` | Training correlation |
| POST | `/api/ai/performance-analysis/trends` | Performance trends |

### Advanced Intelligence
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ai/advanced-intelligence/patterns` | Analyze training patterns |
| POST | `/api/ai/advanced-intelligence/predictions` | Predict performance/race times |
| POST | `/api/ai/advanced-intelligence/injury-risk` | Calculate injury risk |
| POST | `/api/ai/advanced-intelligence/periodization` | Auto-adjust periodization |
| POST | `/api/ai/advanced-intelligence/coach-style` | Extract coaching style |

### Workout Optimization
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/ai/workout-optimization` | Real-time workout optimization based on readiness, ACWR, injuries |

---

## Athlete Portal

### Profile & Data
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/PUT | `/api/athlete/me` | Get/update current athlete profile |
| GET | `/api/athlete/coach` | Get assigned coach info |
| GET | `/api/athlete/training-load` | Get training load data |
| GET | `/api/athlete/team-rank` | Get team ranking |
| GET/POST | `/api/athlete/integrated-activity` | Get unified activity feed |
| GET | `/api/athlete/garmin-prefill` | Prefill from Garmin data |
| GET/POST | `/api/athlete/ai-config` | Athlete AI settings |
| GET/POST | `/api/athlete/ai-suggestions` | AI suggestions |
| GET | `/api/athlete/injury-prevention` | Injury prevention tips |
| GET | `/api/athlete/streaks` | Training streaks |
| GET | `/api/athlete/yearly-summary` | Yearly training summary |
| GET | `/api/athlete/zone-distribution` | Zone distribution stats |
| GET | `/api/athlete/workout-feedback` | Workout feedback |

### Briefings & Notifications
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/athlete/briefing` | Morning briefings |
| GET/PUT/DELETE | `/api/athlete/briefing/[id]` | Single briefing |
| GET/POST | `/api/athlete/notification-preferences` | Notification prefs |
| GET/POST | `/api/athlete/notifications` | Notifications |
| DELETE | `/api/athlete/notifications/[id]` | Delete notification |

### Training Summary
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/athlete/training-summary` | Training summary |
| GET | `/api/athlete/training-summary/[weekStart]` | Weekly summary |

### Research
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/athlete/research` | Athlete research |
| GET/DELETE | `/api/athlete/research/[sessionId]` | Research session |

### Concept2
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/athlete/concept2/import` | Import Concept2 workouts |
| GET | `/api/athlete/concept2/workouts` | List Concept2 workouts |

### VBT (Velocity-Based Training)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/athlete/vbt` | List/create VBT sessions |
| GET/PUT/DELETE | `/api/athlete/vbt/[sessionId]` | VBT session details |
| GET | `/api/athlete/vbt/profile` | Load-velocity profile |
| GET | `/api/athlete/vbt/progression` | VBT progression |
| POST | `/api/athlete/vbt/upload` | Upload VBT session data |

### Strength Sessions (Athlete)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/athlete/strength-sessions` | Assigned strength sessions |
| POST | `/api/athlete/strength-sessions/self-assign` | Self-assign template |

### Live HR
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/athlete/live-hr/push` | Push live HR data |

### Athlete-Specific Data
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/athletes/[clientId]/cardio-sessions` | Athlete's cardio sessions |
| GET/POST | `/api/athletes/[clientId]/hybrid-workouts` | Athlete's hybrid workouts |
| GET/POST | `/api/athletes/[clientId]/hybrid-results` | Athlete's hybrid results |
| GET/POST | `/api/athlete-accounts` | Manage athlete accounts |

---

## Integrations

### Strava
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/integrations/strava` | Strava connection status |
| GET | `/api/integrations/strava/callback` | OAuth callback |
| POST | `/api/integrations/strava/sync` | Sync Strava activities |
| POST | `/api/integrations/strava/webhook` | Strava webhook handler |

### Garmin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/integrations/garmin` | Garmin connection status |
| GET | `/api/integrations/garmin/callback` | OAuth callback |
| POST | `/api/integrations/garmin/sync` | Sync Garmin activities |
| POST | `/api/integrations/garmin/webhook` | Garmin webhook handler |

### Concept2
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/integrations/concept2` | Concept2 connection status |
| GET | `/api/integrations/concept2/callback` | OAuth callback |
| POST | `/api/integrations/concept2/sync` | Sync Concept2 results |
| POST | `/api/integrations/concept2/webhook` | Concept2 webhook handler |

---

## Ergometer Testing

### Tests
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/ergometer-tests` | List/create ergometer tests |
| GET/PUT/DELETE | `/api/ergometer-tests/[id]` | CRUD single test |
| GET | `/api/ergometer-tests/progression/[clientId]` | Test progression history |

### Thresholds & Zones
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/ergometer-thresholds` | List/create thresholds |
| GET/PUT | `/api/ergometer-thresholds/[clientId]` | Client's thresholds |
| GET/POST | `/api/ergometer-zones` | List/create zones |
| GET/PUT | `/api/ergometer-zones/[clientId]` | Client's zones |

### Analysis
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ergometer/classify` | Classify athlete level |
| POST | `/api/ergometer/pacing` | Get pacing recommendations |
| POST | `/api/ergometer/predict` | Predict performance |

---

## Calendar & Events

### Calendar Events
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/calendar-events` | List/create events (races, camps, illness, etc.) |
| GET/PUT/DELETE | `/api/calendar-events/[id]` | CRUD single event |

### Calendar Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/calendar/unified` | Get unified calendar view |
| POST | `/api/calendar/conflicts` | Detect scheduling conflicts |
| POST | `/api/calendar/constraints` | Training constraints |
| GET/POST | `/api/calendar/my-availability` | Get/set availability |
| POST | `/api/calendar/reschedule` | Reschedule workouts |

### External Calendar
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/calendar/external` | External calendar connections |
| GET/PUT/DELETE | `/api/calendar/external/[id]` | Manage connection |
| POST | `/api/calendar/external/[id]/sync` | Sync external calendar |

### Notifications
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/calendar/notifications` | Calendar notifications |
| GET/DELETE | `/api/calendar/notifications/[id]` | Manage notification |

---

## Clients

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/clients` | List/create clients |
| GET/PUT/DELETE | `/api/clients/[id]` | CRUD single client |
| GET | `/api/clients/[id]/context-summary` | AI context summary |
| GET | `/api/clients/[id]/paces` | Elite training paces (VDOT/Lactate/HR) |
| GET/POST | `/api/clients/[id]/programs` | Client's programs |
| GET/PUT | `/api/clients/[id]/progression/[exerciseId]` | Exercise progression |

---

## Tests & Calculations

### Physiological Tests
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/tests` | List/create tests |
| GET/PUT/DELETE | `/api/tests/[id]` | CRUD single test |
| POST | `/api/tests/[id]/recalculate` | Recalculate results |

### Templates
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/templates` | List/create test templates |
| GET/PUT/DELETE | `/api/templates/[id]` | CRUD single template |

### Calculations
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/calculations/thresholds` | Calculate lactate thresholds (D-max) |
| POST | `/api/calculations/zones` | Calculate training zones |
| POST | `/api/calculations/vdot` | Calculate VDOT from race |
| POST | `/api/calculations/goal-zones` | Goal-based zone calculation |
| POST | `/api/calculations/environmental` | WBGT, altitude, wind corrections |

---

## Training Programs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/programs` | List/create programs |
| GET/PUT/DELETE | `/api/programs/[id]` | CRUD single program |
| GET/PUT | `/api/programs/[id]/edit` | Edit program structure |
| GET | `/api/programs/[id]/zones` | Get program zones |
| POST | `/api/programs/[id]/days/[dayId]/add-workout` | Add workout to day |
| POST | `/api/programs/generate` | Auto-generate program |

---

## Workouts

### CRUD
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/workouts` | List/create workouts |
| POST | `/api/workouts/create` | Create standalone workout |
| POST | `/api/workouts/quick-create` | Quick create workout |
| GET/PUT/DELETE | `/api/workouts/[id]` | CRUD single workout |

### Logging
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/workouts/[id]/logs` | List/create workout logs |
| GET/PUT/DELETE | `/api/workouts/[id]/logs/[logId]` | CRUD single log |
| POST | `/api/workouts/[id]/logs/[logId]/sets` | Add sets to log |

### Modifications
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/workouts/[id]/change-type` | Change workout type |
| GET/POST | `/api/workouts/[id]/focus-mode` | Focus mode for workout |
| POST | `/api/workouts/modify` | Modify based on readiness |
| GET/POST | `/api/workouts/modifications` | List/create modifications |
| PUT | `/api/workouts/modifications/[id]/review` | Coach review |

---

## Strength Training

### Sessions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/strength-sessions` | List/create sessions |
| GET/PUT/DELETE | `/api/strength-sessions/[id]` | CRUD single session |
| POST | `/api/strength-sessions/[id]/assign` | Assign to client |
| POST | `/api/strength-sessions/[id]/sets` | Manage sets |
| POST | `/api/strength-sessions/[id]/focus-mode` | Focus mode |
| POST | `/api/strength-sessions/generate` | Generate session |

### Templates
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/strength-templates` | List/create templates |
| GET/POST | `/api/strength-templates/system` | System templates |
| GET/PUT/DELETE | `/api/strength-templates/system/[id]` | CRUD system template |

### Progression
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/strength-pr` | Log personal record |
| GET | `/api/progression/history` | Progression history |
| POST | `/api/progression/calculate` | Calculate 1RM (Epley/Brzycki) |

---

## Cardio Sessions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/cardio-sessions` | List/create sessions |
| GET/PUT/DELETE | `/api/cardio-sessions/[id]` | CRUD single session |
| POST | `/api/cardio-sessions/[id]/assign` | Assign to client |
| POST | `/api/cardio-sessions/[id]/focus-mode` | Focus mode |
| GET/PUT/DELETE | `/api/cardio-sessions/[id]/segments/[index]` | Update segment |
| GET/POST | `/api/cardio-templates` | List cardio templates |

---

## Hybrid/HYROX

### Workouts
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/hybrid-workouts` | List/create (AMRAP, EMOM, FOR_TIME, etc.) |
| GET/PUT/DELETE | `/api/hybrid-workouts/[id]` | CRUD single workout |
| GET/POST | `/api/hybrid-workouts/[id]/results` | Submit/get results |
| GET/POST | `/api/hybrid-workouts/[id]/versions` | Version history |
| POST | `/api/hybrid-workouts/[id]/focus-mode` | Focus mode |
| GET/PUT/DELETE | `/api/hybrid-workouts/[id]/rounds/[number]` | Round details |

### Assignments & Analysis
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/hybrid-assignments` | List/create assignments |
| GET/PUT/DELETE | `/api/hybrid-assignments/[id]` | CRUD single assignment |
| GET/POST | `/api/hybrid-movements` | List HYROX stations/movements |
| GET/POST | `/api/hybrid-analytics` | Analyze performance by station |

---

## Exercise Library

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/exercises` | List/create (84 exercises, filterable) |
| GET/PUT/DELETE | `/api/exercises/[id]` | CRUD single exercise |
| GET | `/api/exercises/[id]/alternatives` | Same-pillar alternatives |
| GET | `/api/exercises/[id]/progression-path` | Easier/harder variations |

**Query params**: `search`, `pillar`, `level`, `difficulty`, `limit`, `offset`

---

## Field Tests

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/field-tests` | List/create (30-min TT, HR drift, CV) |
| POST | `/api/field-tests/[id]/analysis` | Detailed analysis |
| GET | `/api/field-tests/progression/[clientId]` | Progression history |
| GET | `/api/field-tests/schedule` | Schedule field test |

---

## Race Results

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/race-results` | List/create with auto-VDOT |
| GET/PUT/DELETE | `/api/race-results/[id]` | CRUD single race |

---

## Monitoring & Readiness

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/daily-metrics` | Daily check-in data (HRV, sleep, soreness) |
| GET/POST | `/api/readiness` | Calculate readiness score |
| GET | `/api/training-load/warnings` | ACWR-based warnings |

---

## Injury Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/injury/assess` | Delaware pain assessment |
| POST | `/api/injury/process-checkin` | Process injury from check-in |
| GET/POST | `/api/injury/alerts` | Get/create injury alerts |
| POST | `/api/injury/alerts/[id]/resolve` | Resolve alert |

---

## Cross-Training

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/cross-training/convert` | Convert workout (TSS equivalency) |
| GET/PUT | `/api/cross-training/substitutions/[clientId]` | Get/update alternatives |
| GET/PUT | `/api/cross-training/preferences/[clientId]` | Modality preferences |
| GET/PUT | `/api/cross-training/fitness-projection/[clientId]` | Project fitness |

**Modalities**: DWR (98%), Cycling (75%), Swimming (45%), Elliptical (65%), AlterG, Rowing (70%)

---

## Messaging

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/messages` | List/send messages |
| GET/PUT/DELETE | `/api/messages/[id]` | CRUD single message |

---

## Documents & Knowledge

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/documents` | List/create documents |
| POST | `/api/documents/upload` | Upload file (max 50MB) |
| GET/PUT/DELETE | `/api/documents/[id]` | Get/update/delete document |
| POST | `/api/documents/[id]/embed` | Generate embeddings |
| POST | `/api/knowledge/search` | Semantic search |
| GET | `/api/knowledge/context` | Build RAG context |

---

## Body Composition

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/body-composition` | List/create bioimpedance records |
| GET/PUT/DELETE | `/api/body-composition/[id]` | CRUD single record |

---

## Sport Profile & Tests

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/sport-profile` | Create sport profile |
| GET/PUT/DELETE | `/api/sport-profile/[clientId]` | Get/update/delete profile |
| GET/POST | `/api/sport-tests` | Sport-specific tests |
| GET/PUT/DELETE | `/api/sport-tests/[id]` | CRUD sport test |
| GET | `/api/sport-performance` | Sport performance data |

**Sports**: RUNNING, CYCLING, SWIMMING, TRIATHLON, HYROX, SKIING, GENERAL_FITNESS, FUNCTIONAL_FITNESS, STRENGTH, TEAM_FOOTBALL, TEAM_ICE_HOCKEY, TEAM_HANDBALL, TEAM_FLOORBALL, TEAM_BASKETBALL, TEAM_VOLLEYBALL, TENNIS, PADEL

---

## Video Analysis

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/video-analysis` | List/create analyses |
| POST | `/api/video-analysis/upload` | Upload video (max 100MB) |
| GET/PUT/DELETE | `/api/video-analysis/[id]` | Get/update/delete analysis |
| POST | `/api/video-analysis/[id]/analyze` | Analyze with Gemini + MediaPipe |
| GET | `/api/video-analysis/[id]/landmarks` | Get skeletal landmarks |
| POST | `/api/video-analysis/analyze-pose-data` | Analyze raw pose data |

**Analysis types**: Running gait, Skiing technique, HYROX station

---

## Nutrition & Meals

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/nutrition/preferences` | Dietary preferences |
| GET/POST | `/api/nutrition/goals` | Macro goals |
| GET/POST | `/api/nutrition/guidance` | Nutrition guidance |
| GET | `/api/nutrition/tip` | Daily tip |
| GET/POST | `/api/meals` | List/create meals |
| GET/PUT/DELETE | `/api/meals/[mealId]` | CRUD single meal |

---

## Menstrual Cycle

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/menstrual-cycle` | Cycle tracking |
| POST | `/api/menstrual-cycle/daily-log` | Daily log |
| GET | `/api/menstrual-cycle/insights/[clientId]` | Training insights by phase |

---

## Habits

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/habits` | List/create habits |
| GET/PUT/DELETE | `/api/habits/[habitId]` | CRUD single habit |
| POST | `/api/habits/[habitId]/log` | Log habit completion |

---

## Audio Journal

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/audio-journal` | List/create voice logs |
| POST | `/api/audio-journal/[id]/process` | Process audio |

---

## Business & Locations

### Business
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/business` | List/create businesses |
| GET/PUT/DELETE | `/api/business/[id]` | CRUD single business |
| GET/POST | `/api/business/[id]/members` | Manage members |
| GET | `/api/business/[id]/stats` | Business statistics |

### Locations
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/locations` | List/create locations |
| GET/PUT/DELETE | `/api/locations/[id]` | CRUD single location |
| GET | `/api/locations/[id]/stats` | Location statistics |

---

## Organizations

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/organizations` | List/create organizations |
| GET/PUT/DELETE | `/api/organizations/[id]` | CRUD single org |

---

## Teams

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/teams` | List/create teams |
| GET/PUT/DELETE | `/api/teams/[id]` | CRUD single team |
| GET | `/api/teams/[id]/dashboard` | Team dashboard |
| GET | `/api/teams/[id]/leaderboard` | Team leaderboard |
| POST | `/api/teams/[id]/assign-workout` | Assign workout to team |

---

## Match Schedule

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/match-schedule` | List/create matches |
| GET/PUT/DELETE | `/api/match-schedule/[matchId]` | CRUD single match |

---

## Payments & Subscriptions

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/payments/create-checkout` | Create Stripe checkout (athlete) |
| POST | `/api/payments/coach/create-checkout` | Create Stripe checkout (coach) |
| GET | `/api/payments/portal` | Stripe customer portal (athlete) |
| GET | `/api/payments/coach/portal` | Stripe customer portal (coach) |
| GET/PUT | `/api/payments/subscription` | Get/update subscription status |
| POST | `/api/payments/webhook` | Stripe webhook handler |

**Tiers**: FREE, STANDARD, PREMIUM, ENTERPRISE

---

## Referrals

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/referrals` | List/create referrals |
| GET/POST | `/api/referrals/code` | Get/create referral code |
| POST | `/api/referrals/validate` | Validate referral code |
| POST | `/api/referrals/apply` | Apply referral code |
| GET | `/api/referrals/rewards` | Get referral rewards |

---

## Settings

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/settings/api-keys` | BYOK API keys (encrypted) |
| POST | `/api/settings/api-keys/validate` | Validate API key |
| GET/PUT | `/api/settings/default-model` | Default AI model |
| POST | `/api/send-report-email` | Email test report |

---

## Auth

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/auth/google/callback` | Google OAuth callback |
| POST | `/api/auth/signup-athlete` | Athlete signup |

---

## Coach Dashboard

### Alerts
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/coach/alerts` | Coach alerts |
| GET/PUT/DELETE | `/api/coach/alerts/[id]` | CRUD single alert |

### Live HR Sessions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/coach/live-hr/sessions` | Live HR sessions |
| GET/PUT/DELETE | `/api/coach/live-hr/sessions/[id]` | CRUD single session |
| GET | `/api/coach/live-hr/sessions/[id]/participants` | Session participants |
| GET | `/api/coach/live-hr/sessions/[id]/stream` | Live HR stream |

---

## System & Admin

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/me` | Current user |
| GET/POST | `/api/users` | List/create users (admin) |

### Testers
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/testers` | List/create testers |
| GET/PUT/DELETE | `/api/testers/[id]` | CRUD single tester |
| GET | `/api/testers/[id]/stats` | Tester statistics |

### System
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/system-validation` | Multi-system validation cascade |
| GET/POST | `/api/analytics` | System analytics |
| GET/POST | `/api/admin/stats` | Admin statistics |
| GET/POST | `/api/admin/users` | Admin user management |
| POST | `/api/reports/[testId]/share` | Share report |
| GET | `/api/locale` | Get locale |
| POST | `/api/lactate/quick-capture` | Quick lactate capture |
| GET/POST | `/api/invitations` | Create invitation |
| GET | `/api/invitations/[code]` | Get invitation |

### Cron Jobs
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/cron/calculate-acwr` | Nightly ACWR calculation |
| POST | `/api/cron/coach-alerts` | Coach alerts processing |
| POST | `/api/cron/injury-digest` | Injury digest emails |
| POST | `/api/cron/mental-prep` | Mental preparation reminders |
| POST | `/api/cron/milestone-detection` | Milestone detection |
| POST | `/api/cron/morning-briefings` | Morning briefings |
| POST | `/api/cron/pattern-detection` | Training pattern detection |
| POST | `/api/cron/poll-program-generation` | Poll program generation |
| POST | `/api/cron/poll-research` | Poll research sessions |
| POST | `/api/cron/post-workout-checkins` | Post-workout check-ins |
| POST | `/api/cron/preworkout-nudges` | Pre-workout nudges |
| POST | `/api/cron/reset-budgets` | Reset AI budgets |
| POST | `/api/cron/weekly-summary` | Weekly summary generation |

---

## Error Responses

```json
{ "success": false, "error": "Error message", "code": "ERROR_CODE" }
```

| Status | Description |
|--------|-------------|
| 400 | Bad Request (validation) |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 500 | Internal Error |

---

## Rate Limiting

- AI endpoints: 20/min
- Calculation endpoints: 60/min
- Standard: 100/min

---

*Total: 287 route files | Last Updated: January 2026*
