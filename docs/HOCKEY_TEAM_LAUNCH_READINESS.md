# Hockey Team Launch Readiness

Use this as the immediate launch plan for inviting 3-6 hockey teams. It is intentionally smaller than the full 5,000-user gate, but it should produce evidence before real coaches and athletes arrive.

## Expected Pilot Shape

- Teams: `3-6`
- Athletes: `75-210`
- Coaches/staff: `6-30`
- Normal peak: `25-40` concurrent users
- Stress peak: `75` concurrent users
- Main crowded moments:
  - coaches opening team dashboards after testing
  - coaches reviewing hockey test matrices and athlete summaries
  - athletes opening dashboards/check-ins around practice
  - coaches exporting SIMCA/aerobic-profile CSVs

## Critical Journeys

| Journey | Routes/APIs | Launch risk |
| --- | --- | --- |
| Coach opens team context | `GET /api/business/[id]/stats`, `GET /api/teams/[id]/dashboard` | dashboard over-fetch, team count fan-out |
| Coach reviews hockey testing | `GET /api/coach/hockey-tests?teamId=...`, `GET /api/teams/[id]/hockey-test-package` | hockey test query growth, exercise hydration |
| Coach checks one athlete | `GET /api/clients/[id]/hockey-tests/summary` | summary/history query fan-out |
| Coach exports analysis CSV | `GET /api/teams/[id]/hockey-tests/export?preset=aerobic_profile` | large CSV generation under repeated clicks |
| Athlete daily use | `GET/POST /api/daily-metrics`, `GET /api/calendar/unified` | write bursts, deferred processing backlog |
| Invite/onboarding | business invitations, athlete platform invites, auth callback | email paused, auth edge cases, tenant isolation |

## Browser QA Coverage

`npm run qa:hockey` logs in as a coach and checks:

- hockey cockpit page renders without browser console/page errors
- hockey test list API returns tests for the selected team
- team hockey test package API returns enabled package items
- athlete hockey summary API returns history for a real team athlete
- team tests page renders speed-gap and aerobic-profile sections
- aerobic SIMCA export includes `vo2_max_ml_kg_min` and `lt2_speed_kmh`

## Invite/Email QA Coverage

Run before athlete or staff onboarding:

```bash
npm run qa:launch-config
```

Required decision:

```env
HOCKEY_PILOT_INVITE_MODE=live    # real invite email
# or
HOCKEY_PILOT_INVITE_MODE=manual  # email suppressed/manual follow-up
```

When `live`, the check requires `EMAILS_PAUSED` to be off, Resend to be configured, Supabase service role credentials to be present, and `NEXT_PUBLIC_APP_URL` to be a production `https://` URL.

When `manual`, the check requires outbound email to be paused and requires `HOCKEY_PILOT_MANUAL_INVITE_OWNER` so follow-up ownership is explicit.

## Immediate Test Data

For local/demo validation:

```bash
SKELLEFTEA_OWNER_EMAIL="coach@example.com" npm run seed:skelleftea-hockey-demo
```

For a realistic pilot load test, seed or import at least:

- 6 teams
- 25-30 athletes per team
- 2-5 staff per team
- 2-3 seasons of hockey test history for at least one team
- recent daily metrics for 30-60 athletes
- at least 5 athlete accounts invited and able to sign in

## Hockey Pilot Load Test

The pilot-specific k6 script lives at:

```bash
load-tests/k6/hockey-pilot.js
```

It exercises:

- hockey test list
- hockey test package
- athlete hockey summary
- athlete calendar
- daily metrics read/write
- business stats
- team dashboard
- SIMCA/aerobic-profile export

Required `load-tests/.env.k6` values:

```env
BASE_URL=http://localhost:3000
CLIENT_ID=...
CLIENT_IDS=client-id-1,client-id-2,client-id-3
BUSINESS_ID=...
TEAM_ID=...
BUSINESS_SLUG=skelleftea-aik
AUTH_COOKIE=...
ATHLETE_AUTH_COOKIE=... # required for athlete daily-metrics writes unless using ATHLETE_BEARER_TOKEN or athlete bypass email
```

To generate a coach session plus a matching athlete session locally:

```bash
LOAD_TEST_ATHLETE_EMAIL="athlete@example.com" npm run load:k6:auth -- "coach@example.com"
```

When `LOAD_TEST_ATHLETE_EMAIL` is set, the generated `CLIENT_ID`/`CLIENT_IDS` are pinned to that athlete's client record so daily-metrics writes exercise the correct access path. If athlete traffic is enabled, keep `CLIENT_IDS` to the one athlete that matches the athlete auth session.

For a multi-business pilot owner, pin the environment generation to the intended business and team so the run does not accidentally target an older or empty team:

