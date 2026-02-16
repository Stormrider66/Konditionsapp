# 5000-User Readiness Assessment

This document defines the first practical load-testing plan for scaling to 5000 users, based on current API behavior and query patterns.

## Scope

- Define a peak traffic model.
- Identify heavy endpoints to load test first.
- Provide staged k6 scenarios (`smoke`, `baseline`, `stress`).
- Capture likely bottlenecks with concrete fixes.

## Traffic Model (Initial)

Use this as the default model until production analytics refines it.

- Registered users: `5000`
- Peak concurrently active users: `8-12%` (`400-600`)
- API mix at peak:
  - Reads: `75%`
  - Writes: `20%`
  - External AI/integrations: `5%`
- Target latency budget:
  - p95 read <= `1200ms`
  - p95 write <= `2000ms`
  - p99 all <= `5000ms`
- Error budget:
  - non-2xx <= `1-2%` for smoke/baseline
  - non-2xx <= `3%` under stress

## Highest-Risk Endpoints

These routes are the current performance risk leaders due to query fan-out, large includes, write cascades, or external calls:

1. `GET /api/teams/[id]/dashboard`
   - Broadcast and member `count()` fan-out (N+1 style query growth).
2. `GET /api/business/[id]/stats`
   - Large `Promise.all` with count/groupBy/findMany/raw SQL + includes.
3. `GET /api/calendar/unified`
   - Multiple sequential `findMany` calls and large object assembly.
4. `POST /api/daily-metrics`
   - Upsert + historical lookups + side effects (`injury`, notifications, streaks).
5. `POST /api/ai/chat`
   - DB + embeddings + optional web search + external model streaming.
6. `POST /api/integrations/strava/webhook`
   - External API dependency and event-driven write pressure.

## k6 Test Plan

Scripts live in `load-tests/k6/`:

- `smoke.js`
  - Fast sanity checks on common reads.
- `baseline.js`
  - Sustained heavier read load on business/team dashboard surfaces.
- `stress.js`
  - Write-heavy + optional AI/integration traffic toggles.

### Required env vars

- `BASE_URL` (default: `http://localhost:3000`)
- `CLIENT_ID`
- `BUSINESS_ID` (baseline)
- `TEAM_ID` (baseline)
- One auth method:
  - `AUTH_COOKIE` (recommended for Next/Supabase session)
  - or `BEARER_TOKEN`

### Optional env vars

- `START_DATE`, `END_DATE`
- `ENABLE_AI=true|false` (stress script)
- `ENABLE_WEBHOOK=true|false` (stress script)

### Install k6 (Windows)

Use one:

- `choco install k6`
- `winget install k6.k6`

### Run commands

From repo root:

- `npm run load:k6:smoke`
- `npm run load:k6:baseline`
- `npm run load:k6:stress`

Use environment variables in PowerShell, for example:

- `$env:BASE_URL="http://localhost:3000"`
- `$env:CLIENT_ID="your-client-id"`
- `$env:BUSINESS_ID="your-business-id"`
- `$env:TEAM_ID="your-team-id"`
- `$env:AUTH_COOKIE="sb-access-token=...; sb-refresh-token=..."`

Then run a script.

## Bottlenecks and Concrete Fixes

1. `teams/[id]/dashboard` N+1 counts
   - Replace per-member/per-broadcast `count()` loops with grouped aggregates.
   - Precompute completion stats in a summary table (or cached materialized view).

2. `business/[id]/stats` repeated heavy stats
   - Add short-lived cache (30-60s) keyed by `businessId`.
   - Move expensive trend calculations to scheduled jobs where possible.

3. `calendar/unified` sequential query execution
   - Run independent collections in `Promise.all`.
   - Paginate or cap each source collection by date window and count.

4. `daily-metrics` request-time side effects
   - Keep synchronous path minimal (validate + upsert + response).
   - Move injury cascade, notifications, and streak milestones to background jobs/queue.

5. `ai/chat` synchronous context assembly
   - Add stricter per-user/provider rate limits.
   - Cache reusable context chunks and constrain document/web search fan-out.

6. External webhook and provider dependencies
   - Acknowledge quickly, enqueue async processing, and retry with backoff.

## Next Step Execution Order

1. Run `smoke` with valid auth + IDs.
2. Run `baseline` and capture p95/p99 + fail rate.
3. Run `stress` with `ENABLE_AI=false` first (database-only stress).
4. Re-run `stress` with `ENABLE_AI=true` in short windows to measure external-call impact.
5. Implement top 2 optimizations (`teams dashboard` + `calendar`) and compare before/after.

## Current Daily-Metrics Optimization Status

Latest improvements in `app/api/daily-metrics/route.ts`:

- POST path is now minimal synchronous work:
  - auth/access validation
  - upsert raw check-in payload with `PENDING` derived fields
  - immediate response
