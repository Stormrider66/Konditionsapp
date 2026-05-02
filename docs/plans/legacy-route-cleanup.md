# Legacy Non-Business-Scoped Route Cleanup

Plan to delete the parallel non-business-scoped route tree for coach/PT/team/gym/physio surfaces. Athletes are explicitly **out of scope** — `app/athlete/...` stays for solo (non-business-affiliated) athletes.

Source: post-implementation review on 2026-04-25 + Explore agent audit, updated after the 2026-04-25 ownership refactor.

## Current state (2026-04-25)

The coach-owned legacy non-business-scoped route tree has been deleted. The active non-athlete UI now lives under:

- `app/(business)/[businessSlug]/coach|physio|...` — the modern business-scoped tree, where all real users land via `proxy.ts` middleware

`proxy.ts` **redirects** authenticated coach/admin traffic from coach-owned legacy roots to business-scoped routes:

- `/coach/*` → `/{primarySlug}/coach/*`
- `/clients/*` → `/{primarySlug}/coach/clients/*`
- `/teams/*` → `/{primarySlug}/coach/teams/*`
- `/programs/*` → `/{primarySlug}/coach/programs/*`
- `/tests/*` → `/{primarySlug}/coach/tests/*` (`/tests` lands on `/coach/test-overview`)
- `/test/*` → `/{primarySlug}/coach/test/*`
- `/physio/*` → `/{primarySlug}/physio/*`

Coaches/physios without a business slug are sent to `/`. So in practice nobody should land on the legacy non-athlete pages today.

`app/athlete/...` is the **intentional exception** — solo athletes (no `primarySlug`) fall through to it. Keep this branch alive forever.

## Phase 1 result — cross-tree import pattern removed

Originally, the legacy tree was not just dead code waiting to be cut. The codebase's architecture was:

> The implementations live under `app/coach/...`. The business-scoped pages are thin wrappers that re-export them.

Concrete example (one of 34):

```tsx
// app/(business)/[businessSlug]/coach/tools/page.tsx
export { default } from '@/app/coach/tools/page'
```

Deleting `app/coach/tools/page.tsx` would simultaneously break the business-scoped tools page that imported it. **Naive `rm -rf` was not safe.**

A 2026-04-25 refactor moved those shared implementations out of `app/coach` / `app/clients` and into `components/coach/...` or `components/physio/...`. Current grep target:

```bash
rg "@/app/(coach|clients|teams|physio)|@/app/coach|@/app/clients|@/app/teams|@/app/physio" "app/(business)" components
```

Expected result: **no matches**.

`npm run audit:legacy-routes` now also fails if business-scoped code or shared components import legacy app route implementations.

## Trigger — why this was done

The cleanup was picked up because:

- Future coach/physio implementation work should only land in business-scoped routes.
- Middleware already redirects authenticated coach/admin users away from the legacy roots.
- Keeping dead route files made it too easy to add or land on non-business-scoped pages by accident.

## The work, when picked up

This is a **move-then-delete refactor**, not a delete. Order matters.

### Phase 1 — Move implementations out of the legacy tree

Status: **completed on 2026-04-25**.

What moved:

- Pure client implementations moved into `components/coach/...` and `components/physio/...`.
- Shared server/page implementations moved into component-owned route modules such as `components/coach/tests/TestDetailPage.tsx`, `components/coach/athletes/AthleteLogsPage.tsx`, and `components/coach/clients/AthleteProfilePage.tsx`.
- Legacy route files are now wrappers around component-owned implementations where they still exist.
- Business route files no longer import from `@/app/coach`, `@/app/clients`, `@/app/teams`, or `@/app/physio`.

Verification:

- `npm run audit:legacy-routes -- --json` → `totalLegacy: 79`, `totalPaired: 79`, `missing: []`, `forbiddenImports: []`
- `npm run typecheck` passes
- `git diff --check` passes

Historical build caveat: earlier `npm run build` attempts on 2026-04-25 hit local build-runner issues. After Phase 2, the production build passed when rerun outside the sandbox.

Original Phase 1 checklist:

1. Identify the *implementation* — usually a default-exported component or a client component file (`*Client.tsx`).
2. Move it to its natural home:
   - Pure client components → `components/coach/...`, `components/physio/...`, etc.
   - Pages with server logic → INTO the business-scoped page that currently re-exports them. Inline the body; remove the re-export.
3. Update the legacy `app/coach/...` page to either (a) be removed, or (b) become the wrapper that re-exports from the new location. Pick (a) when the page is genuinely going away; (b) only if there's a transition reason.
4. Update any other importers (often there's just one: the business-scoped re-export).
5. Run `npm run typecheck` + `npm run build` after each move. The graph is small; a single build catches misses.

### Phase 2 — Delete the legacy directories

Status: **completed on 2026-04-25**.

After Phase 1, every cross-tree import had been cut. Phase 2 deleted:

- `app/coach/...`
- `app/physio/...`
- `app/teams/page.tsx`
- `app/clients/...`
- `app/programs/...`
- `app/tests/...`
- `app/test/...`

Verification after deletion:

- `npm run audit:legacy-routes -- --json` → `totalLegacy: 0`, `totalPaired: 0`, `missing: []`, `forbiddenImports: []`
- Business-scoped code and shared components still have no imports from legacy app route implementations.
- `npm run typecheck` passes after regenerating route types with `npx next typegen` and clearing stale `.next/dev/types`.
- `npm run build` passes when run outside the sandbox. The sandboxed build hit a Turbopack worker port restriction (`Operation not permitted`).
- `git diff --check` passes.

### Phase 3 — Decide the fate of `proxy.ts` redirects

Two options:

- **Keep them** — old bookmarks (if any) keep working, redirecting to business-scoped. ~30 lines of code, zero perf cost. **Recommended.**
- **Delete them** — anyone hitting an old URL gets 404. Cleaner, but loses the safety net.

Recommend keeping them indefinitely as a courtesy.

## Follow-up fixes

Status: **completed on 2026-04-25**.

Closed follow-ups:

- `app/page.tsx` quick actions now route through a business-aware coach helper instead of deleted top-level coach aliases.
- Header/navigation fallbacks now avoid linking to deleted coach/physio pages when business context is missing.
- AI Studio document links now use the business-scoped documents route, with `/login` as the missing-scope fallback.
- Coach subscription upgrade, trial, Stripe checkout/portal, and notification URLs now resolve to `/{businessSlug}/coach/...` when a business slug is available, with public fallbacks instead of deleted legacy pages.
- E2E helpers now log coaches/physios into business-scoped routes directly.
- Subscription-gating mocks no longer use `/coach/subscription`.

Verification:

- Strict link/redirect grep found no direct `href`, `router.push`, `redirect`, or `window.location` calls to deleted top-level coach/physio/client/test pages.
- `npx vitest run __tests__/api/tenant-boundary/subscription-gating.test.ts __tests__/lib/subscription/require-feature-access.test.ts` passes.

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
