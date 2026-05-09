# Load Test Results

This directory stores k6 baseline runs against Vercel preview deploys. We keep one results file per release (or per significant infra change) so we can detect regression early.

The k6 scripts themselves live in `load-tests/k6/`. The traffic model and target SLOs live in [`docs/PERFORMANCE_5000_USER_READINESS.md`](../PERFORMANCE_5000_USER_READINESS.md). This doc covers **how to run** and **how to record**.

---

## When to run

- **Always:** before promoting a deploy that touches a hot path (`/api/teams/[id]/dashboard`, `/api/business/[id]/stats`, `/api/calendar/unified`, `/api/daily-metrics`, `/api/ai/chat`, `/api/integrations/strava/webhook`).
- **Always:** before bumping the user cap (e.g. when we cross 100 / 500 / 1000 / 5000 active users).
- **Quarterly otherwise**, even on quiet weeks, to catch slow drift.

A "result" here is a `baseline.js` run, optionally followed by `stress.js` if we're testing capacity rather than correctness.

For hockey pilot invite evidence, use `npm run qa:hockey-pilot-gates -- --include-load` instead of the generic baseline command. That path writes a hockey-specific manifest and evidence note, and it marks localhost/plain HTTP targets as non-launch evidence.

---

## How to run against a preview deploy

1. **Push the branch and let Vercel build a preview.** Don't run against a local `npm run dev` — Node serverless cold-start, single-process Postgres, and real-Vercel routing all matter.

2. **Get a session cookie for the preview.** A real authenticated session is required because the high-cost endpoints all enforce auth + tenant scoping.

   ```bash
   # Logs in via Supabase, dumps the session cookie to load-tests/.env.k6
   node scripts/grab-auth-cookie.cjs --base https://<preview-url>.vercel.app
   ```

   Then edit `load-tests/.env.k6` and set:
   - `BASE_URL=https://<preview-url>.vercel.app`
   - `CLIENT_ID=<a real client ID owned by the auth user>`
   - `BUSINESS_ID=<a real business the auth user is a member of>`
   - `TEAM_ID=<a team within that business>`

   These IDs should reference data with realistic shape — at least 30 athletes, 90 days of workout history, etc. A clean fresh tenant under-stresses the dashboards.

3. **Run smoke first.** Two minutes. Verifies auth + connectivity before you commit to a 15-minute baseline.

   ```bash
   node load-tests/k6/run.cjs smoke
   ```

   If smoke fails with 401/403, regenerate the cookie. If it fails with 500, fix that before scaling up.

4. **Run baseline.** ~15 minutes; this is the canonical run we record.

   ```bash
   K6_SUMMARY_EXPORT=docs/load-test-results/_raw-$(date +%Y-%m-%d).json node load-tests/k6/run.cjs baseline
   ```

   For hockey pilot evidence, run the stricter pilot gate:

   ```bash
   HOCKEY_PILOT_SUPPORT_OWNER="Support Lead" HOCKEY_PILOT_SUPPORT_SLA_HOURS=24 HOCKEY_PILOT_OPEN_CRITICAL_ISSUES=0 K6_SUMMARY_EXPORT=load-tests/evidence/hockey-pilot-YYYY-MM-DD.json npm run qa:hockey-pilot-gates -- --include-load
   ```

   The pilot preflight prints `Target production-like: yes/no`; only `yes` runs count as invite evidence.

5. **(Optional) Run stress** if you're testing capacity, not correctness.

   ```bash
   node load-tests/k6/run.cjs stress
   ```

6. **Record the results.** Copy `_template.md` to `YYYY-MM-DD-<short-name>.md` and fill it in. The raw `_raw-*.json` is for forensic comparison; the markdown file is the human-readable summary.

7. **Commit** both the markdown and the raw JSON to this directory.

---

## SLO reference (quick lookup)

From `docs/PERFORMANCE_5000_USER_READINESS.md`:

| Metric           | Target                                |
|------------------|---------------------------------------|
| p95 read         | ≤ 1200ms                              |
| p95 write        | ≤ 2000ms                              |
| p99 all          | ≤ 5000ms                              |
| Error rate       | ≤ 1–2% (smoke/baseline), ≤ 3% (stress)|
| Concurrent users | 400–600 (8–12% of 5000 registered)    |

A run "passes" if all three latency thresholds and the error budget are met. Anything else is a regression and should block the deploy.

---

## Reading the results

The k6 console output ends with a thresholds table. The fields that matter most:

- `http_req_duration p(95) / p(99)` — overall latency. Compare against the SLOs above.
- `http_req_failed rate` — overall error rate. Anything >2% on baseline means the test isn't representative; figure out what's 5xx-ing before treating the latency numbers as signal.
- `endpoint_duration{endpoint:<name>}` — per-endpoint p95. This is what you actually compare to the previous baseline. The *aggregated* p95 hides regressions in slow tail endpoints.
- `endpoint_cache_hit{endpoint:<name>}` — cache hit rate. A drop here usually explains a latency rise.

When recording results, capture the per-endpoint breakdown, not just the aggregate.

---

## When a baseline regresses

1. **Don't promote the deploy.** A regression in p95 on a hot path will be felt by every user.
2. Cross-reference the change set since the previous baseline (`git log --since=<previous-baseline-date>`). The culprit is almost always in there.
3. If the regression is in `business-stats` or `team-dashboard`, suspect a new `include` or a missing index.
4. If it's in `ai/chat`, suspect a new step in the prompt build, or an upstream provider's slow tail (the breaker should mask sustained outages but not a slow median).
5. If it's in `daily-metrics`, suspect the side-effects pipeline.
6. If it's in `strava/webhook`, suspect a sync helper that changed shape.

Roll back, re-run baseline against the previous-good preview, confirm the regression isn't in the test setup itself, then fix forward.
