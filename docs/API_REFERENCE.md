# API Reference

Complete documentation for all API endpoints in the Elite Training Platform.

**Base URL**: `http://localhost:3000` (development) or your production domain
**Auth**: All endpoints require Supabase Auth JWT in Authorization header (unless noted)
**Response**: JSON with `{ success: boolean, data?: any, error?: string }`

---

## Table of Contents

1. [AI & Chat](#ai--chat) (34 routes)
2. [Athlete Portal](#athlete-portal) (31 routes)
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
13. [Agility Training](#agility-training) (8 routes)
14. [Exercise Library](#exercise-library) (4 routes)
15. [Field Tests](#field-tests) (4 routes)
16. [Race Results](#race-results) (3 routes)
17. [Monitoring & Readiness](#monitoring--readiness) (3 routes)
18. [Injury Management](#injury-management) (6 routes)
19. [Physio System](#physio-system) (16 routes)
20. [Cross-Training](#cross-training) (4 routes)
21. [Messaging](#messaging) (2 routes)
22. [Documents & Knowledge](#documents--knowledge) (6 routes)
23. [Body Composition](#body-composition) (2 routes)
24. [Sport Profile & Tests](#sport-profile--tests) (5 routes)
25. [Video Analysis](#video-analysis) (6 routes)
26. [Nutrition & Meals](#nutrition--meals) (7 routes)
27. [Menstrual Cycle](#menstrual-cycle) (3 routes)
28. [Habits](#habits) (3 routes)
29. [Audio Journal](#audio-journal) (2 routes)
30. [Ad-Hoc Workouts](#ad-hoc-workouts) (7 routes)
31. [Business & Locations](#business--locations) (7 routes)
32. [Organizations](#organizations) (2 routes)
33. [Teams](#teams) (5 routes)
34. [Match Schedule](#match-schedule) (2 routes)
35. [Timing Gates](#timing-gates) (4 routes)
36. [Live HR](#live-hr) (4 routes)
37. [Payments & Subscriptions](#payments--subscriptions) (8 routes)
38. [Referrals](#referrals) (5 routes)
39. [Settings](#settings) (4 routes)
40. [Auth](#auth) (3 routes)
41. [Coach Dashboard](#coach-dashboard) (6 routes)
42. [Data Moat](#data-moat) (20 routes)
43. [Admin](#admin) (30 routes)
44. [Cron Jobs](#cron-jobs) (16 routes)
45. [External API v1](#external-api-v1) (4 routes)

**Total: 402 route files across 82 categories**

---

## AI & Chat

### Core Chat
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ai/chat` | Stream AI responses (Claude/Gemini/GPT) with athlete context |
| GET/POST | `/api/ai/conversations` | List/create conversations |
| GET/PUT/DELETE | `/api/ai/conversations/[id]` | CRUD single conversation |
| POST | `/api/ai/conversations/[id]/message` | Send message |

### AI Generation
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ai/generate-program` | Generate training program (multi-part for 8+ weeks) |
| GET | `/api/ai/generate-program/[sessionId]/progress` | Program generation progress |
| POST | `/api/ai/save-program` | Save AI-generated program to DB |
| POST | `/api/ai/nutrition-plan` | Generate nutrition recommendations |
| POST | `/api/ai/generate-chart` | Generate dynamic charts |
| POST | `/api/ai/lactate-ocr` | Extract lactate values from images |
| GET | `/api/ai/models` | List available AI models |
| GET/POST | `/api/ai/models/preference` | User model preference |

### AI Budget
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/ai/budget` | AI budget management |
| POST | `/api/ai/budget/reset` | Reset AI budget |
| GET | `/api/ai/budget/usage` | AI usage statistics |

### AI WOD (Workout of the Day)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/ai/wod` | Generate readiness-aware daily workout |
| POST | `/api/ai/wod/repeat` | Regenerate WOD variation |

### AI Memory
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ai/memory/extract` | Extract memories from conversation |
| GET/DELETE | `/api/ai/memory/[clientId]` | Client AI memories |

### Deep Research
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/ai/deep-research` | Deep research sessions |
| GET/PUT | `/api/ai/deep-research/[sessionId]` | Session details |
| GET | `/api/ai/deep-research/[sessionId]/progress` | Research progress |
| POST | `/api/ai/deep-research/[sessionId]/save` | Save research |
| POST | `/api/ai/deep-research/[sessionId]/share` | Share with athlete |

### Performance Analysis
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ai/performance-analysis/analyze-test` | Analyze single test |
| POST | `/api/ai/performance-analysis/compare-tests` | Compare multiple tests |
| POST | `/api/ai/performance-analysis/training-correlation` | Training-to-performance mapping |
| POST | `/api/ai/performance-analysis/trends` | Long-term progression |

### Advanced Intelligence
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ai/advanced-intelligence/patterns` | Detect training patterns |
| POST | `/api/ai/advanced-intelligence/predictions` | Performance predictions |
| POST | `/api/ai/advanced-intelligence/injury-risk` | Injury risk assessment |
| POST | `/api/ai/advanced-intelligence/periodization` | Periodization recommendations |
| POST | `/api/ai/advanced-intelligence/coach-style` | Coach decision patterns |

### Workout Optimization
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/ai/workout-optimization` | Real-time workout optimization |

---

## Athlete Portal

### Profile & Data
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/PUT | `/api/athlete/me` | Current athlete profile |
| GET | `/api/athlete/coach` | Assigned coach info |
| GET | `/api/athlete/training-load` | Training load data |
| GET | `/api/athlete/team-rank` | Team ranking |
| GET/POST | `/api/athlete/integrated-activity` | Unified activity feed |
| GET | `/api/athlete/garmin-prefill` | Prefill from Garmin |
| GET/POST | `/api/athlete/ai-config` | AI chat settings |
| GET/POST | `/api/athlete/ai-suggestions` | AI suggestions |
| GET | `/api/athlete/injury-prevention` | Injury prevention tips |
| GET | `/api/athlete/streaks` | Training streaks |
| GET | `/api/athlete/yearly-summary` | Yearly summary |
| GET | `/api/athlete/zone-distribution` | Zone distribution stats |
| GET | `/api/athlete/subscription-status` | Subscription tier and usage |

### Briefings & Notifications
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/athlete/briefing` | Morning briefings |
| GET/PUT/DELETE | `/api/athlete/briefing/[id]` | Single briefing |
| GET/POST | `/api/athlete/notification-preferences` | Notification prefs |
| GET/POST | `/api/athlete/notifications` | Notifications |

### Research
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/athlete/research` | Athlete research sessions |
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
| POST | `/api/athlete/vbt/upload` | Upload VBT data |

### Live HR
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/athlete/live-hr/push` | Push live HR data |

---

## Integrations

### Strava
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/integrations/strava` | Connection status |
| GET | `/api/integrations/strava/callback` | OAuth callback |
| POST | `/api/integrations/strava/sync` | Sync activities |
| POST | `/api/integrations/strava/webhook` | Webhook handler |

### Garmin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/integrations/garmin` | Connection status |
| GET | `/api/integrations/garmin/callback` | OAuth callback |
| POST | `/api/integrations/garmin/sync` | Sync activities |
| POST | `/api/integrations/garmin/webhook` | Webhook handler |

### Concept2
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/integrations/concept2` | Connection status |
| GET | `/api/integrations/concept2/callback` | OAuth callback |
| POST | `/api/integrations/concept2/sync` | Sync results |
| POST | `/api/integrations/concept2/webhook` | Webhook handler |

---

## Ergometer Testing

### Tests
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/ergometer-tests` | List/create ergometer tests |
| GET/PUT/DELETE | `/api/ergometer-tests/[id]` | CRUD single test |
| GET | `/api/ergometer-tests/progression/[clientId]` | Progression history |

### Thresholds & Zones
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/ergometer-thresholds` | List/create thresholds |
| GET/PUT | `/api/ergometer-thresholds/[clientId]` | Client thresholds |
| GET/POST | `/api/ergometer-zones` | List/create zones |
| GET/PUT | `/api/ergometer-zones/[clientId]` | Client zones |

### Analysis
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ergometer/classify` | Classify athlete level |
| POST | `/api/ergometer/pacing` | Pacing recommendations |
| POST | `/api/ergometer/predict` | Performance prediction |

---

## Calendar & Events

### Calendar Events
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/calendar-events` | List/create events (races, camps, illness) |
| GET/PUT/DELETE | `/api/calendar-events/[id]` | CRUD single event |

### Calendar Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/calendar/unified` | Unified calendar view |
| POST | `/api/calendar/conflicts` | Conflict detection |
| POST | `/api/calendar/constraints` | Training constraints |
| GET/POST | `/api/calendar/my-availability` | Availability |
| POST | `/api/calendar/reschedule` | AI-powered rescheduling |

### External Calendar
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/calendar/external` | External connections (Google, Outlook) |
| GET/PUT/DELETE | `/api/calendar/external/[id]` | Manage connection |
| POST | `/api/calendar/external/[id]/sync` | Sync external calendar |

---

## Clients

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/clients` | List/create clients |
| GET/PUT/DELETE | `/api/clients/[id]` | CRUD single client |
| GET | `/api/clients/[id]/context-summary` | AI context summary |
| GET | `/api/clients/[id]/paces` | Elite training paces |
| GET/POST | `/api/clients/[id]/programs` | Client programs |
| GET/PUT | `/api/clients/[id]/progression/[exerciseId]` | Exercise progression |

---

## Tests & Calculations

### Physiological Tests
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/tests` | List/create lab tests |
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
| POST | `/api/calculations/environmental` | WBGT, altitude corrections |

---

## Training Programs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/programs` | List/create programs |
| GET/PUT/DELETE | `/api/programs/[id]` | CRUD single program |
| GET/PUT | `/api/programs/[id]/edit` | Edit program structure |
| GET | `/api/programs/[id]/zones` | Program zones |
| POST | `/api/programs/[id]/days/[dayId]/add-workout` | Add workout to day |
| POST | `/api/programs/generate` | Auto-generate program |

---

## Workouts

### CRUD
| Method | Endpoint | Description |
|--------|----------|-------------|
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
| GET/POST | `/api/workouts/[id]/focus-mode` | Focus mode |
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
| POST | `/api/strength-sessions/generate` | Auto-generate session |

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
| GET/POST | `/api/hybrid-workouts` | List/create (AMRAP, EMOM, FOR_TIME) |
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
| GET/POST | `/api/hybrid-movements` | HYROX stations/movements |
| GET/POST | `/api/hybrid-analytics` | Performance by station |

---

## Agility Training

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/agility-drills` | List/create drills |
| GET/PUT/DELETE | `/api/agility-drills/[id]` | CRUD single drill |
| GET/POST | `/api/agility-workouts` | List/create workouts |
| GET/PUT/DELETE | `/api/agility-workouts/[id]` | CRUD single workout |
| POST | `/api/agility-workouts/[id]/assign` | Assign to athlete |
| POST | `/api/agility-workouts/[id]/results` | Submit results |

---

## Exercise Library

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/exercises` | List/create (84 exercises) |
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
| POST | `/api/race-results/[id]/analysis` | AI race analysis |

---

## Monitoring & Readiness

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/daily-metrics` | Daily check-in (HRV, sleep, soreness) |
| GET/POST | `/api/readiness` | Calculate readiness score |
| GET | `/api/training-load/warnings` | ACWR-based warnings |

---

## Injury Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/injury/assess` | Delaware pain assessment |
| POST | `/api/injury/process-checkin` | Process injury from check-in |
| GET/POST | `/api/injury/alerts` | Injury alerts |
| POST | `/api/injury/alerts/[id]/resolve` | Resolve alert |
| GET/POST | `/api/injury/acute-report` | Acute injury reports |
| POST | `/api/injury/acute-report/[id]/assess` | Assess acute injury |

---

## Physio System

### Assignments
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/physio/assignments` | Physio assignments |
| GET/PUT/DELETE | `/api/physio/assignments/[id]` | CRUD single assignment |

### Athletes
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/physio/athletes` | Physio-managed athletes |
| GET | `/api/physio/athletes/[id]` | Single athlete details |
| GET | `/api/physio/athletes/[id]/history` | Injury/treatment history |

### Rehab Programs
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/physio/rehab-programs` | List/create rehab programs |
| GET/PUT/DELETE | `/api/physio/rehab-programs/[id]` | CRUD single program |
| GET/POST | `/api/physio/rehab-programs/[id]/exercises` | Program exercises |
| GET/POST | `/api/physio/rehab-programs/[id]/milestones` | Program milestones |
| POST | `/api/physio/rehab-programs/[id]/progress` | Log progress |

### Restrictions & Treatments
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/physio/restrictions` | Training restrictions |
| GET/PUT/DELETE | `/api/physio/restrictions/[id]` | CRUD single restriction |
| GET/POST | `/api/physio/treatments` | Treatment sessions (SOAP) |
| GET/PUT/DELETE | `/api/physio/treatments/[id]` | CRUD single treatment |
| GET/POST | `/api/physio/screenings` | Movement screenings |
| GET/PUT/DELETE | `/api/physio/screenings/[id]` | CRUD single screening |

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
| GET/PUT/DELETE | `/api/documents/[id]` | CRUD single document |
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
| GET/PUT/DELETE | `/api/sport-profile/[clientId]` | CRUD profile |
| GET/POST | `/api/sport-tests` | Sport-specific tests |
| GET/PUT/DELETE | `/api/sport-tests/[id]` | CRUD sport test |
| GET | `/api/sport-performance` | Performance data |

**Sports**: RUNNING, CYCLING, SWIMMING, TRIATHLON, HYROX, SKIING, GENERAL_FITNESS, FUNCTIONAL_FITNESS, STRENGTH, TEAM_FOOTBALL, TEAM_ICE_HOCKEY, TEAM_HANDBALL, TEAM_FLOORBALL, TEAM_BASKETBALL, TEAM_VOLLEYBALL, TENNIS, PADEL

---

## Video Analysis

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/video-analysis` | List/create analyses |
| POST | `/api/video-analysis/upload` | Upload video (max 100MB) |
| GET/PUT/DELETE | `/api/video-analysis/[id]` | CRUD single analysis |
| POST | `/api/video-analysis/[id]/analyze` | Analyze (MediaPipe + Gemini) |
| GET | `/api/video-analysis/[id]/landmarks` | Get skeletal landmarks |
| POST | `/api/video-analysis/analyze-pose-data` | Analyze raw pose data |

**Types**: Running gait, Skiing technique, HYROX station, Strength form

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
| POST | `/api/habits/[habitId]/log` | Log completion |

---

## Audio Journal

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/audio-journal` | List/create voice logs |
| POST | `/api/audio-journal/[id]/process` | Process audio |

---

## Ad-Hoc Workouts

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/adhoc-workouts` | List/create ad-hoc workouts |
| GET/PUT/DELETE | `/api/adhoc-workouts/[id]` | CRUD single workout |
| POST | `/api/adhoc-workouts/import/strava` | Import from Strava |
| POST | `/api/adhoc-workouts/import/garmin` | Import from Garmin |
| POST | `/api/adhoc-workouts/voice` | Voice-to-workout |
| POST | `/api/adhoc-workouts/photo` | Photo-to-workout |
| POST | `/api/adhoc-workouts/text` | Text-to-workout |

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

## Timing Gates

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/timing-gates` | List/create sessions |
| GET/PUT/DELETE | `/api/timing-gates/[sessionId]` | CRUD single session |
| GET/POST | `/api/timing-gates/[sessionId]/results` | Session results |
| POST | `/api/timing-gates/import` | Import timing data |

---

## Live HR

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/coach/live-hr/sessions` | Live HR sessions |
| GET/PUT/DELETE | `/api/coach/live-hr/sessions/[id]` | CRUD single session |
| GET | `/api/coach/live-hr/sessions/[id]/participants` | Session participants |
| GET | `/api/coach/live-hr/sessions/[id]/stream` | Live HR stream |

---

## Payments & Subscriptions

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/payments/create-checkout` | Stripe checkout (athlete) |
| POST | `/api/payments/coach/create-checkout` | Stripe checkout (coach) |
| GET | `/api/payments/portal` | Customer portal (athlete) |
| GET | `/api/payments/coach/portal` | Customer portal (coach) |
| GET/PUT | `/api/payments/subscription` | Subscription status |
| POST | `/api/payments/webhook` | Stripe webhook |
| GET | `/api/athlete/subscription-status` | Athlete tier and usage |
| GET | `/api/coach/subscription-status` | Coach tier and limits |

**Tiers**: FREE, STANDARD, PREMIUM, ENTERPRISE

---

## Referrals

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/referrals` | List/create referrals |
| GET/POST | `/api/referrals/code` | Get/create referral code |
| POST | `/api/referrals/validate` | Validate referral code |
| POST | `/api/referrals/apply` | Apply referral code |
| GET | `/api/referrals/rewards` | Referral rewards |

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
| POST | `/api/auth/signup-athlete` | Direct athlete signup (FREE tier) |
| POST | `/api/auth/register/partner` | Partner registration |

---

## Coach Dashboard

### Alerts
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/coach/alerts` | Coach alerts |
| GET/PUT/DELETE | `/api/coach/alerts/[id]` | CRUD single alert |

### Athlete Mode
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/athlete-mode` | Toggle athlete view mode |
| GET | `/api/athlete-mode/status` | Current mode status |

---

## Data Moat

### Coach Decisions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/data-moat/coach-decisions` | Log coach decisions |
| POST | `/api/data-moat/coach-decisions/[id]/outcome` | Record outcomes |
| GET | `/api/data-moat/coach-decisions/analytics` | Decision analytics |

### Predictions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/data-moat/predictions` | Generate predictions |
| GET | `/api/data-moat/predictions/[id]` | Prediction details |
| POST | `/api/data-moat/predictions/[id]/validate` | Validate prediction |
| GET | `/api/data-moat/predictions/accuracy` | Model accuracy |

### Training Analysis
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/data-moat/training-outcomes` | Track outcomes |
| GET | `/api/data-moat/training-outcomes/analytics` | Outcome analytics |
| GET | `/api/data-moat/training-outcomes/[id]/report` | Outcome report |
| GET | `/api/data-moat/exercise-effectiveness` | Exercise ROI |
| GET | `/api/data-moat/patterns` | Training patterns |

### Cohorts & Consent
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/data-moat/cohorts` | Create athlete cohorts |
| GET | `/api/data-moat/cohorts/benchmark` | Benchmark against cohort |
| GET/PUT | `/api/data-moat/consent/[athleteId]` | Data consent |
| GET/POST | `/api/data-moat/feedback` | Collect feedback |
| GET | `/api/data-moat/feedback/aggregate` | Aggregate feedback |
| GET | `/api/data-moat/models` | ML models |
| GET | `/api/data-moat/prompts` | ML prompts |

---

## Admin

### Business Administration
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/admin/businesses` | Manage businesses |
| GET/PUT/DELETE | `/api/admin/businesses/[id]` | CRUD single business |
| GET/POST | `/api/admin/businesses/[id]/members` | Business members |
| GET/POST | `/api/admin/businesses/[id]/api-keys` | API keys |
| GET/POST | `/api/admin/contracts` | Enterprise contracts |

### Monitoring
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/monitoring/errors` | System errors |
| POST | `/api/admin/monitoring/errors/[id]/resolve` | Resolve error |
| GET | `/api/admin/monitoring/metrics` | System metrics |
| GET | `/api/admin/monitoring/stream` | Real-time events |

### Pricing & Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/admin/pricing` | Pricing tiers |
| GET/POST | `/api/admin/pricing/overrides` | Custom pricing |
| POST | `/api/admin/pricing/sync-stripe` | Sync with Stripe |
| GET | `/api/admin/stats` | Platform statistics |
| GET/POST | `/api/admin/users` | User management |

---

## Cron Jobs

All cron jobs require Bearer token authentication.

| Method | Endpoint | Schedule | Purpose |
|--------|----------|----------|---------|
| POST | `/api/cron/calculate-acwr` | Nightly | ACWR injury risk calculation |
| POST | `/api/cron/expire-trials` | Daily | Expire ended trials |
| POST | `/api/cron/trial-warnings` | Daily | Email expiring trials |
| POST | `/api/cron/reset-ai-usage` | Daily | Reset AI token budgets |
| POST | `/api/cron/reset-budgets` | Daily | Reset subscription usage |
| POST | `/api/cron/morning-briefings` | Morning | Daily briefings |
| POST | `/api/cron/preworkout-nudges` | Pre-workout | Workout reminders |
| POST | `/api/cron/post-workout-checkins` | Post-workout | Check-in nudges |
| POST | `/api/cron/pattern-detection` | Daily | Detect training patterns |
| POST | `/api/cron/milestone-detection` | Daily | Auto-detect PRs |
| POST | `/api/cron/mental-prep` | Pre-race | Mental preparation |
| POST | `/api/cron/coach-alerts` | Daily | Coach monitoring alerts |
| POST | `/api/cron/injury-digest` | Weekly | Injury summaries |
| POST | `/api/cron/weekly-summary` | Weekly | Weekly summaries |
| POST | `/api/cron/poll-program-generation` | Polling | Program generation status |
| POST | `/api/cron/poll-research` | Polling | Research session status |

---

## External API v1

Business API with scope-based access. Requires API key in Authorization header.

| Method | Endpoint | Scope | Description |
|--------|----------|-------|-------------|
| GET | `/api/external/v1/athletes` | `read:athletes` | List business athletes |
| GET | `/api/external/v1/athletes/[id]` | `read:athletes` | Single athlete |
| GET | `/api/external/v1/tests` | `read:tests` | Query test results |
| GET | `/api/external/v1/tests/[id]` | `read:tests` | Single test with calculations |

---

## Error Responses

```json
{ "success": false, "error": "Error message", "code": "ERROR_CODE" }
```

| Status | Description |
|--------|-------------|
| 400 | Bad Request (validation) |
| 401 | Unauthorized |
| 403 | Forbidden (subscription or role) |
| 404 | Not Found |
| 429 | Rate Limited |
| 500 | Internal Error |

---

## Rate Limiting

| Category | Limit |
|----------|-------|
| AI endpoints | 20/min |
| Calculation endpoints | 60/min |
| Standard endpoints | 100/min |

---

*Total: 402 route files | Last Updated: January 2026*
