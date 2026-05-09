# Hockey Pilot Runbook

Use this during the first 3-6 team hockey pilot. The goal is simple: invite gradually, watch the few places that can get crowded, and keep a clear evidence trail for every go/no-go decision.

## Roles

- Pilot owner: decides invite timing and go/no-go.
- Technical owner: runs QA, load tests, and checks errors.
- Support owner: watches coach/athlete feedback and handles manual invite follow-up.

## Before Invite

1. Confirm pilot shape:
   - team count
   - expected athlete count
   - expected coach/staff count
   - first busy window

2. Confirm invite mode:
   - `live`: emails are enabled and verified
   - `manual`: emails are paused and one owner handles follow-up

3. Confirm the invite wave size:

```bash
HOCKEY_PILOT_TEAM_COUNT=6 HOCKEY_PILOT_ATHLETES_PER_TEAM=30 HOCKEY_PILOT_STAFF_PER_TEAM=5 npm run qa:hockey-pilot-wave-plan
```

4. Run local tooling checks:

```bash
npm run qa:hockey-pilot-gates
```

5. Run target-environment browser checks:

```bash
npm run qa:hockey-browser-env
npm run qa:hockey-pilot-gates -- --include-browser
```

6. Run the hockey pilot load test with evidence export:

```bash
K6_SUMMARY_EXPORT=load-tests/evidence/hockey-pilot-YYYY-MM-DD.json npm run qa:hockey-pilot-gates -- --include-load
```

7. Save the generated evidence:
   - summary JSON
   - analyzer text
   - gate text
   - manifest JSON
   - completed evidence note

   The k6 runner creates the evidence note automatically next to the manifest. You can regenerate it manually from the manifest:

```bash
npm run qa:hockey-pilot-evidence -- load-tests/evidence/hockey-pilot-YYYY-MM-DD.manifest.json load-tests/evidence/hockey-pilot-YYYY-MM-DD.md
```

## During Invite

Invite in small waves:

1. Internal dry run.
2. Team 1 only.
3. Teams 2-3 after 48 quiet hours.
4. Teams 4-6 only after rerunning the hockey pilot load test.

Watch:

- sign-in failures
- invite delivery issues
- dashboard load complaints
- hockey test review errors
- SIMCA/export failures
- daily metrics save failures
- daily metrics backlog growth
- unexpected 401/403 reports from valid users
- database connection or pool warnings

## Pause Criteria

Pause new invites if any of these happen:

- summary gate fails on a production-like run
- repeated valid-user 401/403 reports
- dashboard p95 above the pilot gate for two runs in a row
- export repeatedly times out or blocks dashboards
- daily metrics writes create a visible backlog
- coaches report cross-team visibility or missing team access
- invite delivery mode is unclear

## Go Criteria

Continue to the next wave only when:

- `npm run qa:hockey-pilot-readiness` passes
- `npm run qa:launch-config` passes
- `npm run qa:hockey-pilot-wave-plan` passes
- `npm run qa:hockey-pilot-tenant-boundary` passes
- `npm run qa:hockey-browser-env` passes
- `npm run qa:hockey` passes against the target environment
- `npm run qa:cron-config` passes
- `npm run qa:hockey-pilot-gates` passes
- `npm run qa:hockey-pilot-gates -- --include-load` passes with evidence export
- the hockey pilot load summary gate passes
- `npm run qa:daily-metrics-backlog` passes after the load run
- the manifest says `result.status` is `passed`
- no critical support issues remain open
- tenant isolation spot checks are clean

## After Each Run

1. Review the generated evidence note.
   - Regenerate a pre-filled copy with `npm run qa:hockey-pilot-evidence -- <manifest.json> <output.md>` if needed.
2. Attach or link the generated artifacts.
3. Record the decision:
   - `GO`
   - `PAUSE`
   - `FIX_AND_RERUN`
4. If paused, write the specific owner and next action before inviting more teams.

## Escalation

- Auth or tenant isolation issue: stop invites immediately.
- Data loss or incorrect athlete/team visibility: stop invites immediately.
- Performance-only issue: pause next wave, collect manifest and logs, fix, rerun.
- Email-only issue: switch to manual invite mode if the product remains otherwise healthy.
