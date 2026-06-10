# Athlete Profile (Coach Mode) — IA Redesign & Implementation Plan

Status: **implemented — all phases 0–4 shipped** (2026-06-06; commits `4a8a2a15` phases 0–2, `5c479188` phases 3–4, `5c9bb870` team-plan surfacing, `7156644b` endurance-table gating). The deferred Phase-0 step 3 (server-side parallel data loading, no more fetch-on-mount waterfall) shipped 2026-06-10 (`7224f427`). The legacy endurance table was fully replaced by the managed AssessmentTimeline 2026-06-10 (`f9806b36`), and the orphaned-IntegrationToken audit found nothing to clean (FK cascade holds). **No open items.**
Scope: the coach-mode athlete profile at `app/(business)/[businessSlug]/coach/clients/[id]/page.tsx`.

---

## 1. Problem

The page is a single **2,273-line client component** that builds every tab's JSX inline,
runs **5 client-side `fetch()` waterfalls** in a `useEffect`, then hands four blobs to
`components/client/ClientDetailTabs.tsx`. Concretely:

- **Duplicated sport branching.** `isHockeyAthlete` is computed three different ways
  (`page.tsx:576`, `components/test/TestPageContent.tsx`, and
  `components/coach/sport-views/SportSpecificAthleteView.tsx`'s `switch`), and running is
  special-cased *outside* the sport switch (`page.tsx:1568`).
- **Fragmented tests.** Five disjoint models — `Test`, `HockeyPhysicalTest`, `SportTest`,
  `ErgometerFieldTest`, `CustomTestResult` — and the on-page table shows **only** endurance
  `Test`, so a hockey player's actual battery isn't where you'd look.
- **Hidden data.** Rich pre-computed aggregates already exist but aren't surfaced:
  `WeeklyTrainingSummary` / `MonthlyTrainingSummary` / `YearlySummary`, `ProgressionTracking`
  + `OneRepMaxHistory`, per-set `SetLog`, multi-source activity feeds (Strava/Garmin/Concept2/
  `AdHocWorkout`), and the full `DailyMetrics` wellness model.
- **Team context invisible** on the individual profile (team percentile/rank lives only on the
  team page), and **Garmin** is fully built but has no coach-facing home.

**Key insight:** the redesign is ~80% composition + a sport-strategy layer, ~20% new
viz/aggregation. It is **not** a data-modeling project.

---

## 2. Locked decisions

- Keep the **4-tab shell**, redefined in decision order: **Today · Plan · Development · Profile**.
- **Statistics + recurring-exercise/workout progression + wellness-component trends** all live
  **inside Development**, next to a unified test timeline.
- Priority situations: **individual runner**, **team hockey player**, **Garmin-connected athlete**.

### Tab ownership

| Coach question | Tab | Owns |
|---|---|---|
| "Is this athlete OK *right now*?" | **Today** | Readiness, load/ACWR, active flags/injury, fueling, Garmin source indicator, next action |
| "What's the plan, and are they doing it?" | **Plan** | Block/program, calendar, **compliance**, **completed-workout browser** |
| "Are they getting better?" | **Development** | **Unified test timeline**, sport view, **team percentile (hockey)**, **exercise/workout progression**, **training statistics**, **wellness trends** |
| "Who are they / is setup right?" | **Profile** | Personal + sport profile, portal, **integrations / Garmin connection** |

---

## 3. Two structural fixes (the spine)

### A. Sport-strategy registry
`lib/coach/athlete-profile-config.ts`:

```ts
getAthleteProfileConfig(sportProfile, team) => {
  sportKind: 'ENDURANCE' | 'TEAM' | 'STRENGTH' | 'RACKET' | ...,
  isTeamAthlete: boolean,
  testKinds: TestKind[],          // which assessment entries/lenses apply
  modules: Record<TabId, ModuleId[]>  // ordered module ids per tab
}
```

The page renders `config.modules[tab]`. Running and hockey become two configs, not special cases.
Deletes the three duplicate `isHockey` checks and the `page.tsx:1568` running bolt-on.

### B. Unified test timeline
One chronological, typed feed across the five test models, each row tagged with a `kind` badge and
an **individual-vs-team** marker, click-through to a kind-specific detail renderer. Replaces the
endurance-only table.

---

## 4. Module catalog

Legend: **♻︎ reuse** · **🔧 compose** (exists, needs wiring/aggregation) · **🆕 new** (mostly viz; data in DB).

### Today
| Module | Source | Status |
|---|---|---|
| Decision cockpit (Plan/Test/7-day/Next action) | inline heuristics | ♻︎ extract |
| Readiness (score, HRV/RHR/wellness/ACWR, 7-day trend) | `DailyMetrics` → `ReadinessDashboard` | ♻︎ |
| Training load / ACWR (zone, acute-vs-chronic sparkline) | `TrainingLoad` → `ClientLoadSummary` | ♻︎ |
| Active flags (red/yellow, injury pain, illness, physio request) | `DailyMetrics.redFlags/injury*` | 🔧 small card |
| Fueling snapshot | `ClientFuelingSummary` | ♻︎ |
| Garmin data-source / freshness indicator | `IntegrationToken` | 🆕 small |

### Plan
| Module | Source | Status |
|---|---|---|
| Current block / program / AthletePlan | programs + athlete-plans | ♻︎ |
| Unified calendar (planned vs completed) | `UnifiedCalendar` | ♻︎ |
| Compliance (% planned completed, streak) | `WeeklyTrainingSummary.compliancePercent` | 🆕 viz |
| Completed-workout browser (multi-source, click→detail+feedback) | `WorkoutLog`+`SetLog`+activities+`AdHocWorkout`; existing `athletes/[id]/logs` + `IntegratedRecentActivity` | 🔧 promote + merge |

### Development
| Module | Source | Status |
|---|---|---|
| Unified test timeline (§3B) | 5 test models | 🔧 new endpoint + reuse renderers |
| Sport view (hockey pathway / endurance pace+zones) | `SportSpecificAthleteView` + `PaceValidationDashboard` | ♻︎ via registry |
| Team percentile / position rank (hockey) | `/api/teams/[id]/test-sessions`, `HockeyNormReference` | 🔧 surface here |
| Exercise/workout progression (1RM, 2-for-2, plateau, PRs, VBT) | `ProgressionTracking`/`OneRepMaxHistory` → `ProgressionDashboard`/`StrengthPRTable`/`PendingPRFeed`/`VBTProgressionWidget` | ♻︎ |
| Recurring-exercise stats (top by frequency/volume + trend) | group-by `SetLog`/`ProgressionTracking` | 🆕 endpoint + viz |
| Training statistics (TSS/distance/duration, zones, polarization, type; weekly→yearly) | `Weekly/Monthly/YearlySummary` + `WeeklyZoneSummary`/`YearlyTrainingOverview` | 🔧 assemble |
| Wellness trends (per-component soreness/energy/mood/stress/sleep; injury timeline) | `DailyMetrics` per-component fields | 🆕 viz |

### Profile
| Module | Source | Status |
|---|---|---|
| Setup checklist, personal info, sport profile editor, portal | existing | ♻︎ |
| Integrations / Garmin connection (status, last sync, quality, connect/disconnect) | `IntegrationToken` + `/api/integrations/garmin` | 🆕 coach-facing card |

---

## 5. Implementation plan (phased, no behavior change until Phase 1)

### Phase 0 — Decompose + registry (pure cleanup, zero behavior change)
1. Create `components/coach/athlete-profile/` and extract the four content blocks into
   `TodayTab.tsx`, `PlanTab.tsx`, `DevelopmentTab.tsx`, `ProfileTab.tsx`. Move shared helpers
   (`buildHockeySettings`, `normalizeHockey*`, `calculateAge`, `calculateBMI`, types) into
   `athlete-profile/lib.ts` and `athlete-profile/types.ts`. `page.tsx` becomes a thin orchestrator
   that still fetches and passes data down. Keep client-side fetching for now.
2. Add `lib/coach/athlete-profile-config.ts` (`getAthleteProfileConfig`) and route ALL sport/team
   branching through it. Remove the duplicate `isHockey` checks in `page.tsx`,
   `components/test/TestPageContent.tsx`, and the `switch` in `SportSpecificAthleteView.tsx`
   (the view consumes the config instead).
3. (Optional, later) Move the 5 fetches to a server component / parallel server fetch to kill the
   `useEffect` waterfall.

### Phase 1 — Unified test timeline
4. Generalize `app/api/clients/[id]/recent-tests/route.ts` into
   `GET /api/clients/[id]/assessments` — typed, paginated, filterable feed across all 5 models with
   `kind` and `isTeamTest` (derive from each row's `teamId`).
5. `components/coach/athlete-profile/AssessmentTimeline.tsx` + per-kind detail renderers (reuse the
   existing endurance/hockey detail views). Replace the endurance-only table in Development.

### Phase 2 — Development surfaces
6. Training-statistics section: assemble `Weekly/Monthly/YearlySummary` with the existing
   `WeeklyZoneSummary` / `YearlyTrainingOverview` into one "Statistics" block.
7. Recurring-exercise stats: `GET /api/clients/[id]/exercise-frequency` (group-by on `SetLog` /
   `ProgressionTracking`) + a compact "top exercises + trend" viz next to `ProgressionDashboard`.
8. Wellness trends: `components/coach/athlete-profile/WellnessTrends.tsx` charting per-component
   `DailyMetrics` fields + an injury-history timeline. Extend `/api/daily-metrics?days=N` if needed.
9. Surface hockey **team percentile / position rank** by consuming `/api/teams/[id]/test-sessions`
   on the individual profile.

### Phase 3 — Plan surfaces
10. Compliance module from `WeeklyTrainingSummary.compliancePercent` (+ check-in streak).
11. Completed-workout browser: promote `athletes/[id]/logs` into a Plan-tab module and merge the
    multi-source feed (`IntegratedRecentActivity`: `WorkoutLog` + Strava + Garmin + Concept2 +
    `AdHocWorkout`), with dedup via `lib/training/activity-deduplication.ts`.

### Phase 4 — Garmin surfacing (launch-ready)
12. Today: data-source/freshness indicator. Profile: coach-facing connection/quality card.
    Lights up when Garmin production approval lands.

### Cross-cutting
- i18n keys in `messages/en.json` + `messages/sv.json` for every new string.
- No regressions to existing widgets; keep URLs/`?tab=` aliases working (`ClientDetailTabs`).
- Add/extend tests for the new endpoints (assessments, exercise-frequency).

**Sequencing:** Phase 0 first (safe, high-clarity, unblocks everything). Phases 1–4 each ship
independently and carry the new value.
