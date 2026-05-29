# Team Cockpit Redesign — Plan

**Status:** Design / not yet implemented · no code written yet
**Author context:** Redesign of the team detail page (the screen a coach sees when opening a team).
**Date:** 2026-05-29

---

## Decisions locked

| # | Decision | Choice |
|---|----------|--------|
| 1 | How aggressive is the new landing? | **Full replace.** The team root becomes the two-pane cockpit. Current stat cards + Passuppföljning move entirely to an **Uppföljning** tab. |
| 2 | What does the roster Status dot mean at launch? | **Medical-only first.** Injury/restriction status only (always available). Readiness/ACWR is layered in as Phase 2. |
| 3 | Schedule pane default scope? | **Single day + `‹ Idag ›` nav.** One day at a time, matching the reference design. |

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

The team page already has sub-routes (`/calendar`, `/medical`, `/analysis`, `/tests`, `/multivariate`). The redesign mainly changes **what the team root index renders**:

```
/coach/teams/[teamId]            → Idag (cockpit)        ← NEW default landing
/coach/teams/[teamId]/calendar   → Kalender              (existing TeamCalendarView, untouched)
/coach/teams/[teamId]            → Trupp                 (full TeamRosterTable — management view)
/coach/teams/[teamId]/medical    → Medical               (existing board)
/coach/teams/[teamId]            → Uppföljning           ← current index content moves here
```

> The current index content (stat cards + `TeamWorkoutMonitor` + leaderboard + notes) **moves to Uppföljning**. Nothing is deleted — it's demoted one click.

---

## The cockpit spec (team root)

### Header (slim)
Team name · sport badge · player count. Action cluster collapses from a wall of equal-weight black buttons to: **Tilldela pass** (primary) · Lagkalender · Medical · `⋯` (Skriv ut lagpass, Lägg till spelare, Skapa blockplan).

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

1. **Cockpit shell on existing data** — two panes (schedule from events API + compact roster with injury/restriction + today-workout), move current stats/`TeamWorkoutMonitor` to the **Uppföljning** tab. *Fixes the confusing-landing problem on its own.*
2. **Readiness + ACWR** into the status dot and attention strip (adds the batched readiness helper + "ej incheckad" state).
3. **Cross-pane interactions**, position filter across both panes, live "now" highlighting.
4. **Fix + reframe the adherence analytics** in Uppföljning (resolve the discrepancy).

No `prisma migrate` in any slice — purely a re-layout of data that already flows.

---

## Open questions / later

- **Roster at scale (19–55).** Compact rail needs sticky header + search + position grouping; confirm the read query is batched (avoid N+1 over members for status).
- **Mobile/tablet.** Two-pane collapses to tabs (Schedule | Roster) rinkside; status dots must survive the squeeze.
- **Readiness adoption signal.** Before Phase 2, confirm how many athletes actually submit `DailyCheckIn` — it decides whether the readiness layer is worth surfacing prominently.
