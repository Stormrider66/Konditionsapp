# Legacy Non-Business-Scoped Route Cleanup

Forward-looking plan to delete the parallel non-business-scoped route tree for coach/PT/team/gym/physio surfaces. Deferred from the active hardening pass on 2026-04-25 because the codebase has more cross-tree dependency than first surveyed. Athletes are explicitly **out of scope** — `app/athlete/...` stays for solo (non-business-affiliated) athletes.

Source: post-implementation review on 2026-04-25 + Explore agent audit. Everything below is trigger-driven; until the trigger fires, the proxy.ts redirects keep users away from the dead pages and there's no user-visible problem.

## Current state (2026-04-25)

Two parallel route trees exist for non-athlete surfaces:

- `app/(business)/[businessSlug]/coach|physio|...` — the modern business-scoped tree, where all real users land via `proxy.ts` middleware
- `app/coach/...`, `app/physio/...`, `app/clients/...`, `app/teams/page.tsx` — legacy non-business-scoped tree

`proxy.ts` (lines ~730-847) **already unconditionally redirects** `/coach/*` and `/physio/*` traffic to `/{primarySlug}/coach/*` / `/{primarySlug}/physio/*` for any authenticated user with a business affiliation. Coaches without a business slug are kicked to login or 404. So in practice **nobody lands on the legacy non-athlete pages today**.

`app/athlete/...` is the **intentional exception** — solo athletes (no `primarySlug`) fall through to it. Keep this branch alive forever.

## Why this is deferred — the cross-tree import pattern

The legacy tree is not just dead code waiting to be cut. The codebase's actual architecture is:

> The implementations live under `app/coach/...`. The business-scoped pages are thin wrappers that re-export them.

Concrete example (one of 34):

```tsx
// app/(business)/[businessSlug]/coach/tools/page.tsx
export { default } from '@/app/coach/tools/page'
```

Deleting `app/coach/tools/page.tsx` would simultaneously break the business-scoped tools page that imports it. **Naive `rm -rf` is not safe.**

A 2026-04-25 grep of `from '@/app/(coach|clients|teams|physio)` across `app/(business)` and `components/` returned **34 unique imported paths** spanning settings, analytics, calendar, invitations, live-hr, onboarding, referrals, subscription, tools, tests, ergometer-tests, field-tests, cross-training, injuries, athletes/logs, business, messages, and the team dashboard client itself.

## Trigger — when to actually do this

Any of:

- A new feature lands that needs to live ONLY in business-scoped (with no legacy mirror) and the team-shaped re-export pattern starts feeling wrong against it
- A code-quality push where the parallel structure makes a refactor 2× harder than it should be
- Someone hits a 404 because they bookmarked an old `/coach/*` URL pre-middleware-redirect (low likelihood — middleware has been live for a while)
- The legacy tree starts diverging from business-scoped (i.e. someone forgets to update both) and the divergence introduces a real bug

If none of these fire, the cleanup is pure code-cleanliness with no user-facing payoff. Deprioritize.

## The work, when picked up

This is a **move-then-delete refactor**, not a delete. Order matters.

### Phase 1 — Move implementations out of the legacy tree

For each of the 34 cross-tree files:

1. Identify the *implementation* — usually a default-exported component or a client component file (`*Client.tsx`).
2. Move it to its natural home:
   - Pure client components → `components/coach/...`, `components/physio/...`, etc.
   - Pages with server logic → INTO the business-scoped page that currently re-exports them. Inline the body; remove the re-export.