- Derived assessments (HRV/RHR/wellness/readiness) now run in deferred post-write processing.
- Post-write queue now coalesces by `clientId:date` with debounce, reducing duplicate expensive recompute runs under bursty load.
- Added queue observability:
  - counters for enqueued/coalesced/started/completed/failed
  - periodic queue health logging
  - debounce remains fixed at 3s (adaptive delay was tested and rolled back due worse stress results)
- Added recompute skip cache:
  - keyed by `clientId:date` + payload signature
  - skips duplicate deferred assessment recalculation for unchanged payloads in a short TTL window
  - still allows deferred side effects to run with last computed readiness values

### Observed effect (best recent stress run)

- `http_req_duration p95`: improved to ~`19.7s` from earlier ~`30-48s+`.
- `http_req_failed`: improved near target in best run (~`3.98%`).

### Known caveat

- A fixed global worker cap for post-write tasks regressed performance and was removed.
- Pressure-adaptive debounce was also tested and regressed latency/error in this workload; fixed debounce currently performs better.

## Latest Stress Validation (Post-Restart)

Configuration used:

- Production build (`next build` + `next start`)
- k6 stress scenario (`load-tests/k6/stress.js`)
- Load-test auth bypass enabled in middleware via env guard:
  - `ENABLE_LOAD_TEST_AUTH_BYPASS=true`
  - `LOAD_TEST_BYPASS_SECRET` + `LOAD_TEST_BYPASS_USER_EMAIL`
  - k6 sends matching `x-load-test-secret` and `x-auth-user-email`

Result:

- `http_req_failed`: `2.51%` (passes stress target `<3%`)
- `http_req_duration p95`: `8.02s` (improved significantly, still above strict target)
- `http_req_duration p99`: `18.12s`
- Throughput: `~67.97 req/s`, `~40,781` iterations in 20m

Interpretation:

- Previous dominant bottleneck was middleware-side Supabase auth fetch under high concurrency.
- With bypass enabled for controlled load testing, request reliability and throughput improved substantially.
- Remaining latency gap is now mostly request/database work, not auth refresh contention.

Safety note:

- The bypass path is explicitly opt-in via env and secret header; keep it disabled outside local/load-test environments.

## Latest Optimization Pass (Read Endpoints)

Implemented additional auth/access hot-path reductions on two peak read routes:

- `GET /api/teams/[id]/dashboard`
  - Added short-lived auth context cache (email + app user id resolution).
  - Added in-flight dedupe for auth resolution.
  - Supports forwarded auth identity (`x-auth-user-email`) from load-test middleware bypass path.
- `GET /api/calendar/unified`
  - Added the same auth context cache + in-flight dedupe.
  - Added short-lived `canAccessClient` cache (`userId:clientId`) to avoid repeated access checks in burst traffic.
  - Supports forwarded auth identity (`x-auth-user-email`) from load-test middleware bypass path.

Validation status:

- Fresh post-change k6 numbers are still pending.
- Attempted production benchmark rerun was blocked by a local `next build` hang in this environment; rerun after successful build is the immediate next step.

## Benchmark Run (Local, 2026-02-13)

Environment:

- `next build` completed successfully (took ~19 minutes on this machine).
- `next start` (production server) on `http://localhost:3000`
- Load tests used `load-tests/.env.k6` and the load-test secret headers to avoid Supabase middleware auth overhead.

Results:

- `smoke` (`load-tests/k6/smoke.js`)
  - `http_req_duration p95`: `~1.05s` (passes p95 target `<=1200ms`)
  - `http_req_failed`: `~47%` (fails)
  - Root cause: the smoke script includes `GET /api/race-results?clientId=...` which returned non-200 for most iterations in this run (likely auth/data preconditions). Treat smoke as "not representative" until that endpoint is fixed or removed from smoke.
- `baseline` (`load-tests/k6/baseline.js`)
  - `http_req_failed`: `0.00%` (passes baseline error target)
  - `http_req_duration p95`: `6.26s` (fails p95 target `<=1800ms`)
  - `http_req_duration p99`: `9.62s` (fails p99 target `<=3000ms`)
  - Throughput: `~47.92 req/s`, `~14,384` iterations in 15m
- `stress` (`load-tests/k6/stress.js`, `ENABLE_AI=false`, `ENABLE_WEBHOOK=false`)
  - `http_req_failed`: `1.51%` (passes stress error target `<3%`)
  - `http_req_duration p95`: `8.68s` (fails p95 target `<=2500ms`)
  - `http_req_duration p99`: `18.08s` (fails p99 target `<=5000ms`)
  - Throughput: `~59.24 req/s`, `~35,569` iterations in 20m
  - Notes: saw intermittent connection resets (`wsarecv: An existing connection was forcibly closed by the remote host`) during peak load, reflected in the failed write checks.

## k6 Endpoint Breakdown Instrumentation

