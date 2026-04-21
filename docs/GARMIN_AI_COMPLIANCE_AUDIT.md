# Garmin AI Compliance Audit

**Date:** 2026-04-21
**Trigger:** Marc Lussi (Garmin Connect Partner Services) rejected production access on 2026-04-21. Rule: Garmin data must not be shared with, processed by, or made available to any third-party AI or data processing service.
**Goal:** Catalog every Garmin data ingress point and every outbound AI call site, so we can split AI flows cleanly — Garmin-touching flows move to self-hosted OSS models, non-Garmin flows stay on external providers (Anthropic / Google / OpenAI).

---

## Part 1 — What Garmin delivers to us

### Webhook summary types (`lib/integrations/garmin/webhook-service.ts`)

| Type | Field on payload | Handled at | Stored in |
|---|---|---|---|
| Activities | `activities[]` | `processActivity()` (498–624) | `GarminActivity` |
| Activity details | `activityDetails[]` | `processActivityDetails()` (824–900) | `GarminActivity.hrStream`, `hrZoneSeconds`, `laps` |
| Daily summaries | `dailies[]` | `processDailySummary()` (433–496) | `DailyMetrics` + `factorScores.garminDaily` |
| Sleep | `sleeps[]` | `processSleepData()` (626–671) | `DailyMetrics` + `factorScores.garminSleep` |
| HRV | `hrv[]` | `processHRVData()` (779–822) | `DailyMetrics` + `factorScores.garminHRV` |
| Body composition | `bodyComps[]` | `processBodyComposition()` (673–777) | `BodyComposition` + `factorScores.garminBodyComposition` |
| Stress details | `stressDetails` (backfill only) | not yet implemented | — |
| Respiration | `respiration` (backfill only) | not yet implemented | — |
| Deregistrations | `deregistrations[]` | `handleDeregistration()` (407–431) | `IntegrationToken.syncEnabled = false` |
| User permissions | `userPermissionsChange[]` | `handleUserPermissionsChange()` (902–945) | `IntegrationToken.scope` |

### Pull/backfill endpoints (`lib/integrations/garmin/client.ts`)

- `requestBackfill(clientId, summaryType, start, end)` — async (HTTP 202), result pushed via webhook. Max 90 days (health types) / 30 days (activity types).
- `getGarminDailySummaries / Activities / SleepData / HRVData / ActivityDetails` — direct pulls, used sparingly.
- `getGarminUserId(accessToken)` — identity lookup.
- `disconnectGarmin(clientId)` — DELETE on registration; unregisters user from our app.

### Prisma models containing Garmin-sourced data

1. **`GarminActivity`** (`prisma/schema/integrations.prisma:131–204`) — raw activity metrics, `hrStream` (second-by-second HR), `hrZoneSeconds`, `laps`, `splits`, `deviceName`, calculated `tss` / `mappedType` / `mappedIntensity`.
2. **`DailyMetrics`** (`prisma/schema/training.prisma:588–666`) — `hrvRMSSD`, `hrvStatus`, `restingHR`, `sleepHours`, `sleepQuality`, `stress`, plus the catch-all JSON `factorScores` with `garminDaily` / `garminSleep` / `garminHRV` / `garminBodyComposition` sub-keys. **This JSON is the most contaminated single field — anything reading `factorScores` pulls Garmin data.**
3. **`BodyComposition`** (`prisma/schema/training.prisma:1304–1344`) — weight, BF%, muscle, visceral fat, metabolic age. `deviceBrand: "Garmin"` flags the source.
4. **`IntegrationToken`** (`prisma/schema/integrations.prisma:13–41`) — OAuth tokens + `externalUserId` + sync state.
5. **`CardioSessionAssignment`** (`prisma/schema/cardio.prisma:54–118`) — `garminWorkoutId`, `garminPushedAt` + matched actuals (`actualDuration`, `actualDistance`, `avgHeartRate`).
6. **`ActivityHRZoneDistribution`** (`prisma/schema/training.prisma:870–920`) — `garminActivityId` + zone-second breakdown.
7. **`AdHocWorkout`** (`prisma/schema/training.prisma:1530–1550`) — `garminActivityId` cross-link, auto-matched on webhook ingest.
8. **`OAuthRequestToken`** (`prisma/schema/integrations.prisma:45–56`) — transient PKCE state, 10-min TTL.

### Derived Garmin metrics (still count as Garmin-sourced)

- **TSS** — `calculateTSS` in `webhook-service.ts:385–405` and `sync.ts:541–556`.
- **Intensity mapping** (EASY / MODERATE / HARD / MAX) — `webhook-service.ts:541–548`.
- **Activity-type mapping** — `ACTIVITY_TYPE_MAP` at `webhook-service.ts:14–38`.
- **Readiness score** — `getGarminReadinessData()` at `sync.ts:561–630`. Weighted blend of HRV / sleep quality / sleep duration / RHR.
- **Training load summary** — `getGarminTrainingLoad()` at `sync.ts:636–694`. Aggregates TSS/distance/duration by period.
- **ACWR** — `lib/training-engine/injury-management/acwr-monitoring.ts:24–79`. EWMA-based acute:chronic ratio.
- **Training fingerprints** — `lib/data-moat/fingerprint-generator.ts`. Zone distribution, volume variation, periodization detection.

