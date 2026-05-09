# Hockey Cockpit QA And Demo Data

This note covers the repeatable checks and seed data for the Skelleftea hockey workflow.

## QA Script

For local/demo development, run:

```bash
TRAINOMICS_QA_BASE_URL="http://localhost:3000" \
TRAINOMICS_QA_EMAIL="coach@example.com" \
TRAINOMICS_QA_PASSWORD="..." \
TRAINOMICS_QA_BUSINESS_SLUG="skelleftea-aik" \
npm run qa:hockey
```

For invite evidence, use the combined gate against a production-like `https://` target:

```bash
TRAINOMICS_QA_BASE_URL="https://pilot.example.com" \
TRAINOMICS_QA_EMAIL="coach@example.com" \
TRAINOMICS_QA_PASSWORD="..." \
TRAINOMICS_QA_BUSINESS_SLUG="skelleftea-aik" \
npm run qa:hockey-pilot-gates -- --include-browser
```

The combined browser gate intentionally fails localhost and plain HTTP targets so a local demo check cannot be mistaken for launch evidence.

The script logs in, opens the hockey testing page, checks that the VO2/ramp, LT1/LT2, and 7x40 sections render, follows the first team shortcut, checks the team tests page for ice-speed/team-gap and aerobic-profile blocks, then opens the aerobic SIMCA export and verifies key aerobic variables are present.

## Demo Seed

Run:

```bash
SKELLEFTEA_OWNER_EMAIL="coach@example.com" npm run seed:skelleftea-hockey-demo
```

If the `skelleftea-aik` business already exists, the script can infer the owner from the existing active business member. The owner email is required the first time a workspace is created.

The seed creates or updates:

- `skelleftea-aik` club workspace and hockey organization.
- A-team, J20, and J18 teams.
- 12 demo hockey athletes across C/W/D/G positions.
- Three seasons of hockey physical tests per athlete.
- Matching lab/ramp `Test` records and `AthleteProfile` lactate data.

Half of the latest hockey tests intentionally omit aerobic values. That lets the app demonstrate the linked-source badge where VO2, LT1/LT2, max lactate, max HR, and ramp context are pulled from lab/profile data without manually duplicating values.
