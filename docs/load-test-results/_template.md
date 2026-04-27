# Load Test Baseline — YYYY-MM-DD

**Preview URL:** `https://<preview-url>.vercel.app`
**Commit:** `<sha>` on branch `<branch>`
**Tester:** `<name>`
**Tenant shape:** `<e.g. 1 business · 1 team · 35 athletes · 90d history>`

## Overall

| Metric                | Target  | Result | Pass? |
|-----------------------|---------|--------|-------|
| p95 read              | ≤1200ms |        |       |
| p95 write             | ≤2000ms |        |       |
| p99 all               | ≤5000ms |        |       |
| Error rate            | ≤2%     |        |       |

## Per-endpoint p95 (read paths)

| Endpoint                          | p95   | p99   | Cache hit % |
|-----------------------------------|-------|-------|-------------|
| `team-dashboard`                  |       |       |             |
| `business-stats`                  |       |       |             |
| `calendar-unified`                |       |       |             |

## Per-endpoint p95 (write paths)

| Endpoint                | p95   | p99   |
|-------------------------|-------|-------|
| `daily-metrics`         |       |       |
| `ai-chat`               |       |       |
| `strava-webhook`        |       |       |

## Versus previous baseline

| Endpoint                | Prev p95 | This p95 | Δ     |
|-------------------------|----------|----------|-------|
|                         |          |          |       |

## Notes / anomalies

- (any 5xx spikes, surprising tail behavior, environment caveats)

## Decision

- [ ] Promote the deploy
- [ ] Block the deploy and investigate (link issue / commit)

## Raw

- Summary export: `_raw-YYYY-MM-DD.json`