```bash
LOAD_TEST_BUSINESS_SLUG=skelleftea-aik LOAD_TEST_TEAM_ID="<team-id>" LOAD_TEST_ATHLETE_EMAIL="athlete@example.com" npm run load:k6:auth -- "coach@example.com"
```

Optional load knobs:

```env
HOCKEY_PILOT_WARM_VUS=10
HOCKEY_PILOT_STEADY_VUS=35
HOCKEY_PILOT_PEAK_VUS=75
HOCKEY_PILOT_EXPECTED_PEAK_USERS=75
HOCKEY_PILOT_WARM_DURATION=2m
HOCKEY_PILOT_STEADY_DURATION=6m
HOCKEY_PILOT_PEAK_DURATION=4m
HOCKEY_PILOT_RAMP_DOWN_DURATION=2m
HOCKEY_PILOT_READ_WEIGHT=0.40
HOCKEY_PILOT_ATHLETE_WEIGHT=0.25
HOCKEY_PILOT_DASHBOARD_WEIGHT=0.20
HOCKEY_PILOT_EXPORT_WEIGHT=0.15
HOCKEY_EXPORT_PRESET=aerobic_profile
ATHLETE_BEARER_TOKEN=...
ATHLETE_LOAD_TEST_BYPASS_USER_EMAIL=athlete@example.com
HOCKEY_PILOT_REQUIRED_ENDPOINTS= # optional comma-separated override; use only for narrow debug runs
```

Coach/review endpoints use `AUTH_COOKIE`/`BEARER_TOKEN`. Athlete daily-use endpoints can override that with `ATHLETE_AUTH_COOKIE`, `ATHLETE_BEARER_TOKEN`, or `ATHLETE_LOAD_TEST_BYPASS_USER_EMAIL`. The athlete identity must map to the `CLIENT_ID`/`CLIENT_IDS` used for daily metrics, otherwise writes should correctly return `403`.

If you deliberately want a coach-only hockey load run, set:

```env
HOCKEY_PILOT_ATHLETE_WEIGHT=0
```

Otherwise the script fails fast when athlete traffic is enabled without athlete auth, so a long run does not quietly become a wall of expected `403`s.

At least one traffic weight must be greater than `0`; all-zero weights are treated as a configuration error.

`HOCKEY_PILOT_PEAK_VUS` must be at least `HOCKEY_PILOT_EXPECTED_PEAK_USERS` before the run can count as pilot evidence.

Run:

```bash
npm run qa:hockey-pilot-gates
npm run qa:hockey-pilot-wave-plan
npm run qa:hockey-pilot-tenant-boundary
npm run qa:hockey-pilot-env
K6_SUMMARY_EXPORT=load-tests/hockey-pilot-summary.json npm run qa:hockey-pilot-gates -- --include-load
npm run qa:hockey-pilot-tooling
```

Add browser cockpit QA when a target app and QA credentials are ready:

```bash
npm run qa:hockey-browser-env
npm run qa:hockey-pilot-gates -- --include-browser
```

`npm run load:k6:hockey-pilot` also runs the same env preflight automatically before k6 starts. When `K6_SUMMARY_EXPORT` is set, it also prints the k6 analyzer output and runs the summary gate after k6 finishes.

Shell environment variables override values in `load-tests/.env.k6`, so one-off commands such as `HOCKEY_PILOT_ATHLETE_WEIGHT=0 npm run load:k6:hockey-pilot` behave consistently in both preflight and k6.

Values in `load-tests/.env.k6` may be quoted and can use inline comments after a space, for example `CLIENT_ID=abc123 # pilot athlete`.

Set `K6_SUMMARY_EXPORT` for pilot runs so the summary JSON is saved as launch evidence. The k6 runner creates the export directory automatically.

When the hockey pilot run finishes, the runner also saves `<summary>.analyzer.txt`, `<summary>.gate.txt`, `<summary>.manifest.json`, and `<summary>.md` next to the JSON file. The manifest records the target, business/team IDs, client count, auth modes, traffic weights, git commit/branch/dirty status, artifact paths, and whether the analyzer/gate passed or failed.

If k6 exits nonzero after writing the summary JSON, the runner still saves analyzer, gate, and manifest evidence. The manifest records the k6 exit code so threshold failures are reviewable instead of disappearing into terminal scrollback.

Regenerate the pre-filled go/no-go evidence note from the manifest if needed:

```bash
npm run qa:hockey-pilot-evidence -- load-tests/evidence/hockey-pilot-YYYY-MM-DD.manifest.json load-tests/evidence/hockey-pilot-YYYY-MM-DD.md
```

