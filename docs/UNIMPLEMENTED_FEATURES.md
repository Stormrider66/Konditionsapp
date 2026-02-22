# Unimplemented Features & Technical Debt

**Last Updated:** 2026-02-21
**Source:** Code review audit

---

## Unimplemented API Endpoints (501 responses)

### Google/Outlook Calendar Sync
- **File:** `app/api/calendar/external/[id]/sync/route.ts`
- **What's needed:** Google OAuth token refresh, Google Calendar API fetch, Outlook Calendar API fetch
- **Blocked by:** OAuth integration with Google/Microsoft

### LangChain AI Provider
- **File:** `app/api/ai/deep-research/route.ts`
- **What's needed:** LangChain provider support for deep research
- **Priority:** Low (existing providers cover use cases)

### Coach Calendar OAuth
- **File:** `app/api/coach/calendar/external/route.ts`
- **What's needed:** OAuth flow for Google/Outlook calendar providers in coach context

---

## ~~Components Using Mock Data~~ (RESOLVED)

> All three items below were fixed on 2026-02-21.

### ~~Workout History~~ FIXED
- Created `GET /api/athletes/[clientId]/workout-history` with type/range filtering
- `WorkoutHistory.tsx` now fetches real `WorkoutLog` data with exercise details

### ~~Exercise Personal Performance~~ FIXED
- `ExerciseInstructionsModal.tsx` now calls `/api/clients/{id}/progression/{exerciseId}`
- Extracts personalBest and lastPerformed from real progression history

### ~~Exercise Favorites Persistence~~ FIXED
- Added `ExerciseFavorite` model to Prisma schema (userId + exerciseId, unique constraint)
- Created `GET/POST /api/exercises/favorites` for loading and toggling
- `ExerciseLibraryBrowser.tsx` loads favorites on mount and persists changes

---

## Provider Support Gaps

### Ad-hoc Workout Parser
- **File:** `lib/adhoc-workout/parser.ts:169,194,225`
- **Issue:** Only Google provider supported for text/image/audio workout parsing
- **What's needed:** Anthropic and OpenAI provider implementations
- **Priority:** Medium (Google covers the use case but limits provider flexibility)

---

## Missing Notification Systems

### Injury Acute Report Notifications
- **File:** `app/api/injury/acute-report/route.ts:242`
- **Issue:** Physio and coach notifications are never sent when acute injury is reported

### Deep Research Email Sharing
- **File:** `app/api/ai/deep-research/[sessionId]/share/route.ts:157`
- **Issue:** Email notification not sent when research is shared, only marked as notified

### Plateau Detection Actions
- **File:** `lib/training-engine/progression/plateau-detection.ts:360`
- **Issue:** Plateau detection only logs, doesn't create notifications or trigger actions

### Business Member Invitations
- **File:** `app/api/business/[id]/members/route.ts:133`
- **Issue:** No invitation email sent when members are added to a business

---

## Incomplete Modules

### Ergometer Subsystems
- **File:** `lib/training-engine/ergometer/index.ts`
- **Commented-out exports:** zones, protocols, benchmarks, analysis
- **Status:** Modules partially exist but not ready for export

### Ergometer Benchmark Classification
- **File:** `app/api/ergometer-tests/route.ts:710-714`
- **Issue:** Returns placeholder message; full classification planned for Phase 6
- **Blocked by:** Reference data seeding

### Gemini RAG Document Search
- **File:** `lib/ai/gemini-tools.ts:193-199`
- **Issue:** Document search returns empty results (placeholder)
- **Fix:** Wire up actual pgvector semantic search

### Elite Pace Integration
- **File:** `lib/program-generator/index-elite-integration.ts:150-157`
- **Status:** Reference implementation only, returns empty object

---

## Minor Issues

### Race Week Nutrition Timing
- **File:** `lib/nutrition-timing/generators/guidance-generator.ts:71`
- **Issue:** `isRaceWeek` hardcoded to `false`; needs race calendar integration

### API Key Validation
- **File:** `app/api/settings/api-keys/route.ts:182`
- **Issue:** Google API key only format-checked, no actual API validation call

### Cross-Training Athlete Preferences
- **File:** `app/api/cross-training/substitutions/[clientId]/route.ts:94`
- **Issue:** Uses injury-based fallback instead of fetching actual athlete preferences

### Calendar Intensity Modification
- **File:** `components/calendar/UnifiedCalendar.tsx:444`
- **Issue:** Intensity modification on conflict resolution not implemented

---

## Cleaned Up (2026-02-21)

- [x] Deleted `lib/db-mock.ts` - unused mock database (252 lines)
- [x] Removed `calculateTrainingZonesLegacy()` from `lib/calculations/zones.ts` - deprecated, zero callers
- [x] Removed no-op edit/duplicate buttons in agility studio `WorkoutList`
- [x] Removed non-functional share button from `MilestoneCelebrationCard`
- [x] Fixed hardcoded gender in `HYROXDashboard` - now reads from athlete profile
- [x] Fixed fake success toast in `SubstitutionSchedule` - now shows honest "not available yet" message
- [x] Created `GET /api/athletes/[clientId]/workout-history` and wired up `WorkoutHistory.tsx` (was using mock data)
- [x] Wired up `ExerciseInstructionsModal.tsx` to real progression API at `/api/clients/[id]/progression/[exerciseId]`
- [x] Added `ExerciseFavorite` Prisma model + `POST/GET /api/exercises/favorites` API + wired up `ExerciseLibraryBrowser.tsx`
