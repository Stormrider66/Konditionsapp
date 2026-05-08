# Hockey Pilot Run Evidence

## Run

- Date:
- Runner:
- Environment:
- Target URL:
- Commit SHA:
- Decision: `GO` / `PAUSE` / `FIX_AND_RERUN`

## Pilot Shape

- Teams invited:
- Expected athletes:
- Expected coach/staff users:
- Busy window tested:
- Test data notes:

## Commands

```bash
npm run qa:hockey-pilot-readiness
npm run qa:launch-config
npm run qa:hockey
K6_SUMMARY_EXPORT=load-tests/evidence/hockey-pilot-YYYY-MM-DD.json npm run load:k6:hockey-pilot
```

## Artifacts

- Summary JSON:
- Analyzer output:
- Summary gate output:
- Manifest JSON:
- Screenshot or support notes:

## Manifest Snapshot

- Result status:
- Failed step:
- k6 exit code:
- Business/team:
- Client ID count:
- Traffic weights:

## Gate Results

- Overall fail rate:
- Overall p95:
- Overall p99:
- Slowest endpoint:
- Endpoint failures:

## Manual Checks

- Coach can open assigned team dashboard:
- Coach can review hockey tests:
- Coach can export SIMCA/aerobic profile:
- Athlete can open own dashboard:
- Athlete can save daily metrics:
- Team-scoped staff cannot access another team:
- Athlete cannot access another athlete summary:

## Issues

| Severity | Area | Symptom | Owner | Next action |
| --- | --- | --- | --- | --- |
|  |  |  |  |  |

## Decision Notes

Write the short reason for the decision here. If paused, include the fix owner and the next rerun condition.
