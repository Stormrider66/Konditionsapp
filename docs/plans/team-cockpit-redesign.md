# Team Cockpit Redesign — Plan

**Status:** Phases 1–4 **shipped to `main` 2026-05-30**. The Idag tab renders the phase + attention strips over an interactive two-pane cockpit (live schedule timeline | compact roster rail) plus the auto-hiding setup banner. Cross-pane linking is live: click a session → its players light up in the rail (rest dimmed); click a player → their sessions light up in the schedule (rest dimmed), or a quick-assign CTA appears if they have none; a position filter narrows both panes at once; the active session pulses "now". Next: **Phase 5** — fix + reframe the adherence analytics discrepancy in the Uppföljning tab (the only remaining slice).
**Author context:** Redesign of the team detail page (the screen a coach sees when opening a team).
**Date:** 2026-05-29

---

## Decisions locked

| # | Decision | Choice |
|---|----------|--------|
| 1 | How aggressive is the new landing? | **Full replace.** The team root's *default tab* (Idag) becomes the two-pane cockpit. Current stat cards + Passuppföljning move to an **Uppföljning** tab. |
| 2 | What does the roster Status dot mean at launch? | **Medical-only first.** Injury/restriction status only (always available). Readiness/ACWR is layered in as Phase 2. |
| 3 | Schedule pane default scope? | **Single day + `‹ Idag ›` nav.** One day at a time, matching the reference design. |
| 4 | How are the non-cockpit modules organized? | **Tabs under the header.** Idag (default) · Plan · Uppföljning · Trupp · Medical · Analys. Nothing is deleted — everything is one click away. |
| 5 | Surface the current training block on the cockpit? | **Yes.** A one-line "Nuvarande block: … (n/m) · vecka x/y" strip on the cockpit; the full phase planner lives in the **Plan** tab. |

> **Scope clarification (important):** "Full replace" applies only to the *landing tab*, not the page. The cockpit is the **hero you see first** — it is **not** the whole page. The only content genuinely demoted is the misleading adherence block (stat cards + Passuppföljning). The header, phase planner, notes, analysis cards, leaderboard, and full roster are all **kept** — relocated into sibling tabs, never removed.

---

## Problem

When a coach opens a team today they land on an **analytics-first** page: four stat cards (`Spelare / Tilldelade pass / Genomförda / Genomförandegrad`) and a `Passuppföljning` follow-up panel. Two failure modes:

1. **Wrong altitude.** The landing answers a *reporting* question ("how has adherence looked over 30 days?") when the actual job-to-be-done is *operational* ("what's the plan today, who's training, who needs careful handling?").
2. **It doesn't even answer its own question well.** On a populated team the top cards show `432 assigned / 2 completed / 0%` while the panel right below shows `444 / 14 / 70 / 3%` — two contradictory numbers on one screen. Even fully populated, the page produces *questions*, not *answers*.

The reference design (a prior app by the same author) gets this right: it opens on a **Today's Schedule** timeline with a **status-rich Team Roster** beside it.

## North star

Opening a team must answer three questions in **under 5 seconds**:

1. **What's happening today?** (with day-nav to look ahead)
2. **Is everyone covered?** (who has a workout assigned today)
3. **Who needs careful handling today?** (injured / restricted — readiness in Phase 2)

Adherence-over-time is a **different job** → it gets its own **Uppföljning** tab, and the discrepancy bug gets fixed there.

---

## Key finding: this is a re-assembly, not a rebuild

**Every data point the cockpit needs already exists and is already queried somewhere.** No schema changes, **no `prisma migrate`**. This is pure information-architecture work.

### Data source map

