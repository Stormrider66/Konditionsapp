# Supabase Auth Hook — Custom Access Token

Registers `public.custom_access_token_hook` so Supabase injects our
application claims (`role`, `primarySlug`, `memberBusinessSlugs`, etc.)
into every access token. Middleware reads those claims from the JWT
instead of querying the database on every request.

The SQL function itself lives in
`prisma/migrations/20260418_custom_access_token_hook/migration.sql`.

## Before you start

1. Confirm the migration has been applied (function exists):

   ```sql
   SELECT proname FROM pg_proc WHERE proname = 'custom_access_token_hook';
   ```
2. Confirm the middleware feature flag is set in Vercel:
   `USE_JWT_CLAIMS=true` (production + preview). If the flag is missing
   or set to anything else, middleware falls back to the legacy DB-based
   lookup — safe rollback in case the hook misbehaves.

## Enable the hook

1. Open the Supabase dashboard for project `rzvznvaxpxsfqfmhbept`.
2. Go to **Authentication → Hooks (Beta)**.
3. Find **Customize Access Token (JWT) Claims**.
4. Toggle **Enabled**.
5. Hook type: **Postgres**.
6. Schema: `public`.
7. Function name: `custom_access_token_hook`.
8. Click **Create hook** (or **Save**).

Issue a fresh sign-in afterwards. Inspect the JWT (jwt.io) — you should
see `app_metadata.role`, `app_metadata.primarySlug`, etc. Existing
sessions need to refresh their access token (≤ 1 hour on default
settings) before they pick up the new claims.

## Rolling back

- **Disable in the dashboard** (toggle off). Existing tokens keep their
  claims until they expire; new tokens will be minted without them,
  and middleware with `USE_JWT_CLAIMS=true` will fail to find claims
  and fall through to the DB lookup.
- **Remove the flag** (`USE_JWT_CLAIMS` set to anything other than
  `true`) forces all requests through the DB lookup immediately.

## Smoke tests

Run after enabling the hook:

1. Sign in as a coach whose `User.id` matches their auth user id —
   access token should carry `role: COACH` and their `primarySlug`.
2. Sign in as a legacy user whose `User.id` drifted from the auth
   user id — the function's email fallback should still populate the
   claims. If it doesn't, run
   `npx ts-node scripts/sync-user-ids-with-supabase.ts --report` to
   surface the mismatches and plan the cleanup.
3. Hit `/api/auth/whoami` (or any authenticated API route) and assert
   the response matches the JWT claims.

## Why not `authMFA` / `beforeUserCreated` hooks too?

We only need enriched tokens today. The other hook kinds can be added
in follow-up migrations when a concrete need appears.