`npm run qa:hockey-pilot-summary -- <summary.json>` can also be run manually to re-check a saved k6 JSON. The checker uses the same traffic weights to decide which endpoint groups are required. For example, `HOCKEY_PILOT_ATHLETE_WEIGHT=0` makes athlete-only endpoints optional for coach-only debug runs. Use `HOCKEY_PILOT_REQUIRED_ENDPOINTS` only for narrow investigations where you intentionally want a custom coverage set.

## Pilot Green Gate

Pass these before inviting the first external teams:

- `npm run build` completes
- `npm run qa:hockey-pilot-gates` passes locally
- `npm run qa:hockey-pilot-readiness` passes locally
- `npm run qa:launch-config` passes
- `npm run qa:hockey-pilot-wave-plan` passes with the intended team/staff/athlete counts
- `npm run qa:hockey-pilot-tenant-boundary` passes
- `npm run qa:hockey-browser-env` passes before target browser QA
- `npm run qa:hockey` passes against the target environment
- `npm run qa:hockey-pilot-env` passes before running k6
- `npm run qa:cron-config` passes
- `npm run qa:hockey-pilot-summary -- <summary.json>` passes after the run
- `npm run qa:daily-metrics-backlog` passes before and after the run
- `npm run qa:hockey-pilot-tooling` passes after preflight, runner, or summary-gate edits
- hockey pilot load test passes at `35` steady VUs and `75` peak VUs
- overall `http_req_failed < 1.5%`
- overall p95 request duration `<= 2000ms`
- overall p99 request duration `<= 5000ms`
- `team-dashboard` p95 `<= 1500ms`
- `business-stats` p95 `<= 1500ms`
- `hockey-tests-list` p95 `<= 1800ms`
- `hockey-package` p95 `<= 1500ms`
- `hockey-athlete-summary` p95 `<= 1500ms`
- `athlete-calendar` p95 `<= 1800ms`
- `daily-metrics-get` p95 `<= 1000ms`
- `daily-metrics-post` p95 `<= 1200ms`
- `hockey-simca-export` p95 `<= 3000ms`
- required endpoint fail rates stay below their k6 thresholds
- no database pool exhaustion during the run
- no repeated 401/403 errors for valid coach sessions
- no tenant-boundary failure in manual spot checks
- `canAccessClient` regression tests pass for team-scoped staff
- staff invite regression tests pass for team-scoped roles and team assignment validation
- email launch mode is decided: either invites enabled and verified, or a manual onboarding workaround is documented

## Must-Fix Before Invite

1. Verify invite/onboarding with real coach and athlete accounts while `EMAILS_PAUSED` is in the intended launch state.
2. Run `npm run qa:launch-config`.
3. Run `npm run qa:hockey-pilot-wave-plan` with the intended pilot size:
   - `HOCKEY_PILOT_TEAM_COUNT`
   - `HOCKEY_PILOT_ATHLETES_PER_TEAM`
   - `HOCKEY_PILOT_STAFF_PER_TEAM`
   - `HOCKEY_PILOT_EXPECTED_PEAK_USERS`
4. Run `npm run qa:hockey-pilot-tenant-boundary`.
5. Run `npm run qa:hockey` against production-like data.
6. Run `npm run load:k6:hockey-pilot`, save the summary JSON, and confirm the automatic summary gate passes.
7. Manually spot-check tenant isolation:
   - coach from Team A cannot access Team B-only athletes unless business-level permissions allow it
   - athlete cannot open another athlete's hockey summary
   - assistant/team-scoped staff cannot export another team's CSV
   - physical trainer/assistant coach can access assigned-team athletes but not every athlete in the club
   - team-scoped staff invites require valid teams from the pilot business
8. Confirm expensive surfaces degrade safely:
   - repeated CSV export does not block dashboards
   - daily metrics writes do not build a visible deferred-processing backlog
   - AI/video/report features have practical rate limits during pilot week

## Rollout Sequence

1. Internal dry run with demo hockey workspace.
2. Invite 1 team and monitor sign-in, dashboard, test review, and export behavior for 48 hours.
3. Invite 2 more teams only if error rate and support issues stay low.
4. Pause before teams 4-6 and rerun `hockey-pilot` against production-like data.
5. Move to the full `docs/5000_USER_LAUNCH_CHECKLIST.md` only after the pilot gates are green.

## Evidence To Save

- k6 summary JSON
- analyzer output (`<summary>.analyzer.txt`)
- summary gate output (`<summary>.gate.txt`)
- run manifest (`<summary>.manifest.json`)
- commit SHA
- environment: local/staging/production
- VU knobs used
- seeded/imported data size
- known failures and fixes

See `docs/HOCKEY_PILOT_RUNBOOK.md` for the invite-week operating flow and `docs/templates/hockey-pilot-run-evidence.md` for the evidence note template.