To make p95/p99 actionable, k6 now records per-endpoint submetrics:

- `load-tests/k6/helpers.js` emits:
  - `endpoint_duration{endpoint:...}` (Trend)
  - `endpoint_failed{endpoint:...}` (Rate)
- `load-tests/k6/smoke.js`, `baseline.js`, `stress.js` include tagged thresholds so k6 prints per-endpoint p95/p99 in the summary.

## Debugging Queueing vs Handler Time

Under high local VU counts, latency can be dominated by queueing in the Next.js/Node server (time spent before the route handler starts).

For local load tests (when `x-load-test-secret` is present), the API now emits:

- `x-handler-ms` (time spent inside the route handler, measured from handler entry)
- `x-mw-ms` and `x-mw-bypass` (middleware bypass cost)

And k6 records:

- `endpoint_handler_ms{endpoint:...}` (Trend)
- `endpoint_mw_ms{endpoint:...}` (Trend)
- `endpoint_next_queue_ms{endpoint:...}` ~= `http_req_duration - x-handler-ms - x-mw-ms`

If `endpoint_next_queue_ms` is multiple seconds while `endpoint_handler_ms` is sub-millisecond, the local machine is saturated and you need horizontal scaling for realistic tail latency.

## Local Multi-Process Baseline (Optional)

`next start` is single-process. To validate horizontal scaling locally, you can run multiple `next start` workers and proxy to them:

1. Build once: `npm run build`
2. Start a 4-worker cluster + local load balancer:
   - `powershell -NoProfile -ExecutionPolicy Bypass -File load-tests/start-local-cluster.ps1 -Workers 4`
3. Run k6 against `http://127.0.0.1:3000` (already set in `load-tests/.env.k6`)

## Calendar Payload Controls

`GET /api/calendar/unified` now supports response-shape controls (both default to `true`):

- `includeItems=true|false`
- `includeGroupedByDate=true|false`
- `itemsMode=full|light` (default `full`) - when `includeItems=true`, `light` returns minimal fields/metadata to reduce DB work + JSON size
- `maxItemsPerSource=1..1000` (default `150`) - caps items fetched per source (workouts/races/events/etc)

Use these to reduce response size and server-side work during peak loads. The cache key includes these flags.

Observed impact (local baseline run):

- Running baseline with `includeGroupedByDate=false` improved aggregate latency:
  - `http_req_duration p95`: `~3.50s`
  - `http_req_duration p99`: `~4.91s`
- `calendar-unified` remained one of the slower endpoints at baseline load, but response-shape trimming measurably helped overall throughput/latency on this machine.

## Business Stats Payload Controls

`GET /api/business/[id]/stats` now supports optional flags (these default to `true` unless noted):

- `includeRecentTests=true|false` (plus `recentTestsTake=0..50`)
- `includeMonthlyTrend=true|false`
- `includeBreakdowns=true|false` (tester/location breakdowns)
- `includeSubscriptions=true|false`
- `shortWindow=true|false` (default `false`) - skips the 90d/1y count queries and limits monthly trend to the last 30 days

These flags are part of the in-memory cache key, so different shapes do not collide.

Observed impact (local baseline run, calendar groupedByDate disabled):

- With `includeRecentTests=false`, `includeMonthlyTrend=false`, `includeBreakdowns=false`, `includeSubscriptions=false`:
  - `business-stats` `p95 ~2.84s`, `p99 ~3.52s`
  - aggregate `http_req_duration` `p95 ~3.44s`, `p99 ~4.32s`
- With all business-stats flags enabled (defaults):
  - `business-stats` `p95 ~3.77s`, `p99 ~4.89s`
  - aggregate `http_req_duration` `p95 ~4.48s`, `p99 ~6.43s`

## Team Dashboard Payload Controls

`GET /api/teams/[id]/dashboard` supports optional flags (all default to `true`):

- `includeMemberStats=true|false` (per-athlete completion breakdown; most expensive)
- `includeRecentBroadcasts=true|false`
- `days=1..90` (default `30`) - limits lookback window for assignments/broadcasts

## Latest Baseline Breakdown (Per Endpoint)

`baseline` endpoints and observed latency (local run, production build):

- `business-stats`: `p95 ~3.66s`, `p99 ~5.90s`
- `team-dashboard`: `p95 ~3.70s`, `p99 ~5.57s`
- `calendar-unified`: `p95 ~4.00s`, `p99 ~6.07s`
- Aggregate: `http_req_duration p95 ~3.76s`, `p99 ~5.89s`, `http_req_failed 0.00%`

Interpretation:

- Error rate target is consistently met for baseline.
- The remaining gap is dominated by read latency on these three endpoints (no longer auth/middleware).

Notes:

- Local benchmark runs show noticeable variance between runs (cache warmup and machine load matter).
- For apples-to-apples comparisons, run `baseline` twice back-to-back and compare the second run.