3. Update the legacy `app/coach/...` page to either (a) be removed, or (b) become the wrapper that re-exports from the new location. Pick (a) when the page is genuinely going away; (b) only if there's a transition reason.
4. Update any other importers (often there's just one: the business-scoped re-export).
5. Run `npm run typecheck` + `npm run build` after each move. The graph is small; a single build catches misses.

### Phase 2 — Delete the legacy directories

After Phase 1, every cross-tree import has been cut. The legacy tree should now have zero inbound references.

Delete in order:

1. `app/coach/...` — by far the largest (62 page.tsx files audit said). Single big commit OR per-feature commits.
2. `app/physio/...` — 8 files. One commit.
3. `app/teams/page.tsx` — single file.
4. `app/clients/...` — 6 files.

After each deletion, hit the build + e2e tests.

### Phase 3 — Decide the fate of `proxy.ts` redirects

Two options:

- **Keep them** — old bookmarks (if any) keep working, redirecting to business-scoped. ~30 lines of code, zero perf cost. **Recommended.**
- **Delete them** — anyone hitting an old URL gets 404. Cleaner, but loses the safety net.

Recommend keeping them indefinitely as a courtesy.

## What also needs updating (non-deletion fixes)

Found by grep but not part of the move:

- `app/page.tsx` (homepage) — has 5 hardcoded `/coach/programs`, `/coach/ai-studio`, `/coach/video-analysis`, `/coach/monitoring`, `/coach/dashboard` links. Replace with login/signup or with a business-aware routing helper.
- `components/coach/CoachGlassHeader.tsx` — legacy header with `/coach/*` links. Probably unreferenced after Phase 1 but worth checking.
- `components/ai-studio/ContextPanel.tsx` — hardcoded `/coach/documents`.
- `components/athlete-profile/...` — some tabs link to `/coach/...` paths.
- `__tests__/api/tenant-boundary/subscription-gating.test.ts` — hardcoded `/coach/subscription` in error mock body.
- `tests/e2e/navigation-and-auth.spec.ts` — currently tests "legacy redirect works"; rewrite to assert 404 OR assert business-scoped redirect.
- `tests/e2e/coach-flows.spec.ts` — already uses `businessPath()` helper; verify after deletion.

Stripe, Strava, Garmin, Concept2 callbacks are clean (already use business-scoped redirects). Magic links / emails have no hardcoded coach URLs.

## What stays (not in scope)

- `app/athlete/...` — solo-tier athletes. Permanent.
- `app/api/...` — API routes are not part of this cleanup; they don't follow the `(business)` prefix.
- Public/marketing/auth pages: `app/login`, `app/signup/*`, `app/pricing`, `app/privacy`, `app/coaches`, `app/for-coaches`, `app/for-athletes`, `app/for-gyms`. Out of scope.

## Risks / things to watch

- **Hidden test fixtures** referencing legacy URLs — easy to grep, easy to miss one.
- **Migration scripts** under `scripts/` that hit specific URLs — none found in the audit but worth re-checking before deletion.
- **Sentry / monitoring rules** matching on legacy URL patterns — outside the codebase, but flag mentally.
- **Stale CDN cache** holding legacy HTML — purges on Vercel deploy normally, but a hard refresh after the deletion lands is wise for testing.
- **The team page re-exports `TeamDashboardClient`** from `app/coach/teams/[teamId]/TeamDashboardClient`. Recently touched in the strength-PR work; the re-export means the audit's "legacy team page is empty" finding was misleading. Treat the team subtree carefully when ready.

## Estimated effort when picked up

- Phase 1 (move 34 files): **5-8 focused hours**, ideally one or two commits per feature area so rollback is granular.
- Phase 2 (deletion): **1-2 hours** including verification.
- Phase 3 (proxy.ts decision): **15 min** if we keep them; ~1 hour if we strip them.

Total: **a focused day**, not a few hours as the original audit suggested.

## Decisions to revisit when picked up

- Whether to inline implementations into the business-scoped page or move them to `components/`. Default: implementations that have meaningful server logic stay in the business-scoped page; pure client components move to `components/`.
- Whether to keep legacy `proxy.ts` redirects (default: yes).
- Whether `app/clients/...` (coach client management) deserves its own move, or simply gets folded into `app/(business)/[businessSlug]/coach/clients/...`. It's already the latter under a different prefix — treat as the same kind of move as Phase 1.
- Whether to handle `app/coach/teams/[teamId]/calendar/page.tsx` (a single legacy calendar page) as part of the team area or split it out.

## Recent work potentially affected

The 2026-04-25 hardening pass added Analys-tab content (StrengthPRTable, PendingPRFeedSingle, ClientLoadSummary, ReadinessDashboard, RecentTestsCard, ProgressionDashboard) to BOTH `app/clients/[id]/page.tsx` AND `app/(business)/[businessSlug]/coach/clients/[id]/page.tsx`. These are duplicated wirings, not cross-tree imports — when `app/clients/[id]/page.tsx` is deleted in Phase 2, the business-scoped variant carries on unchanged. Verified during the audit.

The same day also added a small "use the business-scoped page" hint card to `app/coach/teams/[teamId]/page.tsx`. That hint disappears with the page itself — net win.
