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
HOCKEY_PILOT_TEAM_COUNT=6 \
HOCKEY_PILOT_ATHLETES_PER_TEAM=30 \
HOCKEY_PILOT_STAFF_PER_TEAM=5 \
HOCKEY_PILOT_EXPECTED_PEAK_USERS=75 \
HOCKEY_PILOT_SUPPORT_OWNER="Support Lead" \
HOCKEY_PILOT_SUPPORT_SLA_HOURS=24 \
HOCKEY_PILOT_OPEN_CRITICAL_ISSUES=0 \
npm run qa:hockey-pilot-wave-plan
```

4. Run local tooling checks:

```bash
npm run qa:hockey-pilot-gates
```

5. Run target-environment browser checks:

```bash
HOCKEY_PILOT_TARGET_COMMIT_SHA="vercel-deployment-commit-sha" npm run qa:hockey-browser-env
HOCKEY_PILOT_TARGET_COMMIT_SHA="vercel-deployment-commit-sha" npm run qa:hockey-pilot-gates -- --include-browser
```

For invite evidence, the browser target must be a production-like `https://` URL. Localhost browser checks are useful during development, but the combined browser gate fails local/plain HTTP targets on purpose. The browser preflight prints `Target production-like: yes/no` and `Target deployment matches commit SHA: yes/no`.

6. Run the hockey pilot load test with evidence export:

```bash
HOCKEY_PILOT_SUPPORT_OWNER="Support Lead" \
HOCKEY_PILOT_SUPPORT_SLA_HOURS=24 \
HOCKEY_PILOT_OPEN_CRITICAL_ISSUES=0 \
HOCKEY_PILOT_TARGET_COMMIT_SHA="vercel-deployment-commit-sha" \
K6_SUMMARY_EXPORT=load-tests/evidence/hockey-pilot-YYYY-MM-DD.json \
npm run qa:hockey-pilot-gates -- --include-load
```

For invite evidence, the load target must also be a production-like `https://` URL. Use localhost only for debugging the script itself. The load preflight also prints `Target production-like: yes/no`.

Before using browser or load results for an invite decision, confirm the target deployment is the same commit SHA recorded in the manifest or preflight output. Set `HOCKEY_PILOT_TARGET_COMMIT_SHA` when running invite evidence so the browser preflight, load manifest, and evidence note record whether the deployment matches. A newer Vercel build means the evidence should be rerun against the new deployment.

Find the real deployment commit from the Vercel deployment details page before replacing `vercel-deployment-commit-sha`. You can also inspect the deployment with the Vercel CLI:

```bash
npm run qa:hockey-deployment-commit
vercel inspect https://your-deployment-url.vercel.app
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
- browser and load gates were run against production-like `https://` targets
- the target deployment commit matches the manifest commit SHA
- the hockey pilot load summary gate passes
- `npm run qa:daily-metrics-backlog` passes after the load run
- the manifest says `result.status` is `passed`
- invite mode and email pause state match the planned onboarding flow
- a support owner is named for the invite window
- support SLA is 24h or faster
- no critical support issues remain open
- tenant isolation spot checks are clean

## After Each Run

1. Review the generated evidence note.
   - Regenerate a pre-filled copy with `npm run qa:hockey-pilot-evidence -- <manifest.json> <output.md>` if needed.
   - Confirm `Target production-like` is `yes`; older manifests without target metadata must be rerun.
   - Confirm the target deployment still matches the manifest commit SHA.
   - Confirm invite mode, email pause state, and manual invite owner match the plan.
2. Attach or link the generated artifacts.
3. Record the decision:
   - `GO`
   - `PAUSE`
   - `FIX_AND_RERUN`
4. Record support status:
   - support owner
   - response SLA
   - support notes link
   - open critical support issue count
5. If paused, write the specific owner and next action before inviting more teams.

## Escalation

- Auth or tenant isolation issue: stop invites immediately.
- Data loss or incorrect athlete/team visibility: stop invites immediately.
- Performance-only issue: pause next wave, collect manifest and logs, fix, rerun.
- Email-only issue: switch to manual invite mode if the product remains otherwise healthy.
