# Skelleftea AIK Pilot Onboarding

Use this as the controlled development-pilot path before selling Trainomics as a finished SHL product.

## Scope

- Start with A-team plus one junior team.
- Staff-first workflow: physical trainer, coach, physio, sport director.
- Athlete portal can be enabled after roster and profile data are clean.
- Treat this as a 6-month founding partner pilot, not a full production rollout.

## Setup

1. Make sure the owning coach user exists in Supabase/Auth and in the Trainomics `User` table.
2. Run:

```bash
SKELLEFTEA_OWNER_EMAIL="you@example.com" npm exec tsx --tsconfig tsconfig.scripts.json scripts/setup-skelleftea-pilot.ts
```

Optional env vars:

- `SKELLEFTEA_BUSINESS_SLUG`, defaults to `skelleftea-aik`
- `SKELLEFTEA_BUSINESS_NAME`, defaults to `Skelleftea AIK`

## First Data Import

1. Open `/{businessSlug}/coach/teams`.
2. Open the A-team.
3. Import `docs/pilot/skelleftea-roster-template.csv` as the shape for the real roster.
4. Review every parsed row before saving.
5. Complete missing profile data before inviting athletes into the portal.

## First Hockey Test Day

Use `docs/pilot/skelleftea-hockey-test-template.csv` as the column shape for a broad test session.

Minimum first-day metrics:

- jersey number and player name
- 5-10-5 left/right
- 10m sprint
- standing long jump
- grip left/right
- back squat or power clean if available

## Go/No-Go Before Wider Club Use

- Team dashboard pilot checklist is green for roster and profiles.
- At least one hockey test session is saved and visible in the team test matrix.
- Staff roles are assigned to the correct teams.
- Athlete data access has been explained to the club.
- No unresolved broken links under `/{businessSlug}/coach/teams/{teamId}`.
