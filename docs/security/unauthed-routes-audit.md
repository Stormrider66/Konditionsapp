# Unauthenticated API Routes — Audit

_Generated during Phase 1 of the 18-issue remediation plan._

**Scope:** `app/api/**/route.ts` files that do **not** match any of the
standard auth helpers (`requireAuth`, `getCurrentUser`, `requireCoach`,
`requireAthlete`, `requireAdmin`, `requirePhysio`, `requireRole`,
`resolveAthleteClientId`, `requireBusinessAdminRole`, `withApiKey`,
`CRON_SECRET` header check, Supabase session cookies, etc.).

Of 626 API routes in the codebase, 22 matched this filter after helpers
such as `resolveAthleteClientId`, `requireBusinessAdminRole` and
`withApiKey` were added to the exclusion list. Each is categorised below
as **public**, **webhook**, **cron**, or **bug**.

## Public (intentional, rate-limited by IP)

These routes are genuinely public. They already rate-limit requests by
IP and do not read or mutate sensitive data.

| Route | Purpose | Notes |
|-------|---------|-------|
| `app/api/business/invitations/validate/route.ts` | Validate invite code during signup | Returns minimal fields |
| `app/api/businesses/search/route.ts` | Marketplace search (GYM/CLUB only) | Rate-limited |
| `app/api/coaches/route.ts` | Public coach listing | Read-only |
| `app/api/coaches/[slug]/route.ts` | Public coach profile | Read-only |
| `app/api/auth/forgot-password/route.ts` | Password reset email trigger | Rate-limited (3/15 min/IP), returns constant response to prevent enumeration |
| `app/api/auth/log-event/route.ts` | Client-side auth telemetry | Rate-limited (30/min/IP) |
| `app/api/auth/register/partner/route.ts` | Partner/coach signup flow | Creates Supabase user + DB row; should add per-IP rate limit (follow-up) |
| `app/api/equipment/route.ts` | Read-only equipment catalog | No sensitive data |
| `app/api/health/route.ts` | Liveness probe | Returns no user data |
| `app/api/locale/route.ts` | Set `NEXT_LOCALE` cookie | No DB access |
| `app/api/referrals/validate/route.ts` | Validate referral code on signup | Returns only referrer name |
| `app/api/strength-templates/system/route.ts` | Hard-coded training templates | Read-only, no DB |
| `app/api/strength-templates/system/[id]/route.ts` | Hard-coded training templates | Read-only, no DB |

## Webhooks (verified via provider signature / verify-token)

Third-party webhooks are authenticated by provider-issued signatures.
They are intentionally excluded from CSRF checks in `middleware.ts`.

| Route | Auth mechanism |
|-------|----------------|
| `app/api/integrations/concept2/webhook/route.ts` | `CONCEPT2_WEBHOOK_VERIFY_TOKEN` |
| `app/api/integrations/garmin/webhook/route.ts` | `GARMIN_WEBHOOK_VERIFY_TOKEN` |
| `app/api/integrations/strava/webhook/route.ts` | `STRAVA_WEBHOOK_VERIFY_TOKEN` |
| `app/api/slack/events/route.ts` | `SLACK_SIGNING_SECRET` (HMAC verify) |
| `app/api/slack/interactions/route.ts` | `SLACK_SIGNING_SECRET` (HMAC verify) |

## Indirect auth (grep missed the pattern)

These routes are actually authenticated but use a helper not in the
grep pattern. Not bugs.

| Route | Helper |
|-------|--------|
| `app/api/ai/config/route.ts` | `getUserAIConfig()` → `getCurrentUser()` internally |

## Fixed during Phase 1

| Route | Fix |
|-------|-----|
| `app/api/agent-tools/dispatch/route.ts` | **Was completely unauthenticated.** Now requires either an authenticated session (with tenant boundary check via `canAccessClient` / same-business `BusinessMember` lookup) OR the `INTERNAL_DISPATCH_SECRET` shared secret for internal workers. |
| `app/api/cron/gym-platform-sync/route.ts` | **Was missing cron-secret check.** Now verifies `Authorization: Bearer $CRON_SECRET`, matching the pattern used by `cron/auto-optimize`, `cron/injury-digest`, `cron/post-workout-checkins`, etc. |

## Still to review (lower priority; not blocking)

| Route | Category | Reason |
|-------|----------|--------|
| `app/api/ergometer/classify/route.ts` | Suspicious | Pure calculation route but reads from DB (`prisma` import). Should be converted to `requireAuth` to prevent crawlers from hammering it. Tracked for Phase 3. |

## Regeneration

Rerun this audit with:

```bash
cd app/api && grep -rLE \
  'requireAuth|getCurrentUser|requireCoach|requireAthlete|requireAdmin|requirePhysio|requireRole|verifyCronSecret|verifyApiKey|createSupabaseServerClient|auth\.getUser|getUser\(\)|x-cron-secret|CRON_SECRET|INTERNAL_DISPATCH_SECRET|verifyWebhook|supabase\.auth|requireUserWithRole|authenticateUser|authenticateRequest|withAuth|withApiKey|requireSession|requireApiKey|validateApiKey|requireMember|requireBusinessMember|getServerSession|createServerSupabase|getAuthenticatedUser|resolveAthleteClientId|requireBusinessAdminRole|requireBusinessRole|getRequestedBusinessScope|requireAthleteOrCoach|requireSelfOrCoach|authorizeCoach|requireOrganizationMember' \
  --include='route.ts' . | sort
```
