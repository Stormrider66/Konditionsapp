# API Reference

Complete documentation for all API endpoints in the Konditionstest Training Platform.

**Base URL**: `http://localhost:3000` (development) or your production domain
**Auth**: All endpoints require Supabase Auth JWT in Authorization header
**Response**: JSON with `{ success: boolean, data?: any, error?: string }`

---

## Table of Contents

1. [AI & Chat](#ai--chat) (20 routes)
2. [Athlete Portal](#athlete-portal) (18 routes)
3. [Integrations](#integrations) (12 routes)
4. [Ergometer Testing](#ergometer-testing) (10 routes)
5. [Calendar & Events](#calendar--events) (12 routes)
6. [Clients](#clients) (7 routes)
7. [Tests & Calculations](#tests--calculations) (11 routes)
8. [Training Programs](#training-programs) (6 routes)
9. [Workouts](#workouts) (11 routes)
10. [Strength Training](#strength-training) (14 routes)
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
22. [Sport Profile](#sport-profile) (2 routes)
23. [Norwegian Method](#norwegian-method) (2 routes)
24. [Video Analysis](#video-analysis) (6 routes)
25. [Nutrition](#nutrition) (4 routes)
26. [Menstrual Cycle](#menstrual-cycle) (3 routes)
27. [Audio Journal](#audio-journal) (2 routes)
28. [Business & Locations](#business--locations) (7 routes)
29. [Organizations](#organizations) (2 routes)
30. [Teams](#teams) (5 routes)
31. [Payments & Subscriptions](#payments--subscriptions) (6 routes)
32. [Referrals](#referrals) (5 routes)
33. [Settings](#settings) (3 routes)
34. [Auth](#auth) (2 routes)
35. [System & Admin](#system--admin) (11 routes)

**Total: 232 route files**

---

## AI & Chat

### Core Chat
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ai/chat` | Stream AI responses (Claude/Gemini) with context |
| GET | `/api/ai/conversations` | List conversations |
| POST | `/api/ai/conversations` | Create conversation |
| GET | `/api/ai/conversations/[id]` | Get conversation with messages |
| PUT | `/api/ai/conversations/[id]` | Update conversation |
| DELETE | `/api/ai/conversations/[id]` | Delete conversation |
| POST | `/api/ai/conversations/[id]/message` | Send message |

### AI Generation
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ai/save-program` | Save AI-generated program to DB |
| POST | `/api/ai/nutrition-plan` | Generate nutrition recommendations |
| POST | `/api/ai/generate-chart` | Generate dynamic charts |
| POST | `/api/ai/lactate-ocr` | Extract lactate values from images |
| GET/PUT | `/api/ai/config` | AI configuration |
| GET | `/api/ai/models` | List available models |
| GET/PUT | `/api/ai/models/preference` | Model preference |

### AI WOD (Workout of the Day)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ai/wod` | Generate readiness-aware daily workout |
| POST | `/api/ai/wod/repeat` | Regenerate WOD variation |

### Advanced Intelligence
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ai/advanced-intelligence/patterns` | Analyze training patterns |
| POST | `/api/ai/advanced-intelligence/predictions` | Predict performance/race times |
| POST | `/api/ai/advanced-intelligence/injury-risk` | Calculate injury risk |
| POST | `/api/ai/advanced-intelligence/periodization` | Auto-adjust periodization |
| POST | `/api/ai/advanced-intelligence/coach-style` | Extract coaching style |

---

## Athlete Portal

### Profile & Data
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/athlete/me` | Get current athlete profile |
| GET | `/api/athlete/coach` | Get assigned coach info |
| GET | `/api/athlete/training-load` | Get training load data |
| GET | `/api/athlete/team-rank` | Get team ranking |
| GET | `/api/athlete/integrated-activity` | Get unified activity feed |
| GET | `/api/athlete/garmin-prefill` | Prefill from Garmin data |
| GET/PUT | `/api/athlete/ai-config` | Athlete AI settings |
| GET | `/api/athlete/ai-suggestions` | Get AI suggestions |

### Concept2
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/athlete/concept2/import` | Import Concept2 workouts |
| GET | `/api/athlete/concept2/workouts` | List Concept2 workouts |

### VBT (Velocity-Based Training)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/athlete/vbt` | List VBT sessions |
| POST | `/api/athlete/vbt/upload` | Upload VBT session data |
| GET | `/api/athlete/vbt/[sessionId]` | Get VBT session details |
| GET | `/api/athlete/vbt/profile` | Get load-velocity profile |
| GET | `/api/athlete/vbt/progression` | Get VBT progression |

### Strength Sessions (Athlete)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/athlete/strength-sessions` | List assigned strength sessions |
| POST | `/api/athlete/strength-sessions/self-assign` | Self-assign template |

### Athlete-Specific Data
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/athletes/[clientId]/cardio-sessions` | Athlete's cardio sessions |
| GET | `/api/athletes/[clientId]/hybrid-workouts` | Athlete's hybrid workouts |
| GET | `/api/athletes/[clientId]/hybrid-results` | Athlete's hybrid results |

### Athlete Accounts
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/athlete-accounts` | Manage athlete accounts |

---

## Integrations

### Strava
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/integrations/strava` | Get Strava connection status |
| GET | `/api/integrations/strava/callback` | OAuth callback |
| POST | `/api/integrations/strava/sync` | Sync Strava activities |
| POST | `/api/integrations/strava/webhook` | Strava webhook handler |

### Garmin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/integrations/garmin` | Get Garmin connection status |
| GET | `/api/integrations/garmin/callback` | OAuth callback |
| POST | `/api/integrations/garmin/sync` | Sync Garmin activities |
| POST | `/api/integrations/garmin/webhook` | Garmin webhook handler |

### Concept2
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/integrations/concept2` | Get Concept2 connection status |
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
| GET | `/api/ergometer-thresholds/[clientId]` | Client's thresholds |
| GET/POST | `/api/ergometer-zones` | List/create zones |
| GET | `/api/ergometer-zones/[clientId]` | Client's zones |

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
| GET | `/api/calendar/unified` | Get unified calendar view |
| GET | `/api/calendar/conflicts` | Detect scheduling conflicts |
| GET/POST | `/api/calendar/constraints` | Training constraints |
| GET | `/api/calendar/my-availability` | Get availability |
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
| GET | `/api/calendar/notifications` | Calendar notifications |
| PUT | `/api/calendar/notifications/[id]` | Mark as read |

---

## Clients

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/clients` | List/create clients |
| GET/PUT/DELETE | `/api/clients/[id]` | CRUD single client |
| GET | `/api/clients/[id]/context-summary` | AI context summary |
| GET | `/api/clients/[id]/paces` | Elite training paces (VDOT/Lactate/HR) |
| GET | `/api/clients/[id]/programs` | Client's programs |
| GET/POST | `/api/clients/[id]/progression/[exerciseId]` | Exercise progression |

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
| PUT | `/api/programs/[id]/edit` | Edit program structure |
| GET | `/api/programs/[id]/zones` | Get program zones |
| POST | `/api/programs/[id]/days/[dayId]/add-workout` | Add workout to day |
| POST | `/api/programs/generate` | Auto-generate program |

---

## Workouts

### CRUD
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/PUT/DELETE | `/api/workouts/[id]` | CRUD single workout |
| POST | `/api/workouts/create` | Create standalone workout |
| POST | `/api/workouts/quick-create` | Quick create workout |

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
| GET | `/api/workouts/modifications` | List pending modifications |
| PUT | `/api/workouts/modifications/[id]/review` | Coach review |

---

## Strength Training

### Sessions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/strength-sessions` | List/create sessions |
| GET/PUT/DELETE | `/api/strength-sessions/[id]` | CRUD single session |
| POST | `/api/strength-sessions/[id]/assign` | Assign to client |
| GET/POST | `/api/strength-sessions/[id]/sets` | Manage sets |
| GET/POST | `/api/strength-sessions/[id]/focus-mode` | Focus mode |
| POST | `/api/strength-sessions/generate` | Generate session |

### Templates
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/strength-templates` | List/create templates |
| GET | `/api/strength-templates/system` | System templates |
| GET | `/api/strength-templates/system/[id]` | Get system template |

### Progression
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/strength-pr` | Log personal record |
| GET | `/api/progression/history` | Progression history |
| POST | `/api/progression/calculate` | Calculate 1RM (Epley/Brzycki) |

---

## Cardio Sessions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/cardio-sessions` | List/create sessions |
| GET/PUT/DELETE | `/api/cardio-sessions/[id]` | CRUD single session |
| POST | `/api/cardio-sessions/[id]/assign` | Assign to client |
| GET/POST | `/api/cardio-sessions/[id]/focus-mode` | Focus mode |
| PUT | `/api/cardio-sessions/[id]/segments/[index]` | Update segment |
| GET | `/api/cardio-templates` | List cardio templates |

---

## Hybrid/HYROX

### Workouts
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/hybrid-workouts` | List/create (AMRAP, EMOM, FOR_TIME, etc.) |
| GET/PUT/DELETE | `/api/hybrid-workouts/[id]` | CRUD single workout |
| POST | `/api/hybrid-workouts/[id]/results` | Submit results |
| GET | `/api/hybrid-workouts/[id]/versions` | Version history |
| GET/POST | `/api/hybrid-workouts/[id]/focus-mode` | Focus mode |
| PUT | `/api/hybrid-workouts/[id]/rounds/[number]` | Update round |

### Assignments & Analysis
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/hybrid-assignments` | List/create assignments |
| GET/PUT/DELETE | `/api/hybrid-assignments/[id]` | CRUD single assignment |
| GET | `/api/hybrid-movements` | List HYROX stations/movements |
| POST | `/api/hybrid-analytics` | Analyze performance by station |

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
| GET | `/api/field-tests/[id]/analysis` | Detailed analysis |
| GET | `/api/field-tests/progression/[clientId]` | Progression history |
| POST | `/api/field-tests/schedule` | Schedule field test |

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
| GET | `/api/readiness` | Calculate readiness score |
| POST | `/api/training-load/warnings` | ACWR-based warnings |

---

## Injury Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/injury/assess` | Delaware pain assessment |
| POST | `/api/injury/process-checkin` | Process injury from check-in |
| GET | `/api/injury/alerts` | Get injury alerts |
| PUT | `/api/injury/alerts/[id]/resolve` | Resolve alert |

---

## Cross-Training

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/cross-training/convert` | Convert workout (TSS equivalency) |
| GET | `/api/cross-training/substitutions/[clientId]` | Get alternatives |
| GET | `/api/cross-training/preferences/[clientId]` | Modality preferences |
| GET | `/api/cross-training/fitness-projection/[clientId]` | Project fitness |

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
| GET/DELETE | `/api/documents/[id]` | Get/delete document |
| POST | `/api/documents/[id]/embed` | Generate embeddings |
| POST | `/api/knowledge/search` | Semantic search |
| POST | `/api/knowledge/context` | Build RAG context |

---

## Body Composition

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/body-composition` | List/create bioimpedance records |
| GET/PUT/DELETE | `/api/body-composition/[id]` | CRUD single record |

---

## Sport Profile

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/sport-profile` | Create sport profile |
| GET/PUT | `/api/sport-profile/[clientId]` | Get/update profile |

**Sports**: RUNNING, CYCLING, SWIMMING, TRIATHLON, HYROX, SKIING, GENERAL_FITNESS

---

## Norwegian Method

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/norwegian-singles/eligibility/[clientId]` | Check 5 prerequisites |
| POST | `/api/norwegian-singles/generate` | Generate double-threshold workouts |

---

## Video Analysis

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/video-analysis` | List/create analyses |
| POST | `/api/video-analysis/upload` | Upload video (max 100MB) |
| GET/DELETE | `/api/video-analysis/[id]` | Get/delete analysis |
| POST | `/api/video-analysis/[id]/analyze` | Analyze with Gemini + MediaPipe |
| GET | `/api/video-analysis/[id]/landmarks` | Get skeletal landmarks |
| POST | `/api/video-analysis/analyze-pose-data` | Analyze raw pose data |

**Analysis types**: Running gait, Skiing technique, HYROX station

---

## Nutrition

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/nutrition/preferences` | Dietary preferences |
| GET/POST | `/api/nutrition/goals` | Macro goals |
| GET | `/api/nutrition/guidance` | Nutrition guidance |
| GET | `/api/nutrition/tip` | Daily tip |

---

## Menstrual Cycle

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/menstrual-cycle` | Cycle tracking |
| POST | `/api/menstrual-cycle/daily-log` | Daily log |
| GET | `/api/menstrual-cycle/insights/[clientId]` | Training insights by phase |

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

## Payments & Subscriptions

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/payments/create-checkout` | Create Stripe checkout (athlete) |
| POST | `/api/payments/coach/create-checkout` | Create Stripe checkout (coach) |
| POST | `/api/payments/portal` | Stripe customer portal (athlete) |
| POST | `/api/payments/coach/portal` | Stripe customer portal (coach) |
| GET | `/api/payments/subscription` | Get subscription status |
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

---

## Auth

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/auth/google/callback` | Google OAuth callback |
| POST | `/api/auth/signup-athlete` | Athlete signup |

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
| GET | `/api/analytics` | System analytics |
| GET | `/api/admin/stats` | Admin statistics |
| GET | `/api/admin/users` | Admin user management |
| POST | `/api/send-report-email` | Email test report |
| POST | `/api/reports/[testId]/share` | Share report |
| GET | `/api/locale` | Get locale |
| POST | `/api/lactate/quick-capture` | Quick lactate capture |
| POST | `/api/invitations` | Create invitation |
| GET | `/api/invitations/[code]` | Get invitation |

### Cron Jobs
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/cron/calculate-acwr` | Nightly ACWR calculation |
| POST | `/api/cron/injury-digest` | Injury digest emails |

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

*Total: 232 route files | Last Updated: January 2026*
