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

### Queued for follow-up (after Marc confirms architecture)

These two edge cases affect product scope but are narrow enough to hold for a second email so they don't derail the current reply.

3. **BLE-direct HR connection.** If a user connects a Garmin HR strap directly via standard Bluetooth Heart Rate Service (outside Garmin Connect OAuth — i.e., no API call, no Garmin cloud involvement), does the resulting HR stream fall under the Developer Program data rules? Or is BLE-direct data outside the program's scope?
   - **Why it matters:** determines whether voice coaching (Gemini Live) can pass through HR from a Garmin strap when the athlete isn't OAuth-connected. Current working assumption: BLE-only users are treated as non-Garmin for compliance; OAuth-connected users are treated as Garmin regardless of how HR is streaming.
   - **Attribution is still required** per Brand Guidelines regardless of the compliance answer.

4. **Derived / aggregated metrics that blend Garmin data with manual or other sources.** For a scalar like weekly training load computed from Garmin activities + Strava + manually logged workouts, at what point (if ever) is the output no longer considered "Garmin data" under this rule? Is it based on reversibility (can the Garmin-specific contribution be recovered from the aggregate?), or is any Garmin-in-lineage output always restricted?
   - **Why it matters:** determines whether features like weekly-TSS summaries, ACWR zone, readiness category can be sent to external AI for narrative generation, or whether the full chain stays self-hosted.
   - **Current working assumption:** any Garmin-in-lineage output is treated as Garmin-derived (safest stance) until Marc draws a clearer line.

5. **Hybrid architecture — per-user routing.** Is it acceptable to run a dual-track AI architecture where non-Garmin-connected users continue to use external AI providers (Anthropic / Google / OpenAI via BYOK) with their own data, while users who have ever been connected to Garmin Connect are routed exclusively through self-hosted inference for any flow touching their data? The rule would prohibit Garmin data from reaching external AI, not running external AI at all.
   - **Why it matters:** determines whether non-Garmin users retain the full frontier-model experience, or whether the entire platform must be moved to self-hosted. Huge product and cost implication.
   - **Current working assumption:** per-user routing is acceptable because the rule targets *where Garmin data goes*, not *where external AI runs*. Routing signal = "athlete has ever had Garmin data ingested" (sticky flag; does not reset on disconnect since historical data persists in our DB).
   - **Edge case to state clearly in the question:** when a coach views a team or aggregates data across multiple athletes, if any one of those athletes has Garmin history the whole request is routed self-hosted. We over-route to be safe rather than under-route.

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

---

## Appendix A — Cost model (100 athletes)

All numbers are order-of-magnitude estimates for infrastructure planning. Refine after real usage data lands.

### Assumptions per active athlete per month

| Feature | Calls/mo | Avg input tokens | Avg output tokens |
|---|---|---|---|
| WOD generation | 15 | 3,000 | 2,000 |
| Athlete chat | 20 turns | 4,000 | 1,000 |
| Morning briefing | 20 | 2,000 | 500 |
| Nutrition plan | 3 | 2,000 | 3,000 |
| Performance analysis | 3 (amortized) | 8,000 | 2,000 |
| Program generation | 0.3 (amortized, 12-wk plans) | ~50,000 | ~40,000 |
| Voice coaching | 4 sessions × 30 min | — | — |

**Aggregate: ~500k–1M tokens/month per active athlete for text AI, plus ~120 min/month of real-time audio.** Midpoint used below: 750k tokens/athlete/month.

### Scenario 1 — 100 athletes, all non-Garmin (external providers, BYOK)

Trainomics routes all inference through user-supplied Anthropic / Google / OpenAI API keys via the existing `ModelIntent` system (`fast` / `balanced` / `powerful`).

Typical distribution: 60% fast / 30% balanced / 10% powerful.

| Tier | Model examples | Blended $/M tokens | Usage (100 athletes) | Cost |
|---|---|---|---|---|
| Fast | Haiku 4.5, Gemini Flash, GPT-5.3 Instant | ~$0.40 avg | 45M tokens | $18 |
| Balanced | Sonnet 4.6, Gemini Pro, GPT-5 Mini | ~$6 avg | 22.5M tokens | $135 |
| Powerful | Opus 4.6, GPT-5.4 | ~$30 avg | 7.5M tokens | $225 |
| Voice (Gemini Live) | Gemini 3.1 Flash Live | audio tokens | 200 hours | ~$345 |
| **Total text + voice** | | | | **~$720/mo** |

