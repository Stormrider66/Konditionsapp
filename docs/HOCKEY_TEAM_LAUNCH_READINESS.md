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

When `manual`, the check warns if outbound email is not paused and asks for `HOCKEY_PILOT_MANUAL_INVITE_OWNER` so follow-up ownership is explicit.

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
```

Optional load knobs:

```env
HOCKEY_PILOT_WARM_VUS=10
HOCKEY_PILOT_STEADY_VUS=35
HOCKEY_PILOT_PEAK_VUS=75
HOCKEY_PILOT_READ_WEIGHT=0.40
HOCKEY_PILOT_ATHLETE_WEIGHT=0.25
HOCKEY_PILOT_DASHBOARD_WEIGHT=0.20
HOCKEY_PILOT_EXPORT_WEIGHT=0.15
HOCKEY_EXPORT_PRESET=aerobic_profile
```

Run:

```bash
K6_SUMMARY_EXPORT=load-tests/hockey-pilot-summary.json npm run load:k6:hockey-pilot
node load-tests/k6/analyze-summary.cjs load-tests/hockey-pilot-summary.json
```

## Pilot Green Gate

Pass these before inviting the first external teams:

- `npm run build` completes
- `npm run qa:launch-config` passes
- `npm run qa:hockey` passes against the target environment
- hockey pilot load test passes at `35` steady VUs and `75` peak VUs
- overall `http_req_failed < 1.5%`
- overall p95 request duration `<= 2000ms`
- overall p99 request duration `<= 5000ms`
- `team-dashboard` p95 `<= 1500ms`
- `business-stats` p95 `<= 1500ms`
- `hockey-tests-list` p95 `<= 1800ms`
- `hockey-athlete-summary` p95 `<= 1500ms`
- `athlete-calendar` p95 `<= 1800ms`
- `daily-metrics-get` p95 `<= 1000ms`
- `daily-metrics-post` p95 `<= 1200ms`
- `hockey-simca-export` p95 `<= 3000ms`
- no database pool exhaustion during the run
- no repeated 401/403 errors for valid coach sessions
- no tenant-boundary failure in manual spot checks
- `canAccessClient` regression tests pass for team-scoped staff
- staff invite regression tests pass for team-scoped roles and team assignment validation
- email launch mode is decided: either invites enabled and verified, or a manual onboarding workaround is documented

## Must-Fix Before Invite

1. Verify invite/onboarding with real coach and athlete accounts while `EMAILS_PAUSED` is in the intended launch state.
2. Run `npm run qa:launch-config`.
3. Run `npm run qa:hockey` against production-like data.
4. Run `npm run load:k6:hockey-pilot` and save the summary JSON.
5. Manually spot-check tenant isolation:
   - coach from Team A cannot access Team B-only athletes unless business-level permissions allow it
   - athlete cannot open another athlete's hockey summary
   - assistant/team-scoped staff cannot export another team's CSV
   - physical trainer/assistant coach can access assigned-team athletes but not every athlete in the club
   - team-scoped staff invites require valid teams from the pilot business
6. Confirm expensive surfaces degrade safely:
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
- analyzer output
- commit SHA
- environment: local/staging/production
- VU knobs used
- seeded/imported data size
- known failures and fixes
