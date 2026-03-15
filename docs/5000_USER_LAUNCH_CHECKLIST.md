# 5,000 User Launch Checklist

Use this checklist as the final go/no-go gate before calling the platform ready for a 5,000-user launch.

## Test Setup

- Run against production-like infrastructure, not `next dev`
- Use the `prod-shape` k6 scenario
- Export summary JSON for every run
- Run at least 2 consecutive benchmark passes:
  - one normal production-shaped run
  - one peak-biased run with higher VUs or a heavier write mix

Recommended commands:

- `K6_SUMMARY_EXPORT=load-tests/prod-shape-run1.json node load-tests/k6/run.js prod-shape`
- `node load-tests/k6/analyze-summary.js load-tests/prod-shape-run1.json`
- `K6_SUMMARY_EXPORT=load-tests/prod-shape-run2.json node load-tests/k6/run.js prod-shape`
- `node load-tests/k6/analyze-summary.js load-tests/prod-shape-run2.json`
- `node load-tests/k6/compare-summaries.js load-tests/prod-shape-run1.json load-tests/prod-shape-run2.json`

## Green Gate

All items below should pass in 2 consecutive runs.

### 1. Overall Stability

- `http_req_failed < 1.5%`
- no sustained spike above `3%` during the peak stage
- no visible retry storm, timeout burst, or worker backlog growth

### 2. Overall Latency

- `http_req_duration p95 <= 2000ms`
- `http_req_duration p99 <= 5000ms`

### 3. Cache-Heavy Read Endpoints

- `calendar-unified p95 <= 1800ms`
- `calendar-unified p99 <= 4000ms`
- `business-stats p95 <= 1500ms`
- `business-stats p99 <= 3500ms`
- `team-dashboard p95 <= 1500ms`
- `team-dashboard p99 <= 3500ms`
- `daily-metrics-get p95 <= 1000ms`
- `daily-metrics-get p99 <= 2500ms`

### 4. Write Endpoint

- `daily-metrics-post p95 <= 1200ms`
- `daily-metrics-post p99 <= 3000ms`
- write error rate `< 1%`

### 5. Cache Effectiveness

- `business-stats` cache hit + stale ratio `>= 80%`
- `team-dashboard` cache hit + stale ratio `>= 80%`
- `calendar-unified` cache hit + stale ratio `>= 70%`
- `daily-metrics-get` cache hit ratio `>= 60%`
- cache miss ratio should not rise materially during the peak stage

### 6. Queueing vs Handler Time

- `endpoint_next_queue_ms p95` should not dominate total latency
- if `handler_ms` is low but total duration is high, treat that as infra saturation

### 7. Background Processing Health

- bounded cron runs are not repeatedly timing out
- daily-metrics processing jobs do not build backlog across peak windows
- hot endpoints are not repeatedly serving degraded fallback payloads

### 8. Database Safety

- DB connections stay below pool exhaustion thresholds
- no repeated lock/contention spikes during peak
- no meaningful slow-query spike during cron overlap

## Decision Rules

- `Green`: all thresholds pass in 2 consecutive runs
- `Yellow`: overall latency passes, but 1-2 endpoint or cache targets miss narrowly
- `Red`: overall error/latency fails, or queueing/backlog grows during peak

## Evidence to Save

- summary JSON for each run
- analyzer output
- compare output
- deployment/config snapshot for the run:
  - app version / commit SHA
  - instance shape
  - DB pool settings
  - Redis enabled/disabled
  - load-test scenario knobs

## Launch Decision

Do not call the platform “ready for 5,000 users” until this checklist is green on production-like infrastructure.
