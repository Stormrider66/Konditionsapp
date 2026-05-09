# Hockey Pilot Run Evidence

## Run

- Date:
- Runner:
- Environment:
- Target URL:
- Commit SHA:
- Decision: `GO` / `PAUSE` / `FIX_AND_RERUN`
- Decision reason:

## Pilot Shape

- Teams invited:
- Expected athletes:
- Expected coach/staff users:
- Busy window tested:
- Test data notes:

## Commands

```bash
npm run qa:hockey-pilot-readiness
npm run qa:hockey-pilot-gates
npm run qa:launch-config
npm run qa:hockey
HOCKEY_PILOT_SUPPORT_OWNER="Support Lead" HOCKEY_PILOT_SUPPORT_SLA_HOURS=24 HOCKEY_PILOT_OPEN_CRITICAL_ISSUES=0 HOCKEY_PILOT_TARGET_COMMIT_SHA="vercel-deployment-commit-sha" K6_SUMMARY_EXPORT=load-tests/evidence/hockey-pilot-YYYY-MM-DD.json npm run qa:hockey-pilot-gates -- --include-load
```

## Artifacts

- Summary JSON:
- Analyzer output:
- Summary gate output:
- Manifest JSON:
- Evidence note:
- Screenshot or support notes:

## Manifest Snapshot

- Result status:
- Failed step:
- k6 exit code:
- Summary gate:
- Gate modes:
- Git branch:
- Git tree dirty:
- Release evidence status:
- Target deployment matches commit SHA: `yes/no`
- Business/team:
- Target production-like: `yes/no` (`reason`)
- Invite mode:
- Emails paused:
- Manual invite owner:
- Client ID count:
- Pilot users: `___` users (`___` teams)
- Traffic weights: read `___`, athlete `___`, dashboard `___`, export `___`
- Load profile: warm `___` VUs/`___`, steady `___` VUs/`___`, peak `___` VUs/`___`, ramp down `___`
- Support owner:
- Support SLA:
- Open critical support issues:

## Gate Results

- Overall fail rate:
- Overall p95:
- Overall p99:
- Slowest endpoint:
- Endpoint failures:

| Endpoint | p95 | p99 | Fail rate |
| --- | ---: | ---: | ---: |
|  |  |  |  |

## Access Checks

- Automated tenant-boundary regressions:
- Staff invite/team assignment regressions:
- Live Team A vs Team B coach check:
- Live athlete-to-athlete summary check:
- Live team-scoped export check:
- Live support/admin override check:

## Manual Checks

- Coach can open assigned team dashboard:
- Coach can review hockey tests:
- Coach can export SIMCA/aerobic profile:
- Athlete can open own dashboard:
- Athlete can save daily metrics:
- Team-scoped staff cannot access another team:
- Athlete cannot access another athlete summary:

## Support Watch

- Sign-in or invite reports:
- Dashboard slow-load reports:
- Hockey test review reports:
- Export/SIMCA reports:
- Daily metrics save reports:
- Valid-user 401/403 reports:
- Support SLA:
- Open critical support issues:

## Issues

| Severity | Area | Symptom | Owner | Next action |
| --- | --- | --- | --- | --- |
|  |  |  |  |  |

## Decision Notes

Write the short reason for the decision here. If paused or marked `FIX_AND_RERUN`, include the fix owner and the next rerun condition.