| Cockpit element | Source (model / lib / API — all existing) |
|---|---|
| Today's schedule timeline | `TeamEvent` (`prisma/schema/calendar.prisma`): `startDate`, `endDate`, `title`, `type`, `location`, `linkedWorkoutId`, `linkedWorkoutType`, `contentStatus`, `assignedBroadcastId`. Served by `app/api/coach/teams/[teamId]/events/route.ts`. |
| Session time / duration / location | `TeamWorkoutBroadcast` (`calendar.prisma`): `startTime`, `endTime`, `locationName`, or `TeamEvent.location`. |
| Participant count + completion bar | `TeamWorkoutBroadcast.totalAssigned` / `totalCompleted`, or `getTeamCalendarAssignmentSummaries()` in `lib/team-calendar/assignment-summary.ts` (returns per-athlete `status`, `jerseyNumber`, `position`, `rpe`). |
| Session status (Upcoming / Active / Done) | `AssignmentStatus` enum (`PENDING / SCHEDULED / COMPLETED / SKIPPED / MODIFIED`) + event time vs. now. |
| "Saknar innehåll" warning | `TeamEvent.contentStatus = NEEDS_CONTENT`. |
| Event type badge | `lib/team-calendar/event-types.ts` (`PRACTICE, ICE_PRACTICE, STRENGTH, CARDIO, HYBRID, AGILITY, PREHAB, PLYOMETRICS, GAME, TEST, INTERVAL_SESSION, OFF_DAY, MEETING, …`). |
| Roster rows (#, name, pos) | `Client` (`prisma/schema/core.prisma`): `jerseyNumber`, `position`, `photoUrl`. |
| "Pass idag" column | Existing `TeamRosterMember` aggregation in `page.tsx:199–342`: `todayWorkoutCount`, `upcomingWorkoutCount`. |
| Status dot (medical) | `InjuryAssessment` (`physio.prisma`: `status`, `phase`, `painLevel`) + `TrainingRestriction` (`type`, `severity`, `bodyParts`, `source`). Already aggregated as `activeInjuryCount`, `activeRestrictionCount`, `restrictionSummaries`. |
| Status dot (readiness — Phase 2) | `DailyCheckIn` + `DailyMetrics` → `lib/training-engine/monitoring/readiness-composite.ts` (0–10 score, status, ACWR via `lib/training-engine/injury-management/acwr-monitoring.ts`). |
| Workout deep-link | `TeamEvent.linkedWorkoutId` + `linkedWorkoutType` → `/coach/strength|cardio|hybrid|agility`. |

---

## Information architecture

A **persistent header** sits above a **tab bar**. The team root renders the **Idag** tab by default. Existing sub-routes (`/calendar`, `/medical`, `/analysis`, `/tests`, `/multivariate`) are preserved and surfaced through the header buttons and the **Analys** tab.

```
Header (persistent):  team name · sport · count
                      [+ Tilldela pass]  Medical · Lagkalender · Skriv ut lagpass · Lägg till spelare · ⋯

Tab bar:  [ Idag ]   Plan   Uppföljning   Trupp   Medical   Analys
          ───────
          Idag        → cockpit: phase strip + attention strip + Dagens schema | Trupp-rail
          Plan        → full phase planner (blockplan) + team notes
          Uppföljning → stat cards (deduped/fixed) + Passuppföljning + ergometer-topplista
          Trupp       → full editable TeamRosterTable (photos, inline edit, bulk-assign)
          Medical     → existing medical board (/medical)
          Analys      → Lagets analys (/analysis) · Tester (/tests) · Multivariat (/multivariate)
```

### Element-destination map (nothing is deleted)

| Current element | Verdict | New home |
|---|---|---|
| Header: name · sport badge · player count | **Keep** | Header, slimmed |
| Buttons: Medical · Lagkalender · Skriv ut lagpass · Lägg till spelare · Skapa blockplan · Tilldela pass | **Keep all** | Header — `Tilldela pass` primary; rest grouped, low-frequency ones into `⋯` |
| 4 stat cards (Spelare / Tilldelade / Genomförda / Genomförandegrad) | **Demote + fix** | Uppföljning tab (deduped against the panel — see discrepancy section) |
| Passuppföljning panel (`TeamWorkoutMonitor`) | **Demote** | Uppföljning tab |
| "Snabb kontroll inför lagstart" (Roster / Profiler / Atletportal / Testflöde readiness checklist) | **Keep, auto-hide** | Collapsible setup banner that hides once all states are "Redo" — it's onboarding, noise once complete |
| Phase planner (e.g. "15 veckor styrkeblock", Nuvarande block) | **Keep** | Full planner in **Plan** tab + a one-line "current block" strip on the cockpit |
| Team notes (`TeamNotesCard`) | **Keep** | Plan tab |
| Ergometer-topplista (`TeamLeaderboard`) | **Keep** | Uppföljning tab |
| Analysis cards (Lagets analys · Tester · Multivariat) | **Keep** | Analys tab (they already link to existing sub-routes) |

---

## The cockpit spec (team root)

### Header (slim)
Team name · sport badge · player count. Action cluster collapses from a wall of equal-weight black buttons to: **Tilldela pass** (primary) · Lagkalender · Medical · `⋯` (Skriv ut lagpass, Lägg till spelare, Skapa blockplan).

### Phase context strip (one line)
A thin strip at the top of the cockpit showing where the team is in its plan:

```
NUVARANDE BLOCK:  Maxstyrka (2/6)  ▓▓▓▓░░  ·  vecka 5/15
```

Source: `TeamPlan` / `TeamPlanBlock` (current active block + index + week). Clicking it opens the **Plan** tab. Renders only when an active `TeamPlan` exists; otherwise hidden. The *full* planner lives in Plan — this is just the at-a-glance context so today's sessions read against their phase.

### Attention strip (renders only when non-empty)
A single triage line above the panes:

```
⚠  3 begränsade  ·  1 skadad  ·  4 utan pass idag          [Phase 2 adds: · 2 hög ACWR]
```

Each chip filters the roster pane. Purpose: surface the *exceptions* so the coach acts instead of scanning 19–55 rows.

### Left pane (~60%) — Dagens schema
- Day navigator `‹ Idag ›` + date label.
- Event summary chips: **Events / Active / Upcoming / Done** (from `TeamEvent` set + assignment status).
- Filter by position/role and by session type.
- Timeline of the selected day's `TeamEvent`s. Each card:
  - Time + duration · title + **type badge** · location
  - Participants (`totalAssigned`) with a completion progress bar
  - **Status:** Upcoming / **Active (now)** / Done
  - **View Workout** deep-link (when `linkedWorkoutId` set)
  - **"Saknar innehåll"** warning when `contentStatus = NEEDS_CONTENT` — a scheduled slot with no workout attached (a real operational gap worth flagging)
  - Overflow: assign / edit / print
- **Rest-day empty state:** "Inga pass idag" + quick **Tilldela pass** CTA — never a dead `0`.

### Right pane (~40%) — Trupp (at-a-glance)
- `Trupp (N)` header + "Visa alla" → Trupp tab. Search box + group/sort by position (F/D/G).
- Columns: **# · Namn · Pos · Pass idag · Status**
  - **Pass idag** must actually populate: assigned ✓ / completed / **gap** (highlighted). This column only earns its space if it answers "is this player covered today?" — in the reference mockup every row showed `–`, which we must avoid.
  - **Status dot (medical-only at launch):**
    - 🔴 active injury OR severe/complete restriction
    - 🟡 limited / mild–moderate restriction
    - 🟢 healthy, no active flags
    - `R` marker + count for restrictions (as in the reference)
    - *(Phase 2 blends in readiness: VERY_POOR → red, FAIR → amber, ACWR CRITICAL → red, and adds ⚪️ "ej incheckad" for no-data — never paint unknown as green.)*
  - Row click → cross-highlights that player's session(s) in the left pane.
- Legend: Frisk / Begränsad / Skadad / Restriktioner.

### Cross-pane linking (Phase 3)
- Click a **session** → highlight its participants, dim the rest.
- Click a **player** → highlight their session(s); if none today, offer quick-assign.
- Position filter applies to **both** panes simultaneously.

---

## Reuse vs. build inventory

**Reuse (already exists):**
- `app/api/coach/teams/[teamId]/events/route.ts` + `getTeamCalendarAssignmentSummaries()` → schedule pane
- `TeamRosterMember` aggregation (`page.tsx:199–342`) + injury/restriction queries → roster status
- `lib/training-engine/monitoring/readiness-composite.ts` + `acwr-monitoring.ts` → readiness dot (Phase 2)
- Workout deep-link routes

**Build (new):**
- The two-pane **Idag** index layout (replaces current index body)
- **Attention strip** component
- A **compact, read-optimized roster rail** (distinct from the 1056-line editable `TeamRosterTable.tsx` — that stays as the Trupp management tab)
- A **schedule timeline card** (can derive from the calendar day view)
- A **batched per-row readiness helper** (Phase 2)
- **Cross-pane highlight state** (Phase 3)

---

## The adherence discrepancy (bug to fix in Uppföljning)

The top cards and the Passuppföljning panel run **different queries**:

| | Top cards (`page.tsx:345–420`) | Passuppföljning (`app/api/teams/[id]/workout-monitor/route.ts`) |
|---|---|---|
| Member filter | `businessId === membership.businessId` | none |
| Counts | **team broadcasts only** (`teamBroadcastId != null`) | **all 4 workout types + interval sessions** |
| Window | hard-coded 30 days | 7/30/90 toggle |

**Fix:** collapse to one canonical definition (proposed: *all team-assigned sessions across all types + interval sessions, team-scoped, for the selected window*). Then **reframe** the metric to be actionable — a team-wide ~0–3% completion almost always means *assignments exist but logging isn't happening*. Surface "70 missade pass → vilka spelare?" leading to names, not a vanity "3%."

---

## Phasing (each slice independently shippable; commit + verify per slice)

1. **Tab scaffold + relocate (no logic changes).** Add the header + tab bar; move existing modules into tabs — Plan (phase planner + notes), Uppföljning (stat cards + `TeamWorkoutMonitor` + leaderboard), Trupp (`TeamRosterTable`), Medical, Analys. Auto-hide the "Snabb kontroll" checklist when complete. Pure relocation of existing components → low risk, instantly de-clutters the landing.
2. **Cockpit (Idag tab) on existing data.** ✅ **Shipped 2026-05-30.** Two panes — schedule from events API + compact roster rail with injury/restriction + today-workout — plus the phase-context strip (`TeamPlan`) and attention strip (medical-only). Built in 4 slices: `getTeamRosterStatus` shared helper → `TeamPhaseStrip` + `TeamAttentionStrip` (one aggregation feeds both) → `TeamRosterRail` (compact read-only rail: #/name/pos, pass-idag coverage marker, medical status dot + R-count, client-side search/sort) → `TeamSchedulePane` (client component fetching the events API with a `‹ Idag ›` day-nav; timeline cards with time/duration, type badge, location, completion bar, Upcoming/Active/Done status, "Saknar innehåll" warning, "Visa pass" studio deep-link, rest-day empty-state CTA). A 5th cleanup slice removed the Phase 1 interim plan-summary card (the phase strip + Plan tab supersede it). Verified per slice with typecheck + eslint. *This is the slice that delivers the new operational view.*
3. **Readiness + ACWR** into the status dot and attention strip. ✅ **Shipped 2026-05-30.** `getTeamRosterStatus` now also batch-reads each member's latest `DailyMetrics.readinessLevel` and `TrainingLoad.acwrZone` within a 3-day window (stored values from the nightly `calculate-acwr` cron — no recompute). A new prisma-free `lib/coach/roster-dot-status.ts` derives the blended dot level so the client rail can import it without server deps. The attention strip gains a "hög ACWR" chip (DANGER + CRITICAL zones). **Decision deviation:** the `⚪️ "ej incheckad"` state was **dropped** — per the author, medical stays the base and readiness/ACWR only ever *downgrade* a dot to amber/red; a player with no flags and no readiness/load data **stays green** (never an unknown dot). So: red = injury · POOR/VERY_POOR readiness · DANGER/CRITICAL ACWR; amber = restriction · FAIR readiness · CAUTION ACWR; green = everything else (incl. no data). Adoption open-question is moot under this policy — low check-in adoption just means fewer downgrades, not an all-gray roster. Verified with typecheck + eslint.
4. **Cross-pane interactions**, position filter across both panes, live "now" highlighting. ✅ **Shipped 2026-05-30.** A new client shell `TeamCockpit.tsx` lifts the day-event fetch out of the schedule pane and owns the shared interaction state (selected session/player + position filter); the schedule pane and rail became presentational. Click a session → highlight its participants in the rail + dim the rest (participants read from `assignmentSummary.athletes[].athleteId`, which equals `Client.id`); click a player → highlight their sessions + dim the rest, or show a quick-assign CTA (→ team calendar) when they have none today; selection toggles off on re-click and clears on day-nav. Position filter narrows the rail and dims schedule cards whose *known* roster lacks that position (sessions with unknown rosters stay visible — never hide on unknown). Active sessions get an emerald left-border + a pulsing "now" dot (status captured at load/nav, not a ticking timer). **Known limitation:** the rail's "pass idag" column + status dot remain a *today* snapshot even when the schedule is navigated to another day (the rail is server-rendered once); cross-highlighting still works because it keys off event participants, not the rail counts. Verified with typecheck + eslint. Schedule cards became keyboard-accessible `role=button` divs (an anchor-in-button would've been invalid HTML).
5. **Fix + reframe the adherence analytics** in Uppföljning (resolve the discrepancy).

No `prisma migrate` in any slice — purely a re-layout of data that already flows.

---

## Phase 1 — implementation spec (tab scaffold + relocation)

> **✅ Shipped 2026-05-30.** Built in 3 commits: `TeamTabNav` + i18n; the four extracted routes (`/uppfoljning`, `/plan`, `/trupp`, `/analys`); then the atomic flip (shared `layout.tsx` + interim Idag + header strip on the 6 sub-pages). Two deviations from the spec below: (1) old slices 5 & 6 were **merged** into one atomic commit (introducing the layout forces removing the root + sub-page headers in the same change, so no commit ever shipped a double header); (2) **interim Idag does not re-render the roster** — to avoid duplicating the Trupp tab it shows a phase summary + auto-hiding setup banner + a "Dagens schema kommer härnäst" placeholder. Verified per slice with typecheck + eslint. Known follow-up: `getAccessibleTeam` runs in both layout and page (not `React.cache()`-wrapped like `validateBusinessMembership`) — one extra cheap query per team page load; wrap it if it shows up in profiling.

### Architecture decision: route-based tabs + shared `layout.tsx`

The team area **already uses real sub-routes** (`/medical`, `/analysis`, `/tests`, `/multivariate`, `/calendar`), each a heavy server component with its own data fetch. The right move is to formalize that into a **shared `layout.tsx` (header + tab bar) with one route per tab** — *not* the query-param single-page pattern used by `components/client/ClientDetailTabs.tsx`. Merging these heavy pages into one query-param page would re-create the 687-line monolith and kill per-tab code-splitting / data isolation.

- **Tab bar** = a client nav component (`TeamTabNav`) using `usePathname()` for active state, styled after `ClientDetailTabs` but rendering `<Link>`s, not query-param triggers.
- **Cost:** all 6 sub-pages currently render their own back-link + `<h1>` header (confirmed via inspection). Those get stripped — the layout renders the header once. Mechanical cleanup that *removes* duplication (net win), but it touches 6 files.
- **Rejected alternative:** query-param tabs on a single page (the `ClientDetailTabs` precedent). Rejected because the team sub-views are heavy independent server components already split into routes; consolidating them would regress performance and re-monolith the page.

### New files

| File | Type | Contents |
|---|---|---|
| `…/teams/[teamId]/layout.tsx` | server | Validate membership + team access (`validateBusinessMembership`, `getAccessibleTeam`); fetch header fields (name, sportType, member count, organization); render back-link + team header + action-button cluster + `<TeamTabNav>`; render `{children}`. |
| `components/coach/teams/TeamTabNav.tsx` | client | Tab links: Idag · Plan · Uppföljning · Trupp · Medical · Analys. `usePathname()` active highlight, i18n labels. Sticky under the global header. |
| `…/teams/[teamId]/plan/page.tsx` | server | Phase planner (`AthletePlanSummaryCard` / empty-state `CreateTeamPlanDialog`) + `TeamNotesCard`. Owns the `activeTeamPlan` + `teamNote` queries. |
| `…/teams/[teamId]/uppfoljning/page.tsx` | server | Stat cards + `TeamWorkoutMonitor` + `TeamLeaderboard`. Owns the `memberStats` adherence calc (where the discrepancy gets fixed in Phase 5). |
| `…/teams/[teamId]/trupp/page.tsx` | server | Full editable `TeamRosterTable`. Owns the roster-status aggregation (today/upcoming counts + injuries + restrictions). |
| `…/teams/[teamId]/analys/page.tsx` | server | Hub with the 3 existing quick-link cards (Lagets analys → `/analysis`, Tester → `/tests`, Multivariat → `/multivariate`). |

### Edited files

- **`…/teams/[teamId]/page.tsx` (root = Idag).** Strip everything that moved (stat cards, monitor, plan card, notes, full roster, leaderboard, analysis cards). **Interim Idag (Phase 1) = existing components only:** active-plan summary (`AthletePlanSummaryCard`) + the auto-hiding "Snabb kontroll" setup banner + the roster (`TeamRosterTable`), with a small "Dagens schema kommer härnäst" notice. The real two-pane cockpit (schedule pane + compact rail + phase/attention strips) is **Phase 2** and replaces this interim body. Keep the queries Idag still needs; delete those whose consumers moved.
- **6 sub-pages** (`medical`, `analysis`, `tests`, `multivariate`, `calendar`, `import`): remove the per-page back-link + `<h1>`/badge header blocks (now in layout). Keep page-specific actions (`medical`'s calendar link, `calendar`'s `ManageAssistantsDialog`) — or hoist into the layout cluster. Fix `calendar`'s back-link (currently points to `/teams`, not the team).
- **`messages/sv.json` + `messages/en.json`:** add `coach.pages.teamDetail.tabs.{today,plan,followUp,roster,medical,analysis}`.

### Notes / gotchas
- **Auth dedup:** layout and each page both call `validateBusinessMembership` / `getAccessibleTeam`. Wrap in React `cache()` (or confirm already wrapped) so the layout+page pair doesn't double-query.
- **Sticky nav:** the global `BusinessCoachGlassHeader` is already sticky; `TeamTabNav` should stick just below it.
- **Routing:** new URLs `/plan`, `/uppfoljning`, `/trupp`, `/analys` had no prior deep links → no redirects needed. Root URL stays Idag.
- **Kalender** stays a header button in Phase 1 (already is); promote to a tab later if desired.

### Suggested commit slices (commit + verify each)
1. `layout.tsx` + `TeamTabNav` + i18n keys
2. extract `/uppfoljning`
3. extract `/plan`
4. extract `/trupp` + `/analys`
5. strip headers from the 6 sub-pages (+ fix calendar back-link)
6. trim root → interim Idag

Verify after each: `npm run build` + `npm run typecheck`; click every tab → no double headers, data renders per tab, active highlight correct, setup banner hides when all "Redo".

### Explicitly deferred to Phase 2+
Two-pane cockpit body (schedule timeline + compact rail + phase/attention strips); readiness/ACWR in the status dot (Phase 3); adherence discrepancy fix (Phase 5).

---

## Open questions / later

- **Roster at scale (19–55).** Compact rail needs sticky header + search + position grouping; confirm the read query is batched (avoid N+1 over members for status).
- **Mobile/tablet.** Two-pane collapses to tabs (Schedule | Roster) rinkside; status dots must survive the squeeze.
- **Readiness adoption signal.** Before Phase 2, confirm how many athletes actually submit `DailyCheckIn` — it decides whether the readiness layer is worth surfacing prominently.