- **Per athlete: ~$7/mo**
- **Trainomics' direct cost: $0** (BYOK — users pay their own provider bills)
- **User's perceived cost:** typically bundled into their own Anthropic/Google/OpenAI account — a few USD each

### Scenario 2 — 100 athletes, all Garmin-connected (self-hosted)

All AI for these users must run on self-hosted OSS models. Cloud Run GPU, scale-to-zero.

**Text inference (Gemma 3/4 27B on NVIDIA L4):**
- Throughput: ~60 tokens/sec on L4 with Q4 quantization
- Volume: 75M tokens/mo across 100 athletes
- Active GPU time: 75M ÷ 60/sec ÷ 3600 = **~350 GPU-hours/month**

Wait — that's a lot. Let me recheck. 75M tokens at 60 tok/s = 1.25M seconds = 347 hours. Yes, ~350 hours/month.

- L4 pricing: ~$0.45/GPU-hour on Cloud Run
- **Text cost: 350 × $0.45 = ~$158/mo**
- Plus CPU/memory surcharge (~$0.10/hr): ~$35/mo
- **Subtotal text: ~$193/mo for 100 athletes = $1.93/athlete/mo**

This is higher than my first quick estimate — at 100 active athletes you're using the GPU a meaningful fraction of the day. If usage concentrates at certain hours (morning briefings, WOD generation sessions) you'll also need concurrency, potentially multiple GPU instances briefly.

**Voice coaching options for Garmin users:**

| Option | Trainomics cost/mo | Notes |
|---|---|---|
| (a) Strip HR from Gemini Live, keep external | $0 (user BYOK) | Garmin user loses HR feedback in voice; otherwise identical |
| (b) Self-hosted voice pipeline (Whisper + Gemma + TTS) | ~$80–150/mo | 2-4x latency of Gemini Live; UX noticeably slower |
| (c) Disable voice coaching for Garmin users | $0 | Worst UX but simplest |

**Recommended: option (a).** Strip the HR stream when athlete is Garmin-connected, keep Gemini Live for the voice itself (no Garmin data in the payload). Users retain low-latency voice, lose only real-time HR feedback.

**Total Scenario 2 direct cost to Trainomics: ~$193/mo for 100 Garmin athletes = ~$1.93/athlete/mo.**

### Scenario 3 — Realistic hybrid (the actual plan)

Assume X% of 100 athletes are Garmin-connected. Non-Garmin users are BYOK (Trainomics cost = $0); Garmin users go self-hosted (Trainomics cost scales with X).

| Garmin % | Garmin athletes | Self-hosted GPU cost to Trainomics | Non-Garmin BYOK cost (user-paid) |
|---|---|---|---|
| 0% | 0 | $0 | 100 × $7 = $700 user-paid |
| 10% | 10 | ~$20/mo | 90 × $7 = $630 user-paid |
| 25% | 25 | ~$50/mo | 75 × $7 = $525 user-paid |
| 50% | 50 | ~$100/mo | 50 × $7 = $350 user-paid |
| 100% | 100 | ~$193/mo | $0 |

### Scenario 4 — If Marc rejects hybrid (all self-hosted)

Worst case: everything runs on Cloud Run GPU regardless of user's Garmin status.

- 100 athletes × ~$1.93/athlete/mo = **~$193/mo direct cost**
- Users no longer need external API keys — BYOK becomes optional/nice-to-have
- Loss of frontier-model quality for all 28 feature categories, not just Garmin users

### One-time costs

- **Self-hosted inference service build-out:** ~1 week of engineering (Cloud Run GPU setup, Dockerfile with Gemma weights, HTTP API, health checks)
- **Routing boundary + sticky flag migration:** ~1 week (add `hasGarminHistory` field, wrapper around AI client, context-builder integration)
- **Voice coaching rework (if option a chosen):** ~2–3 days (device-brand detection, HR-stream gate)
- **Quality validation against real prompts:** ~1 week (sample prompts, A/B comparison, manual review)
- **Container registry storage for Gemma 27B image:** ~$0.50/mo (≈15 GB image)

### Headline takeaway

At 100 athletes, even 100% Garmin adoption costs Trainomics less than **$200/mo** in direct inference costs. The hybrid architecture keeps non-Garmin users on frontier models with zero marginal Trainomics cost. The cost constraint is not why you'd avoid this rework — the reason to think twice is engineering time and the quality delta for complex tasks (program generation), not infrastructure cost.
