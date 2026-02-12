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