---

## Part 2 — What we send to external AI today

**Totals:** 28 🔴 Garmin-touching · 8 🟡 uncertain · ~10 🟢 clean

### 🔴 Must move to self-hosted

| # | Feature | Entry | Garmin data in prompt |
|---|---|---|---|
| 1 | Athlete chat | `app/api/ai/chat/route.ts:278` | dailyMetrics, trainingLoad, dailyCheckIn, HRV, sleep, stravaActivity (Garmin-synced) |
| 2 | WOD generation | `app/api/ai/wod/route.ts:233` | readiness score, ACWR zone, fatigue, soreness, sleep |
| 3 | Nutrition plan | `app/api/ai/nutrition-plan/route.ts:157` | sleep, stress, readiness, energy, body composition |
| 4 | Morning briefing | `lib/ai/briefing-generator.ts:502` | ACWR, mood, sleep, readiness, workout RPE |
| 5 | Performance / training correlation | `lib/ai/performance-analysis/training-correlator.ts:83` | explicit `garminActivity` queries (pace, power, HR, cadence) |
| 6 | Test comparison / analysis | `app/api/ai/performance-analysis/compare-tests`, `analyze-test` | Garmin activities in surrounding context |
| 7 | Coach chat (multi-turn) | `app/api/ai/conversations/[id]/message/route.ts:264` | full athlete context |
| 8 | Coach chat tools | `lib/ai/coach-chat-tools.ts` (`analyzeWellness`, `predictPerformance`, `generateProgramOutline`) | training load, readiness |
| 9 | Program generator | `lib/ai/program-generator/orchestrator.ts:327, 344, 361` | sport context (includes training load) |
| 10 | Voice coaching (Gemini Live) | `lib/ai/live-voice-coaching/gemini-live-client.ts` | **real-time HR stream if Garmin HR monitor connected** |
| 11 | Auto-optimize cron | `app/api/cron/auto-optimize/route.ts:148` | training load, performance data |
| 12 | Injury risk prediction | `app/api/ai/advanced-intelligence/injury-risk` | ACWR, training load, HRV, readiness |
| 13 | Pattern detector (cron) | `lib/daily-metrics-jobs.ts` | daily metrics (sleep, HRV, readiness) |
| 14–28 | Context builders (shared infra) | `lib/ai/athlete-context-builder.ts:350–382`, `lib/ai/sport-context/main.ts:103–125`, `wod-context-builder.ts:199–304`, `sport-context/readiness.ts`, `sport-context/coach-context.ts`, `sport-context/integrations.ts` | these power 20+ call sites — the routing decision belongs here |

### 🟢 Can stay on external AI

| Feature | Entry | Why clean |
|---|---|---|
| Food scan (vision) | `app/api/ai/food-scan/route.ts` | image only, no athlete context |
| Food scan text | `app/api/ai/food-scan/analyze-text/route.ts` | user-typed food only |
| Food scan refine | `app/api/ai/food-scan/refine/route.ts` | user preferences + text |
| Form video analysis | `lib/ai/sport-context/video-analysis.ts` | video frames only |
| Deep Research | `app/api/ai/deep-research/[sessionId]/save/route.ts` | coach research query only |
| Document RAG embedding | `app/api/documents/[id]/embed/route.ts` | coach-uploaded docs only |
| Social content | `app/api/coach/social/generate/route.ts` | coach topic/tone only |
| Program import parse | `app/api/programs/import-parse/route.ts` | PDF parsing only |
| Team import parse | `app/api/coach/teams/[teamId]/import-parse/route.ts` | PDF parsing only |
| Lactate/power OCR | `app/api/ai/lactate-ocr/route.ts` | image OCR only |

### 🟡 Need deeper review

- **Menstrual cycle insights** (`app/api/menstrual-cycle/insights/[clientId]/route.ts:119`) — cycle data is user-logged, but `fatigue`/`mood` may come from Garmin-synced daily check-ins.
- **Test import OCR** (`app/api/ai/test-import/route.ts`) — extraction itself is clean; extracted data feeds downstream Garmin-inclusive analysis.
- **Deep-think periodization** (`lib/ai/deep-think-periodization.ts:176`) — sport context may include load.
- **Memory extractor** (`lib/ai/memory-extractor.ts:115`) — depends on caller-provided context.
- **Generative charts** (`lib/ai/generative-charts.ts:140`) — depends on what the chart represents.
- **Chat on-finish handler** — may trigger memory extraction with athlete context.
- **Care-team messaging** (`app/api/care-team/threads/[id]/messages`) — if AI-assisted, may include athlete context.
- **Injury detection / acute report** (`app/api/injury/acute-report/route.ts`) — verify actual prompt contents.

---

## Part 3 — Three surprising findings

1. **`DailyMetrics.factorScores` is a JSON grab-bag with raw Garmin data inside.** Any query that reads `factorScores` and passes it into an AI prompt leaks Garmin data regardless of the surrounding code's intent. The sub-keys `garminDaily`, `garminSleep`, `garminHRV`, `garminBodyComposition` are the hot spots. Treat any read of `factorScores` as Garmin-tainted unless proven otherwise.

2. **Voice coaching streams live HR to Gemini Live** if the athlete's HR monitor is a Garmin device. Not just a one-shot prompt — a real-time WebSocket push. Needs explicit device-brand detection to strip or reroute the HR stream when the source is Garmin.

3. **Context builders are the choke point.** Most of the 28 call sites don't query Garmin directly — they call `buildAthleteOwnContext`, `buildSportSpecificContext`, `buildWODContext`. A single routing decision at the context builder layer fixes 20+ call sites with one change instead of 28.

---

## Part 4 — Proposed rework architecture

### Single routing boundary

Wrap the AI client so every outbound call declares its data provenance:

```ts
// Conceptual — actual API TBD
aiClient.generate({
  prompt,
  containsGarminData: boolean,
  // routes to:
  //   true  → self-hosted OSS inference (Cloud Run GPU, Gemma / Llama / Mistral)
  //   false → BYOK external provider (Anthropic / Google / OpenAI)
})
```

The flag is set at the **context builder** layer (not the call site), because:
- 20+ call sites consume the same context helpers
- One fix propagates automatically
- Mistakes at individual call sites are caught when the shared context asserts its provenance

### Self-hosted inference service

- **Model candidate:** Gemma 3 / Gemma 4 (9B or 27B) or Llama 3.1 / Mistral 7B
- **Host:** Cloud Run GPU (NVIDIA L4, 24 GB VRAM) in the existing `gen-lang-client-0770611871` GCP project, scale-to-zero
- **Ops profile:** same project as `garmin-webhook`, second Cloud Run service
- **Cost estimate:** ~$10–50/mo at current volume; L4 at ~$0.40–0.70/hr active, $0 idle
- **Development:** Ollama / MLX on the 64 GB MacBook for local iteration; production = Cloud Run GPU

### What explicitly does NOT qualify as "self-hosted"

Per Marc's rule, third-party hosted inference services **do not count as internal**, even when they serve the same OSS models. This includes:

- Groq, Fireworks, Together, Replicate, Cerebras, Anyscale
- Vercel AI Gateway (any provider)
- Any API call where the payload traverses someone else's servers

Only model weights executing on compute under our control count.

### Privacy policy commitment (per Marc)

A dedicated anchor-linked section must explicitly state: Garmin data is never sent to third-party AI providers. **No publishing before Marc approves the wording in writing.** Any future change to this section requires re-approval.

---

## Part 5 — Open clarifications sent to Marc

1. Does Cloud Run GPU (rented compute, own container, own model weights, no outbound inference API calls) qualify as "internal-only processing"?
2. Confirm hosted inference services (Groq / Fireworks / Together / Replicate / Vercel AI Gateway) do NOT qualify as internal, even for OSS models.

Reply pending as of 2026-04-21.

---

## Part 6 — Execution order (once Marc confirms)

1. **Build the self-hosted inference service** — Cloud Run GPU, chosen OSS model, exposed as an HTTP endpoint mirroring the Vercel AI SDK `generateText` / `streamText` shape.
2. **Add the routing boundary** — `aiClient` wrapper with `containsGarminData` flag. Default to true in context builders that read `factorScores` / `trainingLoad` / `DailyMetrics` / `GarminActivity`.
3. **Move the 28 🔴 sites** — mostly a one-line change once the routing boundary is in place (flip the flag at the context builder layer).
4. **Resolve the 8 🟡 sites** — read each in detail, classify, route accordingly.
5. **Voice coaching** — separate fix: detect Garmin device brand on the HR monitor connection; either route the Live session through a self-hosted voice model or strip the HR stream before it hits Gemini Live.
6. **Privacy policy draft** — send to Marc for approval before publishing.
7. **Resubmit production package** — zipped screenshots per API, all UX flows, privacy policy link.

---

## References

- Memory: `project_garmin_production.md` (rejection + rework decision)
- Memory: `reference_garmin_cloud_run.md` (webhook infrastructure)
- Webhook source: `apps/garmin-webhook/`, `lib/integrations/garmin/webhook-service.ts`
- Ingest source: `lib/integrations/garmin/client.ts`, `lib/integrations/garmin/sync.ts`
- AI surface: `lib/ai/`, `app/api/ai/`
